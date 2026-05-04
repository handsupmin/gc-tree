/**
 * Multi-repo gc-tree evaluation
 *
 * Tests gc-tree on three real cosmo repos (backend, web, admin) to verify:
 *   1. Onboarding quality per repo
 *   2. Cross-branch isolation (backend query shouldn't match web branch, etc.)
 *   3. Resolve relevance within each branch
 *   4. Token efficiency across all three branches
 *
 * Onboarding content is derived from reading actual source structure,
 * then written via __apply-onboarding to simulate what the AI would produce.
 *
 * Run:
 *   node --import tsx tests/eval/multi-repo.ts
 *   node --import tsx tests/eval/multi-repo.ts --verbose
 */

import { readdir, mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { existsSync } from 'node:fs';

import { onboardBranch } from '../../src/onboard.js';
import { resolveContext } from '../../src/resolve.js';
import { checkoutBranch, initHome, statusForBranch } from '../../src/store.js';
import { branchDocsDir } from '../../src/paths.js';

const VERBOSE = process.argv.includes('--verbose');

// ─────────────────────────────────────────────
// Realistic onboarding fixtures derived from
// actual cosmo repo structure (mod-haus)
// ─────────────────────────────────────────────

const COSMO_BACKEND_ONBOARDING = {
  branch: 'cosmo-backend',
  branchSummary: 'cosmo-backend: NestJS monorepo for cosmo.fans — API server, gas-fuel, job-worker, blockchain indexer.',
  docs: [
    {
      title: 'Project Identity',
      slug: 'project-identity',
      summary: 'cosmo-backend is the NestJS monorepo powering api.cosmo.fans. Packages: api (main), gas-fuel, job-worker, shared, slackbot, transaction-worker, indexer.',
      body: [
        'Stack: Node 18+, NestJS, pnpm workspaces, TypeScript.',
        'Main API at api.cosmo.fans serves REST + WebSocket. Swagger available at /swagger.',
        'Monorepo packages: api (core HTTP), gas-fuel (MATIC top-up for user wallets), job-worker (async task processing), shared (types/utils), slackbot, transaction-worker, indexer (blockchain event sync).',
        'Dev command: pnpm --filter api dev (opens localhost:8080/swagger).',
        'Auth: JWT-based with wallet-based login for Web3 users. Firebase for social login.',
      ].join('\n'),
      tags: ['backend', 'nestjs', 'monorepo', 'cosmo'],
    },
    {
      title: 'Domain Architecture',
      slug: 'domain-architecture',
      summary: 'Core domains: objekt (NFT cards), artist, gravity (voting), challenge, blockchain, push notifications. Shared types in the shared package.',
      body: [
        'objekt: NFT card management. ObjektControllerV1 handles card lookup, ownership, transfers.',
        'artist: artist profiles and metadata. ArtistController + usecases pattern.',
        'gravity: fan voting system. Voting rounds, tallying, and results.',
        'challenge: time-limited fan challenges with leaderboards.',
        'blockchain: on-chain event indexing and wallet interactions. Uses Polygon (MATIC).',
        'push: Firebase FCM push notifications for real-time events.',
        'Common pattern: Controller → UseCase → Repository. No service layer; usecases are the single unit of business logic.',
      ].join('\n'),
      tags: ['domain', 'objekt', 'gravity', 'blockchain', 'nestjs'],
    },
    {
      title: 'Blockchain & Web3 Conventions',
      slug: 'blockchain-conventions',
      summary: 'Polygon (MATIC) for transactions. gas-fuel service tops up user wallets. NFT objekts are ERC-721 on Polygon.',
      body: [
        'Chain: Polygon mainnet. All token operations use MATIC.',
        'gas-fuel service monitors user wallets and tops them up when balance is low.',
        'Objekts are ERC-721 NFTs. Ownership verified on-chain via indexer.',
        'Never expose private keys in env logs. Use KMS for production key management.',
        'transaction-worker handles queued blockchain writes; do not call chain directly from api.',
      ].join('\n'),
      tags: ['blockchain', 'polygon', 'web3', 'nft', 'security'],
    },
    {
      title: 'Glossary',
      slug: 'glossary',
      summary: 'Objekt: NFT fan card. Gravity: voting system. Cosmo: the fan platform. Lenticular: special objekt type with dual-image effect.',
      body: [
        'Objekt: a fan-owned NFT card tied to a K-pop artist.',
        'Gravity: the on-platform voting/ranking system for fans.',
        'Cosmo: the mod-haus fan engagement platform (cosmo.fans).',
        'Lenticular: a special objekt variant with two alternating images.',
        'Grid: the collectible display grid for user objekts.',
        'Season: a fixed time window for objekt drops and events.',
        'Spin: the mechanism for obtaining random objekts (gacha-like).',
      ].join('\n'),
      tags: ['glossary', 'cosmo', 'domain-terms'],
    },
  ],
};

const COSMO_WEB_ONBOARDING = {
  branch: 'cosmo-web',
  branchSummary: 'cosmo-web: Next.js frontend for cosmo.fans. Fan portal for objekts, gravity voting, artist profiles.',
  docs: [
    {
      title: 'Project Identity',
      slug: 'project-identity',
      summary: 'cosmo-web is a Next.js 14 App Router SPA for cosmo.fans. Stack: TypeScript, Tailwind, React Query, OpenAPI-generated BFF types.',
      body: [
        'Stack: Next.js 14 (App Router), TypeScript, Tailwind CSS, React Query.',
        'BFF types auto-generated from OpenAPI spec: npm run bff-type and bff-v3-type.',
        'API base: api.dev.cosmo.fans (dev) / api.cosmo.fans (prod).',
        'i18n support via i18n.ts. Storybook for component development (port 6006).',
        'Structure: src/app (routes), src/components (shared UI), src/hooks, src/lib, src/types.',
      ].join('\n'),
      tags: ['frontend', 'nextjs', 'typescript', 'cosmo'],
    },
    {
      title: 'Page & Component Structure',
      slug: 'page-structure',
      summary: 'App Router routes under src/app/[locale]. Key pages: objekt grid, artist profiles, gravity voting, shop.',
      body: [
        'Route layout: src/app/[locale]/ for all locale-aware pages.',
        'Objekt grid: user collection display, infinite scroll, filter/sort.',
        'Artist pages: artist profile with discography and related objekts.',
        'Gravity voting: fan participation UI with real-time tallies.',
        'i18n: locale param in every route. Default locale: ko (Korean). Also supports en, ja.',
        'OpenAPI types imported from bff/api.ts and bff/g3/api.ts — never define API types manually.',
      ].join('\n'),
      tags: ['routing', 'pages', 'i18n', 'objekt', 'gravity'],
    },
    {
      title: 'Data Fetching Conventions',
      slug: 'data-fetching',
      summary: 'React Query for client fetches. Server components use fetch with Next.js cache. BFF types from OpenAPI codegen — never write raw API types.',
      body: [
        'Server components: use native fetch with { next: { revalidate: N } } for caching.',
        'Client components: use React Query. Querykeys in src/lib/querykeys.ts.',
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
        'BFF: Backend-For-Frontend. cosmo-web proxies API calls through Next.js API routes to avoid CORS and manage auth headers.',
        'Locale route: every route is prefixed with [locale] for i18n.',
        'Chromatic: automated visual regression testing integrated with Storybook.',
        'Hydration: Next.js App Router server → client component handoff.',
        'g3: third-generation API (v3). Some features still use g2 or legacy endpoints.',
      ].join('\n'),
      tags: ['glossary', 'bff', 'i18n', 'nextjs'],
    },
  ],
};

const COSMO_ADMIN_ONBOARDING = {
  branch: 'cosmo-admin',
  branchSummary: 'cosmo-admin: Next.js internal admin panel for mod-haus operators — objekt management, gravity curation, user ops.',
  docs: [
    {
      title: 'Project Identity',
      slug: 'project-identity',
      summary: 'cosmo-admin is a Next.js internal ops tool for mod-haus staff. Manages objekts, gravity rounds, artists, and user accounts via admin APIs.',
      body: [
        'Stack: Next.js (Pages Router), TypeScript, OpenAPI-generated types from g2 API.',
        'Admin API: api-g2.dev.cosmo.fans (dev) / api-g2.cosmo.fans (prod).',
        'Type generation: npm run g2-type (uses bearer token auth for swagger).',
        'Not public-facing. Requires mod-haus employee auth. No social login.',
        'Structure: src/app, src/pages, src/components, src/gravity, src/objekt, src/artist, src/user.',
      ].join('\n'),
      tags: ['admin', 'internal', 'nextjs', 'mod-haus'],
    },
    {
      title: 'Admin Operations',
      slug: 'admin-ops',
      summary: 'Key ops: objekt mint/burn, gravity round management, user role assignment, artist curation, shop management.',
      body: [
        'Objekt admin: mint new objekts, burn invalid ones, update metadata, manage seasons.',
        'Gravity: create/close voting rounds, review submissions, set weights.',
        'User ops: assign roles, suspend accounts, view transaction history.',
        'Artist: manage artist profiles, linked objekts, event scheduling.',
        'Shop: manage listings, pricing, inventory, promotional campaigns.',
        'All destructive ops (mint, burn, ban) require two-step confirmation.',
      ].join('\n'),
      tags: ['objekt', 'gravity', 'user-management', 'admin'],
    },
    {
      title: 'Gravity Editor',
      slug: 'gravity-editor',
      summary: 'gravity-editor: specialized UI for building and publishing gravity voting rounds. Lives in src/gravity-editor.',
      body: [
        'gravity-editor is a standalone sub-feature in src/gravity-editor.',
        'Allows ops to: define candidates, set vote weights, schedule rounds, preview results.',
        'Rounds go through states: draft → active → closed → published.',
        'Do not edit gravity-editor logic without coordinating with the backend gravity module.',
        'Test with staging gravity API before pushing to production rounds.',
      ].join('\n'),
      tags: ['gravity', 'editor', 'voting'],
    },
    {
      title: 'Glossary',
      slug: 'glossary',
      summary: 'Ops: mod-haus operator staff. g2 API: internal admin API (not public BFF). Gravity round: a voting period with candidates and weights.',
      body: [
        'Ops: mod-haus operator staff who use this admin panel.',
        'g2 API: the internal admin API, separate from the public BFF.',
        'Gravity round: a defined voting period with artist candidates and vote tallying.',
        'Mint: creating a new objekt NFT on-chain.',
        'Burn: permanently destroying an objekt NFT.',
        'Season: a content release cycle determining which objekts are mintable.',
      ].join('\n'),
      tags: ['glossary', 'admin', 'operations'],
    },
  ],
};

// ─────────────────────────────────────────────
// Cross-branch isolation test cases
// ─────────────────────────────────────────────
const ISOLATION_TESTS = [
  // backend-specific
  { query: 'NestJS controller usecase repository pattern', match: 'cosmo-backend', noMatch: ['cosmo-web', 'cosmo-admin'], desc: 'NestJS backend pattern' },
  { query: 'gas-fuel MATIC wallet top-up blockchain', match: 'cosmo-backend', noMatch: ['cosmo-web', 'cosmo-admin'], desc: 'gas-fuel service' },
  { query: 'ERC-721 NFT objekt Polygon transaction-worker', match: 'cosmo-backend', noMatch: ['cosmo-web', 'cosmo-admin'], desc: 'blockchain NFT terms' },

  // web-specific
  { query: 'React Query BFF OpenAPI codegen server component', match: 'cosmo-web', noMatch: ['cosmo-backend', 'cosmo-admin'], desc: 'Next.js BFF data fetching' },
  { query: 'Storybook Chromatic visual regression Tailwind', match: 'cosmo-web', noMatch: ['cosmo-backend', 'cosmo-admin'], desc: 'frontend visual testing' },
  { query: 'locale i18n App Router Suspense hydration', match: 'cosmo-web', noMatch: ['cosmo-backend', 'cosmo-admin'], desc: 'i18n routing' },

  // admin-specific
  { query: 'mint burn objekt admin operator mod-haus', match: 'cosmo-admin', noMatch: ['cosmo-backend', 'cosmo-web'], desc: 'admin mint/burn ops' },
  { query: 'gravity-editor round draft active closed', match: 'cosmo-admin', noMatch: ['cosmo-backend', 'cosmo-web'], desc: 'gravity editor states' },
  { query: 'g2 API internal admin two-step confirmation', match: 'cosmo-admin', noMatch: ['cosmo-backend', 'cosmo-web'], desc: 'admin g2 API ops' },

  // shared terms (should match multiple — we just check the RIGHT branch matches)
  { query: 'gravity voting round candidates', match: 'cosmo-backend', noMatch: [], desc: 'gravity (backend)' },
  { query: 'objekt grid display collection', match: 'cosmo-web', noMatch: [], desc: 'objekt grid (web)' },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function main(): Promise<void> {
  const home = await mkdtemp(join(tmpdir(), 'gctree-multirepo-'));
  console.log(`\n═══ gc-tree Multi-Repo Evaluation ═══`);
  console.log(`Home: ${home}`);
  console.log(`Branches: cosmo-backend, cosmo-web, cosmo-admin\n`);

  try {
    await initHome(home);

    // ── Onboarding ──
    const branches = [
      { id: 'cosmo-backend', input: COSMO_BACKEND_ONBOARDING },
      { id: 'cosmo-web', input: COSMO_WEB_ONBOARDING },
      { id: 'cosmo-admin', input: COSMO_ADMIN_ONBOARDING },
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

    // ── Within-branch relevance ──
    console.log('\n── Within-branch Resolve Relevance ──');
    const relevanceTests = [
      { branch: 'cosmo-backend', query: 'NestJS blockchain objekt NFT', expectMatch: true },
      { branch: 'cosmo-backend', query: 'React Query Tailwind hydration', expectMatch: false },
      { branch: 'cosmo-web', query: 'BFF OpenAPI locale i18n', expectMatch: true },
      { branch: 'cosmo-web', query: 'NestJS usecase gas-fuel MATIC', expectMatch: false },
      { branch: 'cosmo-admin', query: 'gravity editor mint burn operator', expectMatch: true },
      { branch: 'cosmo-admin', query: 'Storybook Chromatic server component', expectMatch: false },
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

    // ── Cross-branch isolation ──
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
        console.log(`  ${icon} "${t.query.slice(0, 35)}" [${t.match}] → ${matchRes.matches.length} match(es) (expect ≥1)`);
      }
    }

    const isoScore = isoCorrect / isoTotal;
    console.log(`  Score: ${isoCorrect}/${isoTotal} (${pct(isoScore)})`);

    // ── Token efficiency per branch ──
    console.log('\n── Token Efficiency per Branch ──');
    for (const { id } of branches) {
      const chars = await totalDocChars(home, id);

      // Relevant query
      const relQ = id === 'cosmo-backend' ? 'NestJS objekt blockchain' : id === 'cosmo-web' ? 'BFF OpenAPI React Query' : 'gravity round admin mint';
      const relRes = await resolveContext({ home, branch: id, query: relQ });
      const relReturned = relRes.matches.reduce((s, m) => s + m.summary.length + m.excerpt.length + m.title.length, 0);

      // Irrelevant query
      const irrelQ = id === 'cosmo-backend' ? 'Storybook Tailwind Chromatic' : id === 'cosmo-web' ? 'gas-fuel MATIC Polygon chain' : 'NestJS usecase job-worker indexer';
      const irrelRes = await resolveContext({ home, branch: id, query: irrelQ });
      const irrelReturned = irrelRes.matches.reduce((s, m) => s + m.summary.length + m.excerpt.length + m.title.length, 0);

      console.log(`  [${id}] total=${chars}ch`);
      console.log(`    relevant  "${relQ.slice(0, 30)}": returned ${relReturned}ch (${pct(relReturned / chars)} of total)`);
      console.log(`    irrelevant "${irrelQ.slice(0, 30)}": returned ${irrelReturned}ch (${pct(irrelReturned / chars)} of total)`);
    }

    // ── Summary ──
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
