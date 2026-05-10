/**
 * Ranked-relevance evaluation for gc-tree.
 *
 * Adds what the original scenario-based eval did not measure:
 *   - recall@1, recall@3, recall@5, MRR per case (positive cases have an expectedId).
 *   - Per-category and per-language breakdowns.
 *   - Hard negatives (cross-branch + same-domain): scored as "matchCount===0".
 *   - Variance across N runs (mean ± stdev).
 *   - Token efficiency: returned chars / total doc chars.
 *   - DEV (visible to autoresearch) vs HOLDOUT (reporting only) split.
 *
 * Run:
 *   node --import tsx tests/eval/ranked.ts
 *   node --import tsx tests/eval/ranked.ts --runs 3
 *   node --import tsx tests/eval/ranked.ts --verbose
 *   node --import tsx tests/eval/ranked.ts --json   # machine-readable
 */

import { rm } from 'node:fs/promises';

import {
  fmtPerCategory,
  fmtSummary,
  measureTokens,
  meanStd,
  overallScore,
  perCategory,
  perLang,
  runCases,
  runWithVariance,
  setupFixture,
  summarize,
  type CaseResult,
  type FixtureSet,
  type MetricSummary,
} from './lib.js';
import { DEV_FIXTURE, HOLDOUT_FIXTURE } from './fixtures.js';

const VERBOSE = process.argv.includes('--verbose');
const JSON_OUT = process.argv.includes('--json');
const RUNS = (() => {
  const idx = process.argv.indexOf('--runs');
  return idx !== -1 ? Math.max(1, parseInt(process.argv[idx + 1], 10) || 1) : 1;
})();

interface FixtureReport {
  name: string;
  summary: MetricSummary;
  overall: number;
  perCategory: Array<[string, MetricSummary]>;
  perLang: Array<[string, MetricSummary]>;
  failures: Array<{
    branch: string;
    query: string;
    category: string;
    expectedId: string | null;
    rank: number | null;
    matchCount: number;
    topIds: string[];
  }>;
  variance: {
    runs: number;
    overallMean: number;
    overallStd: number;
    recallAt1Mean: number;
    recallAt1Std: number;
  };
  tokens: {
    meanReturnedFrac: number;
    meanReturnedFracPositives: number;
    meanReturnedFracNegatives: number;
  };
}

function failuresOf(results: CaseResult[]): FixtureReport['failures'] {
  return results
    .filter((r) => !r.hit)
    .map((r) => ({
      branch: r.case.branch,
      query: r.case.query,
      category: r.case.category,
      expectedId: r.case.expectedId,
      rank: r.rank,
      matchCount: r.matchCount,
      topIds: r.topIds,
    }));
}

async function evalFixture(fixture: FixtureSet, runs: number): Promise<FixtureReport> {
  const home = await setupFixture(fixture);
  let single: CaseResult[];
  try {
    single = await runCases(home, fixture.cases);
  } finally {
    await rm(home, { recursive: true, force: true });
  }

  const summary = summarize(single);
  const cats = [...perCategory(single).entries()];
  const langs = [...perLang(single).entries()];

  // Variance across runs (re-creates the home each run; same cases).
  let variance: FixtureReport['variance'] = {
    runs,
    overallMean: overallScore(summary),
    overallStd: 0,
    recallAt1Mean: summary.recallAt1,
    recallAt1Std: 0,
  };
  if (runs > 1) {
    const { summaries } = await runWithVariance(fixture, runs);
    const overalls = summaries.map(overallScore);
    const r1s = summaries.map((s) => s.recallAt1);
    const o = meanStd(overalls);
    const r = meanStd(r1s);
    variance = { runs, overallMean: o.mean, overallStd: o.std, recallAt1Mean: r.mean, recallAt1Std: r.std };
  }

  // Token efficiency on a fresh home (same fixture).
  const home2 = await setupFixture(fixture);
  let tokenStats;
  try {
    tokenStats = await measureTokens(home2, fixture.cases);
  } finally {
    await rm(home2, { recursive: true, force: true });
  }
  const fracs = tokenStats.map((s) => 1 - s.efficiency);
  const posFracs = tokenStats
    .map((s, i) => ({ s, c: fixture.cases[i] }))
    .filter((x) => x.c.expectedId !== null)
    .map((x) => 1 - x.s.efficiency);
  const negFracs = tokenStats
    .map((s, i) => ({ s, c: fixture.cases[i] }))
    .filter((x) => x.c.expectedId === null)
    .map((x) => 1 - x.s.efficiency);
  const mean = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

  return {
    name: fixture.name,
    summary,
    overall: overallScore(summary),
    perCategory: cats,
    perLang: langs,
    failures: failuresOf(single),
    variance,
    tokens: {
      meanReturnedFrac: mean(fracs),
      meanReturnedFracPositives: mean(posFracs),
      meanReturnedFracNegatives: mean(negFracs),
    },
  };
}

