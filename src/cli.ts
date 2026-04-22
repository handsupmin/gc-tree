#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { stdin, stderr, stdout } from 'node:process';

import { readAsciiLogo, readAsciiTree } from './ascii.js';
import { dispatchGcTreeHook } from './hook.js';
import { onboardBranch } from './onboard.js';
import {
  buildProviderLaunchPlan,
  maybeLaunchProvider,
  promptLanguageSelection,
  promptLaunchProviderSelection,
  promptProviderSelection,
} from './provider.js';
import { DEFAULT_BRANCH, branchDir, resolveHome } from './paths.js';
import {
  branchRepoMapPath,
  branchScopeStatus,
  detectCurrentRepoId,
  detectRepoRoot,
  promptResolveScopeDecision,
  readBranchRepoMap,
  resolveBranchForRepo,
  setRepoScopeForBranch,
} from './repo-map.js';
import { findRelatedDocs, getDocById, resolveContext } from './resolve.js';
import { scaffoldHostIntegration } from './scaffold.js';
import { requirePreferredProvider, writeSettings, readSettings } from './settings.js';
import { checkoutBranch, initHome, listBranches, readHead, resetBranchContext, statusForBranch, ensureBranchExists, isBranchContextEmpty } from './store.js';
import type { GcTreeContextUpdateInput, GcTreeOnboardingInput, GcTreeProvider, GcTreeProviderMode } from './types.js';
import { updateBranchContext } from './update.js';
import { uninstallGcTree } from './uninstall.js';
import { verifyOnboarding } from './verify-onboarding.js';

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function readPackageVersion(): Promise<string> {
  const candidates = ['../package.json', '../../package.json'];
  for (const relative of candidates) {
    try {
      const raw = await readFile(new URL(relative, import.meta.url), 'utf8');
      return JSON.parse(raw).version || '0.0.0';
    } catch {
      continue;
    }
  }
  return '0.0.0';
}

function usage(): never {
  console.error(`Usage:
  gctree --version
  gctree plant
  gctree init [--home DIR] [--provider <claude-code|codex|both>] [--language TEXT] [--target DIR] [--no-launch]
  gctree checkout <branch> [--home DIR]
  gctree checkout -b <branch> [--home DIR]
  gctree branches [--home DIR]
  gctree repo-map [--home DIR]
  gctree set-repo-scope --branch NAME [--repo NAME] [--cwd DIR] (--include|--exclude) [--home DIR]
  gctree status [--home DIR] [--cwd DIR]
  gctree onboard [--home DIR] [--branch NAME] [--provider <codex|claude-code>] [--target DIR] [--no-launch]
  gctree verify-onboarding [--home DIR] [--branch NAME]
  gctree reset-gc-branch [--home DIR] [--branch NAME] --yes
  gctree uninstall [--home DIR] [--target DIR] [--host <codex|claude-code|both>] [--keep-home] --yes
  gctree resolve --query TEXT [--home DIR] [--branch NAME] [--cwd DIR]
  gctree show-doc --id ID [--home DIR] [--branch NAME]
  gctree related --id ID [--home DIR] [--branch NAME]
  gctree update-global-context [--home DIR] [--branch NAME] [--provider <codex|claude-code>] [--target DIR] [--no-launch]
  gctree update-gc [--home DIR] [--branch NAME] [--provider <codex|claude-code>] [--target DIR] [--no-launch]
  gctree ugc [--home DIR] [--branch NAME] [--provider <codex|claude-code>] [--target DIR] [--no-launch]
  gctree scaffold --host <codex|claude-code|both> [--target DIR] [--force]

Internal commands:
  gctree __apply-onboarding --input FILE [--home DIR] [--branch NAME]
  gctree __apply-update --input FILE [--home DIR] [--branch NAME]
  gctree __hook --event <SessionStart|UserPromptSubmit> [--home DIR]
`);
  process.exit(1);
}

async function readJsonFile<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

