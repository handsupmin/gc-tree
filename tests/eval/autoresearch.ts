/**
 * Autoresearch-style iterative improvement loop for gc-tree resolve quality
 *
 * Inspired by karpathy/autoresearch:
 * - Fixed metric: eval score across all 5 dimensions
 * - Modification target: scoreText() in src/resolve.ts
 * - Each iteration: run eval → identify weakest area → apply one candidate fix → re-run
 * - Stop: when no improvement, score plateaus, or max iterations reached
 *
 * Candidate fixes are ordered by expected impact. The loop picks the next
 * untried fix, applies it, measures the delta, and keeps it only if it improves
 * or holds the score. At the end, prints the full improvement history.
 *
 * Run:
 *   node --import tsx tests/eval/autoresearch.ts
 *   node --import tsx tests/eval/autoresearch.ts --max-iter 4
 */

import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { onboardBranch } from '../../src/onboard.js';
import { resolveContext } from '../../src/resolve.js';
import { checkoutBranch, initHome } from '../../src/store.js';
import { branchDocsDir } from '../../src/paths.js';

const ROOT = join(new URL(import.meta.url).pathname, '../../..');
const RESOLVE_PATH = join(ROOT, 'src/resolve.ts');

const MAX_ITER = (() => {
  const idx = process.argv.indexOf('--max-iter');
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : 5;
})();

// ─────────────────────────────────────────────
// Candidate improvements (ordered by expected impact)
// Each has a name, description, and the exact file transform to apply
// ─────────────────────────────────────────────
interface CandidateFix {
  name: string;
  description: string;
  apply: (source: string) => string;
  revert?: (source: string) => string;
}

