/**
 * Multilingual resolve eval
 *
 * Tests the resolve scoring algorithm against non-English and mixed-language queries.
 * Languages: Chinese, Japanese, Spanish, Italian, Arabic
 * Each language: (1) pure, (2) mixed with English
 *
 * Run:
 *   node --import tsx tests/eval/multilingual.ts
 *   node --import tsx tests/eval/multilingual.ts --verbose
 */

import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const VERBOSE = process.argv.includes('--verbose');

// ─────────────────────────────────────────────
// Test documents — one per language group
// ─────────────────────────────────────────────
interface Doc {
  title: string;
  body: string;
}

const DOCS: Record<string, Doc> = {
  // Chinese
  zh_auth: {
    title: '认证与会话规范',
    body: `## Summary\n访问令牌 TTL 15分钟，每次请求轮换 JWT，refresh token 存在 httpOnly Cookie 中。\n\n## Details\n- 登录接口返回 access token 和 refresh token\n- access token 有效期 15 分钟\n- 每次认证请求自动轮换 token\n- 登出时使 refresh token 失效`,
  },
  zh_deploy: {
    title: '部署与基础设施',
    body: `## Summary\n使用 Kubernetes 和 ArgoCD 进行部署，通过 GitHub Actions 触发流水线。\n\n## Details\n- k8s 集群部署在 AWS EKS\n- ArgoCD 负责 GitOps 同步\n- 每次合并到 main 分支触发自动部署\n- 回滚通过 ArgoCD 界面操作`,
  },

  // Japanese
  ja_auth: {
    title: '認証とセッションの規約',
    body: `## Summary\nアクセストークン TTL 15分、リクエストごとに JWT をローテーション、refresh token は httpOnly Cookie に保存。\n\n## Details\n- ログイン API が access token と refresh token を返す\n- access token の有効期限は 15 分\n- 認証済みリクエストのたびにトークンをローテーション\n- ログアウト時に refresh token を無効化`,
  },
  ja_deploy: {
    title: 'デプロイとインフラ',
    body: `## Summary\nKubernetes と ArgoCD でデプロイ、GitHub Actions でパイプラインをトリガー。\n\n## Details\n- k8s クラスタは AWS EKS 上に構築\n- ArgoCD が GitOps 同期を担当\n- main ブランチへのマージで自動デプロイが走る\n- ロールバックは ArgoCD の UI から操作`,
  },

  // Spanish
  es_auth: {
    title: 'Convenciones de autenticación y sesión',
    body: `## Summary\nTTL de 15 minutos para el access token, rotación de JWT en cada solicitud, refresh token almacenado en cookie httpOnly.\n\n## Details\n- La API de login devuelve access token y refresh token\n- El access token expira en 15 minutos\n- El token se rota en cada solicitud autenticada\n- Al cerrar sesión se invalida el refresh token`,
  },
  es_deploy: {
    title: 'Despliegue e infraestructura',
    body: `## Summary\nDespliegue con Kubernetes y ArgoCD, pipeline activado por GitHub Actions.\n\n## Details\n- El clúster k8s está en AWS EKS\n- ArgoCD gestiona la sincronización GitOps\n- Cada merge a main activa el despliegue automático\n- El rollback se hace desde la interfaz de ArgoCD`,
  },

  // Italian
  it_auth: {
    title: 'Convenzioni di autenticazione e sessione',
    body: `## Summary\nTTL di 15 minuti per l'access token, rotazione JWT ad ogni richiesta, refresh token in cookie httpOnly.\n\n## Details\n- L'API di login restituisce access token e refresh token\n- L'access token scade dopo 15 minuti\n- Il token viene ruotato ad ogni richiesta autenticata\n- Al logout il refresh token viene invalidato`,
  },
  it_deploy: {
    title: 'Deployment e infrastruttura',
    body: `## Summary\nDeploy con Kubernetes e ArgoCD, pipeline attivata da GitHub Actions.\n\n## Details\n- Il cluster k8s è su AWS EKS\n- ArgoCD gestisce la sincronizzazione GitOps\n- Ogni merge su main attiva il deploy automatico\n- Il rollback avviene dall'interfaccia di ArgoCD`,
  },

  // Arabic
  ar_auth: {
    title: 'اتفاقيات المصادقة والجلسة',
    body: `## Summary\nمدة صلاحية access token هي 15 دقيقة، يتم تدوير JWT في كل طلب، ويُخزَّن refresh token في cookie من نوع httpOnly.\n\n## Details\n- تُعيد واجهة تسجيل الدخول access token و refresh token\n- تنتهي صلاحية access token بعد 15 دقيقة\n- يُجدَّد التوكن في كل طلب مصادَق عليه\n- يُبطَل refresh token عند تسجيل الخروج`,
  },
  ar_deploy: {
    title: 'النشر والبنية التحتية',
    body: `## Summary\nالنشر باستخدام Kubernetes و ArgoCD، ويُشغَّل pipeline عبر GitHub Actions.\n\n## Details\n- يعمل مجموعة k8s على AWS EKS\n- يتولى ArgoCD مزامنة GitOps\n- يُطلق كل دمج في main عملية نشر تلقائية\n- يتم التراجع عن التغييرات من واجهة ArgoCD`,
  },
};

