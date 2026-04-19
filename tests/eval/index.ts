/**
 * gc-tree evaluation harness
 *
 * Evaluates 5 dimensions:
 *   1. Onboarding documentation quality
 *   2. Token efficiency (resolve output size vs total doc size)
 *   3. Irrelevant-query noise (unrelated queries should return 0 matches)
 *   4. Global context update correctness
 *   5. Branch isolation (switching gc-branch changes resolved context)
 *
 * Run:
 *   node --import tsx tests/eval/index.ts
 *   node --import tsx tests/eval/index.ts --verbose
 */

import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { onboardBranch } from '../../src/onboard.js';
import { resolveContext } from '../../src/resolve.js';
import { checkoutBranch, initHome, statusForBranch } from '../../src/store.js';
import { updateBranchContext } from '../../src/update.js';
import { branchDocsDir, branchIndexPath } from '../../src/paths.js';

const VERBOSE = process.argv.includes('--verbose');

// ─────────────────────────────────────────────
// Fixtures: two realistic synthetic projects
// ─────────────────────────────────────────────

const ALPHA_ONBOARDING = {
  branch: 'alpha',
  branchSummary: 'E-commerce frontend team: React/TypeScript SPA with cart, auth, and checkout.',
  docs: [
    {
      title: 'Project Identity',
      slug: 'project-identity',
      summary: 'Alpha is a React/TypeScript SPA for an e-commerce storefront. Key concerns: cart state, auth tokens, and Stripe checkout.',
      body: [
        'Alpha is the customer-facing storefront SPA.',
        'Stack: React 18, TypeScript, Zustand for cart state, React Query for data fetching.',
        'Auth uses short-lived JWTs refreshed via /api/auth/refresh. Tokens are stored in memory only.',
        'Stripe Elements handles payment UI. Never log card data or expose Stripe secret key on the client.',
        'The design system lives in packages/ui. Do not inline Tailwind classes in business logic components.',
      ].join('\n'),
      tags: ['frontend', 'react', 'auth', 'stripe'],
    },
    {
      title: 'Cart System',
      slug: 'cart-system',
      summary: 'Cart state is managed by Zustand. Items persist to localStorage on every change. The cart slice is in src/store/cart.ts.',
      body: [
        'Cart actions: addItem, removeItem, updateQuantity, clearCart.',
        'Cart persists to localStorage via the zustand persist middleware.',
        'Do NOT call the backend on every cart change; sync only at checkout.',
        'Max cart size: 50 items. Enforce this limit in the Zustand action, not in the API.',
        'Cart totals are calculated client-side; the server re-validates on checkout to prevent tampering.',
      ].join('\n'),
      tags: ['cart', 'zustand', 'localStorage'],
    },
    {
      title: 'Auth Flow',
      slug: 'auth-flow',
      summary: 'JWT auth with silent refresh via /api/auth/refresh. Tokens live in memory, refresh tokens in httpOnly cookies.',
      body: [
        'Access token lifetime: 15 minutes. Refresh token lifetime: 7 days.',
        'Silent refresh runs 60 seconds before expiry via a setInterval in AuthProvider.',
        'On 401, the auth interceptor in src/lib/axios.ts retries once after a refresh.',
        'Logout clears the in-memory token and calls /api/auth/logout to invalidate the refresh token cookie.',
        'Never store access tokens in localStorage or sessionStorage.',
      ].join('\n'),
      tags: ['auth', 'jwt', 'security'],
    },
    {
      title: 'Glossary',
      slug: 'glossary',
      summary: 'Key terms: SKU (product variant ID), PDP (product detail page), SFN (storefront navigation).',
      body: [
        'SKU: unique identifier for a product variant (size + colour combination).',
        'PDP: Product Detail Page, the per-product route at /products/:slug.',
        'SFN: Storefront Navigation — the top nav + mega-menu component.',
        'Hydration: the process of making a Next.js page interactive on the client.',
        'Ghost button: a secondary CTA with a transparent background and a border.',
      ].join('\n'),
      tags: ['glossary', 'terminology'],
    },
  ],
};

