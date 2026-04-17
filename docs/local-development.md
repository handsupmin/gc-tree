# Local Development

[English](local-development.md) | [한국어](local-development.ko.md) | [简体中文](local-development.zh.md) | [日本語](local-development.ja.md) | [Español](local-development.es.md)

## Summary

Local development follows a standard Node.js 20+ workflow: install dependencies, build the CLI, run it locally, and verify with the existing test suite before you send changes.

## Package status

`gc-tree` is packaged for npm, but the public unscoped release is still blocked by npm's similarity policy because the name is too similar to `rc-tree`.
Use the source workflow below for day-to-day development, and run `npm publish --dry-run` before any release attempt.

## Prerequisites

- Node.js 20+
- npm
- local `codex` and/or `claude` binaries if you want to manually dogfood provider launches

## Setup

```bash
npm install
npm run build
```

## Run the CLI locally

### Option 1: run the built entry directly

```bash
node dist/src/cli.js status
```

### Option 2: link the CLI into your shell

```bash
npm link
gctree status
```

If you change TypeScript sources, rebuild before testing the CLI again.

## Verification

Run these before opening a pull request:

```bash
npm run build
npm test
npm publish --dry-run
```

## Repo-scope tests

The test suite now covers:

- provider mode persistence (`claude-code`, `codex`, `both`)
- preferred language persistence and strong language enforcement in launch prompts
- repo-aware gc-branch selection
- interactive include/exclude decisions during `resolve`
- branch repo map updates
- guided onboarding/update flow boundaries

## Manual provider E2E checks

Automated tests disable provider launch so they can verify launch plans without opening Codex or Claude Code sessions.
If you want to dogfood the real launch path, run one of these in a throwaway directory:

```bash
gctree init --provider codex
gctree init --provider claude-code
```

You should see the provider open and immediately receive `$gc-onboard` or `/gc-onboard`.

## Project layout

- `src/` — CLI, context storage, provider selection, repo-scope mapping, guided onboarding/update flows, and scaffolding logic
- `tests/` — CLI and behavior tests
- `skills/` — tool-agnostic workflow skills
- `scaffolds/` — host-specific bootstrap templates
- `docs/` — concept, principles, usage, and development documentation