// ─────────────────────────────────────────────
// Test cases: [query, expected_title, expect_match]
// ─────────────────────────────────────────────
interface Case {
  lang: string;
  query: string;
  expectedTitle: string;
  expectMatch: boolean;
  note: string;
}

const CASES: Case[] = [
  // Chinese — pure
  { lang: 'zh', query: '认证 JWT 轮换', expectedTitle: '认证与会话规范', expectMatch: true, note: 'ZH pure: auth query' },
  { lang: 'zh', query: '部署 Kubernetes ArgoCD', expectedTitle: '部署与基础设施', expectMatch: true, note: 'ZH pure: deploy query' },
  { lang: 'zh', query: '认证 JWT 轮换', expectedTitle: '部署与基础设施', expectMatch: false, note: 'ZH pure: auth query should NOT match deploy' },
  // Chinese — mixed
  { lang: 'zh', query: 'JWT token 认证 轮换', expectedTitle: '认证与会话规范', expectMatch: true, note: 'ZH+EN mixed: auth query' },
  { lang: 'zh', query: 'Kubernetes EKS 部署 流水线', expectedTitle: '部署与基础设施', expectMatch: true, note: 'ZH+EN mixed: deploy query' },

  // Japanese — pure
  { lang: 'ja', query: '認証 JWT ローテーション', expectedTitle: '認証とセッションの規約', expectMatch: true, note: 'JA pure: auth query' },
  { lang: 'ja', query: 'デプロイ Kubernetes ArgoCD', expectedTitle: 'デプロイとインフラ', expectMatch: true, note: 'JA pure: deploy query' },
  { lang: 'ja', query: '認証 JWT ローテーション', expectedTitle: 'デプロイとインフラ', expectMatch: false, note: 'JA pure: auth query should NOT match deploy' },
  // Japanese — mixed
  { lang: 'ja', query: 'JWT token 認証 ローテーション', expectedTitle: '認証とセッションの規約', expectMatch: true, note: 'JA+EN mixed: auth query' },
  { lang: 'ja', query: 'Kubernetes EKS デプロイ パイプライン', expectedTitle: 'デプロイとインフラ', expectMatch: true, note: 'JA+EN mixed: deploy query' },

  // Spanish — pure
  { lang: 'es', query: 'autenticación JWT rotación sesión', expectedTitle: 'Convenciones de autenticación y sesión', expectMatch: true, note: 'ES pure: auth query' },
  { lang: 'es', query: 'despliegue Kubernetes infraestructura', expectedTitle: 'Despliegue e infraestructura', expectMatch: true, note: 'ES pure: deploy query' },
  { lang: 'es', query: 'autenticación JWT rotación', expectedTitle: 'Despliegue e infraestructura', expectMatch: false, note: 'ES pure: auth query should NOT match deploy' },
  // Spanish — mixed
  { lang: 'es', query: 'JWT token autenticación rotación', expectedTitle: 'Convenciones de autenticación y sesión', expectMatch: true, note: 'ES+EN mixed: auth query' },
  { lang: 'es', query: 'Kubernetes EKS despliegue pipeline', expectedTitle: 'Despliegue e infraestructura', expectMatch: true, note: 'ES+EN mixed: deploy query' },

  // Italian — pure
  { lang: 'it', query: 'autenticazione JWT rotazione sessione', expectedTitle: 'Convenzioni di autenticazione e sessione', expectMatch: true, note: 'IT pure: auth query' },
  { lang: 'it', query: 'deployment Kubernetes infrastruttura', expectedTitle: 'Deployment e infrastruttura', expectMatch: true, note: 'IT pure: deploy query' },
  { lang: 'it', query: 'autenticazione JWT rotazione', expectedTitle: 'Deployment e infrastruttura', expectMatch: false, note: 'IT pure: auth query should NOT match deploy' },
  // Italian — mixed
  { lang: 'it', query: 'JWT token autenticazione rotazione', expectedTitle: 'Convenzioni di autenticazione e sessione', expectMatch: true, note: 'IT+EN mixed: auth query' },
  { lang: 'it', query: 'Kubernetes EKS deployment pipeline', expectedTitle: 'Deployment e infrastruttura', expectMatch: true, note: 'IT+EN mixed: deploy query' },

  // Arabic — pure
  { lang: 'ar', query: 'المصادقة JWT تدوير', expectedTitle: 'اتفاقيات المصادقة والجلسة', expectMatch: true, note: 'AR pure: auth query' },
  { lang: 'ar', query: 'النشر Kubernetes البنية التحتية', expectedTitle: 'النشر والبنية التحتية', expectMatch: true, note: 'AR pure: deploy query' },
  { lang: 'ar', query: 'المصادقة JWT تدوير', expectedTitle: 'النشر والبنية التحتية', expectMatch: false, note: 'AR pure: auth query should NOT match deploy' },
  // Arabic — mixed
  { lang: 'ar', query: 'JWT token مصادقة تدوير', expectedTitle: 'اتفاقيات المصادقة والجلسة', expectMatch: true, note: 'AR+EN mixed: auth query' },
  { lang: 'ar', query: 'Kubernetes EKS نشر تلقائي', expectedTitle: 'النشر والبنية التحتية', expectMatch: true, note: 'AR+EN mixed: deploy query' },
];

