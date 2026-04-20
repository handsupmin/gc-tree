import { readdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
  gctreeHookJsonTargets,
  gctreeManagedMarkdownTargets,
  pathExists,
  removeManagedMarkdownBlock,
  unmergeGcTreeHooksJson,
} from './integration-files.js';
import { scaffoldFiles } from './scaffold.js';

type GcTreeUninstallHost = 'codex' | 'claude-code' | 'both';

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

export async function uninstallGcTree({
  home,
  targetDir,
  host = 'both',
  keepHome = false,
}: {
  home: string;
  targetDir: string;
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
  const markdownTargets = gctreeManagedMarkdownTargets(targetDir);
  const hookTargets = gctreeHookJsonTargets(targetDir);

  for (const entry of hostsFor(host)) {
    if (entry === 'codex') {
      const markdownStatus = await removeManagedMarkdownBlock({
        filePath: markdownTargets.codex,
        marker: 'codex',
      });
      if (markdownStatus !== 'missing') {
        removed.push(markdownTargets.codex);
        await pruneEmptyParents(markdownTargets.codex, targetDir);
      }

      const hookStatus = await unmergeGcTreeHooksJson(hookTargets.codex);
      if (hookStatus !== 'missing') {
        removed.push(hookTargets.codex);
        await pruneEmptyParents(hookTargets.codex, targetDir);
      }
    } else {
      const markdownStatus = await removeManagedMarkdownBlock({
        filePath: markdownTargets.claude,
        marker: 'claude',
      });
      if (markdownStatus !== 'missing') {
        removed.push(markdownTargets.claude);
        await pruneEmptyParents(markdownTargets.claude, targetDir);
      }

      const hookStatus = await unmergeGcTreeHooksJson(hookTargets.claude);
      if (hookStatus !== 'missing') {
        removed.push(hookTargets.claude);
        await pruneEmptyParents(hookTargets.claude, targetDir);
      }
    }

    const extraTargets = scaffoldFiles(entry)
      .map((file) => join(targetDir, file.path))
      .filter((path) =>
        entry === 'codex'
          ? path !== markdownTargets.codex && path !== hookTargets.codex
          : path !== markdownTargets.claude && path !== hookTargets.claude,
      );

    for (const target of [...new Set(extraTargets)]) {
      if (!(await pathExists(target))) continue;
      await rm(target, { recursive: true, force: true });
      removed.push(target);
      await pruneEmptyParents(target, targetDir);
    }
  }

  let homeRemoved = false;
  if (!keepHome && (await pathExists(home))) {
    await rm(home, { recursive: true, force: true });
    homeRemoved = true;
    removed.push(home);
  }

  return {
    target_dir: targetDir,
    home,
    host,
    home_removed: homeRemoved,
    removed,
  };
}
