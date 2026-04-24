import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';

import { DEFAULT_BRANCH } from './paths.js';
import {
  hookCachePath,
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

function formatMatches(matches: GcTreeResolveMatch[]): string {
  return limitMatches(matches)
    .map(
      (match, index) =>
        `${index + 1}. ${match.title} [${match.id}]`,
    )
    .join('\n');
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
  return [
    `[gc-tree] USE FIRST: ${Math.min(matches.length, 3)} docs gc-branch="${gcBranch}" repo="${currentRepo || 'unscoped'}" scope=${repoScopeStatus}.`,
    formatMatches(matches),
    `Rule: apply these docs before tools; if insufficient, open full doc: gctree resolve --id <id>`,
  ].join('\n');
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

export async function dispatchGcTreeHook({
  event,
  home,
  payload,
}: {
  event: 'SessionStart' | 'UserPromptSubmit';
  home: string;
  payload: GcTreeHookPayload;
}): Promise<{ hookSpecificOutput: { hookEventName: string; additionalContext: string } } | null> {
  const cwd = payload.cwd || process.cwd();
  const head = (await readHead(home)) || DEFAULT_BRANCH;
  const resolved = await resolveBranchForRepo({ home, head, cwd });
  const gcBranch = resolved.gc_branch;
  const currentRepo = resolved.current_repo;
  const mapping = await readBranchRepoMap(home);
  const repoScopeStatus = branchScopeStatus(mapping, gcBranch, currentRepo);
  const sessionId = readSessionId(payload);
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
  } else {
    const query = currentRepo ? `${currentRepo} ${prompt}` : prompt;
    const signature = hashQuery(query);

    if (cache.no_match_signatures.includes(signature)) {
      additionalContext = buildNoMatchContext({ gcBranch, currentRepo, cached: true });
    } else {
      const result = await resolveContext({ home, branch: gcBranch, query });

      if (result.matches.length === 0) {
        cache.no_match_signatures = [...new Set([...cache.no_match_signatures, signature])];
        additionalContext = buildNoMatchContext({ gcBranch, currentRepo, cached: false });
      } else {
        cache.no_match_signatures = cache.no_match_signatures.filter((entry) => entry !== signature);
        additionalContext = buildMatchContext({ gcBranch, currentRepo, repoScopeStatus, matches: result.matches });
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
}