const BETA_ONBOARDING = {
  branch: 'beta',
  branchSummary: 'ML platform team: Python data pipelines, model training, and batch inference.',
  docs: [
    {
      title: 'Project Identity',
      slug: 'project-identity',
      summary: 'Beta is the ML platform powering recommendations and demand forecasting. Stack: Python, Ray, MLflow, Spark.',
      body: [
        'Beta owns model training, batch inference, and feature engineering pipelines.',
        'Stack: Python 3.11, Ray for distributed training, MLflow for experiment tracking, PySpark for feature transforms.',
        'All experiments must be tracked in MLflow under the project namespace matching the ticket ID.',
        'Models are served via Ray Serve; latency SLA is p99 < 120 ms for online endpoints.',
        'Batch inference runs nightly via Airflow DAGs in the ml-batch-dag repo.',
      ].join('\n'),
      tags: ['ml', 'python', 'ray', 'mlflow'],
    },
    {
      title: 'Dataset Conventions',
      slug: 'dataset-conventions',
      summary: 'Raw datasets live in s3://ml-data-raw/. Processed features are written to s3://ml-data-features/ by Spark jobs.',
      body: [
        'Never modify data in the raw bucket. Write derived data to ml-data-features.',
        'Partitioning convention: year=YYYY/month=MM/day=DD for time-series datasets.',
        'Schema changes require a migration ticket and a backfill PR before merging.',
        'Personally identifiable information (PII) must be masked before feature extraction.',
        'Dataset lineage is tracked in DataHub; always update the lineage graph when adding a new source.',
      ].join('\n'),
      tags: ['datasets', 's3', 'spark', 'pii'],
    },
    {
      title: 'Model Training Workflow',
      slug: 'model-training',
      summary: 'Training runs are launched via scripts/train.py. Ray head node is at ray://ml-ray-head:10001.',
      body: [
        'Training entry point: scripts/train.py --config configs/<experiment>.yaml.',
        'All hyperparameters must live in the YAML config, not hardcoded in model code.',
        'Use Ray Tune for hyperparameter search; results are logged to MLflow automatically.',
        'GPU quota per team: 8 A100 GPUs. Do not exceed this without approval.',
        'Checkpoint every 10 epochs to s3://ml-checkpoints/. Resume with --resume-from <checkpoint>.',
      ].join('\n'),
      tags: ['training', 'ray', 'gpu'],
    },
    {
      title: 'Glossary',
      slug: 'glossary',
      summary: 'Key terms: feature store, champion model, shadow deployment, data drift.',
      body: [
        'Feature store: centralised store for precomputed features shared across models.',
        'Champion model: the currently deployed production model version.',
        'Shadow deployment: running a new model in parallel without serving its predictions to users.',
        'Data drift: statistical shift between training data distribution and production data.',
        'Cold start: the problem of making recommendations for new users with no history.',
      ].join('\n'),
      tags: ['glossary', 'ml-terminology'],
    },
  ],
};

// ─────────────────────────────────────────────
// Scoring helpers
// ─────────────────────────────────────────────

interface EvalResult {
  name: string;
  passed: boolean;
  score: number; // 0.0 – 1.0
  details: string[];
  warnings: string[];
}

function pass(name: string, details: string[] = []): EvalResult {
  return { name, passed: true, score: 1.0, details, warnings: [] };
}

function fail(name: string, details: string[], score = 0.0): EvalResult {
  return { name, passed: false, score, details, warnings: [] };
}

function partial(name: string, score: number, details: string[], warnings: string[] = []): EvalResult {
  return { name, passed: score >= 0.7, score, details, warnings };
}

// ─────────────────────────────────────────────
// Scenario 1: Onboarding Documentation Quality
// ─────────────────────────────────────────────

