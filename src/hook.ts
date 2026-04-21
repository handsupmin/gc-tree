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
}

interface GcTreeHookCache {
  version: 1;
  session_id: string;
  gc_branch: string | null;
  current_repo: string | null;
  repo_scope_status: GcTreeResolveScopeStatus | null;
  branch_empty: boolean;
  branch_excluded: boolean;
  no_match_signatures: string[];
  updated_at: string;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function hashQuery(query: string): string {
  return createHash('sha1').update(normalizeText(query).toLowerCase()).digest('hex');
}

function limitMatches(matches: GcTreeResolveMatch[], max = 3): GcTreeResolveMatch[] {
  return matches.slice(0, max);
}

function formatMatches(matches: GcTreeResolveMatch[]): string {
  return limitMatches(matches)
    .map(
      (match, index) =>
        `${index + 1}. ${match.title} [id=${match.id}]\n   Summary: ${match.summary}\n   Excerpt: ${match.excerpt}`,
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
  return [
    `gc-tree auto-resolve is active for this session.`,
    `Active gc-branch: "${gcBranch}".`,
    `Current repo: ${currentRepo || 'unscoped'}.`,
    `Repo scope status: ${repoScopeStatus}.`,
    `Before acting on new user prompts, use gc-tree hook context first. If the hook reports no reusable global context, avoid redundant resolve calls for the same session state unless the repo, gc-branch, or task changes materially.`,
  ].join(' ');
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
  return [
    `gc-tree auto-resolve ${cached ? 'used cached state' : 'checked the active gc-branch'} and found no reusable global context for this session because gc-branch "${gcBranch}" currently has 0 docs.`,
    `Repo: ${currentRepo || 'unscoped'}.`,
    `Treat this as "no reusable global context yet" until the gc-branch content changes or a different repo/gc-branch is active.`,
  ].join(' ');
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
  return [
    `gc-tree auto-resolve ${cached ? 'used cached state' : 'checked the active gc-branch'} and found that repo "${currentRepo || 'unknown'}" is excluded from gc-branch "${gcBranch}".`,
    `No reusable global context applies here unless the branch-repo mapping changes.`,
  ].join(' ');
}

function buildNoMatchContext({
  gcBranch,
  currentRepo,
  query,
  cached,
}: {
  gcBranch: string;
  currentRepo: string | null;
  query: string;
  cached: boolean;
}): string {
  return [
    `gc-tree auto-resolve ${cached ? 'skipped a redundant lookup using cached no-match state' : 'checked the active gc-branch'} and found no reusable global context for this prompt in gc-branch "${gcBranch}".`,
    `Repo: ${currentRepo || 'unscoped'}.`,
    `Query: "${query}".`,
    `Only re-run resolve if the repo, gc-branch, or task changes materially.`,
  ].join(' ');
}

function buildMatchContext({
  gcBranch,
  currentRepo,
  repoScopeStatus,
  query,
  matches,
}: {
  gcBranch: string;
  currentRepo: string | null;
  repoScopeStatus: GcTreeResolveScopeStatus;
  query: string;
  matches: GcTreeResolveMatch[];
}): string {
  return [
    `gc-tree auto-resolve checked gc-branch "${gcBranch}" for repo "${currentRepo || 'unscoped'}" (scope: ${repoScopeStatus}) before this prompt.`,
    `Query: "${query}".`,
    `Use these matching gc-tree summaries before planning or implementation:`,
    formatMatches(matches),
    `Read full docs only if the summaries are insufficient. Each doc has a ## Summary section at the top — read that before the full body.`,
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

  if (event === 'SessionStart') {
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

  const prompt = normalizeText(payload.user_prompt || '');
  if (!prompt) return null;

  const branchStatus = await statusForBranch(home, gcBranch);
  const previousCache = await readHookCache(home, sessionId);
  const cache = nextCacheState(previousCache, {
    sessionId,
    gcBranch,
    currentRepo,
    repoScopeStatus,
  });

  if (repoScopeStatus === 'excluded') {
    cache.branch_excluded = true;
    cache.updated_at = new Date().toISOString();
    await writeHookCache(home, cache);
    return {
      hookSpecificOutput: {
        hookEventName: event,
        additionalContext: buildExcludedContext({
          gcBranch,
          currentRepo,
          cached: previousCache?.branch_excluded === true,
        }),
      },
    };
  }

  if (branchStatus.doc_count === 0) {
    const wasCached = cache.branch_empty;
    cache.branch_empty = true;
    cache.updated_at = new Date().toISOString();
    await writeHookCache(home, cache);
    return {
      hookSpecificOutput: {
        hookEventName: event,
        additionalContext: buildEmptyBranchContext({
          gcBranch,
          currentRepo,
          cached: wasCached,
        }),
      },
    };
  }

  const query = currentRepo ? `${currentRepo} ${prompt}` : prompt;
  const signature = hashQuery(query);

  if (cache.no_match_signatures.includes(signature)) {
    cache.updated_at = new Date().toISOString();
    await writeHookCache(home, cache);
    return {
      hookSpecificOutput: {
        hookEventName: event,
        additionalContext: buildNoMatchContext({
          gcBranch,
          currentRepo,
          query,
          cached: true,
        }),
      },
    };
  }

  const result = await resolveContext({ home, branch: gcBranch, query });

  if (result.matches.length === 0) {
    cache.no_match_signatures = [...new Set([...cache.no_match_signatures, signature])];
    cache.updated_at = new Date().toISOString();
    await writeHookCache(home, cache);
    return {
      hookSpecificOutput: {
        hookEventName: event,
        additionalContext: buildNoMatchContext({
          gcBranch,
          currentRepo,
          query,
          cached: false,
        }),
      },
    };
  }

  cache.no_match_signatures = cache.no_match_signatures.filter((entry) => entry !== signature);
  cache.updated_at = new Date().toISOString();
  await writeHookCache(home, cache);

  return {
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext: buildMatchContext({
        gcBranch,
        currentRepo,
        repoScopeStatus,
        query,
        matches: result.matches,
      }),
    },
  };
}
