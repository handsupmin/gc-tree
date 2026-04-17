# gc-tree

Branch-aware global context for AI coding tools.

[English](https://github.com/handsupmin/gc-tree/blob/main/README.md) | [한국어](https://github.com/handsupmin/gc-tree/blob/main/README.ko.md) | [简体中文](https://github.com/handsupmin/gc-tree/blob/main/README.zh.md) | [日本語](https://github.com/handsupmin/gc-tree/blob/main/README.ja.md) | [Español](https://github.com/handsupmin/gc-tree/blob/main/README.es.md)

## Introduction

`gctree` is a lightweight **Global Context Tree** for AI coding tools.
It gives long-lived context a reusable, file-backed home that stays explicit, branch-aware, and easy to plug into existing workflows.

When a single `AGENTS.md`, `CLAUDE.md`, or prompt snippet is no longer enough, `gctree` helps you:

- separate context by product, client, or workstream
- keep source-of-truth knowledge in markdown instead of hidden memory
- resolve the active context quickly with a slim index and summary-first docs
- onboard and update durable context through your preferred LLM CLI provider
- limit a gc-branch to the repositories where it actually applies

## Key Features

- **Provider-driven onboarding**
  `gctree init` asks which provider mode you want (`claude-code`, `codex`, or `both`), then asks which language to use for responses, saves both choices, scaffolds the right command surface, and starts guided onboarding for the default `main` gc-branch.
- **Repo-aware gc-branch scope**
  `gctree` can map a gc-branch to specific repositories through `~/.gctree/branch-repo-map.json`, so one branch can apply to B/C/D while being ignored in F.
- **Interactive scope guard**
  If `gctree resolve` runs in a repo that is not yet mapped to the current gc-branch, it can ask whether to continue once, always use this gc-branch here, or ignore it here.
- **Summary-first documentation**
  Let tools read the short version first and expand only when they need more detail.
- **Guided durable updates**
  Reuse the same provider-driven flow to update context without hand-authoring JSON files.

## Install & Quick Start

### Install from npm

```bash
npm install -g @handsupmin/gc-tree
```

Or run it once without a global install:

```bash
npx @handsupmin/gc-tree init
```

- **Package name:** `@handsupmin/gc-tree`
- **CLI command:** `gctree`
- **Requirements:** Node.js 20+
For source-based development details, see [docs/local-development.md](https://github.com/handsupmin/gc-tree/blob/main/docs/local-development.md).

### Quick Start

#### 1) Initialize gc-tree

```bash
gctree init
```

This command:

- creates `~/.gctree`
- creates the default `main` gc-branch
- asks which provider mode you want to use (`claude-code`, `codex`, or `both`)
- if you choose `both`, asks which provider should start onboarding now
- asks which language the workflow should use (`English`, `Korean`, or a custom language)
- saves provider mode, onboarding provider, and language in `~/.gctree/settings.json`
- scaffolds the current environment for the selected provider mode
- launches guided onboarding for the active gc-branch when `main` is still empty

#### 2) Resolve the active context

```bash
gctree resolve --query "auth token rotation"
```

If the current repo is outside the mapped scope for the chosen gc-branch, `gctree` can ask whether to:

1. continue once
2. always use this gc-branch for this repo
3. ignore this gc-branch for this repo

Choosing 2 or 3 updates `~/.gctree/branch-repo-map.json`.

#### 3) Create another gc-branch when you need a separate context tree

```bash
gctree checkout -b client-b
```

`checkout -b` creates a **new empty gc-branch**. It does not copy existing branch docs.

#### 4) Onboard that empty gc-branch through the configured provider

```bash
gctree onboard
```

#### 5) Make a durable update later

```bash
gctree update-global-context
```

Short aliases:

```bash
gctree update-gc
gctree ugc
```

If a repo turns out to belong to the current gc-branch after real work, the natural flow is:

1. allow that repo in the branch repo map
2. then run `gctree update-global-context` to add durable context about what that repo is and why it matters

#### 6) Re-onboard only after resetting a gc-branch

```bash
gctree reset-gc-branch --branch client-b --yes
```

### Provider-facing commands inside the runtime

After scaffolding, the visible commands are:

- **Codex:** `$gc-onboard`, `$gc-update-global-context`
- **Claude Code:** `/gc-onboard`, `/gc-update-global-context`

Those commands should always mention the current active gc-branch before gathering or updating durable context, and they should keep using the saved workflow language unless the user explicitly asks to switch.

### Core commands at a glance

| Goal | Command |
| --- | --- |
| Initialize gc-tree and choose a provider | `gctree init` |
| Confirm the active gc-branch | `gctree status` |
| Search the active context | `gctree resolve --query "..."` |
| Show repo-scope rules | `gctree repo-map` |
| Explicitly include/exclude a repo for a gc-branch | `gctree set-repo-scope --branch <name> --include` / `--exclude` |
| Create or switch gc-branches | `gctree checkout <branch>` / `gctree checkout -b <branch>` |
| Guided onboarding for an empty gc-branch | `gctree onboard` |
| Guided durable update for the active gc-branch | `gctree update-global-context` / `gctree update-gc` / `gctree ugc` |
| Reset a gc-branch before re-onboarding | `gctree reset-gc-branch --branch <name> --yes` |
| Scaffold another environment manually | `gctree scaffold --host codex --target /path/to/repo` |

## Documentation

Detailed docs live in the [`docs/`](https://github.com/handsupmin/gc-tree/tree/main/docs) directory.

- **Concept** — [`docs/concept.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/concept.md)
  Learn what `gctree` is, which problem it solves, and what belongs in the global-context layer.
- **Principles** — [`docs/principles.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/principles.md)
  Read the rules behind gc-branches, repo scope, slim indexes, summary-first docs, and guided updates.
- **Usage** — [`docs/usage.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/usage.md)
  See the standard CLI flow, provider-facing commands, repo-scope behavior, and integration patterns.
- **Local development** — [`docs/local-development.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/local-development.md)
  Learn how to run the CLI locally and verify changes before contributing.

## Contribution

Contributions are welcome. See [CONTRIBUTING.md](https://github.com/handsupmin/gc-tree/blob/main/CONTRIBUTING.md) for the development workflow and pull request checklist.

## License

MIT. See [`LICENSE`](https://github.com/handsupmin/gc-tree/blob/main/LICENSE).