async function evalOnboardingQuality(home: string): Promise<EvalResult> {
  const issues: string[] = [];
  const details: string[] = [];
  let checks = 0;
  let passed = 0;

  for (const { branch, input } of [
    { branch: 'alpha', input: ALPHA_ONBOARDING },
    { branch: 'beta', input: BETA_ONBOARDING },
  ]) {
    await checkoutBranch(home, branch, true);
    await onboardBranch({ home, branch, input });

    const status = await statusForBranch(home, branch);
    details.push(`[${branch}] doc_count=${status.doc_count}, index_chars=${status.index_chars}`);

    // Check 1: index size under warning threshold
    checks++;
    if (status.index_chars <= 2000) {
      passed++;
      details.push(`  ✓ index.md is compact (${status.index_chars} chars)`);
    } else {
      issues.push(`[${branch}] index.md too large: ${status.index_chars} chars (limit 2000)`);
      details.push(`  ✗ index.md is too large: ${status.index_chars} chars`);
    }

    // Check 2: no warnings from statusForBranch
    checks++;
    if (status.warnings.length === 0) {
      passed++;
      details.push(`  ✓ no status warnings`);
    } else {
      issues.push(`[${branch}] warnings: ${status.warnings.join('; ')}`);
      details.push(`  ✗ warnings: ${status.warnings.join('; ')}`);
    }

    // Check 3: every doc has ## Summary
    const docsDir = branchDocsDir(home, branch);
    const files = (await readdir(docsDir)).filter((f) => f.endsWith('.md'));
    checks++;
    let allHaveSummary = true;
    for (const file of files) {
      const raw = await readFile(join(docsDir, file), 'utf8');
      if (!/^## Summary$/m.test(raw)) {
        allHaveSummary = false;
        issues.push(`[${branch}] ${file} is missing ## Summary`);
      }
    }
    if (allHaveSummary) {
      passed++;
      details.push(`  ✓ all ${files.length} docs have ## Summary`);
    } else {
      details.push(`  ✗ some docs are missing ## Summary`);
    }

    // Check 4: doc count matches input
    checks++;
    if (status.doc_count === input.docs.length) {
      passed++;
      details.push(`  ✓ doc_count matches input (${status.doc_count})`);
    } else {
      issues.push(`[${branch}] doc_count=${status.doc_count}, expected ${input.docs.length}`);
      details.push(`  ✗ doc_count mismatch: got ${status.doc_count}, expected ${input.docs.length}`);
    }
  }

  const score = passed / checks;
  if (issues.length === 0) return pass('onboarding-quality', details);
  return partial('onboarding-quality', score, details, issues);
}

// ─────────────────────────────────────────────
// Scenario 2: Resolve Relevance
// ─────────────────────────────────────────────

interface ResolveCase {
  branch: string;
  query: string;
  expectMatch: boolean;
  description: string;
}

const RESOLVE_CASES: ResolveCase[] = [
  // Alpha (e-commerce) – should match
  { branch: 'alpha', query: 'React cart state', expectMatch: true, description: 'alpha: relevant frontend query' },
  { branch: 'alpha', query: 'JWT token refresh', expectMatch: true, description: 'alpha: relevant auth query' },
  { branch: 'alpha', query: 'Stripe checkout', expectMatch: true, description: 'alpha: relevant payment query' },
  { branch: 'alpha', query: 'SKU product variant', expectMatch: true, description: 'alpha: glossary term' },
  // Alpha – should NOT match
  { branch: 'alpha', query: 'Ray distributed training', expectMatch: false, description: 'alpha: irrelevant ML query' },
  { branch: 'alpha', query: 'MLflow experiment tracking', expectMatch: false, description: 'alpha: irrelevant MLflow query' },
  { branch: 'alpha', query: 'data drift feature store', expectMatch: false, description: 'alpha: irrelevant ML term' },
  // Beta (ML) – should match
  { branch: 'beta', query: 'Ray training GPU', expectMatch: true, description: 'beta: relevant ML query' },
  { branch: 'beta', query: 'MLflow experiment', expectMatch: true, description: 'beta: relevant experiment query' },
  { branch: 'beta', query: 'dataset PII masking', expectMatch: true, description: 'beta: relevant dataset query' },
  { branch: 'beta', query: 'champion model shadow deployment', expectMatch: true, description: 'beta: glossary term' },
  // Beta – should NOT match
  { branch: 'beta', query: 'React Zustand cart', expectMatch: false, description: 'beta: irrelevant frontend query' },
  { branch: 'beta', query: 'Stripe payment checkout', expectMatch: false, description: 'beta: irrelevant payment query' },
  { branch: 'beta', query: 'product detail page PDP', expectMatch: false, description: 'beta: irrelevant storefront term' },
];

