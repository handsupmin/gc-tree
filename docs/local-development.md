# Local Development

[English](local-development.md) | [한국어](local-development.ko.md) | [简体中文](local-development.zh.md) | [日本語](local-development.ja.md) | [Español](local-development.es.md)

## Summary

Local development follows a standard Node.js 20+ workflow: install dependencies, build the CLI, run it locally, and verify your changes with the existing test suite before you send them out.

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
```

### Eval suite

In addition to the unit tests, an eval suite measures resolve quality against realistic fixtures:

```bash
npm run eval                  # 5-scenario synthetic suite (onboarding, resolve, token efficiency, update, isolation)
npm run eval:verbose          # same, with per-case detail
npm run eval:multi-repo       # cross-repo isolation test using cosmo-style fixtures
npm run eval:real-docs        # recall and precision against real Notion exports (requires local docs)
npm run eval:autoresearch     # iterative resolve improvement loop (modifies src/resolve.ts in place)
```

Expected baselines (run `npm run eval` to verify):

| Suite | Target |
| --- | --- |
| Synthetic (5 scenarios) | 5/5 PASS, mean ≥ 90% |
| Multi-repo | ≥ 80% overall |
| Real-docs | Recall ≥ 90%, F1 ≥ 80% |

If you modify `src/resolve.ts`, run `npm test && npm run eval && npm run eval:real-docs` before opening a PR.

## Test coverage

The unit test suite currently covers:

- provider mode persistence (`claude-code`, `codex`, `both`)
- preferred language persistence and strong language enforcement in launch prompts
- repo-aware gc-branch selection
- interactive include/exclude decisions during `resolve`
- branch repo map updates
- guided onboarding/update flow boundaries

## Manual provider E2E checks

Automated tests disable provider launch so they can verify launch plans without opening real Codex or Claude Code sessions.
If you want to dogfood the real launch path, run one of these in a throwaway directory:

```bash
gctree init --provider codex
gctree init --provider claude-code
```

You should see the provider open and immediately receive `$gc-onboard` or `/gc-onboard`.

## Project layout

- `src/` — CLI, context storage, provider selection, repo-scope mapping, guided onboarding/update flows, and scaffolding logic
- `tests/` — unit tests and eval scripts
- `skills/` — tool-agnostic workflow skills (used by Claude Code)
- `scaffolds/` — placeholder directories; scaffold file content is generated programmatically in `src/scaffold.ts`
- `docs/` — concept, principles, usage, and development documentation
