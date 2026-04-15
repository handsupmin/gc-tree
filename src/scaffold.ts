import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

type GcTreeHost = 'codex' | 'claude-code';

function renderCodexAgentsSnippet(): string {
  return [
    '# gctree Codex integration snippet',
    '',
    '- Treat the active gctree branch as a **gc-branch** when you describe it to users.',
    '- Before planning or implementation, run `gctree status` to confirm the active gc-branch if it is unclear.',
    '- Use `gctree resolve --query "<task>"` when reusable global context may matter.',
    '- Use `$gc-onboard` only for an empty gc-branch.',
    '- Use `$gc-update-global-context` when durable context in the active gc-branch should change.',
    '',
  ].join('\n');
}

function renderCodexBootstrapPrompt(): string {
  return [
    '# gctree Bootstrap',
    '',
    '- Keep the active gc-branch explicit whenever global context matters.',
    '- Resolve reusable global context before planning or implementation when it may change the answer.',
    '- Read summaries first and only open full docs when needed.',
    '- Treat gctree docs as explicit source-of-truth markdown, not hidden memory.',
    '',
  ].join('\n');
}

function renderCodexResolveSkill(): string {
  return [
    '---',
    'description: Resolve reusable global context from the active gc-branch.',
    'argument_hint: "<query>"',
    '---',
    '',
    'Treat everything after this command as the query.',
    '',
    '1. Run `gctree status` if the active gc-branch is unclear.',
    '2. Explicitly mention which gc-branch is active before using the result.',
    '3. Run `gctree resolve --query "<query>"`.',
    '4. If the current repo is outside the mapped scope, choose whether to continue once, always use this gc-branch for this repo, or ignore this gc-branch here.',
    '5. Read summaries first and only open full docs if needed.',
    '',
  ].join('\n');
}

function renderCodexOnboardSkill(): string {
  return [
    '---',
    'description: Guided onboarding for the active gc-branch in gctree.',
    '---',
    '',
    'Use this only when the active gc-branch is empty.',
    '',
    '1. Run `gctree status` and explicitly state the active gc-branch to the user.',
    '2. Ask onboarding questions one at a time until you have enough durable context.',
    '3. Create a temporary JSON file with `branchSummary` and `docs[]` (`title`, `summary`, `body`).',
    '4. Run `gctree __apply-onboarding --input <temp-file>`.',
    '5. Show the written docs and remind the user that future changes belong in `gctree update-global-context`.',
    '6. If the gc-branch is not empty, stop and tell the user to run `gctree reset-gc-branch --branch <current-gc-branch> --yes` or `gctree update-global-context` instead.',
    '',
  ].join('\n');
}

function renderCodexUpdateSkill(): string {
  return [
    '---',
    'description: Guided durable update for the active gc-branch in gctree.',
    '---',
    '',
    '1. Run `gctree status` and explicitly state the active gc-branch to the user.',
    '2. Ask what durable context should change, one question at a time.',
    '3. If this repo clearly belongs to the current gc-branch but is not mapped yet, ask the user whether it should be added to the branch-repo map and run `gctree set-repo-scope --branch <current-gc-branch> --include` when they approve.',
    '4. Create a temporary JSON file containing the updated `docs[]` and optional `branchSummary`.',
    '5. Run `gctree __apply-update --input <temp-file>`.',
    '6. Show the updated docs back to the user.',
    '',
  ].join('\n');
}

function renderClaudeSnippet(): string {
  return [
    '# gctree Claude Code integration snippet',
    '',
    '- Treat the active gctree branch as a **gc-branch** in user-facing language.',
    '- Run `gctree status` before relying on global context if the active gc-branch is unclear.',
    '- Use `gctree resolve --query "<task>"` when reusable global context may matter.',
    '- Use `/gc-onboard` only for an empty gc-branch.',
    '- Use `/gc-update-global-context` when durable context in the active gc-branch should change.',
    '',
  ].join('\n');
}

function renderClaudeSessionStartHook(): string {
  return [
    '# gctree Claude Code SessionStart note',
    '',
    '- At session start, confirm the active gc-branch with `gctree status` when reusable global context may matter.',
    '- Refer to gctree branches as **gc-branches** in user-facing language.',
    '- Resolve summaries before planning or implementation when branch-level context may change the answer.',
    '',
  ].join('\n');
}

