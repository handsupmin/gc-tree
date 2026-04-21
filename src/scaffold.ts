import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
  gctreeHookJsonTargets,
  gctreeManagedMarkdownTargets,
  mergeGcTreeHooksJson,
  unmergeGcTreeHooksJson,
  upsertManagedMarkdownBlock,
} from './integration-files.js';
import { onboardingCompletionLines, onboardingProtocolLines } from './onboarding-protocol.js';

type GcTreeHost = 'codex' | 'claude-code';

function renderCodexAgentsSnippet(): string {
  return [
    '# gctree Codex integration snippet',
    '',
    '- Treat the active gctree branch as a **gc-branch** when you describe it to users.',
    '- gctree init installs SessionStart and UserPromptSubmit hooks that auto-check gc-tree before work.',
    '- Use the hook-injected gc-tree context first. If hooks are unavailable or clearly stale, run `gctree status` and `gctree resolve --query "<task>"` yourself before planning or implementation.',
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
    '- Trust auto-resolved gc-tree hook context first; if it is missing, resolve reusable global context before planning or implementation.',
    '- Read summaries first and only open full docs when needed.',
    '- Treat gctree docs as explicit source-of-truth markdown, not hidden memory.',
    '',
  ].join('\n');
}

function renderCodexHooksJson(): string {
  return JSON.stringify(
    {
      hooks: {
        SessionStart: [
          {
            matcher: 'startup|resume',
            hooks: [
              {
                type: 'command',
                command: 'gctree __hook --event SessionStart',
              },
            ],
          },
        ],
        UserPromptSubmit: [
          {
            hooks: [
              {
                type: 'command',
                command: 'gctree __hook --event UserPromptSubmit',
              },
            ],
          },
        ],
      },
    },
    null,
    2,
  );
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
  const protocol = onboardingProtocolLines();
  const completion = onboardingCompletionLines();
  return [
    '---',
    'description: Guided onboarding for the active gc-branch in gctree.',
    '---',
    '',
    'Use this only when the active gc-branch is empty.',
    '',
    '1. Run `gctree status` and explicitly state the active gc-branch to the user.',
    ...protocol.map((line, index) => `${index + 2}. ${line}`),
    `${protocol.length + 2}. Then create a temporary JSON file with \`branchSummary\` and \`docs[]\` (\`title\`, \`summary\`, \`body\`).`,
    `${protocol.length + 3}. Run \`gctree __apply-onboarding --input <temp-file>\`.`,
    ...completion.map((line, index) => `${protocol.length + index + 4}. ${line}`),
    `${protocol.length + completion.length + 4}. If the gc-branch is not empty, stop and tell the user to run \`gctree reset-gc-branch --branch <current-gc-branch> --yes\` or \`gctree update-global-context\` instead.`,
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
    '- gctree init installs SessionStart and UserPromptSubmit hooks that auto-check gc-tree before work.',
    '- Use the hook-injected gc-tree context first. If hooks are unavailable or clearly stale, run `gctree status` and `gctree resolve --query "<task>"` yourself before planning or implementation.',
    '- Use `/gc-onboard` only for an empty gc-branch.',
    '- Use `/gc-update-global-context` when durable context in the active gc-branch should change.',
    '',
  ].join('\n');
}

function renderClaudeSessionStartHook(): string {
  return [
    '# gctree Claude Code SessionStart note',
    '',
    '- gctree init installs real SessionStart/UserPromptSubmit hooks via `.claude/hooks/hooks.json`.',
    '- At session start, use the injected hook context to confirm the active gc-branch.',
    '- Refer to gctree branches as **gc-branches** in user-facing language.',
    '- If hook context is missing or stale, resolve summaries before planning or implementation when branch-level context may change the answer.',
    '',
  ].join('\n');
}