const CANDIDATE_FIXES: CandidateFix[] = [
  {
    name: 'word-boundary-matching',
    description: 'Replace substring includes() with \\b word-boundary regex matching',
    apply: (src) =>
      src.replace(
        'return tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);',
        `  return tokens.reduce((sum, token) => {
    const re = new RegExp(\`\\\\b\${token}\\\\b\`);
    return sum + (re.test(haystack) ? 1 : 0);
  }, 0);`,
      ),
  },
  {
    name: 'min-token-length-3',
    description: 'Raise minimum meaningful token length from 2 to 3 to reduce short-word noise',
    apply: (src) => src.replace('.filter((token) => token.length >= 2 && !STOP_WORDS.has(token));', '.filter((token) => token.length >= 3 && !STOP_WORDS.has(token));'),
    revert: (src) => src.replace('.filter((token) => token.length >= 3 && !STOP_WORDS.has(token));', '.filter((token) => token.length >= 2 && !STOP_WORDS.has(token));'),
  },
  {
    name: 'require-min-score-2-for-long-queries',
    description: 'For queries with 4+ tokens, require score >= 2 to reduce single-token noise',
    apply: (src) =>
      src.replace(
        '    if (score <= 0) continue;',
        `    const minScore = tokens.length >= 4 ? 2 : 1;
    if (score < minScore) continue;`,
      ),
    revert: (src) =>
      src.replace(
        `    const minScore = tokens.length >= 4 ? 2 : 1;
    if (score < minScore) continue;`,
        '    if (score <= 0) continue;',
      ),
  },
  {
    name: 'idf-style-title-boost',
    description: 'Give 2x weight to tokens that match in the document title (more signal-dense)',
    apply: (src) =>
      src.replace(
        `  for (const entry of entries) {
    const fullPath = join(branchDir(home, branch), entry.path);
    const raw = await readFile(fullPath, 'utf8');
    const summary = extractSummary(raw);
    const combined = \`\${entry.title}\\n\${summary}\\n\${raw}\`;
    const score = scoreText(combined, query);`,
        `  for (const entry of entries) {
    const fullPath = join(branchDir(home, branch), entry.path);
    const raw = await readFile(fullPath, 'utf8');
    const summary = extractSummary(raw);
    const combined = \`\${entry.title}\\n\${summary}\\n\${raw}\`;
    // Title matches count double (higher signal density)
    const titleScore = scoreText(entry.title, query);
    const bodyScore = scoreText(\`\${summary}\\n\${raw}\`, query);
    const score = titleScore * 2 + bodyScore;`,
      ),
    revert: (src) =>
      src.replace(
        `  for (const entry of entries) {
    const fullPath = join(branchDir(home, branch), entry.path);
    const raw = await readFile(fullPath, 'utf8');
    const summary = extractSummary(raw);
    const combined = \`\${entry.title}\\n\${summary}\\n\${raw}\`;
    // Title matches count double (higher signal density)
    const titleScore = scoreText(entry.title, query);
    const bodyScore = scoreText(\`\${summary}\\n\${raw}\`, query);
    const score = titleScore * 2 + bodyScore;`,
        `  for (const entry of entries) {
    const fullPath = join(branchDir(home, branch), entry.path);
    const raw = await readFile(fullPath, 'utf8');
    const summary = extractSummary(raw);
    const combined = \`\${entry.title}\\n\${summary}\\n\${raw}\`;
    const score = scoreText(combined, query);`,
      ),
  },
  {
    name: 'phrase-bonus',
    description: 'Add +3 bonus when the full query phrase appears as a continuous substring',
    apply: (src) =>
      src.replace(
        `  for (const entry of entries) {
    const fullPath = join(branchDir(home, branch), entry.path);
    const raw = await readFile(fullPath, 'utf8');
    const summary = extractSummary(raw);
    const combined = \`\${entry.title}\\n\${summary}\\n\${raw}\`;
    const score = scoreText(combined, query);`,
        `  const queryLower = query.toLowerCase();
  for (const entry of entries) {
    const fullPath = join(branchDir(home, branch), entry.path);
    const raw = await readFile(fullPath, 'utf8');
    const summary = extractSummary(raw);
    const combined = \`\${entry.title}\\n\${summary}\\n\${raw}\`;
    const combinedLower = combined.toLowerCase();
    // Phrase match bonus: full query as continuous substring scores higher
    const phraseBonus = combinedLower.includes(queryLower) ? 3 : 0;
    const score = scoreText(combined, query) + phraseBonus;`,
      ),
    revert: (src) =>
      src.replace(
        `  const queryLower = query.toLowerCase();
  for (const entry of entries) {
    const fullPath = join(branchDir(home, branch), entry.path);
    const raw = await readFile(fullPath, 'utf8');
    const summary = extractSummary(raw);
    const combined = \`\${entry.title}\\n\${summary}\\n\${raw}\`;
    const combinedLower = combined.toLowerCase();
    // Phrase match bonus: full query as continuous substring scores higher
    const phraseBonus = combinedLower.includes(queryLower) ? 3 : 0;
    const score = scoreText(combined, query) + phraseBonus;`,
        `  for (const entry of entries) {
    const fullPath = join(branchDir(home, branch), entry.path);
    const raw = await readFile(fullPath, 'utf8');
    const summary = extractSummary(raw);
    const combined = \`\${entry.title}\\n\${summary}\\n\${raw}\`;
    const score = scoreText(combined, query);`,
      ),
  },
];

