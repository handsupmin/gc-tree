# Usage

[English](usage.md) | [한국어](usage.ko.md) | [简体中文](usage.zh.md) | [日本語](usage.ja.md) | [Español](usage.es.md)

## Summary

A standard `gctree` workflow is: initialize gc-tree, choose a provider, onboard the default `main` gc-branch, resolve active context, create new gc-branches when needed, map repositories to the right gc-branches, and use guided updates for durable changes.

## Standard workflow

1. run `gctree init`
2. choose your preferred provider (`codex` or `claude-code`)
3. complete guided onboarding for the default `main` gc-branch
4. resolve relevant context with `gctree resolve --query "..."`
5. create or switch gc-branches with `gctree checkout`
6. run `gctree onboard` only for an empty gc-branch
7. use repo scope mapping so a gc-branch only applies where it belongs
8. use `gctree update-global-context` for durable changes later

## Core commands

| Command | Purpose |
| --- | --- |
| `gctree init` | Create `~/.gctree`, create the default `main` gc-branch, save the preferred provider, scaffold the current environment, and start guided onboarding when `main` is empty. |
| `gctree checkout <branch>` | Switch the active gc-branch. |
| `gctree checkout -b <branch>` | Create and switch to a new empty gc-branch. |
| `gctree branches` | List available gc-branches and show the active one. |
| `gctree status` | Show the active gc-branch, the current repo, the current repo-scope status, warnings, and the preferred provider. |
| `gctree resolve --query TEXT` | Search the relevant gc-branch for context. If the current repo is unmapped, `gctree` can ask how that repo should be treated. |
| `gctree repo-map` | Show the current contents of `branch-repo-map.json`. |
| `gctree set-repo-scope --branch <name> --include` | Mark the current repo as included for that gc-branch. |
| `gctree set-repo-scope --branch <name> --exclude` | Mark the current repo as ignored for that gc-branch. |
| `gctree onboard` | Launch guided onboarding for the active gc-branch. Works only when that gc-branch is empty. |
| `gctree reset-gc-branch --branch <name> --yes` | Clear a gc-branch so it can be onboarded again. |
| `gctree update-global-context` | Launch a guided durable update for the active gc-branch. |
| `gctree update-gc` / `gctree ugc` | Aliases for `gctree update-global-context`. |
| `gctree scaffold --host <codex|claude-code>` | Install the provider-facing command surface in another environment. |

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
2. let `gctree` scaffold the current environment
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

`gctree scaffold` installs provider-facing commands such as guided onboarding and guided updates.
Those commands should explicitly mention the current active gc-branch before they start gathering or applying durable context.

```bash
gctree scaffold --host codex --target /path/to/repo
gctree scaffold --host claude-code --target /path/to/repo
```

### Runtime behavior

The active gc-branch is the one pointed to by `HEAD` inside `~/.gctree`, but repo mapping can override that fallback when a repository is explicitly bound to another gc-branch.
This makes gc-tree practical for heavy users who keep many unrelated sessions open at the same time.