function renderClaudeResolveCommand(): string {
  return [
    '---',
    'description: Resolve reusable global context from the active gc-branch.',
    'argument-hint: "<query>"',
    '---',
    '',
    '1. Run `gctree status` if the active gc-branch is unclear.',
    '2. Explicitly mention the active gc-branch before using the result.',
    '3. Run `gctree resolve --query "$ARGUMENTS"`.',
    '4. If the current repo is outside the mapped scope, choose whether to continue once, always use this gc-branch for this repo, or ignore this gc-branch here.',
    '5. Read summaries first and only open full docs if needed.',
    '',
  ].join('\n');
}

function renderClaudeOnboardCommand(): string {
  return [
    '---',
    'description: Guided onboarding for the active gc-branch in gctree.',
    '---',
    '',
    'Use this only when the active gc-branch is empty.',
    '',
    '1. Run `gctree status` and explicitly state the active gc-branch to the user.',
    '2. Ask onboarding questions one at a time until you have enough durable context.',
    '3. Create a temporary JSON file with `branchSummary` and `docs[]` (`title`, `summary`, `body`).',
    '4. Run `gctree __apply-onboarding --input <temp-file>`.',
    '5. Show the written docs and remind the user that future changes belong in `gctree update-global-context`.',
    '6. If the gc-branch is not empty, stop and tell the user to run `gctree reset-gc-branch --branch <current-gc-branch> --yes` or `gctree update-global-context` instead.',
    '',
  ].join('\n');
}

function renderClaudeUpdateCommand(): string {
  return [
    '---',
    'description: Guided durable update for the active gc-branch in gctree.',
    '---',
    '',
    '1. Run `gctree status` and explicitly state the active gc-branch to the user.',
    '2. Ask what durable context should change, one question at a time.',
    '3. If this repo clearly belongs to the current gc-branch but is not mapped yet, ask the user whether it should be added to the branch-repo map and run `gctree set-repo-scope --branch <current-gc-branch> --include` when they approve.',
    '4. Create a temporary JSON file containing the updated `docs[]` and optional `branchSummary`.',
    '5. Run `gctree __apply-update --input <temp-file>`.',
    '6. Show the updated docs back to the user.',
    '',
  ].join('\n');
}

function scaffoldFiles(host: GcTreeHost): Array<{ path: string; content: string }> {
  if (host === 'codex') {
    return [
      { path: 'AGENTS.md', content: renderCodexAgentsSnippet() },
      { path: '.codex/prompts/gctree-bootstrap.md', content: renderCodexBootstrapPrompt() },
      { path: '.codex/skills/gc-resolve-context/SKILL.md', content: renderCodexResolveSkill() },
      { path: '.codex/skills/gc-onboard/SKILL.md', content: renderCodexOnboardSkill() },
      { path: '.codex/skills/gc-update-global-context/SKILL.md', content: renderCodexUpdateSkill() },
    ];
  }

  return [
    { path: 'CLAUDE.md', content: renderClaudeSnippet() },
    { path: '.claude/hooks/gctree-session-start.md', content: renderClaudeSessionStartHook() },
    { path: '.claude/commands/gc-resolve-context.md', content: renderClaudeResolveCommand() },
    { path: '.claude/commands/gc-onboard.md', content: renderClaudeOnboardCommand() },
    { path: '.claude/commands/gc-update-global-context.md', content: renderClaudeUpdateCommand() },
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
}): Promise<{ host: GcTreeHost; target_dir: string; written: string[]; skipped_existing: string[] }> {
  const files = scaffoldFiles(host);
  const written: string[] = [];
  const skippedExisting: string[] = [];

  const targets = files.map((file) => ({
    ...file,
    fullPath: join(targetDir, file.path),
  }));

  for (const target of targets) {
    let exists = false;
    try {
      await access(target.fullPath);
      exists = true;
    } catch {
      exists = false;
    }

    if (exists && !force) {
      skippedExisting.push(target.fullPath);
      continue;
    }

    await mkdir(dirname(target.fullPath), { recursive: true });
    await writeFile(target.fullPath, `${target.content.trimEnd()}
`, 'utf8');
    written.push(target.fullPath);
  }

  return {
    host,
    target_dir: targetDir,
    written,
    skipped_existing: skippedExisting,
  };
}
