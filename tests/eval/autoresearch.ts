/**
 * Autoresearch loop with proper train/holdout split.
 *
 * Pipeline per iteration:
 *   1. Pick the next untried candidate fix.
 *   2. Apply it to src/resolve.ts.
 *   3. Re-import resolve.ts and score it on DEV (the "train" fixture).
 *   4. Score the same patched code on HOLDOUT (never used to pick fixes).
 *   5. Keep the patch only if:
 *        - DEV overall improves (strictly), AND
 *        - HOLDOUT overall does not regress by more than HOLDOUT_REGRESSION_BUDGET.
 *      Otherwise revert.
 *
 * This addresses the train=test leak in the previous loop, where fixes were
 * accepted if they improved the same fixture used to evaluate them.
 *
 * The single-number objective is `overallScore(summary)` from lib.ts:
 *   0.4 * recall@1 + 0.4 * MRR + 0.2 * negative-precision
 *
 * Run:
 *   node --import tsx tests/eval/autoresearch.ts
 *   node --import tsx tests/eval/autoresearch.ts --max-iter 8
 *   node --import tsx tests/eval/autoresearch.ts --strict   # no holdout regression at all
 */

import { readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { overallScore, runCases, setupFixture, summarize, type CaseResult, type FixtureSet, type MetricSummary } from './lib.js';
import { DEV_FIXTURE, HOLDOUT_FIXTURE } from './fixtures.js';
import { resolveContext } from '../../src/resolve.js';

const ROOT = join(new URL(import.meta.url).pathname, '../../..');
const RESOLVE_PATH = join(ROOT, 'src/resolve.ts');

const MAX_ITER = (() => {
  const idx = process.argv.indexOf('--max-iter');
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : 8;
})();

const STRICT = process.argv.includes('--strict');
// Allow a tiny holdout regression so noise doesn't reject every fix; tighten with --strict.
const HOLDOUT_REGRESSION_BUDGET = STRICT ? 0 : 0.01;

type ResolveFn = typeof resolveContext;

interface CandidateFix {
  name: string;
  description: string;
  apply: (source: string) => string;
}

const CANDIDATE_FIXES: CandidateFix[] = [
  {
    name: 'min-token-length-3',
    description: 'Raise minimum meaningful token length from 2 to 3 to reduce short-word noise.',
    apply: (src) => src.replace('.filter((t) => t.length >= 2 && !STOP_WORDS.has(t));', '.filter((t) => t.length >= 3 && !STOP_WORDS.has(t));'),
  },
  {
    name: 'korean-stopwords',
    description: 'Add common Korean particles/conjunctions to STOP_WORDS so 가/이/와/에서 do not count as tokens.',
    apply: (src) =>
      src.replace(
        "  'do', 'did', 'has', 'had', 'not', 'no', 'so', 'up', 'out', 'off', 'via',\n  'vs', 'per', 'set', 'get', 'run', 'add', 'use', 'new', 'old', 'all', 'any',\n]);",
        "  'do', 'did', 'has', 'had', 'not', 'no', 'so', 'up', 'out', 'off', 'via',\n  'vs', 'per', 'set', 'get', 'run', 'add', 'use', 'new', 'old', 'all', 'any',\n  // Korean particles / conjunctions (very low signal, very high frequency)\n  '가', '이', '와', '과', '를', '을', '의', '에', '에서', '으로', '로', '은', '는',\n  '하고', '하며', '한다', '있다', '있음',\n]);",
      ),
  },
  {
    name: 'glossary-demote-by-title',
    description: 'When the query has 4+ tokens and the doc title contains "glossary", subtract score so deep docs win unless the query is glossary-style. Uses title (reliable) instead of category (often null).',
    apply: (src) =>
      src.replace(
        'return labelScore + titleScore + summaryScore + categoryScore + pathScore + contentScore + phraseScore;',
        `const isGlossary = /glossary/i.test(entry.title || '');\n  const glossaryPenalty = tokens.length >= 4 && isGlossary ? -5 : 0;\n  return labelScore + titleScore + summaryScore + categoryScore + pathScore + contentScore + phraseScore + glossaryPenalty;`,
      ),
  },
  {
    name: 'phrase-bonus-also-in-summary',
    description: 'Increase weight of exact-phrase match inside the summary block (current: equal to other fields). Cheap precision boost on multi-word queries.',
    apply: (src) =>
      src.replace(
        'exactPhraseScore(entry.summary, query) +',
        'exactPhraseScore(entry.summary, query) * 2 +',
      ),
  },
  {
    name: 'prefix-stem-long-tokens',
    description: 'For ASCII tokens >=9 chars, accept a 7-char prefix-stem match in addition to exact word-boundary match. Handles persists<->persistence, reconciled<->reconciliation, replicated<->replication. The 7-char stem is conservative enough that "Suspense" (8 chars, skipped) does not leak into "suspension" / "suspend".',
    apply: (src) =>
      src.replace(
        `function countTokenMatches(text: string, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const haystack = String(text || '').toLowerCase();
  return tokens.reduce((sum, token) => {
    try {
      return sum + (makeTokenRegex(token).test(haystack) ? 1 : 0);
    } catch {
      // Regex construction failed (e.g. special chars in token) — fall back to substring
      return sum + (haystack.includes(token) ? 1 : 0);
    }
  }, 0);
}`,
        `function countTokenMatches(text: string, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const haystack = String(text || '').toLowerCase();
  return tokens.reduce((sum, token) => {
    try {
      if (makeTokenRegex(token).test(haystack)) return sum + 1;
      // Prefix-stem fallback for long ASCII tokens. Conservative: token must be
      // >=9 chars and the prefix is 7 chars, so words like "Suspense" (8 chars)
      // are skipped and cannot collide with unrelated stems like "suspension".
      // Catches persists/persistence, reconciled/reconciliation, replicated/replication.
      if (token.length >= 9 && /^[a-z]+$/.test(token)) {
        const stem = token.slice(0, 7);
        if (new RegExp(\`\\\\b\${stem}[a-z]*\\\\b\`).test(haystack)) return sum + 1;
      }
      return sum;
    } catch {
      return sum + (haystack.includes(token) ? 1 : 0);
    }
  }, 0);
}`,
      ),
  },
];

interface IterationOutcome {
  iter: number;
  fix: string;
  description: string;
  devBefore: number;
  devAfter: number;
  holdoutBefore: number;
  holdoutAfter: number;
  kept: boolean;
  reason: string;
  failedDev: number;
  failedHoldout: number;
}

async function score(fixture: FixtureSet, resolveFn: ResolveFn): Promise<{ summary: MetricSummary; failures: CaseResult[] }> {
  const home = await setupFixture(fixture);
  try {
    const results = await runCases(home, fixture.cases, resolveFn);
    return { summary: summarize(results), failures: results.filter((r) => !r.hit) };
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

async function importResolveFresh(version: number): Promise<ResolveFn> {
  // Cache-bust the dynamic import so the patched source is re-read.
  const mod = (await import(`../../src/resolve.js?v=${version}`)) as typeof import('../../src/resolve.js');
  return mod.resolveContext;
}

function fmtPair(d: number, h: number): string {
  return `dev=${(d * 100).toFixed(1)}% holdout=${(h * 100).toFixed(1)}%`;
}

async function main(): Promise<void> {
  console.log(`═══ gc-tree Autoresearch (train=DEV, gate=HOLDOUT) ═══`);
  console.log(`Max iterations: ${MAX_ITER}`);
  console.log(`Holdout regression budget: ${(HOLDOUT_REGRESSION_BUDGET * 100).toFixed(2)}%${STRICT ? '  (--strict)' : ''}`);
  console.log(`Target file: ${RESOLVE_PATH}`);

  // Baseline (current code on disk).
  const baselineDev = await score(DEV_FIXTURE, resolveContext);
  const baselineHoldout = await score(HOLDOUT_FIXTURE, resolveContext);
  let curDev = overallScore(baselineDev.summary);
  let curHoldout = overallScore(baselineHoldout.summary);

  console.log(`\n── Baseline ──`);
  console.log(`  ${fmtPair(curDev, curHoldout)}`);
  console.log(`  dev failures=${baselineDev.failures.length}, holdout failures=${baselineHoldout.failures.length}`);

  const originalSource = await readFile(RESOLVE_PATH, 'utf8');
  let curSource = originalSource;
  const tried = new Set<string>();
  const history: IterationOutcome[] = [];

  for (let iter = 1; iter <= MAX_ITER; iter++) {
    const fix = CANDIDATE_FIXES.find((f) => !tried.has(f.name));
    if (!fix) {
      console.log(`\nNo more candidate fixes. Stopping at iter ${iter - 1}.`);
      break;
    }
    tried.add(fix.name);

    console.log(`\n── Iter ${iter}: ${fix.name} ──`);
    console.log(`  ${fix.description}`);

    const next = fix.apply(curSource);
    if (next === curSource) {
      console.log(`  ⚠ Pattern not found in current source; skipping.`);
      continue;
    }

    await writeFile(RESOLVE_PATH, next, 'utf8');

    let devAfter = curDev;
    let holdoutAfter = curHoldout;
    let failedDev = baselineDev.failures.length;
    let failedHoldout = baselineHoldout.failures.length;

    try {
      const resolveFn = await importResolveFresh(iter);
      const dev = await score(DEV_FIXTURE, resolveFn);
      const holdout = await score(HOLDOUT_FIXTURE, resolveFn);
      devAfter = overallScore(dev.summary);
      holdoutAfter = overallScore(holdout.summary);
      failedDev = dev.failures.length;
      failedHoldout = holdout.failures.length;
    } catch (err) {
      console.log(`  ✗ Patch caused error: ${err instanceof Error ? err.message : String(err)} — reverting.`);
      await writeFile(RESOLVE_PATH, curSource, 'utf8');
      continue;
    }

    const devDelta = devAfter - curDev;
    const holdoutDelta = holdoutAfter - curHoldout;
    const devImproved = devDelta > 0;
    const holdoutOk = holdoutDelta >= -HOLDOUT_REGRESSION_BUDGET;
    const kept = devImproved && holdoutOk;

    let reason: string;
    if (!devImproved && !holdoutOk) reason = `no dev gain (${(devDelta * 100).toFixed(2)}%), holdout regressed (${(holdoutDelta * 100).toFixed(2)}%)`;
    else if (!devImproved) reason = `no dev gain (${(devDelta * 100).toFixed(2)}%)`;
    else if (!holdoutOk) reason = `holdout regressed beyond budget (${(holdoutDelta * 100).toFixed(2)}% < -${(HOLDOUT_REGRESSION_BUDGET * 100).toFixed(2)}%)`;
    else reason = `dev +${(devDelta * 100).toFixed(2)}%, holdout ${holdoutDelta >= 0 ? '+' : ''}${(holdoutDelta * 100).toFixed(2)}%`;

    console.log(`  Before: ${fmtPair(curDev, curHoldout)}`);
    console.log(`  After:  ${fmtPair(devAfter, holdoutAfter)}`);
    console.log(`  Decision: ${kept ? '✅ KEPT' : '❌ REVERTED'} — ${reason}`);

    history.push({ iter, fix: fix.name, description: fix.description, devBefore: curDev, devAfter, holdoutBefore: curHoldout, holdoutAfter, kept, reason, failedDev, failedHoldout });

    if (kept) {
      curSource = next;
      curDev = devAfter;
      curHoldout = holdoutAfter;
      if (curDev >= 0.999 && curHoldout >= 0.999) {
        console.log(`\nNear-perfect on both. Stopping.`);
        break;
      }
    } else {
      await writeFile(RESOLVE_PATH, curSource, 'utf8');
    }
  }

  console.log(`\n═══ Autoresearch Results ═══`);
  console.log(`Baseline: ${fmtPair(overallScore(baselineDev.summary), overallScore(baselineHoldout.summary))}`);
  console.log(`Final:    ${fmtPair(curDev, curHoldout)}`);
  const devNet = curDev - overallScore(baselineDev.summary);
  const holdNet = curHoldout - overallScore(baselineHoldout.summary);
  console.log(`Net delta: dev ${devNet >= 0 ? '+' : ''}${(devNet * 100).toFixed(2)}%, holdout ${holdNet >= 0 ? '+' : ''}${(holdNet * 100).toFixed(2)}%`);

  console.log(`\n── Iteration log ──`);
  for (const h of history) {
    const icon = h.kept ? '✅' : '❌';
    console.log(`  ${icon} [${h.iter}] ${h.fix}: ${fmtPair(h.devAfter, h.holdoutAfter)}  (${h.reason})`);
  }

  const kept = history.filter((h) => h.kept);
  console.log(`\nApplied fixes (${kept.length}/${history.length}):`);
  for (const h of kept) console.log(`  - ${h.fix}: ${h.description}`);

  if (kept.length === 0) {
    // Make sure the file is exactly as we found it.
    await writeFile(RESOLVE_PATH, originalSource, 'utf8');
    console.log(`\nNo fixes accepted; src/resolve.ts unchanged.`);
  } else {
    console.log(`\nsrc/resolve.ts now contains ${kept.length} accepted fix(es). Run \`npm test\` to confirm no regressions.`);
  }
}

await main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