async function evalResolveRelevance(home: string): Promise<EvalResult> {
  const details: string[] = [];
  const warnings: string[] = [];
  let correct = 0;

  // Track per-category stats
  let relevantTotal = 0, relevantMatched = 0;
  let irrelevantTotal = 0, irrelevantEmpty = 0;

  for (const c of RESOLVE_CASES) {
    const result = await resolveContext({ home, branch: c.branch, query: c.query });
    const hasMatch = result.matches.length > 0;
    const ok = hasMatch === c.expectMatch;
    if (ok) correct++;

    if (c.expectMatch) {
      relevantTotal++;
      if (hasMatch) relevantMatched++;
    } else {
      irrelevantTotal++;
      if (!hasMatch) irrelevantEmpty++;
    }

    const icon = ok ? '✓' : '✗';
    const matchStr = hasMatch ? `${result.matches.length} match(es) [top: "${result.matches[0]?.title}" score=${result.matches[0]?.score}]` : 'no matches';
    const expectStr = c.expectMatch ? 'expect match' : 'expect empty';
    details.push(`  ${icon} ${c.description}: ${matchStr} (${expectStr})`);

    if (!ok) {
      warnings.push(`FAIL: ${c.description} — got ${matchStr}, ${expectStr}`);
    }
  }

  const score = correct / RESOLVE_CASES.length;
  details.unshift(
    `Relevant recall: ${relevantMatched}/${relevantTotal}`,
    `Irrelevant precision: ${irrelevantEmpty}/${irrelevantTotal} returned empty`,
    `Overall: ${correct}/${RESOLVE_CASES.length} correct`,
  );

  return partial('resolve-relevance', score, details, warnings);
}

// ─────────────────────────────────────────────
// Scenario 3: Token Efficiency
// ─────────────────────────────────────────────

interface TokenStats {
  query: string;
  branch: string;
  totalDocChars: number;
  returnedChars: number;
  matchCount: number;
  efficiency: number; // 1 - returned/total (higher = less wasted)
}

async function measureTokenEfficiency(home: string, branch: string, queries: string[]): Promise<TokenStats[]> {
  const docsDir = branchDocsDir(home, branch);
  const files = (await readdir(docsDir)).filter((f) => f.endsWith('.md'));
  let totalDocChars = 0;
  for (const file of files) {
    const raw = await readFile(join(docsDir, file), 'utf8');
    totalDocChars += raw.length;
  }

  const stats: TokenStats[] = [];
  for (const query of queries) {
    const result = await resolveContext({ home, branch, query });
    const returnedChars = result.matches.reduce((sum, m) => sum + m.summary.length + m.excerpt.length + m.title.length, 0);
    stats.push({
      query,
      branch,
      totalDocChars,
      returnedChars,
      matchCount: result.matches.length,
      efficiency: totalDocChars > 0 ? 1 - returnedChars / totalDocChars : 1,
    });
  }
  return stats;
}