// ─────────────────────────────────────────────
// Minimal inline eval (no subprocess) — same fixtures as main eval
// ─────────────────────────────────────────────
const ALPHA_DOCS = [
  { title: 'Project Identity', slug: 'project-identity', summary: 'Alpha is a React/TypeScript SPA for an e-commerce storefront. Key concerns: cart state, auth tokens, and Stripe checkout.', body: 'Stack: React 18, TypeScript, Zustand for cart state. Auth uses short-lived JWTs. Stripe Elements handles payment UI.' },
  { title: 'Cart System', slug: 'cart-system', summary: 'Cart state managed by Zustand. Items persist to localStorage on every change.', body: 'Cart actions: addItem, removeItem, updateQuantity, clearCart. Cart persists to localStorage.' },
  { title: 'Auth Flow', slug: 'auth-flow', summary: 'JWT auth with silent refresh via /api/auth/refresh. Never store access tokens in localStorage.', body: 'Access token lifetime: 15 minutes. Silent refresh runs 60 seconds before expiry. On 401, retry once after refresh.' },
  { title: 'Glossary', slug: 'glossary', summary: 'Key terms: SKU (product variant ID), PDP (product detail page), SFN (storefront navigation).', body: 'SKU: unique identifier for a product variant. PDP: Product Detail Page. SFN: Storefront Navigation.' },
];
const BETA_DOCS = [
  { title: 'Project Identity', slug: 'project-identity', summary: 'Beta is the ML platform powering recommendations. Stack: Python, Ray, MLflow, Spark.', body: 'Beta owns model training, batch inference, and feature engineering pipelines. Ray for distributed training.' },
  { title: 'Dataset Conventions', slug: 'dataset-conventions', summary: 'Raw datasets in s3://ml-data-raw/. Processed features in s3://ml-data-features/ by Spark jobs.', body: 'Never modify data in the raw bucket. PII must be masked before feature extraction.' },
  { title: 'Model Training', slug: 'model-training', summary: 'Training via scripts/train.py. Ray head at ray://ml-ray-head:10001.', body: 'All hyperparameters in YAML config. Ray Tune for hyperparameter search. Checkpoint every 10 epochs.' },
  { title: 'Glossary', slug: 'glossary', summary: 'Key terms: feature store, champion model, shadow deployment, data drift, cold start.', body: 'Feature store: centralised precomputed features. Champion model: current production version. Shadow deployment: new model in parallel without serving.' },
];

interface EvalScore {
  resolveRelevance: number;
  branchIsolation: number;
  overall: number;
}

const RESOLVE_CASES = [
  { branch: 'alpha', query: 'React cart Zustand', expectMatch: true },
  { branch: 'alpha', query: 'JWT token silent refresh', expectMatch: true },
  { branch: 'alpha', query: 'Stripe checkout payment', expectMatch: true },
  { branch: 'alpha', query: 'Ray MLflow experiment', expectMatch: false },
  { branch: 'alpha', query: 'data drift feature store', expectMatch: false },
  { branch: 'beta', query: 'Ray training MLflow GPU', expectMatch: true },
  { branch: 'beta', query: 'dataset PII masking', expectMatch: true },
  { branch: 'beta', query: 'champion model shadow deployment', expectMatch: true },
  { branch: 'beta', query: 'React Zustand shopping cart', expectMatch: false },
  { branch: 'beta', query: 'SKU product detail page', expectMatch: false },
];

const ISOLATION_CASES = [
  { query: 'JWT token Zustand cart', match: 'alpha', noMatch: 'beta' },
  { query: 'Ray training MLflow dataset', match: 'beta', noMatch: 'alpha' },
  { query: 'Stripe payment checkout', match: 'alpha', noMatch: 'beta' },
  { query: 'feature store champion model', match: 'beta', noMatch: 'alpha' },
  { query: 'SKU PDP storefront navigation', match: 'alpha', noMatch: 'beta' },
  { query: 'cold start recommendation', match: 'beta', noMatch: 'alpha' },
];