function printReport(r: FixtureReport): void {
  console.log(`\n══ ${r.name.toUpperCase()} ══`);
  console.log(`Overall composite score: ${(r.overall * 100).toFixed(1)}%`);
  console.log(`Summary: ${fmtSummary(r.summary)}`);
  console.log(`\nPer-category:`);
  for (const line of fmtPerCategory(new Map(r.perCategory))) console.log(line);
  console.log(`\nPer-language:`);
  for (const line of fmtPerCategory(new Map(r.perLang))) console.log(line);
  console.log(
    `\nVariance over ${r.variance.runs} run(s): overall=${(r.variance.overallMean * 100).toFixed(1)}% ± ${(r.variance.overallStd * 100).toFixed(2)}%, R@1=${(r.variance.recallAt1Mean * 100).toFixed(1)}% ± ${(r.variance.recallAt1Std * 100).toFixed(2)}%`,
  );
  console.log(
    `Token injection (returned / total docs): mean=${(r.tokens.meanReturnedFrac * 100).toFixed(2)}%, on positives=${(r.tokens.meanReturnedFracPositives * 100).toFixed(2)}%, on negatives=${(r.tokens.meanReturnedFracNegatives * 100).toFixed(2)}%`,
  );
  if (r.failures.length > 0 && (VERBOSE || r.failures.length <= 10)) {
    console.log(`\nFailures (${r.failures.length}):`);
    for (const f of r.failures) {
      const expect = f.expectedId === null ? 'expect: no match' : `expect: id=${f.expectedId} top1`;
      const got = f.matchCount === 0 ? 'no matches' : `rank=${f.rank ?? '∞'}, top=${f.topIds.slice(0, 3).join(',')}`;
      console.log(`  [${f.category}/${f.branch}] "${f.query}" — ${expect}, got: ${got}`);
    }
  }
}

async function main(): Promise<void> {
  const dev = await evalFixture(DEV_FIXTURE, RUNS);
  const holdout = await evalFixture(HOLDOUT_FIXTURE, RUNS);

  if (JSON_OUT) {
    console.log(JSON.stringify({ dev, holdout }, null, 2));
    return;
  }

  console.log(`═══ gc-tree Ranked Evaluation ═══`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Runs per fixture: ${RUNS}`);
  printReport(dev);
  printReport(holdout);

  console.log(`\n══ Headline ══`);
  console.log(`DEV     overall=${(dev.overall * 100).toFixed(1)}%  R@1=${(dev.summary.recallAt1 * 100).toFixed(1)}%  MRR=${(dev.summary.mrr * 100).toFixed(1)}%`);
  console.log(`HOLDOUT overall=${(holdout.overall * 100).toFixed(1)}%  R@1=${(holdout.summary.recallAt1 * 100).toFixed(1)}%  MRR=${(holdout.summary.mrr * 100).toFixed(1)}%`);
  const gap = dev.overall - holdout.overall;
  console.log(`Generalization gap (dev − holdout): ${(gap * 100).toFixed(1)} pts ${gap > 0.1 ? '⚠ possible overfit' : 'ok'}`);
}

await main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
