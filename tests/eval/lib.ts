/**
 * Shared eval library for gc-tree.
 *
 * Provides:
 *   - LabeledCase: a query with an expected doc id (or null for hard negatives) + category + lang.
 *   - Ranking metrics: hit, recall@k, reciprocal rank.
 *   - Aggregators: per-category, per-language, overall.
 *   - Variance: run a metric N times and report mean ± stdev.
 *
 * Used by index.ts (main eval) and autoresearch.ts (gated improvement loop).
 *
 * No new runtime deps; stdlib only.
 */

import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { onboardBranch } from '../../src/onboard.js';
import { resolveContext } from '../../src/resolve.js';
import { checkoutBranch, initHome } from '../../src/store.js';
import { branchDocsDir } from '../../src/paths.js';
import type { GcTreeOnboardingInput } from '../../src/types.js';

export type Category =
  | 'exact-keyword'
  | 'paraphrase'
  | 'multi-hop'
  | 'glossary'
  | 'mixed-lang'
  | 'same-domain-distractor'
  | 'cross-branch-negative'
  | 'same-domain-negative';

export type Lang = 'en' | 'ko' | 'mixed';

export interface LabeledCase {
  branch: string;
  query: string;
  /** docId expected at top of results, or null when no doc should match. */
  expectedId: string | null;
  category: Category;
  lang: Lang;
}

export interface BranchFixture {
  branch: string;
  branchSummary: string;
  docs: GcTreeOnboardingInput['docs'];
}

export interface FixtureSet {
  name: string;
  branches: BranchFixture[];
  cases: LabeledCase[];
}

// ─────────────────────────────────────────────
// Ranking metrics for a single case
// ─────────────────────────────────────────────

export interface CaseResult {
  case: LabeledCase;
  matchCount: number;
  topIds: string[];
  /** 1 if expected doc is in topK (or, for negatives, matchCount===0); else 0. */
  hit: boolean;
  /** rank of expected doc in matches, or null. Only for positive cases. */
  rank: number | null;
  /** 1/rank if found, 0 otherwise. Negatives: 1 if no matches, else 0. */
  reciprocalRank: number;
}

export function evaluateCase(c: LabeledCase, matchIds: string[]): CaseResult {
  if (c.expectedId === null) {
    const hit = matchIds.length === 0;
    return {
      case: c,
      matchCount: matchIds.length,
      topIds: matchIds.slice(0, 5),
      hit,
      rank: null,
      reciprocalRank: hit ? 1 : 0,
    };
  }
  const idx = matchIds.indexOf(c.expectedId);
  const rank = idx >= 0 ? idx + 1 : null;
  return {
    case: c,
    matchCount: matchIds.length,
    topIds: matchIds.slice(0, 5),
    hit: rank !== null,
    rank,
    reciprocalRank: rank !== null ? 1 / rank : 0,
  };
}

// ─────────────────────────────────────────────
// Aggregators
// ─────────────────────────────────────────────

export interface MetricSummary {
  n: number;
  recallAt1: number;
  recallAt3: number;
  recallAt5: number;
  mrr: number;
  /** For negatives only: fraction with matchCount===0. NaN if no negatives. */
  negativePrecision: number;
}

export function summarize(results: CaseResult[]): MetricSummary {
  const positives = results.filter((r) => r.case.expectedId !== null);
  const negatives = results.filter((r) => r.case.expectedId === null);
  const r1 = positives.length === 0 ? 0 : positives.filter((r) => r.rank !== null && r.rank <= 1).length / positives.length;
  const r3 = positives.length === 0 ? 0 : positives.filter((r) => r.rank !== null && r.rank <= 3).length / positives.length;
  const r5 = positives.length === 0 ? 0 : positives.filter((r) => r.rank !== null && r.rank <= 5).length / positives.length;
  const mrr = positives.length === 0 ? 0 : positives.reduce((s, r) => s + r.reciprocalRank, 0) / positives.length;
  const negPrec = negatives.length === 0 ? Number.NaN : negatives.filter((r) => r.hit).length / negatives.length;
  return { n: results.length, recallAt1: r1, recallAt3: r3, recallAt5: r5, mrr, negativePrecision: negPrec };
}

export function groupBy<T, K extends string>(arr: T[], key: (t: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of arr) {
    const k = key(item);
    const list = map.get(k) || [];
    list.push(item);
    map.set(k, list);
  }
  return map;
}

export function perCategory(results: CaseResult[]): Map<Category, MetricSummary> {
  const out = new Map<Category, MetricSummary>();
  for (const [cat, items] of groupBy(results, (r) => r.case.category)) {
    out.set(cat, summarize(items));
  }
  return out;
}

export function perLang(results: CaseResult[]): Map<Lang, MetricSummary> {
  const out = new Map<Lang, MetricSummary>();
  for (const [lang, items] of groupBy(results, (r) => r.case.lang)) {
    out.set(lang, summarize(items));
  }
  return out;
}