async function evalTokenEfficiency(home: string): Promise<EvalResult> {
  const details: string[] = [];
  const warnings: string[] = [];

  const alphaRelevant = ['cart checkout', 'JWT auth token', 'Stripe payment'];
  const alphaIrrelevant = ['neural network training', 'S3 bucket Spark'];
  const betaRelevant = ['MLflow experiment GPU', 'dataset feature store'];
  const betaIrrelevant = ['React component Zustand', 'shopping cart'];

  const allStats: TokenStats[] = [
    ...(await measureTokenEfficiency(home, 'alpha', [...alphaRelevant, ...alphaIrrelevant])),
    ...(await measureTokenEfficiency(home, 'beta', [...betaRelevant, ...betaIrrelevant])),
  ];

  let relevantMeanEff = 0;
  let irrelevantMeanEff = 0;
  let relevantCount = 0;
  let irrelevantCount = 0;

  const alphaIrrelevantSet = new Set(alphaIrrelevant);
  const betaIrrelevantSet = new Set(betaIrrelevant);

  for (const s of allStats) {
    const isIrrelevant =
      (s.branch === 'alpha' && alphaIrrelevantSet.has(s.query)) ||
      (s.branch === 'beta' && betaIrrelevantSet.has(s.query));

    const effPct = (s.efficiency * 100).toFixed(1);
    const retPct = (100 - s.efficiency * 100).toFixed(1);
    details.push(
      `  [${s.branch}] "${s.query}": ${s.matchCount} match(es), returned ${s.returnedChars}/${s.totalDocChars} chars (${retPct}% of total)`,
    );

    if (isIrrelevant) {
      irrelevantMeanEff += s.efficiency;
      irrelevantCount++;
      if (s.matchCount > 0) {
        warnings.push(`Noise: irrelevant query "${s.query}" on [${s.branch}] returned ${s.matchCount} match(es)`);
      }
    } else {
      relevantMeanEff += s.efficiency;
      relevantCount++;
    }
  }

  if (relevantCount > 0) relevantMeanEff /= relevantCount;
  if (irrelevantCount > 0) irrelevantMeanEff /= irrelevantCount;

  details.unshift(
    `Relevant queries — mean fraction of total docs returned: ${((1 - relevantMeanEff) * 100).toFixed(1)}%`,
    `Irrelevant queries — mean fraction of total docs returned: ${((1 - irrelevantMeanEff) * 100).toFixed(1)}%`,
  );

  // Score: irrelevant queries should return nothing (efficiency = 1.0), relevant should return some content
  const noiseScore = irrelevantMeanEff; // 1.0 = perfect silence on irrelevant queries
  const signalScore = relevantCount > 0 ? Math.min(1, (1 - relevantMeanEff) * 5) : 0; // reward returning at least 20% of docs for relevant queries
  const score = (noiseScore + signalScore) / 2;

  return partial('token-efficiency', score, details, warnings);
}

// ─────────────────────────────────────────────
// Scenario 4: Global Context Update
// ─────────────────────────────────────────────