// ─────────────────────────────────────────────
// Minimal resolve reimplementation (no file I/O needed)
// ─────────────────────────────────────────────
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','if','in','on','at','to','for',
  'of','with','by','as','is','it','its','be','was','are','were',
  'do','did','has','had','not','no','so','up','out','off','via',
  'vs','per','set','get','run','add','use','new','old','all','any',
]);

function tokenize(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

function makeTokenRegex(token: string): RegExp {
  const isAscii = /^[a-z0-9]+$/.test(token);
  return isAscii
    ? new RegExp(`\\b${token}\\b`)
    : new RegExp(`(?<!\\p{L})${token}(?!\\p{L})`, 'u');
}

function scoreText(text: string, query: string): number {
  const tokens = tokenize(query);
  if (tokens.length === 0) return 0;
  const haystack = String(text || '').toLowerCase();
  return tokens.reduce((sum, token) => {
    try { return sum + (makeTokenRegex(token).test(haystack) ? 1 : 0); }
    catch { return sum + (haystack.includes(token) ? 1 : 0); }
  }, 0);
}

function resolveInMemory(query: string, docs: Doc[]): { title: string; score: number }[] {
  return docs
    .map((doc) => {
      const titleScore = scoreText(doc.title, query);
      const bodyScore = scoreText(doc.body, query);
      return { title: doc.title, score: titleScore * 2 + bodyScore };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
const LANG_NAMES: Record<string, string> = {
  zh: 'Chinese  (中文)',
  ja: 'Japanese (日本語)',
  es: 'Spanish  (Español)',
  it: 'Italian  (Italiano)',
  ar: 'Arabic   (العربية)',
};

const docsByLang: Record<string, Doc[]> = {
  zh: [DOCS.zh_auth, DOCS.zh_deploy],
  ja: [DOCS.ja_auth, DOCS.ja_deploy],
  es: [DOCS.es_auth, DOCS.es_deploy],
  it: [DOCS.it_auth, DOCS.it_deploy],
  ar: [DOCS.ar_auth, DOCS.ar_deploy],
};

console.log('\n═══ Multilingual Resolve Eval ═══\n');

let totalPass = 0;
let totalFail = 0;
const failDetails: string[] = [];

for (const lang of ['zh', 'ja', 'es', 'it', 'ar']) {
  const docs = docsByLang[lang];
  const cases = CASES.filter((c) => c.lang === lang);
  let langPass = 0, langFail = 0;

  console.log(`── ${LANG_NAMES[lang]} ──`);

  for (const c of cases) {
    const matches = resolveInMemory(c.query, docs);
    const matched = matches.some((m) => m.title === c.expectedTitle);
    const ok = matched === c.expectMatch;

    if (ok) {
      langPass++;
      totalPass++;
      if (VERBOSE) {
        const top = matches[0];
        console.log(`  ✓ ${c.note}`);
        console.log(`    query: "${c.query}"`);
        console.log(`    top match: ${top ? `"${top.title}" score=${top.score}` : 'none'}`);
      }
    } else {
      langFail++;
      totalFail++;
      const top = matches[0];
      const detail = `  ✗ ${c.note}\n    query: "${c.query}"\n    expected ${c.expectMatch ? 'match' : 'no match'} for "${c.expectedTitle}"\n    got: ${top ? `"${top.title}" score=${top.score}` : 'no matches'}`;
      failDetails.push(detail);
      if (VERBOSE) console.log(detail);
    }
  }

  const pct = Math.round(langPass / cases.length * 100);
  const status = langFail === 0 ? '✅ PASS' : '❌ FAIL';
  console.log(`  ${status}  ${langPass}/${cases.length} (${pct}%)\n`);
}

// ─────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────
const total = totalPass + totalFail;
const pct = Math.round(totalPass / total * 100);

console.log('═══ Summary ═══');
console.log(`Overall: ${totalPass}/${total} (${pct}%)`);

if (failDetails.length > 0) {
  console.log('\nFailures:');
  for (const d of failDetails) console.log(d);
}

// ─────────────────────────────────────────────
// Token debug (show how each language tokenizes)
// ─────────────────────────────────────────────
if (VERBOSE) {
  console.log('\n── Tokenizer debug ──');
  const samples: [string, string][] = [
    ['ZH pure query', '认证 JWT 轮换'],
    ['ZH no-space',   '认证JWT轮换'],
    ['JA pure query', '認証 JWT ローテーション'],
    ['JA no-space',   '認証JWTローテーション'],
    ['ES query',      'autenticación JWT rotación'],
    ['IT query',      'autenticazione JWT rotazione'],
    ['AR pure',       'المصادقة JWT تدوير'],
    ['AR+EN mixed',   'JWT token مصادقة تدوير'],
  ];
  for (const [label, text] of samples) {
    console.log(`  ${label.padEnd(18)}: ${JSON.stringify(tokenize(text))}`);
  }
}

process.exitCode = totalFail > 0 ? 1 : 0;