// ─────────────────────────────────────────────
// Composite "overall" score used as single-number objective for autoresearch.
// Balances recall@1, MRR, negative precision. Range [0,1].
// ─────────────────────────────────────────────
export function overallScore(s: MetricSummary): number {
  // Weighted blend. Negative precision counts only if there are negatives.
  if (Number.isNaN(s.negativePrecision)) {
    return 0.5 * s.recallAt1 + 0.5 * s.mrr;
  }
  return 0.4 * s.recallAt1 + 0.4 * s.mrr + 0.2 * s.negativePrecision;
}

// ─────────────────────────────────────────────
// Fixture setup + run
// ─────────────────────────────────────────────

export async function setupFixture(fixture: FixtureSet): Promise<string> {
  const home = await mkdtemp(join(tmpdir(), `gctree-eval-${fixture.name}-`));
  await initHome(home);
  for (const b of fixture.branches) {
    await checkoutBranch(home, b.branch, true);
    await onboardBranch({
      home,
      branch: b.branch,
      input: { branchSummary: b.branchSummary, docs: b.docs },
    });
  }
  return home;
}

type ResolveFn = typeof resolveContext;

export async function runCases(home: string, cases: LabeledCase[], resolveFn: ResolveFn = resolveContext): Promise<CaseResult[]> {
  const out: CaseResult[] = [];
  for (const c of cases) {
    const res = await resolveFn({ home, branch: c.branch, query: c.query });
    const ids = res.matches.map((m) => m.id);
    out.push(evaluateCase(c, ids));
  }
  return out;
}

// ─────────────────────────────────────────────
// Variance: run setup+cases N times, return per-run summaries.
// Useful to detect non-determinism or order sensitivity (resolve uses fs readdir).
// ─────────────────────────────────────────────
export async function runWithVariance(
  fixture: FixtureSet,
  runs: number,
  resolveFn: ResolveFn = resolveContext,
): Promise<{ summaries: MetricSummary[]; results: CaseResult[][] }> {
  const summaries: MetricSummary[] = [];
  const results: CaseResult[][] = [];
  for (let i = 0; i < runs; i++) {
    const home = await setupFixture(fixture);
    try {
      const res = await runCases(home, fixture.cases, resolveFn);
      results.push(res);
      summaries.push(summarize(res));
    } finally {
      await rm(home, { recursive: true, force: true });
    }
  }
  return { summaries, results };
}

export function meanStd(values: number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

// ─────────────────────────────────────────────
// Token efficiency: ratio of returned chars to total docs.
// (Simple, dep-free char count; not BPE, but consistent across runs.)
// ─────────────────────────────────────────────
export interface TokenStats {
  branch: string;
  query: string;
  totalDocChars: number;
  returnedChars: number;
  /** 1 - returned/total. Higher = less injected. */
  efficiency: number;
  matchCount: number;
}

export async function measureTokens(
  home: string,
  cases: LabeledCase[],
  resolveFn: ResolveFn = resolveContext,
): Promise<TokenStats[]> {
  // Cache total doc chars per branch.
  const totals = new Map<string, number>();
  for (const branch of new Set(cases.map((c) => c.branch))) {
    let total = 0;
    const dir = branchDocsDir(home, branch);
    const walk = async (d: string): Promise<void> => {
      for (const ent of await readdir(d, { withFileTypes: true })) {
        const p = join(d, ent.name);
        if (ent.isDirectory()) await walk(p);
        else if (ent.name.endsWith('.md')) total += (await readFile(p, 'utf8')).length;
      }
    };
    await walk(dir);
    totals.set(branch, total);
  }

  const out: TokenStats[] = [];
  for (const c of cases) {
    const res = await resolveFn({ home, branch: c.branch, query: c.query });
    const returnedChars = res.matches.reduce((s, m) => s + m.title.length + m.summary.length + m.excerpt.length, 0);
    const total = totals.get(c.branch) || 0;
    out.push({
      branch: c.branch,
      query: c.query,
      totalDocChars: total,
      returnedChars,
      efficiency: total > 0 ? 1 - returnedChars / total : 1,
      matchCount: res.matches.length,
    });
  }
  return out;
}

// ─────────────────────────────────────────────
// Pretty-printers
// ─────────────────────────────────────────────
export function fmtSummary(s: MetricSummary): string {
  const np = Number.isNaN(s.negativePrecision) ? 'n/a' : `${(s.negativePrecision * 100).toFixed(1)}%`;
  return `R@1=${(s.recallAt1 * 100).toFixed(1)}% R@3=${(s.recallAt3 * 100).toFixed(1)}% R@5=${(s.recallAt5 * 100).toFixed(1)}% MRR=${(s.mrr * 100).toFixed(1)}% negP=${np} (n=${s.n})`;
}

export function fmtPerCategory(map: Map<string, MetricSummary>): string[] {
  const lines: string[] = [];
  for (const [k, v] of map) lines.push(`  [${k}] ${fmtSummary(v)}`);
  return lines;
}