async function evalGlobalContextUpdate(home: string): Promise<EvalResult> {
  const details: string[] = [];
  const warnings: string[] = [];
  let checks = 0;
  let passed = 0;

  // Patch the alpha cart doc
  const updateInput = {
    branch: 'alpha',
    docs: [
      {
        title: 'Cart System',
        slug: 'cart-system',
        summary: 'Cart state managed by Zustand. NEW: cart now syncs to the backend every 30 seconds via debounce.',
        body: [
          'Cart actions: addItem, removeItem, updateQuantity, clearCart.',
          'Cart persists to localStorage via the zustand persist middleware.',
          'NEW: Cart syncs to /api/cart every 30 seconds via a debounced effect. This replaces the old checkout-only sync.',
          'Max cart size: 50 items.',
          'Cart totals are still validated server-side on checkout.',
        ].join('\n'),
        tags: ['cart', 'zustand', 'sync'],
      },
    ],
  };

  await updateBranchContext({ home, branch: 'alpha', input: updateInput });

  // Check 1: updated doc reflects the new content
  checks++;
  const result1 = await resolveContext({ home, branch: 'alpha', query: 'cart sync backend debounce' });
  const mentionsDebounce = result1.matches.some((m) => m.summary.toLowerCase().includes('debounce') || m.excerpt.toLowerCase().includes('debounce'));
  if (mentionsDebounce) {
    passed++;
    details.push(`  ✓ updated cart doc is findable via "cart sync backend debounce"`);
  } else {
    warnings.push(`cart update not reflected: query "cart sync backend debounce" returned no matches with debounce`);
    details.push(`  ✗ update not reflected in resolve results`);
  }

  // Check 2: untouched doc (auth-flow) is unchanged
  checks++;
  const result2 = await resolveContext({ home, branch: 'alpha', query: 'JWT token silent refresh' });
  const authStillPresent = result2.matches.some((m) => m.title.toLowerCase().includes('auth'));
  if (authStillPresent) {
    passed++;
    details.push(`  ✓ untouched auth doc still present after cart update`);
  } else {
    warnings.push(`auth doc missing after partial update`);
    details.push(`  ✗ auth doc not found after partial update`);
  }

  // Check 3: old content from same doc is replaced
  checks++;
  const result3 = await resolveContext({ home, branch: 'alpha', query: 'cart checkout only sync' });
  const hasOldContent = result3.matches.some(
    (m) => m.excerpt.toLowerCase().includes('sync only at checkout') || m.summary.toLowerCase().includes('sync only at checkout'),
  );
  if (!hasOldContent) {
    passed++;
    details.push(`  ✓ old "checkout-only sync" content no longer in summary/excerpt`);
  } else {
    warnings.push(`stale content "checkout only sync" still visible in resolve excerpts`);
    details.push(`  ✗ stale old content still visible`);
  }

  // Check 4: status still healthy after update
  checks++;
  const status = await statusForBranch(home, 'alpha');
  if (status.warnings.length === 0) {
    passed++;
    details.push(`  ✓ no status warnings after update`);
  } else {
    warnings.push(`status warnings after update: ${status.warnings.join('; ')}`);
    details.push(`  ✗ warnings: ${status.warnings.join('; ')}`);
  }

  const score = passed / checks;
  return partial('global-context-update', score, details, warnings);
}

// ─────────────────────────────────────────────
// Scenario 5: Branch Isolation
// ─────────────────────────────────────────────

async function evalBranchIsolation(home: string): Promise<EvalResult> {
  const details: string[] = [];
  const warnings: string[] = [];
  let checks = 0;
  let passed = 0;

  const crossTests: Array<{ query: string; shouldMatchBranch: string; shouldNotMatchBranch: string }> = [
    { query: 'React Zustand shopping cart', shouldMatchBranch: 'alpha', shouldNotMatchBranch: 'beta' },
    { query: 'JWT token access refresh', shouldMatchBranch: 'alpha', shouldNotMatchBranch: 'beta' },
    { query: 'Ray training MLflow experiment', shouldMatchBranch: 'beta', shouldNotMatchBranch: 'alpha' },
    { query: 'S3 bucket dataset feature store', shouldMatchBranch: 'beta', shouldNotMatchBranch: 'alpha' },
    { query: 'cold start recommendation', shouldMatchBranch: 'beta', shouldNotMatchBranch: 'alpha' },
    { query: 'SKU product detail page', shouldMatchBranch: 'alpha', shouldNotMatchBranch: 'beta' },
  ];

  for (const t of crossTests) {
    const shouldResult = await resolveContext({ home, branch: t.shouldMatchBranch, query: t.query });
    const shouldNotResult = await resolveContext({ home, branch: t.shouldNotMatchBranch, query: t.query });

    checks++;
    const matchesCorrect = shouldResult.matches.length > 0;
    const noiseAbsent = shouldNotResult.matches.length === 0;
    const bothOk = matchesCorrect && noiseAbsent;
    if (bothOk) passed++;

    const icon = bothOk ? '✓' : '✗';
    details.push(
      `  ${icon} "${t.query}": [${t.shouldMatchBranch}] ${shouldResult.matches.length} match(es), [${t.shouldNotMatchBranch}] ${shouldNotResult.matches.length} match(es)`,
    );

    if (!matchesCorrect) warnings.push(`[${t.shouldMatchBranch}] "${t.query}" should match but returned 0 results`);
    if (!noiseAbsent) warnings.push(`[${t.shouldNotMatchBranch}] "${t.query}" should NOT match but returned ${shouldNotResult.matches.length} result(s)`);
  }

  const score = passed / checks;
  details.unshift(`Branch isolation: ${passed}/${checks} cross-branch tests passed`);
  return partial('branch-isolation', score, details, warnings);
}