async function runEval(home: string): Promise<{ scores: EvalScore; details: string[] }> {
  const details: string[] = [];

  // Relevance
  let relCorrect = 0;
  for (const c of RESOLVE_CASES) {
    const res = await resolveContext({ home, branch: c.branch, query: c.query });
    const ok = (res.matches.length > 0) === c.expectMatch;
    if (ok) relCorrect++;
    if (!ok) details.push(`  relevance FAIL: [${c.branch}] "${c.query}" → ${res.matches.length} matches (expect ${c.expectMatch ? '≥1' : '0'})`);
  }

  // Isolation
  let isoCorrect = 0;
  for (const c of ISOLATION_CASES) {
    const matchRes = await resolveContext({ home, branch: c.match, query: c.query });
    const noMatchRes = await resolveContext({ home, branch: c.noMatch, query: c.query });
    if (matchRes.matches.length > 0) isoCorrect++;
    if (noMatchRes.matches.length === 0) isoCorrect++;
    if (matchRes.matches.length === 0) details.push(`  isolation FAIL: [${c.match}] "${c.query}" → 0 matches (expect ≥1)`);
    if (noMatchRes.matches.length > 0) details.push(`  isolation FAIL: [${c.noMatch}] "${c.query}" → ${noMatchRes.matches.length} matches (expect 0)`);
  }

  const resolveRelevance = relCorrect / RESOLVE_CASES.length;
  const branchIsolation = isoCorrect / (ISOLATION_CASES.length * 2);
  return { scores: { resolveRelevance, branchIsolation, overall: (resolveRelevance + branchIsolation) / 2 }, details };
}

async function setupEvalHome(): Promise<string> {
  const home = await mkdtemp(join(tmpdir(), 'gctree-ar-'));
  await initHome(home);
  for (const { branch, docs } of [
    { branch: 'alpha', docs: ALPHA_DOCS },
    { branch: 'beta', docs: BETA_DOCS },
  ]) {
    await checkoutBranch(home, branch, true);
    await onboardBranch({ home, branch, input: { branchSummary: `${branch} gc-branch`, docs } });
  }
  return home;
}

function fmt(score: EvalScore): string {
  return `overall=${(score.overall * 100).toFixed(1)}% rel=${(score.resolveRelevance * 100).toFixed(1)}% iso=${(score.branchIsolation * 100).toFixed(1)}%`;
}

