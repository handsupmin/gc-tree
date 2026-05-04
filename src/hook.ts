import { mkdir, open, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';

import { DEFAULT_BRANCH } from './paths.js';
import {
  hookCachePath,
  hookCacheDir,
} from './paths.js';
import { branchScopeStatus, readBranchRepoMap, resolveBranchForRepo } from './repo-map.js';
import { resolveContext } from './resolve.js';
import { readHead, statusForBranch } from './store.js';
import type { GcTreeResolveMatch } from './types.js';
import type { GcTreeResolveScopeStatus } from './repo-map.js';

export interface GcTreeHookPayload {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  hook_event_name?: string;
  user_prompt?: string;
  prompt?: string;
}

const SELF_REVIEW_INTERVAL = 5;


interface GcTreeHookCache {
  version: 1;
  session_id: string;
  gc_branch: string | null;
  current_repo: string | null;
  repo_scope_status: GcTreeResolveScopeStatus | null;
  branch_empty: boolean;
  branch_excluded: boolean;
  no_match_signatures: string[];
  unmapped_shown_repos: string[];
  prompt_count: number;
  last_session_start_signature?: string;
  last_session_start_at?: string;
  last_prompt_signature?: string;
  last_prompt_at?: string;
  updated_at: string;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function hashQuery(query: string): string {
  return createHash('sha1').update(normalizeText(query).toLowerCase()).digest('hex');
}

function recentDuplicate(previousAt: string | undefined, now: Date, windowMs = 5000): boolean {
  if (!previousAt) return false;
  const previousMs = Date.parse(previousAt);
  if (!Number.isFinite(previousMs)) return false;
  return now.getTime() - previousMs <= windowMs;
}

function limitMatches(matches: GcTreeResolveMatch[], max = 3): GcTreeResolveMatch[] {
  return matches.slice(0, max);
}

function displayKeyword(match: GcTreeResolveMatch): string {
  return (match.label || match.title || match.id).trim();
}

function formatMatches(matches: GcTreeResolveMatch[]): string {
  return limitMatches(matches)
    .map((match) => {
      const summary = match.summary?.trim() ?? '';
      const excerpt = match.excerpt?.trim() ?? '';
      const context = summary || excerpt;
      const shortContext = context.length > 180 ? `${context.slice(0, 177).trim()}...` : context;
      const showDoc = `gctree show-doc --id "${match.id}"`;
      return [
        `[${displayKeyword(match)}]`,
        shortContext,
        `details: ${showDoc}`,
      ].join('\n');
    })
    .join('\n\n');
}

function buildSessionStartContext({
  gcBranch,
  currentRepo,
  repoScopeStatus,
}: {
  gcBranch: string;
  currentRepo: string | null;
  repoScopeStatus: GcTreeResolveScopeStatus;
}): string {
  return `[gc-tree] active gc-branch="${gcBranch}" repo="${currentRepo || 'unscoped'}" scope=${repoScopeStatus}.`;
}

function buildEmptyBranchContext({
  gcBranch,
  currentRepo,
  cached,
}: {
  gcBranch: string;
  currentRepo: string | null;
  cached: boolean;
}): string {
  return `[gc-tree] no docs: gc-branch="${gcBranch}" repo="${currentRepo || 'unscoped'}"${cached ? ' cached=true' : ''}.`;
}

function buildExcludedContext({
  gcBranch,
  currentRepo,
  cached,
}: {
  gcBranch: string;
  currentRepo: string | null;
  cached: boolean;
}): string {
  return `[gc-tree] excluded: gc-branch="${gcBranch}" repo="${currentRepo || 'unknown'}"${cached ? ' cached=true' : ''}.`;
}

function buildNoMatchContext({
  gcBranch,
  currentRepo,
  cached,
}: {
  gcBranch: string;
  currentRepo: string | null;
  cached: boolean;
}): string {
  return `[gc-tree] no match: gc-branch="${gcBranch}" repo="${currentRepo || 'unscoped'}"${cached ? ' cached=true' : ''}.`;
}

function buildMatchContext({
  gcBranch,
  currentRepo,
  repoScopeStatus,
  matches,
}: {
  gcBranch: string;
  currentRepo: string | null;
  repoScopeStatus: GcTreeResolveScopeStatus;
  matches: GcTreeResolveMatch[];
}): string {
  const lines = [
    `[gc-tree] USE FIRST: ${Math.min(matches.length, 3)} docs gc-branch="${gcBranch}" repo="${currentRepo || 'unscoped'}" scope=${repoScopeStatus}.`,
    '',
    formatMatches(matches),
    '',
    `Rule: 위 문서를 먼저 근거로 삼고, 부족하면 details 명령으로 세부 정보를 확인.`,
  ];
  if (repoScopeStatus === 'unmapped' && currentRepo) {
    lines.push(`Note: repo "${currentRepo}" is unmapped. If it belongs here, offer to run: gctree set-repo-scope --branch ${gcBranch} --include`);
  }
  return lines.join('\n');
}

function buildSelfReviewAppend(promptCount: number): string {
  return [
    `\n[gc-tree] self-review #${promptCount}: silently check whether durable context should change. If yes, propose a targeted gc-tree update; otherwise say nothing.`,
  ].join('\n');
}

async function readHookCache(home: string, sessionId: string): Promise<GcTreeHookCache | null> {
  try {
    const raw = await readFile(hookCachePath(home, sessionId), 'utf8');
    return JSON.parse(raw) as GcTreeHookCache;
  } catch {
    return null;
  }
}

async function writeHookCache(home: string, cache: GcTreeHookCache): Promise<void> {
  const path = hookCachePath(home, cache.session_id);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
}

function nextCacheState(
  previous: GcTreeHookCache | null,
  {
    sessionId,
    gcBranch,
    currentRepo,
    repoScopeStatus,
  }: {
    sessionId: string;
    gcBranch: string;
    currentRepo: string | null;
    repoScopeStatus: GcTreeResolveScopeStatus;
  },
): GcTreeHookCache {
  const changed =
    !previous ||
    previous.gc_branch !== gcBranch ||
    previous.current_repo !== currentRepo ||
    previous.repo_scope_status !== repoScopeStatus;

  return {
    version: 1,
    session_id: sessionId,
    gc_branch: gcBranch,
    current_repo: currentRepo,
    repo_scope_status: repoScopeStatus,
    branch_empty: changed ? false : previous.branch_empty,
    branch_excluded: changed ? false : previous.branch_excluded,
    no_match_signatures: changed ? [] : previous.no_match_signatures,
    unmapped_shown_repos: previous?.unmapped_shown_repos ?? [],
    prompt_count: (previous?.prompt_count ?? 0) + 1,
    last_session_start_signature: previous?.last_session_start_signature,
    last_session_start_at: previous?.last_session_start_at,
    last_prompt_signature: previous?.last_prompt_signature,
    last_prompt_at: previous?.last_prompt_at,
    updated_at: new Date().toISOString(),
  };
}

function readSessionId(payload: GcTreeHookPayload): string {
  const raw = normalizeText(payload.session_id || '');
  return raw || 'default-session';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireHookLock(home: string, sessionId: string): Promise<() => Promise<void>> {
  const lockPath = `${hookCachePath(home, sessionId)}.lock`;
  await mkdir(hookCacheDir(home), { recursive: true });

  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const handle = await open(lockPath, 'wx');
      await handle.close();
      return async () => {
        await rm(lockPath, { force: true });
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'EEXIST') throw error;

      try {
        const info = await stat(lockPath);
        if (Date.now() - info.mtimeMs > 10_000) {
          await rm(lockPath, { force: true });
          continue;
        }
      } catch {
        continue;
      }
      await sleep(25);
    }
  }

  return async () => {};
}

export async function dispatchGcTreeHook({
  event,
  home,
  payload,
}: {
  event: 'SessionStart' | 'UserPromptSubmit';
  home: string;
  payload: GcTreeHookPayload;
}): Promise<{ hookSpecificOutput: { hookEventName: string; additionalContext: string } } | null> {
  const sessionId = readSessionId(payload);
  const releaseLock = await acquireHookLock(home, sessionId);
  try {
  const cwd = payload.cwd || process.cwd();
  const head = (await readHead(home)) || DEFAULT_BRANCH;
  const resolved = await resolveBranchForRepo({ home, head, cwd });
  const gcBranch = resolved.gc_branch;
  const currentRepo = resolved.current_repo;
  const mapping = await readBranchRepoMap(home);
  const repoScopeStatus = branchScopeStatus(mapping, gcBranch, currentRepo);
  const now = new Date();

  if (event === 'SessionStart') {
    const previousCache = await readHookCache(home, sessionId);
    const signature = hashQuery(`${event}:${gcBranch}:${currentRepo || ''}:${repoScopeStatus}`);
    if (
      previousCache?.last_session_start_signature === signature &&
      recentDuplicate(previousCache.last_session_start_at, now)
    ) {
      return null;
    }
    await writeHookCache(home, {
      version: 1,
      session_id: sessionId,
      gc_branch: gcBranch,
      current_repo: currentRepo,
      repo_scope_status: repoScopeStatus,
      branch_empty: previousCache?.branch_empty ?? false,
      branch_excluded: previousCache?.branch_excluded ?? false,
      no_match_signatures: previousCache?.no_match_signatures ?? [],
      unmapped_shown_repos: previousCache?.unmapped_shown_repos ?? [],
      prompt_count: previousCache?.prompt_count ?? 0,
      last_session_start_signature: signature,
      last_session_start_at: now.toISOString(),
      last_prompt_signature: previousCache?.last_prompt_signature,
      last_prompt_at: previousCache?.last_prompt_at,
      updated_at: now.toISOString(),
    });
    return {
      hookSpecificOutput: {
        hookEventName: event,
        additionalContext: buildSessionStartContext({
          gcBranch,
          currentRepo,
          repoScopeStatus,
        }),
      },
    };
  }

  const prompt = normalizeText(payload.user_prompt || payload.prompt || '');
  if (!prompt) return null;

  const branchStatus = await statusForBranch(home, gcBranch);
  const previousCache = await readHookCache(home, sessionId);
  const promptSignature = hashQuery(`${event}:${gcBranch}:${currentRepo || ''}:${repoScopeStatus}:${prompt}`);
  if (
    previousCache?.last_prompt_signature === promptSignature &&
    recentDuplicate(previousCache.last_prompt_at, now)
  ) {
    return null;
  }
  const cache = nextCacheState(previousCache, {
    sessionId,
    gcBranch,
    currentRepo,
    repoScopeStatus,
  });
  cache.last_prompt_signature = promptSignature;
  cache.last_prompt_at = now.toISOString();

  let additionalContext: string;

  if (repoScopeStatus === 'excluded') {
    cache.branch_excluded = true;
    additionalContext = buildExcludedContext({
      gcBranch,
      currentRepo,
      cached: previousCache?.branch_excluded === true,
    });
  } else if (branchStatus.doc_count === 0) {
    const wasCached = cache.branch_empty;
    cache.branch_empty = true;
    additionalContext = buildEmptyBranchContext({ gcBranch, currentRepo, cached: wasCached });
  } else if (repoScopeStatus === 'unmapped' && currentRepo && cache.unmapped_shown_repos.includes(currentRepo)) {
    // Already showed context for this unmapped repo this session — skip silently.
    cache.updated_at = now.toISOString();
    await writeHookCache(home, cache);
    return null;
  } else {
    // For unmapped repos: use prompt only (no repo prefix) to avoid bias; apply higher score threshold.
    const isUnmapped = repoScopeStatus === 'unmapped';
    const query = !isUnmapped && currentRepo ? `${currentRepo} ${prompt}` : prompt;
    const signature = hashQuery(query);

    if (!isUnmapped && cache.no_match_signatures.includes(signature)) {
      additionalContext = buildNoMatchContext({ gcBranch, currentRepo, cached: true });
    } else {
      const result = await resolveContext({ home, branch: gcBranch, query });
      const effectiveMatches = result.matches;

      if (effectiveMatches.length === 0) {
        if (isUnmapped) {
          // Unmapped + no strong match: skip silently, no noise.
          cache.updated_at = now.toISOString();
          await writeHookCache(home, cache);
          return null;
        }
        cache.no_match_signatures = [...new Set([...cache.no_match_signatures, signature])];
        additionalContext = buildNoMatchContext({ gcBranch, currentRepo, cached: false });
      } else {
        if (!isUnmapped) {
          cache.no_match_signatures = cache.no_match_signatures.filter((entry) => entry !== signature);
        } else if (currentRepo) {
          // Mark this unmapped repo as shown so we don't repeat next prompt.
          cache.unmapped_shown_repos = [...new Set([...cache.unmapped_shown_repos, currentRepo])];
        }
        additionalContext = buildMatchContext({ gcBranch, currentRepo, repoScopeStatus, matches: effectiveMatches });
      }
    }

    if (cache.prompt_count > 0 && cache.prompt_count % SELF_REVIEW_INTERVAL === 0) {
      additionalContext += buildSelfReviewAppend(cache.prompt_count);
      cache.prompt_count = 0;
    }
  }

  cache.updated_at = now.toISOString();
  await writeHookCache(home, cache);

  return { hookSpecificOutput: { hookEventName: event, additionalContext } };
  } finally {
    await releaseLock();
  }
}
