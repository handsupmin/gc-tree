#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { stdin } from 'node:process';

import { onboardBranch } from './onboard.js';
import { buildProviderLaunchPlan, maybeLaunchProvider, promptProviderSelection } from './provider.js';
import { DEFAULT_BRANCH, resolveHome } from './paths.js';
import {
  branchRepoMapPath,
  branchScopeStatus,
  detectCurrentRepoId,
  promptResolveScopeDecision,
  readBranchRepoMap,
  resolveBranchForRepo,
  setRepoScopeForBranch,
} from './repo-map.js';
import { resolveContext } from './resolve.js';
import { scaffoldHostIntegration } from './scaffold.js';
import { requirePreferredProvider, writeSettings, readSettings } from './settings.js';
import { checkoutBranch, initHome, listBranches, readHead, resetBranchContext, statusForBranch, ensureBranchExists, isBranchContextEmpty } from './store.js';
import type { GcTreeContextUpdateInput, GcTreeOnboardingInput, GcTreeProvider } from './types.js';
import { updateBranchContext } from './update.js';

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function usage(): never {
  console.error(`Usage:
  gctree init [--home DIR] [--provider <codex|claude-code>] [--target DIR] [--no-launch]
  gctree checkout <branch> [--home DIR]
  gctree checkout -b <branch> [--home DIR]
  gctree branches [--home DIR]
  gctree repo-map [--home DIR]
  gctree set-repo-scope --branch NAME [--repo NAME] [--cwd DIR] (--include|--exclude) [--home DIR]
  gctree status [--home DIR] [--cwd DIR]
  gctree onboard [--home DIR] [--branch NAME] [--provider <codex|claude-code>] [--target DIR] [--no-launch]
  gctree reset-gc-branch [--home DIR] [--branch NAME] --yes
  gctree resolve --query TEXT [--home DIR] [--branch NAME] [--cwd DIR]
  gctree update-global-context [--home DIR] [--branch NAME] [--provider <codex|claude-code>] [--target DIR] [--no-launch]
  gctree update-gc [--home DIR] [--branch NAME] [--provider <codex|claude-code>] [--target DIR] [--no-launch]
  gctree ugc [--home DIR] [--branch NAME] [--provider <codex|claude-code>] [--target DIR] [--no-launch]
  gctree scaffold --host <codex|claude-code> [--target DIR] [--force]

Internal commands:
  gctree __apply-onboarding --input FILE [--home DIR] [--branch NAME]
  gctree __apply-update --input FILE [--home DIR] [--branch NAME]
`);
  process.exit(1);
}

async function readJsonFile<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

function normalizeProvider(value: string | undefined): GcTreeProvider | undefined {
  if (!value) return undefined;
  if (value === 'codex' || value === 'claude-code') return value;
  throw new Error(`unsupported provider: ${value}`);
}

async function resolvePreferredProvider(home: string, explicitProvider?: string): Promise<GcTreeProvider> {
  return normalizeProvider(explicitProvider) || (await requirePreferredProvider(home));
}

async function ensureScaffold({
  provider,
  targetDir,
  force = false,
}: {
  provider: GcTreeProvider;
  targetDir: string;
  force?: boolean;
}): Promise<{ host: GcTreeProvider; target_dir: string; written: string[]; skipped_existing: string[] }> {
  return scaffoldHostIntegration({ host: provider, targetDir, force });
}

async function maybePromptProvider(explicitProvider: string | undefined): Promise<GcTreeProvider> {
  const provider = normalizeProvider(explicitProvider);
  if (provider) return provider;
  if (!stdin.isTTY) return 'codex';
  return promptProviderSelection();
}

async function launchGuidedFlow({
  provider,
  targetDir,
  gcBranch,
  command,
  noLaunch,
}: {
  provider: GcTreeProvider;
  targetDir: string;
  gcBranch: string;
  command: 'gc-onboard' | 'gc-update-global-context';
  noLaunch: boolean;
}) {
  const plan = buildProviderLaunchPlan({ provider, targetDir, gcBranch, command });
  if (noLaunch) return plan;
  return maybeLaunchProvider(plan);
}

