import { access, readFile, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join } from 'node:path';
import { mkdir } from 'node:fs/promises';

type HookEventName = 'SessionStart' | 'UserPromptSubmit';

const MARKERS = {
  codex: {
    start: '<!-- gctree:codex:start -->',
    end: '<!-- gctree:codex:end -->',
  },
  claude: {
    start: '<!-- gctree:claude:start -->',
    end: '<!-- gctree:claude:end -->',
  },
} as const;

export async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function injectManagedBlock(existing: string, content: string, start: string, end: string): string {
  const block = `${start}\n${content.trimEnd()}\n${end}`;
  const startIndex = existing.indexOf(start);
  const endIndex = existing.indexOf(end);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    return `${existing.slice(0, startIndex).trimEnd()}\n\n${block}\n${existing.slice(endIndex + end.length).trimStart()}`.trimEnd() + '\n';
  }

  const trimmed = existing.trimEnd();
  return `${trimmed ? `${trimmed}\n\n` : ''}${block}\n`;
}

function removeManagedBlock(existing: string, start: string, end: string): string {
  const startIndex = existing.indexOf(start);
  const endIndex = existing.indexOf(end);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) return existing;
  const before = existing.slice(0, startIndex).trimEnd();
  const after = existing.slice(endIndex + end.length).trimStart();
  const merged = [before, after].filter(Boolean).join('\n\n');
  return merged ? `${merged}\n` : '';
}

export async function upsertManagedMarkdownBlock({
  filePath,
  content,
  marker,
}: {
  filePath: string;
  content: string;
  marker: keyof typeof MARKERS;
}): Promise<'created' | 'updated'> {
  const { start, end } = MARKERS[marker];
  const existing = (await pathExists(filePath)) ? await readFile(filePath, 'utf8') : '';
  const next = injectManagedBlock(existing, content, start, end);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, next, 'utf8');
  return existing ? 'updated' : 'created';
}

export async function removeManagedMarkdownBlock({
  filePath,
  marker,
}: {
  filePath: string;
  marker: keyof typeof MARKERS;
}): Promise<'removed' | 'deleted' | 'missing'> {
  if (!(await pathExists(filePath))) return 'missing';
  const { start, end } = MARKERS[marker];
  const existing = await readFile(filePath, 'utf8');
  const next = removeManagedBlock(existing, start, end);
  if (!next.trim()) {
    await rm(filePath, { force: true });
    return 'deleted';
  }
  if (next === existing) return 'missing';
  await writeFile(filePath, next, 'utf8');
  return 'removed';
}

function buildHookEntry(event: HookEventName) {
  return {
    type: 'command',
    command: `gctree __hook --event ${event}`,
    metadata: {
      owner: 'gctree',
    },
    ...(event === 'UserPromptSubmit' ? { timeout: 10 } : {}),
  } as Record<string, unknown>;
}

function ensureObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? (value as Record<string, any>) : {};
}

function isGcTreeHook(entry: Record<string, unknown>, event: HookEventName): boolean {
  const command = String(entry.command || '');
  const owner = ensureObject(entry.metadata).owner;
  return owner === 'gctree' || command === `gctree __hook --event ${event}`;
}

function mergeHookJson(raw: string | null, target: 'codex' | 'claude-code'): string {
  const parsed = raw ? ensureObject(JSON.parse(raw)) : {};
  const hooks = ensureObject(parsed.hooks);

  const sessionEvent: HookEventName = 'SessionStart';
  const promptEvent: HookEventName = 'UserPromptSubmit';

  const ensureEventArray = (event: HookEventName): any[] => {
    const current = Array.isArray(hooks[event]) ? hooks[event] : [];
    hooks[event] = current;
    return current;
  };

  const upsertGroup = (event: HookEventName, matcher?: string) => {
    const groups = ensureEventArray(event);
    let group = groups.find((candidate) => {
      const hooksArr = Array.isArray(candidate?.hooks) ? candidate.hooks : [];
      return hooksArr.some((entry: Record<string, unknown>) => isGcTreeHook(ensureObject(entry), event));
    });
    if (!group) {
      group = matcher ? { matcher, hooks: [] } : { hooks: [] };
      groups.push(group);
    }
    if (!Array.isArray(group.hooks)) group.hooks = [];
    group.hooks = group.hooks.filter((entry: Record<string, unknown>) => !isGcTreeHook(ensureObject(entry), event));
    group.hooks.push(buildHookEntry(event));
  };

  upsertGroup(sessionEvent, target === 'codex' ? 'startup|resume' : '*');
  upsertGroup(promptEvent, target === 'codex' ? undefined : '*');

  return `${JSON.stringify({ ...parsed, hooks }, null, 2)}\n`;
}

function unmergeHookJson(raw: string, events: HookEventName[]): string {
  const parsed = ensureObject(JSON.parse(raw));
  const hooks = ensureObject(parsed.hooks);

  for (const event of events) {
    const groups = Array.isArray(hooks[event]) ? hooks[event] : [];
    const nextGroups = groups
      .map((group: Record<string, unknown>) => {
        const hooksArr = Array.isArray(group.hooks) ? group.hooks : [];
        const nextHooks = hooksArr.filter((entry: Record<string, unknown>) => !isGcTreeHook(ensureObject(entry), event));
        return nextHooks.length > 0 ? { ...group, hooks: nextHooks } : null;
      })
      .filter(Boolean);

    if (nextGroups.length > 0) hooks[event] = nextGroups;
    else delete hooks[event];
  }

  const { hooks: _unused, ...otherFields } = parsed;
  const hasOtherFields = Object.keys(otherFields).length > 0;
  if (Object.keys(hooks).length === 0) {
    return hasOtherFields ? `${JSON.stringify(otherFields, null, 2)}\n` : '';
  }
  return `${JSON.stringify({ ...otherFields, hooks }, null, 2)}\n`;
}

export async function mergeGcTreeHooksJson({
  filePath,
  target,
}: {
  filePath: string;
  target: 'codex' | 'claude-code';
}): Promise<'created' | 'updated'> {
  const existing = (await pathExists(filePath)) ? await readFile(filePath, 'utf8') : null;
  const next = mergeHookJson(existing, target);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, next, 'utf8');
  return existing ? 'updated' : 'created';
}

export async function unmergeGcTreeHooksJson(filePath: string): Promise<'removed' | 'deleted' | 'missing'> {
  if (!(await pathExists(filePath))) return 'missing';
  const existing = await readFile(filePath, 'utf8');
  const next = unmergeHookJson(existing, ['SessionStart', 'UserPromptSubmit']);
  if (!next.trim()) {
    await rm(filePath, { force: true });
    return 'deleted';
  }
  if (next === existing) return 'missing';
  await writeFile(filePath, next, 'utf8');
  return 'removed';
}

export function gctreeManagedMarkdownTargets(targetDir: string) {
  return {
    codex: join(targetDir, 'AGENTS.md'),
    claude: join(targetDir, 'CLAUDE.md'),
  };
}

export function gctreeHookJsonTargets(targetDir: string) {
  return {
    codex: join(targetDir, '.codex', 'hooks.json'),
    claude: join(targetDir, '.claude', 'hooks', 'hooks.json'),
  };
}