// ─────────────────────────────────────────────
// Main runner
// ─────────────────────────────────────────────

function printResult(r: EvalResult): void {
  const badge = r.passed ? '✅ PASS' : '❌ FAIL';
  const pct = (r.score * 100).toFixed(0);
  console.log(`\n${badge}  ${r.name}  (score: ${pct}%)`);
  if (VERBOSE || !r.passed) {
    for (const d of r.details) console.log(`   ${d}`);
  }
  if (r.warnings.length > 0) {
    console.log('   ⚠️  Warnings:');
    for (const w of r.warnings) console.log(`      - ${w}`);
  }
}

async function main(): Promise<void> {
  const home = await mkdtemp(join(tmpdir(), 'gctree-eval-'));
  console.log(`\n═══ gc-tree Evaluation Suite ═══`);
  console.log(`Home: ${home}`);
  console.log(`Date: ${new Date().toISOString()}`);

  try {
    await initHome(home);

    const results: EvalResult[] = [];

    console.log('\n--- Running scenarios ---');

    process.stdout.write('1. Onboarding Quality ... ');
    const r1 = await evalOnboardingQuality(home);
    results.push(r1);
    console.log(r1.passed ? 'PASS' : 'FAIL');

    process.stdout.write('2. Resolve Relevance ... ');
    const r2 = await evalResolveRelevance(home);
    results.push(r2);
    console.log(r2.passed ? 'PASS' : 'FAIL');

    process.stdout.write('3. Token Efficiency ... ');
    const r3 = await evalTokenEfficiency(home);
    results.push(r3);
    console.log(r3.passed ? 'PASS' : 'FAIL');

    process.stdout.write('4. Global Context Update ... ');
    const r4 = await evalGlobalContextUpdate(home);
    results.push(r4);
    console.log(r4.passed ? 'PASS' : 'FAIL');

    process.stdout.write('5. Branch Isolation ... ');
    const r5 = await evalBranchIsolation(home);
    results.push(r5);
    console.log(r5.passed ? 'PASS' : 'FAIL');

    // ── Summary ──
    console.log('\n═══ Results ═══');
    for (const r of results) printResult(r);

    const passCount = results.filter((r) => r.passed).length;
    const meanScore = results.reduce((s, r) => s + r.score, 0) / results.length;
    console.log(`\n── Overall ──`);
    console.log(`Passed: ${passCount}/${results.length}`);
    console.log(`Mean score: ${(meanScore * 100).toFixed(1)}%`);

    // Token efficiency summary
    console.log('\n── Token Efficiency Details ──');
    const alphaDocCount = (await readdir(branchDocsDir(home, 'alpha'))).filter((f) => f.endsWith('.md')).length;
    const betaDocCount = (await readdir(branchDocsDir(home, 'beta'))).filter((f) => f.endsWith('.md')).length;
    let totalAlphaChars = 0;
    let totalBetaChars = 0;
    for (const f of await readdir(branchDocsDir(home, 'alpha'))) {
      if (f.endsWith('.md')) totalAlphaChars += (await readFile(join(branchDocsDir(home, 'alpha'), f), 'utf8')).length;
    }
    for (const f of await readdir(branchDocsDir(home, 'beta'))) {
      if (f.endsWith('.md')) totalBetaChars += (await readFile(join(branchDocsDir(home, 'beta'), f), 'utf8')).length;
    }
    console.log(`[alpha] ${alphaDocCount} docs, ${totalAlphaChars} total chars`);
    console.log(`[beta]  ${betaDocCount} docs, ${totalBetaChars} total chars`);
    console.log(`(resolve returns: title + summary + excerpt per match — not full docs)`);

    if (passCount < results.length) process.exitCode = 1;
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

await main().catch((err) => {
  console.error(err);
  process.exit(1);
});