// ─────────────────────────────────────────────
// Main autoresearch loop
// ─────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(`\n═══ gc-tree Autoresearch Loop ═══`);
  console.log(`Max iterations: ${MAX_ITER}`);
  console.log(`Target file: ${RESOLVE_PATH}\n`);

  // Baseline eval (with current code)
  let home = await setupEvalHome();
  const { scores: baseline, details: baselineDetails } = await runEval(home);
  await rm(home, { recursive: true, force: true });

  console.log(`── Baseline ──`);
  console.log(`  ${fmt(baseline)}`);
  if (baselineDetails.length > 0) for (const d of baselineDetails) console.log(d);

  const history: Array<{ iter: number; fix: string; description: string; before: EvalScore; after: EvalScore; kept: boolean }> = [];
  let currentSource = await readFile(RESOLVE_PATH, 'utf8');
  let currentScore = baseline;
  const triedFixes = new Set<string>();

  // ── Iteration loop ──
  for (let iter = 1; iter <= MAX_ITER; iter++) {
    // Find the next untried fix
    const fix = CANDIDATE_FIXES.find((f) => !triedFixes.has(f.name));
    if (!fix) {
      console.log(`\nNo more candidate fixes. Stopping at iteration ${iter}.`);
      break;
    }
    triedFixes.add(fix.name);

    console.log(`\n── Iteration ${iter}: ${fix.name} ──`);
    console.log(`  ${fix.description}`);

    // Apply fix to source
    const newSource = fix.apply(currentSource);
    if (newSource === currentSource) {
      console.log(`  ⚠ Fix had no effect (pattern not found). Skipping.`);
      continue;
    }

    // Write modified source and dynamically re-import (use separate home for each test)
    await writeFile(RESOLVE_PATH, newSource, 'utf8');

    // Re-import the modified module by busting the cache
    // Since we're using ESM with tsx, we need to use dynamic import with a cache-bust
    let newScores: EvalScore;
    let evalDetails: string[];

    try {
      // Clear module cache by appending a unique query param
      const { resolveContext: newResolveContext } = await import(`../../src/resolve.js?v=${iter}`) as typeof import('../../src/resolve.js');

      home = await setupEvalHome();

      // Run eval with the new resolve function inline
      const details: string[] = [];
      let relCorrect = 0;
      for (const c of RESOLVE_CASES) {
        const res = await newResolveContext({ home, branch: c.branch, query: c.query });
        const ok = (res.matches.length > 0) === c.expectMatch;
        if (ok) relCorrect++;
        if (!ok) details.push(`  relevance FAIL: [${c.branch}] "${c.query}" → ${res.matches.length} matches`);
      }
      let isoCorrect = 0;
      for (const c of ISOLATION_CASES) {
        const matchRes = await newResolveContext({ home, branch: c.match, query: c.query });
        const noMatchRes = await newResolveContext({ home, branch: c.noMatch, query: c.query });
        if (matchRes.matches.length > 0) isoCorrect++;
        if (noMatchRes.matches.length === 0) isoCorrect++;
        if (matchRes.matches.length === 0) details.push(`  isolation FAIL: [${c.match}] "${c.query}" → 0`);
        if (noMatchRes.matches.length > 0) details.push(`  isolation FAIL: [${c.noMatch}] "${c.query}" → ${noMatchRes.matches.length}`);
      }
      await rm(home, { recursive: true, force: true });

      const resolveRelevance = relCorrect / RESOLVE_CASES.length;
      const branchIsolation = isoCorrect / (ISOLATION_CASES.length * 2);
      newScores = { resolveRelevance, branchIsolation, overall: (resolveRelevance + branchIsolation) / 2 };
      evalDetails = details;
    } catch (err) {
      console.log(`  ✗ Error applying fix: ${err instanceof Error ? err.message : String(err)}`);
      // Revert
      await writeFile(RESOLVE_PATH, currentSource, 'utf8');
      continue;
    }

    const delta = newScores.overall - currentScore.overall;
    const kept = delta >= 0;

    console.log(`  Before: ${fmt(currentScore)}`);
    console.log(`  After:  ${fmt(newScores)}  (delta: ${delta > 0 ? '+' : ''}${(delta * 100).toFixed(1)}%)`);
    if (evalDetails.length > 0) for (const d of evalDetails) console.log(d);

    history.push({ iter, fix: fix.name, description: fix.description, before: currentScore, after: newScores, kept });

    if (kept) {
      console.log(`  ✅ Kept (improvement or no regression)`);
      currentSource = newSource;
      currentScore = newScores;
    } else {
      console.log(`  ❌ Reverted (regression: ${(delta * 100).toFixed(1)}%)`);
      await writeFile(RESOLVE_PATH, currentSource, 'utf8');
    }

    // Stop if perfect
    if (currentScore.overall >= 0.99) {
      console.log(`\nReached near-perfect score. Stopping.`);
      break;
    }
  }

  // ── Final report ──
  console.log(`\n═══ Autoresearch Results ═══`);
  console.log(`Baseline: ${fmt(baseline)}`);
  console.log(`Final:    ${fmt(currentScore)}`);
  const totalDelta = currentScore.overall - baseline.overall;
  console.log(`Net improvement: ${totalDelta > 0 ? '+' : ''}${(totalDelta * 100).toFixed(1)}%`);

  console.log(`\n── Fix History ──`);
  for (const h of history) {
    const delta = h.after.overall - h.before.overall;
    const icon = h.kept ? '✅' : '❌';
    console.log(`  ${icon} [iter ${h.iter}] ${h.fix}: ${delta > 0 ? '+' : ''}${(delta * 100).toFixed(1)}% → ${h.kept ? 'KEPT' : 'REVERTED'}`);
    console.log(`     ${h.description}`);
  }

  const keptFixes = history.filter((h) => h.kept);
  console.log(`\nApplied fixes (${keptFixes.length}/${history.length}):`);
  for (const h of keptFixes) console.log(`  - ${h.fix}`);

  console.log(`\nFinal resolve.ts state: ${RESOLVE_PATH}`);
  console.log(`Run 'npm test' to verify all existing tests still pass.`);
}

await main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
