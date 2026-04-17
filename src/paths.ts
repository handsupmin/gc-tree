import { homedir } from 'node:os';
import { join } from 'node:path';

export const DEFAULT_BRANCH = 'main';
export const INDEX_WARNING_CHARS = 2000;

export function resolveHome(explicitHome?: string): string {
  return explicitHome || process.env.GCTREE_HOME || join(homedir(), '.gctree');
}

export function headPath(home: string): string {
  return join(home, 'HEAD');
}

export function settingsPath(home: string): string {
  return join(home, 'settings.json');
}

export function branchesRoot(home: string): string {
  return join(home, 'branches');
}

export function branchDir(home: string, branch: string): string {
  return join(branchesRoot(home), branch);
}

export function branchMetaPath(home: string, branch: string): string {
  return join(branchDir(home, branch), 'branch.json');
}

export function branchIndexPath(home: string, branch: string): string {
  return join(branchDir(home, branch), 'index.md');
}

export function branchDocsDir(home: string, branch: string): string {
  return join(branchDir(home, branch), 'docs');
}