async function readStdinText(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function compactMatchCommands(id: string, home: string, branch: string): { show_doc: string; related: string } {
  const homeArg = `--home ${JSON.stringify(home)}`;
  const branchArg = `--branch ${JSON.stringify(branch)}`;
  return {
    show_doc: `gctree show-doc --id ${JSON.stringify(id)} ${homeArg} ${branchArg}`,
    related: `gctree related --id ${JSON.stringify(id)} ${homeArg} ${branchArg}`,
  };
}

function normalizeProvider(value: string | undefined): GcTreeProvider | undefined {
  if (!value) return undefined;
  if (value === 'codex' || value === 'claude-code') return value;
  throw new Error(`unsupported provider: ${value}`);
}

function normalizeProviderMode(value: string | undefined): GcTreeProviderMode | undefined {
  if (!value) return undefined;
  if (value === 'codex' || value === 'claude-code' || value === 'both') return value;
  throw new Error(`unsupported provider mode: ${value}`);
}

async function resolvePreferredProvider(home: string, explicitProvider?: string): Promise<GcTreeProvider> {
  return normalizeProvider(explicitProvider) || (await requirePreferredProvider(home));
}

async function ensureScaffold({
  providerMode,
  targetDir,
  force = false,
  scope = 'local',
}: {
  providerMode: GcTreeProviderMode;
  targetDir?: string;
  force?: boolean;
  scope?: 'local' | 'global';
}): Promise<{ hosts: GcTreeProviderMode; target_dir: string; written: string[]; skipped_existing: string[] }> {
  const hosts: GcTreeProvider[] = providerMode === 'both' ? ['claude-code', 'codex'] : [providerMode];
  const combined = { hosts: providerMode, target_dir: scope === 'global' ? '(global)' : (targetDir || process.cwd()), written: [] as string[], skipped_existing: [] as string[] };
  for (const host of hosts) {
    const result = await scaffoldHostIntegration({ host, targetDir, force, scope });
    combined.written.push(...result.written);
    combined.skipped_existing.push(...result.skipped_existing);
  }
  return combined;
}

async function maybePromptProviderMode(explicitProvider: string | undefined): Promise<GcTreeProviderMode> {
  const provider = normalizeProviderMode(explicitProvider);
  if (provider) return provider;
  if (!stdin.isTTY) return 'claude-code';
  return promptProviderSelection();
}

async function maybePromptLanguage(explicitLanguage: string | undefined): Promise<string> {
  if (explicitLanguage?.trim()) return explicitLanguage.trim();
  if (!stdin.isTTY) return 'English';
  return promptLanguageSelection();
}

async function resolveLaunchProvider(providerMode: GcTreeProviderMode): Promise<GcTreeProvider> {
  if (providerMode === 'both') {
    if (!stdin.isTTY) return 'claude-code';
    return promptLaunchProviderSelection();
  }
  return providerMode;
}

async function launchGuidedFlow({
  provider,
  providerMode,
  preferredLanguage,
  targetDir,
  gcBranch,
  command,
  noLaunch,
}: {
  provider: GcTreeProvider;
  providerMode: GcTreeProviderMode;
  preferredLanguage: string;
  targetDir: string;
  gcBranch: string;
  command: 'gc-onboard' | 'gc-update-global-context';
  noLaunch: boolean;
}) {
  const plan = buildProviderLaunchPlan({ provider, providerMode, preferredLanguage, targetDir, gcBranch, command });
  if (noLaunch) return plan;
  return maybeLaunchProvider(plan);
}

async function main(): Promise<void> {
  if (hasFlag('--version') || hasFlag('-v')) {
    stdout.write(`${await readPackageVersion()}\n`);
    return;
  }

  const rawCommand = process.argv[2];
  if (!rawCommand || rawCommand === '--help' || rawCommand === 'help') usage();
  const command = rawCommand === 'update-gc' || rawCommand === 'ugc' ? 'update-global-context' : rawCommand;
  const home = resolveHome(readArg('--home'));

  switch (command) {
    case 'plant': {
      const asciiTree = await readAsciiTree();
      stdout.write(asciiTree);
      if (!asciiTree.endsWith('\n')) stdout.write('\n');
      return;
    }
    case 'init': {
      const asciiLogo = await readAsciiLogo();
      stderr.write(asciiLogo);
      if (!asciiLogo.endsWith('\n')) stderr.write('\n');
      const providerMode = await maybePromptProviderMode(readArg('--provider'));
      const provider = await resolveLaunchProvider(providerMode);
      const preferredLanguage = await maybePromptLanguage(readArg('--language'));
      const explicitTargetDir = readArg('--target');
      const launchTargetDir = explicitTargetDir || process.cwd();
      const result = await initHome(home);
      const settings = await writeSettings({
        home,
        providerMode,
        preferredProvider: provider,
        preferredLanguage,
      });
      const globalScaffold = await ensureScaffold({ providerMode, scope: 'global', force: hasFlag('--force') });
      const scaffold = explicitTargetDir
        ? await ensureScaffold({ providerMode, targetDir: explicitTargetDir, scope: 'local', force: hasFlag('--force') })
        : null;
      const launch = (await isBranchContextEmpty(home, result.gc_branch))
        ? await launchGuidedFlow({
            provider,
            providerMode,
            preferredLanguage,
            targetDir: launchTargetDir,
            gcBranch: result.gc_branch,
            command: 'gc-onboard',
            noLaunch: hasFlag('--no-launch'),
          })
        : null;
      console.log(
        JSON.stringify(
          {
            ...result,
            provider_mode: settings.provider_mode,
            preferred_provider: settings.preferred_provider,
            preferred_language: settings.preferred_language,
            global_scaffold: globalScaffold,
            scaffold,
            launch,
          },
          null,
          2,
        ),
      );
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
      if (!existsSync(branchDir(home, gcBranch))) {
        throw new Error('gc-tree is not initialized. Run `gctree init` first.');
      }
      const result = await statusForBranch(home, gcBranch);
      const settings = await readSettings(home);
      const mapping = await readBranchRepoMap(home);
      const currentRepo = await detectCurrentRepoId(readArg('--cwd') || process.cwd());
      console.log(
        JSON.stringify(
          {
            ...result,
            provider_mode: settings?.provider_mode || null,
            preferred_provider: settings?.preferred_provider || null,
            preferred_language: settings?.preferred_language || null,
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
      const settings = await readSettings(home);
      const targetDir = readArg('--target') || process.cwd();
      const scaffold = readArg('--target')
        ? await ensureScaffold({ providerMode: settings?.provider_mode || provider, targetDir, scope: 'local', force: hasFlag('--force') })
        : null;
      const launch = await launchGuidedFlow({
        provider,
        providerMode: settings?.provider_mode || provider,
        preferredLanguage: settings?.preferred_language || 'English',
        targetDir,
        gcBranch,
        command: 'gc-onboard',
        noLaunch: hasFlag('--no-launch'),
      });
      console.log(JSON.stringify({ mode: 'guided_onboarding', gc_branch: gcBranch, preferred_provider: provider, scaffold, launch }, null, 2));
      return;
    }
    case 'verify-onboarding': {
      const gcBranch = readArg('--branch') || (await readHead(home)) || DEFAULT_BRANCH;
      const result = await verifyOnboarding({ home, branch: gcBranch });
      console.log(JSON.stringify(result, null, 2));
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
    case 'uninstall': {
      if (!hasFlag('--yes')) {
        throw new Error('uninstall is destructive. Re-run with --yes to confirm.');
      }
      const host = normalizeProviderMode(readArg('--host')) || 'both';
      const result = await uninstallGcTree({
        home,
        targetDir: readArg('--target'),
        host,
        keepHome: hasFlag('--keep-home'),
      });
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
      const settings = await readSettings(home);

      if (currentRepo && scopeStatus === 'unmapped') {
        const decision = await promptResolveScopeDecision(gcBranch, currentRepo, settings?.preferred_language || 'English');
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
              status: 'excluded',
              gc_branch: gcBranch,
              query,
              current_repo: currentRepo,
              source: resolved.source,
              repo_scope_status: 'excluded',
              message: `Repo "${currentRepo}" is excluded from gc-branch "${gcBranch}".`,
              matches: [],
            },
            null,
            2,
          ),
        );
        return;
      }

      const branchStatus = await statusForBranch(home, gcBranch);
      if (branchStatus.doc_count === 0) {
        console.log(
          JSON.stringify(
            {
              status: 'empty_branch',
              gc_branch: gcBranch,
              query,
              current_repo: currentRepo,
              source: resolved.source,
              repo_scope_status: scopeStatus,
              message: `gc-branch "${gcBranch}" has no docs yet. Run gctree onboard to add durable context.`,
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
            status: result.matches.length > 0 ? 'matched' : 'no_match',
            gc_branch: result.branch,
            query: result.query,
            current_repo: currentRepo,
            source: resolved.source,
            repo_scope_status: scopeStatus,
            message:
              result.matches.length > 0
                ? `Found ${result.matches.length} matching docs. Use show-doc/related for progressive disclosure.`
                : `No matching docs found in gc-branch "${gcBranch}" for this query.`,
            matches: result.matches.map((match) => ({
              ...match,
              commands: compactMatchCommands(match.id, home, gcBranch),
            })),
          },
          null,
          2,
        ),
      );
      return;
    }
    case 'show-doc': {
      const id = readArg('--id');
      if (!id) usage();
      const gcBranch = readArg('--branch') || (await readHead(home)) || DEFAULT_BRANCH;
      const branchStatus = await statusForBranch(home, gcBranch);
      if (branchStatus.doc_count === 0) {
        console.log(JSON.stringify({ status: 'empty_branch', gc_branch: gcBranch, id, message: `gc-branch "${gcBranch}" has no docs yet.`, doc: null }, null, 2));
        return;
      }
      const doc = await getDocById({ home, branch: gcBranch, id });
      console.log(
        JSON.stringify(
          {
            status: doc ? 'matched' : 'doc_not_found',
            gc_branch: gcBranch,
            id,
            message: doc ? `Loaded doc "${id}".` : `Doc "${id}" was not found in gc-branch "${gcBranch}".`,
            doc,
          },
          null,
          2,
        ),
      );
      return;
    }
    case 'related': {
      const id = readArg('--id');
      if (!id) usage();
      const gcBranch = readArg('--branch') || (await readHead(home)) || DEFAULT_BRANCH;
      const result = await findRelatedDocs({ home, branch: gcBranch, id });
      console.log(
        JSON.stringify(
          {
            status: result.status,
            gc_branch: gcBranch,
            id,
            message:
              result.status === 'matched'
                ? `Found ${result.matches.length} related docs for "${id}".`
                : result.status === 'no_related_docs'
                  ? `No related docs found for "${id}".`
                  : result.status === 'doc_not_found'
                    ? `Doc "${id}" was not found in gc-branch "${gcBranch}".`
                    : `gc-branch "${gcBranch}" has no docs yet.`,
            selected: result.selected
              ? {
                  id: result.selected.id,
                  title: result.selected.title,
                  path: result.selected.path,
                  summary: result.selected.summary,
                }
              : null,
            matches: result.matches.map((match) => ({
              ...match,
              commands: compactMatchCommands(match.id, home, gcBranch),
            })),
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
      const settings = await readSettings(home);
      const targetDir = readArg('--target') || process.cwd();
      const scaffold = readArg('--target')
        ? await ensureScaffold({ providerMode: settings?.provider_mode || provider, targetDir, scope: 'local', force: hasFlag('--force') })
        : null;
      const launch = await launchGuidedFlow({
        provider,
        providerMode: settings?.provider_mode || provider,
        preferredLanguage: settings?.preferred_language || 'English',
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
    case '__hook': {
      const event = readArg('--event');
      if (event !== 'SessionStart' && event !== 'UserPromptSubmit') usage();
      const raw = await readStdinText();
      const payload = raw.trim() ? JSON.parse(raw) : {};
      const result = await dispatchGcTreeHook({
        event,
        home,
        payload,
      });
      if (result) {
        stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      }
      return;
    }
    case 'scaffold': {
      const host = normalizeProviderMode(readArg('--host'));
      if (!host) usage();
      const targetDir = readArg('--target') || process.cwd();
      const result = await ensureScaffold({
        providerMode: host,
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
