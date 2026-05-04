/**
 * Multi-repo gc-tree evaluation
 *
 * Uses synthetic project fixtures to verify:
 *   1. Onboarding quality per repo
 *   2. Cross-branch isolation (API query should not match web/admin branches)
 *   3. Resolve relevance within each branch
 *   4. Token efficiency across all three branches
 *
 * Run:
 *   node --import tsx tests/eval/multi-repo.ts
 *   node --import tsx tests/eval/multi-repo.ts --verbose
 */

import { readdir, mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { onboardBranch } from '../../src/onboard.js';
import { resolveContext } from '../../src/resolve.js';
import { checkoutBranch, initHome, statusForBranch } from '../../src/store.js';
import { branchDocsDir } from '../../src/paths.js';

const VERBOSE = process.argv.includes('--verbose');

const ATLAS_API_ONBOARDING = {
  branch: 'atlas-api',
  branchSummary: 'atlas-api: NestJS monorepo for a fictional SaaS platform. Public API, workers, billing, notifications.',
  docs: [
    {
      title: 'Project Identity',
      slug: 'project-identity',
      summary: 'atlas-api is the NestJS monorepo powering api.atlas.example. Packages: api, billing-worker, notification-worker, shared, search-indexer.',
      body: [
        'Stack: Node 20+, NestJS, pnpm workspaces, TypeScript.',
        'Main API at api.atlas.example serves REST + WebSocket. Swagger available at /swagger.',
        'Monorepo packages: api (core HTTP), billing-worker (invoice jobs), notification-worker (email and push), shared (types/utils), search-indexer.',
        'Dev command: pnpm --filter api dev (opens localhost:8080/swagger).',
        'Auth: JWT-based session tokens with OAuth login providers.',
      ].join('\n'),
      tags: ['backend', 'nestjs', 'monorepo', 'atlas'],
    },
    {
      title: 'Domain Architecture',
      slug: 'domain-architecture',
      summary: 'Core domains: account, catalog, subscription, invoice, notification, search. Shared types live in the shared package.',
      body: [
        'account: workspace users, roles, and OAuth identities.',
        'catalog: product records, pricing rules, and availability windows.',
        'subscription: plan changes, seats, renewals, and trial state.',
        'invoice: payment status, tax lines, refunds, and ledger entries.',
        'notification: transactional email and push delivery.',
        'Common pattern: Controller -> UseCase -> Repository. Usecases are the single unit of business logic.',
      ].join('\n'),
      tags: ['domain', 'account', 'catalog', 'billing', 'nestjs'],
    },
    {
      title: 'Worker Conventions',
      slug: 'worker-conventions',
      summary: 'Background jobs use BullMQ queues. Billing and notification workers own retries, idempotency keys, and dead-letter handling.',
      body: [
        'Billing worker processes invoice generation, refund sync, and renewal reminders.',
        'Notification worker handles email templates, push payloads, and delivery receipts.',
        'Search indexer listens to catalog updates and refreshes OpenSearch documents.',
        'Every job must include an idempotency key and structured retry metadata.',
        'Workers never call each other directly; publish a domain event instead.',
      ].join('\n'),
      tags: ['workers', 'bullmq', 'billing', 'notifications', 'search'],
    },
    {
      title: 'Glossary',
      slug: 'glossary',
      summary: 'Workspace: tenant boundary. Catalog item: sellable product record. Billing cycle: renewal window for a subscription.',
      body: [
        'Workspace: tenant boundary for users, roles, billing, and catalog data.',
        'Catalog item: sellable product record with pricing and availability metadata.',
        'Billing cycle: renewal window for a paid subscription.',
        'Ledger entry: immutable accounting record for invoice and refund events.',
        'Delivery receipt: provider callback confirming notification status.',
      ].join('\n'),
      tags: ['glossary', 'domain-terms'],
    },
  ],
};

const ATLAS_WEB_ONBOARDING = {
  branch: 'atlas-web',
  branchSummary: 'atlas-web: Next.js customer portal for the fictional Atlas SaaS platform. Catalog, checkout, workspace settings.',
  docs: [
    {
      title: 'Project Identity',
      slug: 'project-identity',
      summary: 'atlas-web is a Next.js 14 App Router application for app.atlas.example. Stack: TypeScript, Tailwind, React Query, OpenAPI-generated BFF types.',
      body: [
        'Stack: Next.js 14 (App Router), TypeScript, Tailwind CSS, React Query.',
        'BFF types auto-generated from OpenAPI spec: npm run bff-type.',
        'API base: api.dev.atlas.example (dev) / api.atlas.example (prod).',
        'i18n support via i18n.ts. Storybook for component development (port 6006).',
        'Structure: src/app (routes), src/components (shared UI), src/hooks, src/lib, src/types.',
      ].join('\n'),
      tags: ['frontend', 'nextjs', 'typescript', 'atlas'],
    },
    {
      title: 'Page & Component Structure',
      slug: 'page-structure',
      summary: 'App Router routes under src/app/[locale]. Key pages: catalog, checkout, subscription settings, workspace members.',
      body: [
        'Route layout: src/app/[locale]/ for all locale-aware pages.',
        'Catalog page: product cards, filters, sort, and saved views.',
        'Checkout page: plan selection, coupon validation, tax preview, payment confirmation.',
        'Workspace settings: member invites, roles, billing contact, audit log.',
        'i18n: locale param in every route. Default locale: en. Also supports ko and ja.',
        'OpenAPI types imported from bff/api.ts; never define API response types manually.',
      ].join('\n'),
      tags: ['routing', 'pages', 'i18n', 'catalog', 'checkout'],
    },
    {
      title: 'Data Fetching Conventions',
      slug: 'data-fetching',
      summary: 'React Query for client fetches. Server components use fetch with Next.js cache. BFF types come from OpenAPI codegen.',
      body: [
        'Server components: use native fetch with { next: { revalidate: N } } for caching.',
        'Client components: use React Query. Query keys live in src/lib/querykeys.ts.',
        'All API types come from bff/api.ts (generated). Import only from there.',
        'Never hardcode API URLs. Use config.ts for environment-aware base URLs.',
        'Error boundary wraps every page. Loading states use Suspense.',
      ].join('\n'),
      tags: ['react-query', 'server-components', 'openapi', 'data-fetching'],
    },
    {
      title: 'Glossary',
      slug: 'glossary',
      summary: 'BFF: Backend-For-Frontend proxy layer. Locale route: [locale] param prefix. Chromatic: visual regression testing via Storybook.',
      body: [
        'BFF: Backend-For-Frontend proxy layer used by atlas-web API routes.',
        'Locale route: every route is prefixed with [locale] for i18n.',
        'Chromatic: automated visual regression testing integrated with Storybook.',
        'Hydration: Next.js App Router server to client component handoff.',
        'Saved view: persisted catalog filter configuration for a workspace.',
      ].join('\n'),
      tags: ['glossary', 'bff', 'i18n', 'nextjs'],
    },
  ],
};

const ATLAS_ADMIN_ONBOARDING = {
  branch: 'atlas-admin',
  branchSummary: 'atlas-admin: internal admin panel for fictional Atlas operators. Catalog moderation, billing adjustments, support tools.',
  docs: [
    {
      title: 'Project Identity',
      slug: 'project-identity',
      summary: 'atlas-admin is a Next.js internal ops tool for support and operations staff. It manages catalog records, billing adjustments, and account support.',
      body: [
        'Stack: Next.js (Pages Router), TypeScript, OpenAPI-generated types from admin API.',
        'Admin API: admin-api.dev.atlas.example (dev) / admin-api.atlas.example (prod).',
        'Type generation: npm run admin-type (uses bearer token auth for swagger).',
        'Not public-facing. Requires employee SSO and hardware-key MFA.',
        'Structure: src/pages, src/components, src/catalog, src/billing, src/support, src/workflows.',
      ].join('\n'),
      tags: ['admin', 'internal', 'nextjs', 'operations'],
    },
    {
      title: 'Admin Operations',
      slug: 'admin-ops',
      summary: 'Key ops: catalog moderation, billing adjustment, account suspension, support notes, workflow approval.',
      body: [
        'Catalog admin: approve new catalog items, update metadata, manage availability windows.',
        'Billing admin: issue credits, adjust invoices, review refund requests, sync payment status.',
        'Support ops: add private notes, impersonate read-only sessions, suspend accounts.',
        'Workflow approval: review draft workflows, publish approved changes, archive stale requests.',
        'All destructive ops (suspend, refund, archive) require two-step confirmation.',
      ].join('\n'),
      tags: ['catalog', 'billing', 'support', 'admin'],
    },
    {
      title: 'Workflow Editor',
      slug: 'workflow-editor',
      summary: 'workflow-editor: specialized UI for building and publishing approval workflows. Lives in src/workflows/editor.',
      body: [
        'workflow-editor is a standalone sub-feature in src/workflows/editor.',
        'Allows ops to define steps, assign reviewers, schedule rollout windows, and preview state transitions.',
        'Workflows go through states: draft -> active -> paused -> archived.',
        'Do not edit workflow-editor logic without coordinating with the admin API workflow module.',
        'Test with staging admin API before publishing production workflows.',
      ].join('\n'),
      tags: ['workflow', 'editor', 'approval'],
    },
    {
      title: 'Glossary',
      slug: 'glossary',
      summary: 'Ops: internal operator staff. Admin API: private API separate from the public BFF. Workflow: approval process with state transitions.',
      body: [
        'Ops: internal operator staff who use this admin panel.',
        'Admin API: private operations API, separate from the public BFF.',
        'Workflow: approval process with reviewers, states, and rollout windows.',
        'Credit memo: billing adjustment that reduces an invoice balance.',
        'Read-only impersonation: support view that cannot mutate customer data.',
      ].join('\n'),
      tags: ['glossary', 'admin', 'operations'],
    },
  ],
};

const ISOLATION_TESTS = [
  { query: 'NestJS controller usecase repository pattern', match: 'atlas-api', noMatch: ['atlas-web', 'atlas-admin'], desc: 'NestJS API pattern' },
  { query: 'BullMQ idempotency retry metadata dead-letter queue', match: 'atlas-api', noMatch: ['atlas-web', 'atlas-admin'], desc: 'worker conventions' },
  { query: 'OpenSearch analyzer reindex search-indexer domain event', match: 'atlas-api', noMatch: ['atlas-web', 'atlas-admin'], desc: 'search indexer' },

  { query: 'React Query querykeys Suspense hydration server component', match: 'atlas-web', noMatch: ['atlas-api', 'atlas-admin'], desc: 'Next.js data fetching' },
  { query: 'Storybook Chromatic visual regression Tailwind', match: 'atlas-web', noMatch: ['atlas-api', 'atlas-admin'], desc: 'frontend visual testing' },
  { query: 'locale i18n App Router Suspense hydration', match: 'atlas-web', noMatch: ['atlas-api', 'atlas-admin'], desc: 'i18n routing' },

  { query: 'credit memo read-only impersonation support notes', match: 'atlas-admin', noMatch: ['atlas-api', 'atlas-web'], desc: 'admin support ops' },
  { query: 'workflow-editor draft active paused archived', match: 'atlas-admin', noMatch: ['atlas-api', 'atlas-web'], desc: 'workflow editor states' },
  { query: 'employee SSO MFA private operations panel', match: 'atlas-admin', noMatch: ['atlas-api', 'atlas-web'], desc: 'admin access controls' },

  { query: 'catalog product records availability windows', match: 'atlas-api', noMatch: [], desc: 'shared catalog term from API' },
  { query: 'checkout plan coupon tax preview', match: 'atlas-web', noMatch: [], desc: 'checkout page from web' },
];

function pct(n: number): string {
  return (n * 100).toFixed(0) + '%';
}

async function totalDocChars(home: string, branch: string): Promise<number> {
  const dir = branchDocsDir(home, branch);
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
  let total = 0;
  for (const f of files) total += (await readFile(join(dir, f), 'utf8')).length;
  return total;
}

async function main(): Promise<void> {
  const home = await mkdtemp(join(tmpdir(), 'gctree-multirepo-'));
  console.log(`\n═══ gc-tree Multi-Repo Evaluation ═══`);
  console.log(`Home: ${home}`);
  console.log(`Branches: atlas-api, atlas-web, atlas-admin\n`);

  try {
    await initHome(home);

    const branches = [
      { id: 'atlas-api', input: ATLAS_API_ONBOARDING },
      { id: 'atlas-web', input: ATLAS_WEB_ONBOARDING },
      { id: 'atlas-admin', input: ATLAS_ADMIN_ONBOARDING },
    ];

    console.log('── Onboarding ──');
    for (const { id, input } of branches) {
      await checkoutBranch(home, id, true);
      await onboardBranch({ home, branch: id, input });
      const status = await statusForBranch(home, id);
      const chars = await totalDocChars(home, id);
      const icon = status.warnings.length === 0 ? '✓' : '⚠';
      console.log(`  ${icon} [${id}] docs=${status.doc_count} index=${status.index_chars}ch total_doc_chars=${chars}`);
      if (VERBOSE && status.warnings.length > 0) {
        for (const w of status.warnings) console.log(`      ⚠ ${w}`);
      }
    }

    console.log('\n── Within-branch Resolve Relevance ──');
    const relevanceTests = [
      { branch: 'atlas-api', query: 'NestJS billing-worker catalog search-indexer', expectMatch: true },
      { branch: 'atlas-api', query: 'React Query Tailwind hydration', expectMatch: false },
      { branch: 'atlas-web', query: 'BFF OpenAPI locale i18n checkout', expectMatch: true },
      { branch: 'atlas-web', query: 'NestJS BullMQ invoice worker', expectMatch: false },
      { branch: 'atlas-admin', query: 'workflow editor credit memo operator', expectMatch: true },
      { branch: 'atlas-admin', query: 'Storybook Chromatic server component', expectMatch: false },
    ];

    let relCorrect = 0;
    for (const t of relevanceTests) {
      const res = await resolveContext({ home, branch: t.branch, query: t.query });
      const hasMatch = res.matches.length > 0;
      const ok = hasMatch === t.expectMatch;
      if (ok) relCorrect++;
      const icon = ok ? '✓' : '✗';
      const matchStr = hasMatch ? `${res.matches.length} match(es) [top: ${res.matches[0]?.title} score=${res.matches[0]?.score}]` : 'no matches';
      const expectStr = t.expectMatch ? 'expect match' : 'expect empty';
      console.log(`  ${icon} [${t.branch}] "${t.query.slice(0, 40)}" → ${matchStr} (${expectStr})`);
    }
    const relScore = relCorrect / relevanceTests.length;
    console.log(`  Score: ${relCorrect}/${relevanceTests.length} (${pct(relScore)})`);

    console.log('\n── Cross-branch Isolation ──');
    let isoCorrect = 0, isoTotal = 0;

    for (const t of ISOLATION_TESTS) {
      const matchRes = await resolveContext({ home, branch: t.match, query: t.query });
      const matchOk = matchRes.matches.length > 0;
      isoTotal++;
      if (matchOk) isoCorrect++;

      for (const noMatchBranch of t.noMatch) {
        const noMatchRes = await resolveContext({ home, branch: noMatchBranch, query: t.query });
        const noMatchOk = noMatchRes.matches.length === 0;
        isoTotal++;
        if (noMatchOk) isoCorrect++;

        if (VERBOSE || !noMatchOk) {
          const icon = noMatchOk ? '✓' : '✗';
          console.log(`  ${icon} "${t.query.slice(0, 35)}" [${noMatchBranch}] → ${noMatchRes.matches.length} match(es) (expect 0)`);
        }
      }

      if (VERBOSE || !matchOk) {
        const icon = matchOk ? '✓' : '✗';
        console.log(`  ${icon} "${t.query.slice(0, 35)}" [${t.match}] → ${matchRes.matches.length} match(es) (expect >=1)`);
      }
    }

    const isoScore = isoCorrect / isoTotal;
    console.log(`  Score: ${isoCorrect}/${isoTotal} (${pct(isoScore)})`);

    console.log('\n── Token Efficiency per Branch ──');
    for (const { id } of branches) {
      const chars = await totalDocChars(home, id);
      const relQ = id === 'atlas-api' ? 'NestJS billing-worker catalog' : id === 'atlas-web' ? 'BFF OpenAPI React Query' : 'workflow editor credit memo';
      const relRes = await resolveContext({ home, branch: id, query: relQ });
      const relReturned = relRes.matches.reduce((s, m) => s + m.summary.length + m.excerpt.length + m.title.length, 0);

      const irrelQ = id === 'atlas-api' ? 'Storybook Tailwind Chromatic' : id === 'atlas-web' ? 'BullMQ invoice worker idempotency' : 'NestJS usecase search-indexer';
      const irrelRes = await resolveContext({ home, branch: id, query: irrelQ });
      const irrelReturned = irrelRes.matches.reduce((s, m) => s + m.summary.length + m.excerpt.length + m.title.length, 0);

      console.log(`  [${id}] total=${chars}ch`);
      console.log(`    relevant  "${relQ.slice(0, 30)}": returned ${relReturned}ch (${pct(relReturned / chars)} of total)`);
      console.log(`    irrelevant "${irrelQ.slice(0, 30)}": returned ${irrelReturned}ch (${pct(irrelReturned / chars)} of total)`);
    }

    const overallScore = (relScore + isoScore) / 2;
    const passed = overallScore >= 0.75;
    console.log(`\n═══ Summary ═══`);
    console.log(`Within-branch relevance: ${pct(relScore)}`);
    console.log(`Cross-branch isolation:  ${pct(isoScore)}`);
    console.log(`Overall:                 ${pct(overallScore)}  ${passed ? '✅ PASS' : '❌ FAIL'}`);

    if (!passed) process.exitCode = 1;
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

await main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
