import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

type GcTreeHost = 'codex' | 'claude-code';

function renderCodexAgentsSnippet(): string {
  return [
    '# gctree Codex integration snippet',
    '',
    '- Before planning or implementation, resolve reusable global context with `gctree resolve --query "<task>"` when branch-level context may matter.',
    '- Keep the active gctree branch explicit with `gctree status` and `gctree checkout <branch>` when switching products or clients.',
    '- When durable global context should change, use `gctree update-global-context --input <file>` to draft a proposal first.',
    '- Apply changes only after explicit user approval with `gctree update-global-context --input <file> --yes` or `gctree apply-update --proposal <file>`.',
    '',
  ].join('\n');
}

function renderCodexBootstrapPrompt(): string {
  return [
    '# gctree Bootstrap',
    '',
    '- Use `gctree status` to confirm the active global context branch before relying on branch-level docs.',
    '- Use `gctree resolve --query "<task or repo question>"` before planning or implementation when reusable global context may help.',
    '- Read summaries first. Only open full docs if the summaries are not enough.',
    '- Treat gctree docs as explicit source-of-truth markdown, not hidden memory.',
    '- Never mutate global context silently. Draft with `gctree update-global-context --input <file>` and apply only after explicit approval.',
    '',
  ].join('\n');
}

function renderCodexResolveSkill(): string {
  return [
    '---',
    'description: Resolve reusable global context from the active gctree branch.',
    'argument_hint: "<query>"',
    '---',
    '',
    'Treat everything after this command as the query.',
    '',
    '1. Run `gctree status` if the active branch is unclear.',
    '2. Run `gctree resolve --query "<query>"`.',
    '3. Read summaries first and only read full docs if needed.',
    '',
  ].join('\n');
}

function renderCodexUpdateSkill(): string {
  return [
    '---',
    'description: Draft or apply a reusable global context update through gctree.',
    'argument_hint: "--input <file> [--yes]"',
    '---',
    '',
    'Default behavior is proposal-first.',
    '',
    '- `gctree update-global-context --input <file>` drafts a proposal and prints the summary plus apply command.',
    '- `gctree update-global-context --input <file> --yes` applies immediately, but only when explicit approval is already available.',
    '- If approval is not explicit, stop after the proposal and ask the user.',
    '',
  ].join('\n');
}

function renderClaudeSnippet(): string {
  return [
    '# gctree Claude Code integration snippet',
    '',
    '- Before planning or implementation, resolve reusable global context with `gctree resolve --query "<task>"` when branch-level context may matter.',
    '- Use `gctree status` and `gctree checkout <branch>` to keep product/client context trees separate.',
    '- Use `gctree update-global-context --input <file>` to draft durable context updates and apply only after explicit approval.',
    '',
  ].join('\n');
}

function renderClaudeResolveCommand(): string {
  return [
    '---',
    'description: Resolve reusable global context from the active gctree branch.',
    'argument-hint: "<query>"',
    '---',
    '',
    '1. Run `gctree status` if the active branch is unclear.',
    '2. Run `gctree resolve --query "$ARGUMENTS"`.',
    '3. Read summaries first and only read full docs if needed.',
    '',
  ].join('\n');
}

function renderClaudeUpdateCommand(): string {
  return [
    '---',
    'description: Draft or apply a reusable global context update through gctree.',
    'argument-hint: "--input <file> [--yes]"',
    '---',
    '',
    'Default behavior is proposal-first.',
    '',
    '- `gctree update-global-context --input <file>` drafts a proposal and prints the summary plus apply command.',
    '- `gctree update-global-context --input <file> --yes` applies immediately, but only when explicit approval is already available.',
    '- If approval is not explicit, stop after the proposal and ask the user.',
    '',
  ].join('\n');
}

function scaffoldFiles(host: GcTreeHost): Array<{ path: string; content: string }> {
  if (host === 'codex') {
    return [
      { path: 'AGENTS.gctree.md', content: renderCodexAgentsSnippet() },
      { path: '.codex/prompts/gctree-bootstrap.md', content: renderCodexBootstrapPrompt() },
      { path: '.codex/skills/gctree-resolve-context/SKILL.md', content: renderCodexResolveSkill() },
      { path: '.codex/skills/gctree-update-global-context/SKILL.md', content: renderCodexUpdateSkill() },
    ];
  }

  return [
    { path: 'CLAUDE.gctree.md', content: renderClaudeSnippet() },
    { path: '.claude/commands/gctree-resolve-context.md', content: renderClaudeResolveCommand() },
    { path: '.claude/commands/gctree-update-global-context.md', content: renderClaudeUpdateCommand() },
  ];
}

export async function scaffoldHostIntegration({
  host,
  targetDir,
  force = false,
}: {
  host: GcTreeHost;
  targetDir: string;
  force?: boolean;
}): Promise<{ host: GcTreeHost; target_dir: string; written: string[] }> {
  const files = scaffoldFiles(host);
  const written: string[] = [];

  const targets = files.map((file) => ({
    ...file,
    fullPath: join(targetDir, file.path),
  }));

  if (!force) {
    const collisions: string[] = [];
    for (const target of targets) {
      try {
        await access(target.fullPath);
        collisions.push(target.fullPath);
      } catch {
        // file does not exist
      }
    }
    if (collisions.length > 0) {
      throw new Error(
        `refusing to overwrite existing scaffold files without --force: ${collisions.join(', ')}`,
      );
    }
  }

  for (const target of targets) {
    await mkdir(dirname(target.fullPath), { recursive: true });
    await writeFile(target.fullPath, `${target.content.trimEnd()}\n`, 'utf8');
    written.push(target.fullPath);
  }

  return {
    host,
    target_dir: targetDir,
    written,
  };
}
