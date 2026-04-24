# Usage

[English](usage.md) | [한국어](usage.ko.md) | [简体中文](usage.zh.md) | [日本語](usage.ja.md) | [Español](usage.es.md)

## Summary

A standard `gctree` workflow looks like this: initialize gc-tree, choose a provider, onboard the default `main` gc-branch, resolve the context you need, create new gc-branches when work deserves its own lane, map repositories to the right gc-branches, and use guided updates for durable changes later.

## Standard workflow

1. run `gctree init`
2. choose your preferred provider mode (`claude-code`, `codex`, or `both`)
3. choose the workflow language (`English`, `Korean`, or a custom language)
4. if you picked `both`, choose which provider should start onboarding now
5. complete guided onboarding for the default `main` gc-branch
6. resolve relevant context with `gctree resolve --query "..."`
7. inspect supporting docs with `gctree related --id <match-id>`
8. read the full doc only when needed with `gctree show-doc --id <match-id>`
9. create or switch gc-branches with `gctree checkout`
10. run `gctree onboard` only for an empty gc-branch
11. use repo scope mapping so a gc-branch only applies where it belongs
12. use `gctree update-global-context` for durable changes later

## Core commands

| Command | Purpose |
| --- | --- |
| `gctree init` | Create `~/.gctree`, create the default `main` gc-branch, save the provider mode, onboarding provider, and preferred language, install global provider hooks/commands/skills, and start guided onboarding when `main` is empty. |
| `gctree checkout <branch>` | Switch the active gc-branch. |
| `gctree checkout -b <branch>` | Create and switch to a new empty gc-branch. |
| `gctree branches` | List available gc-branches and show the active one. |
| `gctree status` | Show the active gc-branch, the current repo, the current repo-scope status, warnings, and the preferred provider. |
| `gctree resolve --query TEXT` | Return the compact index layer for a query. Matches include stable IDs plus follow-up commands for deeper inspection. |
| `gctree related --id <match-id>` | Return supporting docs related to one resolved match without expanding the full markdown yet. |
| `gctree show-doc --id <match-id>` | Return the full markdown source-of-truth doc for one stable match ID. |
| `gctree repo-map` | Show the current contents of `branch-repo-map.json`. |
| `gctree set-repo-scope --branch <name> --include` | Mark the current repo as included for that gc-branch. |
| `gctree set-repo-scope --branch <name> --exclude` | Mark the current repo as ignored for that gc-branch. |
| `gctree onboard` | Launch guided onboarding for the active gc-branch. Works only when that gc-branch is empty. |
| `gctree reset-gc-branch --branch <name> --yes` | Clear a gc-branch so it can be onboarded again. |
| `gctree update-global-context` | Launch a guided durable update for the active gc-branch. |
| `gctree update-gc` / `gctree ugc` | Aliases for `gctree update-global-context`. |
| `gctree scaffold --host <codex\|claude-code>` | Install a local provider-facing override in one repository or workspace. |
| `gctree uninstall --yes` | Remove `~/.gctree` and the global gctree activation for the configured providers. |

## What resolve returns

`gctree resolve` is the compact **index layer** in a progressive-disclosure workflow. It scores every document in the active gc-branch against your query and returns only matching docs with stable IDs. Title matches count twice as much as body matches.

```bash
gctree resolve --query "auth token rotation policy"
```

```json
{
  "gc_branch": "main",
  "query": "auth token rotation policy",
  "status": "matched",
  "matches": [
    {
      "id": "auth",
      "title": "Auth & Session Conventions",
      "path": "docs/auth.md",
      "score": 4,
      "summary": "JWT rotation on every request, refresh tokens in httpOnly cookies, 15-min access token TTL",
      "excerpt": "## Auth Flow\nAccess token: 15-min TTL, rotated on every authenticated request...",
      "commands": {
        "show_doc": "gctree show-doc --id \"auth\" --home \"~/.gctree\" --branch \"main\"",
        "related": "gctree related --id \"auth\" --home \"~/.gctree\" --branch \"main\""
      }
    }
  ]
}
```

The intended flow is:

1. `resolve` → compact index
2. `related` → supporting docs around one match
3. `show-doc` → full markdown only when needed

Graceful degradation is explicit:

- empty gc-branch → `status: "empty_branch"`
- excluded repo → `status: "excluded"`
- no hits → `status: "no_match"`
- missing doc id → `status: "doc_not_found"`

## Example repo-scope flow

Suppose gc-branch `A` is relevant to repos `B`, `C`, and `D`, but not `F`.

You can manage that through:

```json
{
  "A": {
    "include": ["B", "C", "D"],
    "exclude": ["F"]
  }
}
```

stored in:

```text
~/.gctree/branch-repo-map.json
```

When `resolve` runs from repo `E` and branch `A` is not mapped there yet, `gctree` can ask whether to:

1. continue once
2. always use `A` in `E`
3. ignore `A` in `E`

## Example first-run flow

```bash
gctree init
```

Then:

1. choose `codex` or `claude-code`
2. let `gctree` install global activation for that provider
3. complete guided onboarding for the `main` gc-branch

## Example multi-branch flow

```bash
gctree checkout -b client-b
gctree onboard
gctree resolve --query "billing retry policy"
```

## Example update flow

```bash
gctree update-global-context
```

Short aliases:

```bash
gctree update-gc
gctree ugc
```

If a newly relevant repo should also become part of the durable context, the natural flow is:

1. map that repo to the gc-branch
2. then run `update-global-context` to add durable knowledge about what that repo does and why it matters

## Integration patterns

### Codex CLI / Claude Code CLI

`gctree init` installs the provider-facing hook surface globally. `gctree scaffold` installs a local override into one target directory when a specific repository needs its own markdown snippets or local command surface.

The UserPromptSubmit hook injects compact pre-task context only: found/no-match state, matched document IDs, and summaries. It does not inline long excerpts by default; open full documents with `gctree resolve --id <id>` when the summary is not enough.

```bash
gctree scaffold --host codex --target /path/to/repo
gctree scaffold --host claude-code --target /path/to/repo
gctree scaffold --host both --target /path/to/repo
```

**Global files for Codex (`gctree init`):**

```
~/.codex/hooks.json                              ← SessionStart/UserPromptSubmit auto-resolve hooks
~/.codex/prompts/gctree-bootstrap.md            ← bootstrap context for Codex sessions
~/.codex/skills/gc-resolve-context/SKILL.md     ← resolve skill
~/.codex/skills/gc-onboard/SKILL.md             ← onboarding skill
~/.codex/skills/gc-update-global-context/SKILL.md  ← update skill
```

**Local override files for `gctree scaffold --host codex`:**

```
AGENTS.md                                  ← gctree snippet appended to agent instructions
.codex/hooks.json                         ← SessionStart/UserPromptSubmit auto-resolve hooks
.codex/prompts/gctree-bootstrap.md         ← bootstrap context for Codex sessions
.codex/skills/gc-resolve-context/SKILL.md  ← resolve skill
.codex/skills/gc-onboard/SKILL.md          ← onboarding skill
.codex/skills/gc-update-global-context/SKILL.md  ← update skill
```

**Global files for Claude Code (`gctree init`):**

```
~/.claude/hooks/hooks.json                         ← SessionStart/UserPromptSubmit auto-resolve hooks
~/.claude/hooks/gctree-session-start.md            ← session-start fallback note
~/.claude/commands/gc-resolve-context.md           ← resolve slash command
~/.claude/commands/gc-onboard.md                   ← onboard slash command
~/.claude/commands/gc-update-global-context.md     ← update slash command
```

**Local override files for `gctree scaffold --host claude-code`:**

```
CLAUDE.md                                        ← gctree snippet appended
.claude/hooks/hooks.json                         ← SessionStart/UserPromptSubmit auto-resolve hooks
.claude/hooks/gctree-session-start.md            ← session-start fallback note
.claude/commands/gc-resolve-context.md           ← resolve slash command
.claude/commands/gc-onboard.md                   ← onboard slash command
.claude/commands/gc-update-global-context.md     ← update slash command
```

Existing local files are left untouched unless you pass `--force`.

### Runtime behavior

The active gc-branch is the one pointed to by `HEAD` inside `~/.gctree`, but repo mapping can override that fallback when a repository is explicitly bound to another gc-branch.
That makes gc-tree practical for heavy users who keep many unrelated sessions open at the same time.
