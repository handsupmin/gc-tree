import { readdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
  gctreeGlobalHookJsonTarget,
  gctreeGlobalRoot,
  gctreeHookJsonTargets,
  gctreeManagedMarkdownTargets,
  pathExists,
  removeManagedMarkdownBlock,
  unmergeGcTreeHooksJson,
} from './integration-files.js';
import { scaffoldFiles } from './scaffold.js';

type GcTreeUninstallHost = 'codex' | 'claude-code' | 'both';
type GcTreeScaffoldScope = 'local' | 'global';

async function pathHasEntries(path: string): Promise<boolean> {
  const entries = await readdir(path).catch(() => []);
  return entries.length > 0;
}

async function pruneEmptyParents(targetPath: string, stopDir: string): Promise<void> {
  let current = dirname(targetPath);
  while (current.startsWith(stopDir) && current !== stopDir) {
    if (await pathHasEntries(current)) return;
    await rm(current, { recursive: true, force: true });
    current = dirname(current);
  }
}

function hostsFor(mode: GcTreeUninstallHost): Array<'codex' | 'claude-code'> {
  return mode === 'both' ? ['claude-code', 'codex'] : [mode];
}

async function uninstallHostScaffold({
  host,
  scope,
  targetDir,
  removed,
}: {
  host: 'codex' | 'claude-code';
  scope: GcTreeScaffoldScope;
  targetDir: string;
  removed: string[];
}): Promise<void> {
  const isCodex = host === 'codex';
  const managedMarkdownPath = scope === 'local'
    ? (isCodex ? gctreeManagedMarkdownTargets(targetDir).codex : gctreeManagedMarkdownTargets(targetDir).claude)
    : null;
  const hookPath = scope === 'local'
    ? (isCodex ? gctreeHookJsonTargets(targetDir).codex : gctreeHookJsonTargets(targetDir).claude)
    : gctreeGlobalHookJsonTarget(host);

  if (managedMarkdownPath) {
    const markdownStatus = await removeManagedMarkdownBlock({
      filePath: managedMarkdownPath,
      marker: isCodex ? 'codex' : 'claude',
    });
    if (markdownStatus !== 'missing') {
      removed.push(managedMarkdownPath);
      await pruneEmptyParents(managedMarkdownPath, targetDir);
    }
  }

  const hookStatus = await unmergeGcTreeHooksJson(hookPath);
  if (hookStatus !== 'missing') {
    removed.push(hookPath);
    await pruneEmptyParents(hookPath, targetDir);
  }

  const extraTargets = scaffoldFiles(host, scope)
    .map((file) => join(targetDir, file.path))
    .filter((path) => path !== hookPath && path !== managedMarkdownPath);

  for (const target of [...new Set(extraTargets)]) {
    if (!(await pathExists(target))) continue;
    await rm(target, { recursive: true, force: true });
    removed.push(target);
    await pruneEmptyParents(target, targetDir);
  }
}

export async function uninstallGcTree({
  home,
  targetDir,
  host = 'both',
  keepHome = false,
}: {
  home: string;
  targetDir?: string;
  host?: GcTreeUninstallHost;
  keepHome?: boolean;
}): Promise<{
  target_dir: string;
  home: string;
  host: GcTreeUninstallHost;
  home_removed: boolean;
  removed: string[];
}> {
  const removed: string[] = [];

  for (const entry of hostsFor(host)) {
    await uninstallHostScaffold({
      host: entry,
      scope: 'global',
      targetDir: gctreeGlobalRoot(entry),
      removed,
    });
    if (targetDir) {
      await uninstallHostScaffold({
        host: entry,
        scope: 'local',
        targetDir,
        removed,
      });
    }
  }

  let homeRemoved = false;
  if (!keepHome && (await pathExists(home))) {
    await rm(home, { recursive: true, force: true });
    homeRemoved = true;
    removed.push(home);
  }

  return {
    target_dir: targetDir || '(global)',
    home,
    host,
    home_removed: homeRemoved,
    removed,
  };
}