async function main(): Promise<void> {
  const rawCommand = process.argv[2];
  if (!rawCommand || rawCommand === '--help' || rawCommand === 'help') usage();
  const command = rawCommand === 'update-gc' || rawCommand === 'ugc' ? 'update-global-context' : rawCommand;
  const home = resolveHome(readArg('--home'));

  switch (command) {
    case 'init': {
      const provider = await maybePromptProvider(readArg('--provider'));
      const targetDir = readArg('--target') || process.cwd();
      const result = await initHome(home);
      const settings = await writeSettings(home, provider);
      const scaffold = await ensureScaffold({ provider, targetDir, force: hasFlag('--force') });
      const launch = (await isBranchContextEmpty(home, result.gc_branch))
        ? await launchGuidedFlow({
            provider,
            targetDir,
            gcBranch: result.gc_branch,
            command: 'gc-onboard',
            noLaunch: hasFlag('--no-launch'),
          })
        : null;
      console.log(JSON.stringify({ ...result, preferred_provider: settings.preferred_provider, scaffold, launch }, null, 2));
      return;
    }
    case 'checkout': {
      const create = hasFlag('-b');
      const branch = create ? process.argv[4] : process.argv[3];
      if (!branch) usage();
      const result = await checkoutBranch(home, branch, create);
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case 'branches': {
      const result = await listBranches(home);
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case 'repo-map': {
      const mapping = await readBranchRepoMap(home);
      console.log(JSON.stringify({ path: branchRepoMapPath(home), mapping }, null, 2));
      return;
    }
    case 'set-repo-scope': {
      const gcBranch = readArg('--branch');
      if (!gcBranch) usage();
      await ensureBranchExists(home, gcBranch);
      const repo = readArg('--repo') || (await detectCurrentRepoId(readArg('--cwd') || process.cwd()));
      if (!repo) {
        throw new Error('could not determine the current repo. Pass --repo explicitly or run this inside a git repository.');
      }
      const include = hasFlag('--include');
      const exclude = hasFlag('--exclude');
      if (include === exclude) {
        throw new Error('set-repo-scope requires exactly one of --include or --exclude.');
      }
      const mapping = await setRepoScopeForBranch({
        home,
        branch: gcBranch,
        repo,
        mode: include ? 'include' : 'exclude',
      });
      console.log(
        JSON.stringify(
          {
            path: branchRepoMapPath(home),
            branch: gcBranch,
            repo,
            mode: include ? 'include' : 'exclude',
            mapping,
          },
          null,
          2,
        ),
      );
      return;
    }
    case 'status': {
      const gcBranch = (await readHead(home)) || DEFAULT_BRANCH;
      const result = await statusForBranch(home, gcBranch);
      const settings = await readSettings(home);
      const mapping = await readBranchRepoMap(home);
      const currentRepo = await detectCurrentRepoId(readArg('--cwd') || process.cwd());
      console.log(
        JSON.stringify(
          {
            ...result,
            preferred_provider: settings?.preferred_provider || null,
            current_repo: currentRepo,
            branch_repo_map_path: branchRepoMapPath(home),
            repo_scope_status: branchScopeStatus(mapping, gcBranch, currentRepo),
          },
          null,
          2,
        ),
      );
      return;
    }
    case 'onboard': {
      const gcBranch = readArg('--branch') || (await readHead(home)) || DEFAULT_BRANCH;
      await ensureBranchExists(home, gcBranch);
      if (!(await isBranchContextEmpty(home, gcBranch))) {
        throw new Error(
          `gc-branch is not empty: ${gcBranch}. Run \`gctree reset-gc-branch --branch ${gcBranch} --yes\` to re-onboard it, or use \`gctree update-global-context\` to make a guided durable update.`,
        );
      }
      const provider = await resolvePreferredProvider(home, readArg('--provider'));
      const targetDir = readArg('--target') || process.cwd();
      const scaffold = await ensureScaffold({ provider, targetDir, force: hasFlag('--force') });
      const launch = await launchGuidedFlow({
        provider,
        targetDir,
        gcBranch,
        command: 'gc-onboard',
        noLaunch: hasFlag('--no-launch'),
      });
      console.log(JSON.stringify({ mode: 'guided_onboarding', gc_branch: gcBranch, preferred_provider: provider, scaffold, launch }, null, 2));
      return;
    }
    case '__apply-onboarding': {
      const inputPath = readArg('--input');
      if (!inputPath) usage();
      const input = await readJsonFile<GcTreeOnboardingInput>(inputPath);
      const gcBranch = readArg('--branch') || input.branch || (await readHead(home)) || DEFAULT_BRANCH;
      if (!(await isBranchContextEmpty(home, gcBranch))) {
        throw new Error(
          `gc-branch is not empty: ${gcBranch}. Run \`gctree reset-gc-branch --branch ${gcBranch} --yes\` to re-onboard it, or use \`gctree update-global-context\` instead.`,
        );
      }
      const result = await onboardBranch({ home, input, branch: gcBranch });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case 'reset-gc-branch': {
      if (!hasFlag('--yes')) {
        throw new Error('reset-gc-branch is destructive. Re-run with --yes to confirm.');
      }
      const gcBranch = readArg('--branch') || (await readHead(home)) || DEFAULT_BRANCH;
      const result = await resetBranchContext(home, gcBranch);
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case 'resolve': {
      const query = readArg('--query');
      if (!query) usage();
      const head = (await readHead(home)) || DEFAULT_BRANCH;
      const resolved = await resolveBranchForRepo({
        home,
        head,
        explicitBranch: readArg('--branch') || undefined,
        cwd: readArg('--cwd') || process.cwd(),
      });
      let gcBranch = resolved.gc_branch;
      const currentRepo = resolved.current_repo;
      let scopeStatus = resolved.scope_status;

      if (currentRepo && scopeStatus === 'unmapped') {
        const decision = await promptResolveScopeDecision(gcBranch, currentRepo);
        if (decision === 'always-use') {
          await setRepoScopeForBranch({ home, branch: gcBranch, repo: currentRepo, mode: 'include' });
          scopeStatus = 'included';
        } else if (decision === 'ignore') {
          await setRepoScopeForBranch({ home, branch: gcBranch, repo: currentRepo, mode: 'exclude' });
          console.log(
            JSON.stringify(
              {
                gc_branch: gcBranch,
                query,
                current_repo: currentRepo,
                source: resolved.source,
                repo_scope_status: 'excluded',
                matches: [],
              },
              null,
              2,
            ),
          );
          return;
        }
      }

      if (currentRepo && scopeStatus === 'excluded') {
        console.log(
          JSON.stringify(
            {
              gc_branch: gcBranch,
              query,
              current_repo: currentRepo,
              source: resolved.source,
              repo_scope_status: 'excluded',
              matches: [],
            },
            null,
            2,
          ),
        );
        return;
      }

      const result = await resolveContext({ home, branch: gcBranch, query });
      console.log(
        JSON.stringify(
          {
            gc_branch: result.branch,
            query: result.query,
            current_repo: currentRepo,
            source: resolved.source,
            repo_scope_status: scopeStatus,
            matches: result.matches,
          },
          null,
          2,
        ),
      );
      return;
    }
    case 'update-global-context': {
      const gcBranch = readArg('--branch') || (await readHead(home)) || DEFAULT_BRANCH;
      await ensureBranchExists(home, gcBranch);
      if (await isBranchContextEmpty(home, gcBranch)) {
        throw new Error(`gc-branch is empty: ${gcBranch}. Run \`gctree onboard --branch ${gcBranch}\` to create its context first.`);
      }
      const provider = await resolvePreferredProvider(home, readArg('--provider'));
      const targetDir = readArg('--target') || process.cwd();
      const scaffold = await ensureScaffold({ provider, targetDir, force: hasFlag('--force') });
      const launch = await launchGuidedFlow({
        provider,
        targetDir,
        gcBranch,
        command: 'gc-update-global-context',
        noLaunch: hasFlag('--no-launch'),
      });
      console.log(JSON.stringify({ mode: 'guided_update', gc_branch: gcBranch, preferred_provider: provider, scaffold, launch }, null, 2));
      return;
    }
    case '__apply-update': {
      const inputPath = readArg('--input');
      if (!inputPath) usage();
      const input = await readJsonFile<GcTreeContextUpdateInput>(inputPath);
      const gcBranch = readArg('--branch') || input.branch || (await readHead(home)) || DEFAULT_BRANCH;
      const result = await updateBranchContext({ home, input, branch: gcBranch });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case 'scaffold': {
      const host = normalizeProvider(readArg('--host'));
      if (!host) usage();
      const targetDir = readArg('--target') || process.cwd();
      const result = await scaffoldHostIntegration({
        host,
        targetDir,
        force: hasFlag('--force'),
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    default:
      usage();
  }
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
