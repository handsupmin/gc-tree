/**
 * Real-docs onboarding evaluation
 *
 * Uses actual mod-haus internal Notion exports as onboarding material
 * to evaluate gc-tree's quality on realistic content (not synthetic fixtures).
 *
 * Tests:
 *   1. Onboarding quality from real docs (index size, summary presence, doc count)
 *   2. Resolve recall — Korean + English queries derived from real content
 *   3. Resolve precision — unrelated queries return 0 matches
 *   4. Token efficiency — how much of total doc chars each query returns
 *   5. Comparison: real-doc branch vs synthetic cosmo-backend branch
 *
 * Notion files used:
 *   - 백엔드 코딩 컨벤션
 *   - [서버] backend-g3 DTO 관리 전략 수립
 *   - 백엔드 서버 온보딩 onboarding
 *   - 백엔드 아키텍처 (backend architecture)
 *
 * Run:
 *   node --import tsx tests/eval/real-docs.ts
 *   node --import tsx tests/eval/real-docs.ts --verbose
 */

import { readdir, readFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { onboardBranch } from '../../src/onboard.js';
import { resolveContext } from '../../src/resolve.js';
import { checkoutBranch, initHome, statusForBranch } from '../../src/store.js';
import { branchDocsDir } from '../../src/paths.js';

const VERBOSE = process.argv.includes('--verbose');

// ─────────────────────────────────────────────
// Notion source paths
// ─────────────────────────────────────────────
const NOTION_BASES = [
  '/Users/sangmin/Downloads/개인 페이지 & 공유된 페이지',
  '/Users/sangmin/Downloads/개인 페이지 & 공유된 페이지 2',
  '/Users/sangmin/Downloads/개인 페이지 & 공유된 페이지 3',
  '/Users/sangmin/Downloads/개인 페이지 & 공유된 페이지 4',
];

async function findMdFile(dir: string): Promise<string> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
  if (files.length === 0) throw new Error(`No .md file in ${dir}`);
  return join(dir, files[0]);
}

