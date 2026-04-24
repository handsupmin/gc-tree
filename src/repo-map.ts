import { access, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stderr } from 'node:process';

export interface GcTreeBranchRepoRule {
  include?: string[];
  exclude?: string[];
}

export interface GcTreeBranchRepoMap {
  [branch: string]: GcTreeBranchRepoRule;
}

export type GcTreeResolveScopeStatus = 'included' | 'excluded' | 'unmapped' | 'unscoped';
export type GcTreeResolveScopeDecision = 'continue-once' | 'always-use' | 'ignore';

export function branchRepoMapPath(home: string): string {
  return join(home, 'branch-repo-map.json');
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function normalizeRule(rule: GcTreeBranchRepoRule | undefined): GcTreeBranchRepoRule {
  return {
    ...(rule?.include?.length ? { include: unique(rule.include) } : {}),
    ...(rule?.exclude?.length ? { exclude: unique(rule.exclude) } : {}),
  };
}

export async function readBranchRepoMap(home: string): Promise<GcTreeBranchRepoMap> {
  try {
    const raw = await readFile(branchRepoMapPath(home), 'utf8');
    const parsed = JSON.parse(raw) as GcTreeBranchRepoMap;
    return Object.fromEntries(Object.entries(parsed).map(([branch, rule]) => [branch, normalizeRule(rule)]));
  } catch {
    return {};
  }
}

export async function writeBranchRepoMap(home: string, mapping: GcTreeBranchRepoMap): Promise<GcTreeBranchRepoMap> {
  const normalized = Object.fromEntries(Object.entries(mapping).map(([branch, rule]) => [branch, normalizeRule(rule)]));
  await writeFile(branchRepoMapPath(home), `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return normalized;
}

export async function setRepoScopeForBranch({
  home,
  branch,
  repo,
  mode,
}: {
  home: string;
  branch: string;
  repo: string;
  mode: 'include' | 'exclude';
}): Promise<GcTreeBranchRepoMap> {
  const mapping = await readBranchRepoMap(home);
  const current = normalizeRule(mapping[branch]);
  const include = new Set(current.include || []);
  const exclude = new Set(current.exclude || []);

  if (mode === 'include') {
    include.add(repo);
    exclude.delete(repo);
  } else {
    exclude.add(repo);
    include.delete(repo);
  }

  mapping[branch] = normalizeRule({
    include: [...include],
    exclude: [...exclude],
  });
  return writeBranchRepoMap(home, mapping);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function detectRepoRoot(startDir = process.cwd()): Promise<string | null> {
  let current = resolve(startDir);
  while (true) {
    if (await pathExists(join(current, '.git'))) return current;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export async function detectCurrentRepoId(startDir = process.cwd()): Promise<string | null> {
  const root = await detectRepoRoot(startDir);
  return root ? basename(root) : null;
}

function repoMatches(entry: string, repo: string): boolean {
  return entry === repo || basename(entry) === repo || entry === basename(repo);
}

export function branchScopeStatus(mapping: GcTreeBranchRepoMap, branch: string, repo: string | null): GcTreeResolveScopeStatus {
  if (!repo) return 'unscoped';
  const rule = normalizeRule(mapping[branch]);
  if (rule.exclude?.some((e) => repoMatches(e, repo))) return 'excluded';
  if (rule.include?.some((e) => repoMatches(e, repo))) return 'included';
  if ((rule.include?.length || 0) > 0 || (rule.exclude?.length || 0) > 0) return 'unmapped';
  return 'unscoped';
}

export async function resolveBranchForRepo({
  home,
  head,
  explicitBranch,
  cwd = process.cwd(),
}: {
  home: string;
  head: string;
  explicitBranch?: string;
  cwd?: string;
}): Promise<{ gc_branch: string; current_repo: string | null; source: 'explicit' | 'repo-map' | 'head'; scope_status: GcTreeResolveScopeStatus }> {
  const currentRepo = await detectCurrentRepoId(cwd);
  const mapping = await readBranchRepoMap(home);

  if (explicitBranch) {
    return {
      gc_branch: explicitBranch,
      current_repo: currentRepo,
      source: 'explicit',
      scope_status: branchScopeStatus(mapping, explicitBranch, currentRepo),
    };
  }

  if (currentRepo) {
    const includedBranches = Object.entries(mapping)
      .filter(([, rule]) => !rule.exclude?.some((e) => repoMatches(e, currentRepo)) && rule.include?.some((e) => repoMatches(e, currentRepo)))
      .map(([branch]) => branch)
      .sort();

    if (includedBranches.length === 1) {
      const chosen = includedBranches[0]!;
      return {
        gc_branch: chosen,
        current_repo: currentRepo,
        source: 'repo-map',
        scope_status: 'included',
      };
    }

    if (includedBranches.length > 1) {
      const chosen = includedBranches.includes(head) ? head : includedBranches[0]!;
      return {
        gc_branch: chosen,
        current_repo: currentRepo,
        source: 'repo-map',
        scope_status: 'included',
      };
    }
  }

  return {
    gc_branch: head,
    current_repo: currentRepo,
    source: 'head',
    scope_status: branchScopeStatus(mapping, head, currentRepo),
  };
}

export async function promptResolveScopeDecision(
  branch: string,
  repo: string,
  preferredLanguage = 'English',
): Promise<GcTreeResolveScopeDecision> {
  if (!stdin.isTTY && process.env.GCTREE_ALLOW_STDIN_PROMPT !== '1') {
    process.stderr.write(`gc-tree: repo "${repo}" is not mapped to gc-branch "${branch}" — continuing without scope decision.\n`);
    return 'continue-once';
  }

  const rl = createInterface({ input: stdin, output: stderr });
  try {
    const isKorean = preferredLanguage.trim().toLowerCase() === 'korean';
    const answer = (
      await rl.question(
        isKorean
          ? `현재 레포 \"${repo}\"는 gc-branch \"${branch}\"에 아직 매핑되어 있지 않습니다.\n1. 이번만 진행\n2. 앞으로 이 레포에서도 이 gc-branch 사용\n3. 이 레포에서는 이 gc-branch 무시\n> `
          : `Repo \"${repo}\" is not mapped to gc-branch \"${branch}\".\n1. Continue once\n2. Always use this gc-branch for this repo\n3. Ignore this gc-branch for this repo\n> `,
      )
    ).trim();
    if (answer === '2') return 'always-use';
    if (answer === '3') return 'ignore';
    return 'continue-once';
  } finally {
    rl.close();
  }
}
