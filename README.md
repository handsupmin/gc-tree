# gc-tree

`gctree` is a lightweight **Global Context Tree** for AI coding tools.

It extracts the reusable global-context part from heavier delivery systems and keeps it:
- branch-aware (`checkout`, `checkout -b`)
- summary-first
- file-backed
- tool-agnostic
- approval-first for updates

## Why it exists

Many AI coding setups need a shared global context, but not a full delivery control plane.
`gctree` gives you a reusable global context home that can be attached to tools like Codex CLI, Claude Code CLI, OmO, OmX, and OmC.

## Core ideas

- **Branches** let one machine hold multiple context trees without mixing them.
- **`index.md` stays small** and acts as an index only.
- **Source docs must be summary-first** so agents can often stop after reading the summary.
- **Global context updates are proposal-first** so nothing mutates silently.

## Commands

- `gctree init [--home DIR] [--branch NAME]`
- `gctree checkout <branch> [--home DIR]`
- `gctree checkout -b <branch> [--home DIR]`
- `gctree branches [--home DIR]`
- `gctree status [--home DIR]`
- `gctree onboard --input FILE [--home DIR] [--branch NAME]`
- `gctree resolve --query TEXT [--home DIR]`
- `gctree propose-update --input FILE [--home DIR]`
- `gctree apply-update --proposal FILE [--home DIR]`

## Home layout

```text
~/.gctree/
  HEAD
  branches/
    main/
      branch.json
      index.md
      docs/
      proposals/
```

## Integration

The repo also ships tool-agnostic Markdown skills under `skills/` for:
- onboard
- checkout
- resolve-context
- update-global-context
- feedback

These are meant to be copied or referenced from Codex / Claude / OMX-style toolchains.