// ─────────────────────────────────────────────
// Notion → gc-tree doc converter
// Strips image refs, cleans up Notion-specific markup,
// extracts a first-paragraph summary, and trims to body.
// ─────────────────────────────────────────────
function stripNotionNoise(raw: string): string {
  return raw
    .replace(/!\[.*?\]\(.*?\)/g, '') // images
    .replace(/\[.*?\]\(https?:\/\/[^\)]*\)/g, (m) => {
      // keep link text, drop URL
      const match = m.match(/\[([^\]]+)\]/);
      return match ? match[1] : '';
    })
    .replace(/^날짜:.*$/gm, '')
    .replace(/^발의자:.*$/gm, '')
    .replace(/^참여자:.*$/gm, '')
    .replace(/^태그:.*$/gm, '')
    .replace(/^상태:.*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractFirstMeaningfulParagraph(text: string): string {
  // Look for the first non-header, non-empty paragraph ≥ 30 chars
  const lines = text.split('\n');
  const candidates: string[] = [];
  let inCodeBlock = false;
  for (const line of lines) {
    if (line.startsWith('```')) { inCodeBlock = !inCodeBlock; continue; }
    if (inCodeBlock) continue;
    const stripped = line.replace(/^#+\s*/, '').replace(/^[-*]\s*/, '').trim();
    if (stripped.length >= 30 && !stripped.startsWith('http')) candidates.push(stripped);
    if (candidates.length >= 3) break;
  }
  return candidates.join(' ').slice(0, 300);
}

interface RawNotionDoc {
  title: string;
  rawContent: string;
}

function notionToGcTreeDoc(doc: RawNotionDoc) {
  const cleaned = stripNotionNoise(doc.rawContent);
  const summary = extractFirstMeaningfulParagraph(cleaned) || doc.title;
  // gc-tree docs can hold full content — only the index.md has a size budget
  const body = cleaned.slice(0, 6000);
  const slug = doc.title
    .toLowerCase()
    .replace(/[^\w가-힣]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

  return { title: doc.title, slug, summary, body };
}

// ─────────────────────────────────────────────
// Eval helpers
// ─────────────────────────────────────────────
function pct(n: number) { return (n * 100).toFixed(1) + '%'; }

async function totalDocChars(home: string, branch: string): Promise<number> {
  const dir = branchDocsDir(home, branch);
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
  let total = 0;
  for (const f of files) total += (await readFile(join(dir, f), 'utf8')).length;
  return total;
}

async function returnedChars(home: string, branch: string, query: string): Promise<{ matches: number; chars: number }> {
  const res = await resolveContext({ home, branch, query });
  const chars = res.matches.reduce((s, m) => s + m.title.length + m.summary.length + m.excerpt.length, 0);
  return { matches: res.matches.length, chars };
}

// ─────────────────────────────────────────────
// Test cases derived directly from real doc content
// ─────────────────────────────────────────────
const RECALL_CASES = [
  // 코딩 컨벤션
  { query: 'plainToInstance satisfies excludeExtraneousValues', desc: '컨벤션: controller return 패턴' },
  { query: 'CosmoException 에러 처리 controller', desc: '컨벤션: 에러 클래스' },
  { query: '서비스 간 호출 금지 순환 참조', desc: '컨벤션: 서비스 제약' },
  { query: 'DTO 클래스명 중복 pnpm dto 스크립트', desc: '컨벤션: DTO 중복 검사' },

  // DTO 전략
  { query: 'dto-controller dto-controller-admin dto-consumer 디렉토리 분리', desc: 'DTO 전략: 계층 분리' },
  { query: 'kebab-case 파일명 camelCase DTO명 Req Res', desc: 'DTO 전략: 네이밍 규칙' },
  { query: '결합도 낮추기 중복 코드 계층 관심사 분리', desc: 'DTO 전략: 설계 목표' },

  // 온보딩
  { query: 'cosmo-backend-g3 cosmo-admin-g3 db-migration 레포', desc: '온보딩: 주요 레포' },
  { query: 'ArgoCD 배포 Grafana 모니터링 k8s EKS 인프라', desc: '온보딩: 인프라 스택' },
  { query: 'OpenVPN AWS CLI aws configure modhaus 로컬 세팅', desc: '온보딩: 로컬 환경 설정' },
  { query: 'Jira PR 티켓 넘버 깃헙 자동 연결', desc: '온보딩: 업무 툴' },

  // 아키텍처
  { query: 'Abstract blockchain NFT objekt 민팅 트랜잭션', desc: '아키텍처: NFT 민팅 플로우' },
  { query: 'BullMQ Airflow 스케줄러 워커 큐', desc: '아키텍처: 비동기 처리' },
  { query: 'Aurora MySQL DynamoDB objekt_mint_task 테이블', desc: '아키텍처: 데이터베이스' },
  { query: 'Gravity Como 투표 개표 블록체인 온체인', desc: '아키텍처: Gravity/투표 플로우' },
  { query: 'Indexer 블록 스크래핑 민팅 이벤트 감지 동기화', desc: '아키텍처: Indexer' },
];

const PRECISION_CASES = [
  // Genuinely unrelated to cosmo-backend internals
  { query: 'Storybook Chromatic 스토리북 시각적 회귀 테스트', desc: '무관: 프론트 비주얼 테스트' },
  { query: 'Stripe PaymentIntent 결제 카드 checkout 웹훅', desc: '무관: Stripe 결제' },
  { query: 'PyTorch 학습률 모델 정확도 에포크 GPU', desc: '무관: 딥러닝 학습' },
  { query: 'Swift UIKit ViewController iOS 앱 모바일', desc: '무관: iOS 네이티브' },
  { query: 'pandas DataFrame groupby 통계 분석 Python', desc: '무관: Python 데이터 분석' },
];

// ─────────────────────────────────────────────
// Synthetic cosmo-backend fixture (for comparison)
// ─────────────────────────────────────────────
const SYNTHETIC_COSMO_BACKEND = {
  branchSummary: 'cosmo-backend: NestJS monorepo for cosmo.fans. API, blockchain, workers.',
  docs: [
    {
      title: 'Project Identity',
      slug: 'project-identity',
      summary: 'NestJS monorepo powering api.cosmo.fans. Packages: api, gas-fuel, job-worker, shared, indexer.',
      body: 'Stack: Node 18+, NestJS, pnpm workspaces. Auth: JWT + Firebase. Blockchain: Polygon MATIC.',
    },
    {
      title: 'Domain Architecture',
      slug: 'domain-architecture',
      summary: 'Core domains: objekt (NFT), artist, gravity (voting), challenge, blockchain.',
      body: 'Pattern: Controller → UseCase → Repository. Gas-fuel tops up MATIC. Objekts are ERC-721.',
    },
  ],
};

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function main(): Promise<void> {
  const home = await mkdtemp(join(tmpdir(), 'gctree-realdocs-'));
  console.log(`\n═══ gc-tree Real-Docs Evaluation ═══`);
  console.log(`Source: 4 Notion exports from mod-haus internal docs`);
  console.log(`Home: ${home}\n`);

  try {
    await initHome(home);

    // ── Load Notion docs ──
    console.log('── Loading Notion exports ──');
    const notionDocs: RawNotionDoc[] = [];
    for (const base of NOTION_BASES) {
      const path = await findMdFile(base);
      const raw = await readFile(path, 'utf8');
      const titleMatch = raw.match(/^#\s+(.+)$/m);
      const title = titleMatch?.[1]?.trim() ?? 'Untitled';
      notionDocs.push({ title, rawContent: raw });
      console.log(`  ✓ Loaded: "${title}" (${raw.length} chars)`);
    }

    // ── Build gc-tree docs from Notion content ──
    const gcDocs = notionDocs.map(notionToGcTreeDoc);

    // ── Onboard real-docs branch ──
    await checkoutBranch(home, 'real', true);
    await onboardBranch({
      home,
      branch: 'real',
      input: {
        branchSummary: 'cosmo-backend-g3 실제 내부 문서: 코딩 컨벤션, DTO 전략, 온보딩 가이드, 아키텍처.',
        docs: gcDocs,
      },
    });

    const status = await statusForBranch(home, 'real');
    const totalChars = await totalDocChars(home, 'real');
    console.log(`\n── Onboarding Quality (real docs) ──`);
    console.log(`  doc_count: ${status.doc_count} (expected ${gcDocs.length})`);
    console.log(`  index_chars: ${status.index_chars} (limit 2000)`);
    console.log(`  total_doc_chars: ${totalChars}`);
    if (status.warnings.length > 0) {
      for (const w of status.warnings) console.log(`  ⚠ ${w}`);
    } else {
      console.log(`  ✓ no warnings`);
    }

    // ── Recall test ──
    console.log(`\n── Recall (관련 쿼리 → 반드시 매칭) ──`);
    let recallHits = 0;
    const recallMisses: string[] = [];
    for (const c of RECALL_CASES) {
      const res = await resolveContext({ home, branch: 'real', query: c.query });
      const hit = res.matches.length > 0;
      if (hit) recallHits++;
      const icon = hit ? '✓' : '✗';
      const top = hit ? `[top: "${res.matches[0]?.title}" score=${res.matches[0]?.score}]` : 'NO MATCH';
      if (VERBOSE || !hit) console.log(`  ${icon} "${c.desc}": ${top}`);
      if (!hit) recallMisses.push(c.desc);
    }
    const recallScore = recallHits / RECALL_CASES.length;
    console.log(`  Recall: ${recallHits}/${RECALL_CASES.length} (${pct(recallScore)})`);
    if (recallMisses.length > 0) {
      console.log(`  Misses:`);
      for (const m of recallMisses) console.log(`    - ${m}`);
    }

    // ── Precision test ──
    console.log(`\n── Precision (무관 쿼리 → 반드시 0 매칭) ──`);
    let precisionHits = 0;
    for (const c of PRECISION_CASES) {
      const res = await resolveContext({ home, branch: 'real', query: c.query });
      const correct = res.matches.length === 0;
      if (correct) precisionHits++;
      const icon = correct ? '✓' : '✗';
      const detail = correct ? '0 matches' : `${res.matches.length} matches [top: "${res.matches[0]?.title}" score=${res.matches[0]?.score}]`;
      if (VERBOSE || !correct) console.log(`  ${icon} "${c.desc}": ${detail}`);
    }
    const precisionScore = precisionHits / PRECISION_CASES.length;
    console.log(`  Precision: ${precisionHits}/${PRECISION_CASES.length} (${pct(precisionScore)})`);

    // ── Token efficiency ──
    console.log(`\n── Token Efficiency ──`);
    const relevantQueries = [
      'plainToInstance controller DTO',
      'NestJS 아키텍처 Abstract blockchain',
      'ArgoCD k8s 배포 모니터링',
    ];
    const irrelevantQueries = [
      'Storybook Chromatic 시각적 회귀',
      'PyTorch 학습률 에포크 GPU',
    ];
    for (const q of relevantQueries) {
      const { matches, chars } = await returnedChars(home, 'real', q);
      console.log(`  [relevant] "${q}": ${matches} match(es), ${chars}ch returned (${pct(chars / totalChars)} of ${totalChars}ch total)`);
    }
    for (const q of irrelevantQueries) {
      const { matches, chars } = await returnedChars(home, 'real', q);
      console.log(`  [irrelevant] "${q}": ${matches} match(es), ${chars}ch returned (${pct(chars / totalChars)} of total)`);
    }

    // ── Comparison: real vs synthetic ──
    console.log(`\n── Comparison: Real Docs vs Synthetic Fixture ──`);
    await checkoutBranch(home, 'synthetic', true);
    await onboardBranch({ home, branch: 'synthetic', input: SYNTHETIC_COSMO_BACKEND });
    const synthStatus = await statusForBranch(home, 'synthetic');
    const synthChars = await totalDocChars(home, 'synthetic');

    // Run same recall queries on synthetic branch
    let synthRecallHits = 0;
    for (const c of RECALL_CASES) {
      const res = await resolveContext({ home, branch: 'synthetic', query: c.query });
      if (res.matches.length > 0) synthRecallHits++;
    }
    let synthPrecisionHits = 0;
    for (const c of PRECISION_CASES) {
      const res = await resolveContext({ home, branch: 'synthetic', query: c.query });
      if (res.matches.length === 0) synthPrecisionHits++;
    }

    console.log(`                   Real Docs    Synthetic`);
    console.log(`  Doc count:        ${status.doc_count.toString().padStart(5)}          ${synthStatus.doc_count.toString().padStart(5)}`);
    console.log(`  Total chars:      ${totalChars.toString().padStart(5)}         ${synthChars.toString().padStart(5)}`);
    console.log(`  Index chars:      ${status.index_chars.toString().padStart(5)}          ${synthStatus.index_chars.toString().padStart(5)}`);
    console.log(`  Recall score:     ${pct(recallScore).padStart(6)}       ${pct(synthRecallHits / RECALL_CASES.length).padStart(6)}`);
    console.log(`  Precision score:  ${pct(precisionScore).padStart(6)}       ${pct(synthPrecisionHits / PRECISION_CASES.length).padStart(6)}`);

    // ── Summary ──
    const f1 = 2 * recallScore * precisionScore / (recallScore + precisionScore || 1);
    const qualityChecks = [
      status.doc_count === gcDocs.length,
      status.index_chars <= 2000,
      status.warnings.length === 0,
    ];
    const qualityScore = qualityChecks.filter(Boolean).length / qualityChecks.length;

    console.log(`\n═══ Summary ═══`);
    console.log(`Onboarding quality: ${pct(qualityScore)}`);
    console.log(`Recall:             ${pct(recallScore)}  (${recallHits}/${RECALL_CASES.length} queries found)`);
    console.log(`Precision:          ${pct(precisionScore)}  (${precisionHits}/${PRECISION_CASES.length} irrelevant → empty)`);
    console.log(`F1 score:           ${pct(f1)}`);

    const overall = (qualityScore + recallScore + precisionScore) / 3;
    const passed = overall >= 0.7;
    console.log(`Overall:            ${pct(overall)}  ${passed ? '✅ PASS' : '❌ FAIL'}`);

    if (!passed) process.exitCode = 1;
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

await main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