function renderClaudeHooksJson(): string {
  return JSON.stringify(
    {
      hooks: {
        SessionStart: [
          {
            matcher: '*',
            hooks: [
              {
                type: 'command',
                command: 'gctree __hook --event SessionStart',
                timeout: 10,
              },
            ],
          },
        ],
        UserPromptSubmit: [
          {
            matcher: '*',
            hooks: [
              {
                type: 'command',
                command: 'gctree __hook --event UserPromptSubmit',
                timeout: 10,
              },
            ],
          },
        ],
      },
    },
    null,
    2,
  );
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
  const protocol = onboardingProtocolLines();
  const completion = onboardingCompletionLines();
  return [
    '---',
    'description: Guided onboarding for the active gc-branch in gctree.',
    '---',
    '',
    'Use this only when the active gc-branch is empty.',
    '',
    '1. Run `gctree status` and explicitly state the active gc-branch to the user.',
    ...protocol.map((line, index) => `${index + 2}. ${line}`),
    `${protocol.length + 2}. Then create a temporary JSON file with \`branchSummary\` and \`docs[]\` (\`title\`, \`summary\`, \`body\`).`,
    `${protocol.length + 3}. Run \`gctree __apply-onboarding --input <temp-file>\`.`,
    ...completion.map((line, index) => `${protocol.length + index + 4}. ${line}`),
    `${protocol.length + completion.length + 4}. If the gc-branch is not empty, stop and tell the user to run \`gctree reset-gc-branch --branch <current-gc-branch> --yes\` or \`gctree update-global-context\` instead.`,
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

export function scaffoldFiles(host: GcTreeHost): Array<{ path: string; content: string }> {
  if (host === 'codex') {
    return [
      { path: 'AGENTS.md', content: renderCodexAgentsSnippet() },
      { path: '.codex/hooks.json', content: renderCodexHooksJson() },
      { path: '.codex/prompts/gctree-bootstrap.md', content: renderCodexBootstrapPrompt() },
      { path: '.codex/skills/gc-resolve-context/SKILL.md', content: renderCodexResolveSkill() },
      { path: '.codex/skills/gc-onboard/SKILL.md', content: renderCodexOnboardSkill() },
      { path: '.codex/skills/gc-update-global-context/SKILL.md', content: renderCodexUpdateSkill() },
    ];
  }

  return [
    { path: 'CLAUDE.md', content: renderClaudeSnippet() },
    { path: '.claude/hooks/hooks.json', content: renderClaudeHooksJson() },
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

  const markdownTargets = gctreeManagedMarkdownTargets(targetDir);
  const hookTargets = gctreeHookJsonTargets(targetDir);
  const isCodex = host === 'codex';

  const managedMarkdownPath = isCodex ? markdownTargets.codex : markdownTargets.claude;
  const managedMarkdownContent = isCodex ? renderCodexAgentsSnippet() : renderClaudeSnippet();
  await upsertManagedMarkdownBlock({
    filePath: managedMarkdownPath,
    content: managedMarkdownContent,
    marker: isCodex ? 'codex' : 'claude',
  });
  written.push(managedMarkdownPath);

  const hookPath = isCodex ? hookTargets.codex : hookTargets.claude;
  await mergeGcTreeHooksJson({
    filePath: hookPath,
    target: isCodex ? 'codex' : 'claude-code',
  });
  written.push(hookPath);

  // Migrate: clean up gctree entries from old hooks.json location (claude-code only)
  if (!isCodex) {
    const oldHooksPath = join(targetDir, '.claude', 'hooks', 'hooks.json');
    await unmergeGcTreeHooksJson(oldHooksPath);
  }

  const targets = files.map((file) => ({
    ...file,
    fullPath: join(targetDir, file.path),
  })).filter((target) => {
    if (isCodex) return target.path !== 'AGENTS.md' && target.path !== '.codex/hooks.json';
    return target.path !== 'CLAUDE.md' && target.path !== '.claude/hooks/hooks.json';
  });

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
