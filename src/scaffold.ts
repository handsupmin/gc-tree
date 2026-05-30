import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
  gctreeGlobalHookJsonTarget,
  gctreeGlobalRoot,
  gctreeHookJsonTargets,
  gctreeLegacyClaudeHooksJsonTarget,
  gctreeLegacyLocalClaudeHooksJsonTarget,
  gctreeManagedMarkdownTargets,
  mergeGcTreeHooksJson,
  unmergeGcTreeHooksJson,
  upsertManagedMarkdownBlock,
} from './integration-files.js';
import { onboardingCompletionLines, onboardingProtocolLines } from './onboarding-protocol.js';

type GcTreeHost = 'codex' | 'claude-code';
type GcTreeScaffoldScope = 'local' | 'global';

function renderCodexAgentsSnippet(): string {
  return [
    '# gctree Codex integration snippet',
    '',
    '- Treat the active gctree branch as a **gc-branch** when you describe it to users.',
    '- gctree init installs SessionStart and UserPromptSubmit hooks that auto-check gc-tree before work.',
    '- Before starting ANY codebase task — new feature, schema change, bug fix, admin work, or any question about how something works — run `gctree resolve` first. Do not assume you know the domain from code alone. Field names, model names, repo names, and feature names are NOT self-explanatory; always verify workflows and cross-repo relationships via gc-tree before touching code.',
    '- Follow this scope-aware protocol before any grep, file read, or code exploration:',
    '  1. Always run `gctree resolve --query "<task or term>"` first. If matched, use the result directly.',
    '  2. Only if the current repo scope is **included** (not unmapped/excluded): if step 1 found nothing, try broader related queries to check if the concept exists in any doc.',
    '  3. If the concept exists in a doc but was not indexed → propose adding it as an Index Entry to that doc.',
    '  4. If it does not exist anywhere → decide whether a new doc is needed and propose it to the user.',
    '  — If the repo is **unmapped** or **excluded**: do step 1 only; if no match, skip and proceed normally.',
    '- When a UserPromptSubmit hook provides `[gc-tree] USE FIRST`, treat matched docs as mandatory grounding before any tool use.',
    '- Do not ignore matched gc-tree docs and jump straight to grep/Explore. Use the listed docs directly, or open the full doc with `gctree resolve --id <id>` if the summary is not enough.',
    '- Only use tools after the matched docs are clearly insufficient for the task.',
    '- If hooks are unavailable or clearly stale, run `gctree status` and `gctree resolve --query "<task>"` yourself before planning or implementation.',
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
    '- Before any codebase task — feature, schema change, bug fix, admin work — do **not** grep or read code first. Follow this exact order:',
    '  1. Run `gctree resolve --query "<task or term>"`.',
    '  2. If that misses, run broader related `gctree resolve` queries.',
    '  3. If the concept is documented but not indexed, propose adding it as an Index Entry to the right doc.',
    '  4. Only if gc-tree still does not answer it should you search code or repo docs.',
    '- When hook-injected gc-tree matches are present, treat them as mandatory grounding. Use them directly or open the full doc with `gctree resolve --id <id>` before grep/file reads/code exploration.',
    '- Only use tools (grep, file read, explore) if matched docs are clearly insufficient — meaning the answer cannot be derived from them at all.',
    '- If hook context is missing, resolve reusable global context before planning or implementation.',
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

function renderUpdateProtocol(): string[] {
  return [
    '1. Run `gctree status` and state the active gc-branch.',
    '2. Find the target doc before writing. Use `gctree resolve --query "<new fact or term>"`; if a match is incomplete, read the full doc with `gctree show-doc --id "<id>"`. For an existing doc, preserve useful existing details and index entries unless the user explicitly wants them removed.',
    '3. Decide category and slug automatically based on content — never ask the user about scope or placement:',
    '   - `docs/workflows/<name>.md` — cross-repo action sequences, step-by-step procedures',
    '   - `docs/conventions/<repo>.md` — code patterns, naming, validation, DTO/service conventions for a repo',
    '   - `docs/repos/<repo>.md` — repo role, key paths, cross-repo dependencies',
    '   - `docs/domain/<concept>.md` — domain terms, acronyms, business logic',
    '   - `docs/infra/<topic>.md` — infra, deployment, environment config',
    '   - `docs/role/<name>.md` — team member roles, responsibilities',
    '4. In the update JSON, `slug` is the path without `docs/` and without `.md`. Example: existing file `docs/conventions/mvldev-assignment-backend-smson.md` must use `slug: "conventions/mvldev-assignment-backend-smson"`.',
    '5. Use exactly this JSON schema. Unknown fields are rejected; do not use `id`, `path`, or `content`.',
    '```json',
    '{',
    '  "branch": "<gc-branch>",',
    '  "docs": [',
    '    {',
    '      "title": "conventions: example repo",',
    '      "slug": "conventions/example-repo",',
    '      "category": "conventions",',
    '      "summary": "Actionable one-paragraph summary with patterns, commands, and constraints.",',
    '      "body": "## Patterns\\n\\n- Details body only. Do not include # title, ## Summary, or ## Index Entries here.",',
    '      "indexLabel": "example repo conventions",',
    '      "indexEntries": ["example repo", "ExampleRepo", "주요 한국어 검색어", "command names", "field names"]',
    '    }',
    '  ]',
    '}',
    '```',
    '6. Write an actionable `summary`: actual patterns/commands/constraints a developer needs — not a sentence about what the doc covers.',
    '7. Put search terms in `indexEntries`, not inside `body`. Include aliases, related terms, command names, field names, workflow names, acronyms, and the exact phrases users are likely to ask. Fewer than 5 entries almost always means more are needed.',
    '7a. **Bilingual index entries**: when the workflow language is not English, `indexEntries` MUST contain BOTH the workflow language AND English forms for every technical term, repo name, workflow name, and concept. gc-tree retrieval is token-overlap based and cannot translate at query time. Acronyms (JWT, EMPI, VCF) stay in original form in both. Body and summary stay in the workflow language; bilingual coverage lives in the index.',
    '8. Create a temporary JSON file with the updated `docs[]` and run `gctree __apply-update --input <temp-file>`.',
    '9. Run `gctree verify-onboarding --branch <gc-branch>` and inspect the output:',
    '   - Check that every updated doc appears in the verified doc list.',
    '   - Check that index entries for the new content exist and are searchable (not just generic titles).',
    '   - Check that no doc has `category: "general"` — reassign to correct category if so.',
    '   - Check that important concepts from the update are present as index labels — if missing, re-apply with added index entries.',
    '   - Self-heal any issues without asking the user: fix category, add index entries, re-run `gctree __apply-update`, re-verify.',
    '10. Run `gctree resolve --query "<new keyword>"` and `gctree show-doc --id "<slug>"` for at least one new keyword/doc to prove retrieval and details are correct.',
    '11. If you intended to update an existing doc and `doc_count` increased unexpectedly, do not report success. Inspect the duplicate, remove the accidental doc, then re-apply with the correct `slug`.',
    '12. Show the user which docs were updated and confirm the index now covers the new content.',
  ];
}

function renderCodexUpdateSkill(): string {
  return [
    '---',
    'description: Guided durable update for the active gc-branch in gctree.',
    '---',
    '',
    ...renderUpdateProtocol(),
    '',
  ].join('\n');
}

function renderClaudeSnippet(): string {
  return [
    '# gctree Claude Code integration snippet',
    '',
    '- Treat the active gctree branch as a **gc-branch** in user-facing language.',
    '- gctree init installs SessionStart and UserPromptSubmit hooks that auto-inject gc-tree context before every prompt.',
    '- Before starting ANY codebase task — new feature, schema change, bug fix, admin work, or any question about how something works — run `gctree resolve` first. Do not assume you know the domain from code alone. Field names, model names, repo names, and feature names are NOT self-explanatory; always verify workflows and cross-repo relationships via gc-tree before touching code.',
    '- Follow this scope-aware protocol before any grep, file read, or code exploration:',
    '  1. Always run `gctree resolve --query "<task or term>"` first. If matched, use the result directly.',
    '  2. Only if the current repo scope is **included** (not unmapped/excluded): if step 1 found nothing, try broader related queries to check if the concept exists in any doc.',
    '  3. If the concept exists in a doc but was not indexed → propose adding it as an Index Entry to that doc.',
    '  4. If it does not exist anywhere → decide whether a new doc is needed and propose it to the user.',
    '  — If the repo is **unmapped** or **excluded**: do step 1 only; if no match, skip and proceed normally.',
    '- When a UserPromptSubmit hook provides `[gc-tree] USE FIRST`, treat matched docs as mandatory grounding before any tool use.',
    '- Do not ignore matched gc-tree docs and jump straight to grep/Explore. Use the listed docs directly, or open the full doc with `gctree resolve --id <id>` if the summary is not enough.',
    '- Only use tools after the matched docs are clearly insufficient for the task.',
    '- If hooks are unavailable or clearly stale, run `gctree status` and `gctree resolve --query "<task>"` yourself before planning or implementation.',
    '- Use `/gc-onboard` only for an empty gc-branch.',
    '- Use `/gc-update-global-context` when durable context in the active gc-branch should change.',
    '',
  ].join('\n');
}

function renderClaudeSessionStartHook(): string {
  return [
    '# gctree Claude Code SessionStart note',
    '',
    '- Before any codebase task — feature, schema change, bug fix, admin work, or any question about how the codebase works — do **not** grep or read code first. Follow this exact order:',
    '  1. Run `gctree resolve --query "<task or term>"`. If matched, use the result directly.',
    '  2. Only if scope is **included**: if step 1 found nothing, try broader related queries.',
    '  3. If concept exists in a doc but not indexed → propose adding an Index Entry.',
    '  4. Only if gc-tree has nothing should you search code.',
    '  — If scope is **unmapped** or **excluded**: do step 1 only; if no match, proceed normally.',
    '- When a UserPromptSubmit hook provides `[gc-tree] USE FIRST`, treat matched docs as mandatory. Do not grep or Explore until you have read every injected summary.',
    '- Only use tools if matched docs are clearly insufficient — meaning the answer cannot be derived from them.',
    '- If hook context is missing, run `gctree resolve --query "<task>"` yourself before planning.',
    '',
  ].join('\n');
}

function renderClaudeHooksJson(): string {
  return JSON.stringify(
    {
      hooks: {
        SessionStart: [
          {
            matcher: '',
            hooks: [
              {
                type: 'command',
                command: 'gctree __hook --event SessionStart',
                metadata: {
                  owner: 'gctree',
                  managed_by: '@handsupmin/gc-tree',
                },
                timeout: 10,
              },
            ],
          },
        ],
        UserPromptSubmit: [
          {
            matcher: '',
            hooks: [
              {
                type: 'command',
                command: 'gctree __hook --event UserPromptSubmit',
                metadata: {
                  owner: 'gctree',
                  managed_by: '@handsupmin/gc-tree',
                },
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
    ...renderUpdateProtocol(),
    '',
  ].join('\n');
}

export function scaffoldFiles(host: GcTreeHost, scope: GcTreeScaffoldScope = 'local'): Array<{ path: string; content: string }> {
  if (host === 'codex') {
    if (scope === 'global') {
      return [
        { path: 'hooks.json', content: renderCodexHooksJson() },
        { path: 'prompts/gctree-bootstrap.md', content: renderCodexBootstrapPrompt() },
        { path: 'skills/gc-resolve-context/SKILL.md', content: renderCodexResolveSkill() },
        { path: 'skills/gc-onboard/SKILL.md', content: renderCodexOnboardSkill() },
        { path: 'skills/gc-update-global-context/SKILL.md', content: renderCodexUpdateSkill() },
      ];
    }
    return [
      { path: 'AGENTS.md', content: renderCodexAgentsSnippet() },
      { path: '.codex/hooks.json', content: renderCodexHooksJson() },
      { path: '.codex/prompts/gctree-bootstrap.md', content: renderCodexBootstrapPrompt() },
      { path: '.codex/skills/gc-resolve-context/SKILL.md', content: renderCodexResolveSkill() },
      { path: '.codex/skills/gc-onboard/SKILL.md', content: renderCodexOnboardSkill() },
      { path: '.codex/skills/gc-update-global-context/SKILL.md', content: renderCodexUpdateSkill() },
    ];
  }

  if (scope === 'global') {
    return [
      { path: 'settings.json', content: renderClaudeHooksJson() },
      { path: 'hooks/gctree-session-start.md', content: renderClaudeSessionStartHook() },
      { path: 'commands/gc-resolve-context.md', content: renderClaudeResolveCommand() },
      { path: 'commands/gc-onboard.md', content: renderClaudeOnboardCommand() },
      { path: 'commands/gc-update-global-context.md', content: renderClaudeUpdateCommand() },
    ];
  }

  return [
    { path: 'CLAUDE.md', content: renderClaudeSnippet() },
    { path: '.claude/settings.json', content: renderClaudeHooksJson() },
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
  scope = 'local',
}: {
  host: GcTreeHost;
  targetDir?: string;
  force?: boolean;
  scope?: GcTreeScaffoldScope;
}): Promise<{ host: GcTreeHost; target_dir: string; written: string[]; skipped_existing: string[] }> {
  const resolvedTargetDir = scope === 'global' ? gctreeGlobalRoot(host) : targetDir!;
  const files = scaffoldFiles(host, scope);
  const written: string[] = [];
  const skippedExisting: string[] = [];
  const isCodex = host === 'codex';
  let managedMarkdownPath: string | null = null;
  let hookPath: string;

  if (scope === 'local') {
    const markdownTargets = gctreeManagedMarkdownTargets(resolvedTargetDir);
    const hookTargets = gctreeHookJsonTargets(resolvedTargetDir);
    managedMarkdownPath = isCodex ? markdownTargets.codex : markdownTargets.claude;
    const managedMarkdownContent = isCodex ? renderCodexAgentsSnippet() : renderClaudeSnippet();
    await upsertManagedMarkdownBlock({
      filePath: managedMarkdownPath,
      content: managedMarkdownContent,
      marker: isCodex ? 'codex' : 'claude',
    });
    written.push(managedMarkdownPath);
    hookPath = isCodex ? hookTargets.codex : hookTargets.claude;

    if (!isCodex) {
      const legacyHooksPath = gctreeLegacyLocalClaudeHooksJsonTarget(resolvedTargetDir);
      const legacyStatus = await unmergeGcTreeHooksJson(legacyHooksPath);
      if (legacyStatus !== 'missing') {
        written.push(legacyHooksPath);
      }
    }
  } else {
    hookPath = gctreeGlobalHookJsonTarget(host);
    if (!isCodex) {
      const legacyHooksPath = gctreeLegacyClaudeHooksJsonTarget(resolvedTargetDir);
      const legacyStatus = await unmergeGcTreeHooksJson(legacyHooksPath);
      if (legacyStatus !== 'missing') {
        written.push(legacyHooksPath);
      }
    }
  }

  if (scope === 'local') {
    const status = await unmergeGcTreeHooksJson(hookPath);
    if (status !== 'missing') {
      written.push(hookPath);
    }
  } else {
    await mergeGcTreeHooksJson({
      filePath: hookPath,
      target: isCodex ? 'codex' : 'claude-code',
    });
    written.push(hookPath);
  }

  const targets = files.map((file) => ({
    ...file,
    fullPath: join(resolvedTargetDir, file.path),
  })).filter((target) => {
    return target.fullPath !== hookPath && target.fullPath !== managedMarkdownPath;
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
    target_dir: resolvedTargetDir,
    written,
    skipped_existing: skippedExisting,
  };
}
