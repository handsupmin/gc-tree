# Concept

[English](concept.md) | [한국어](concept.ko.md) | [简体中文](concept.zh.md) | [日本語](concept.ja.md) | [Español](concept.es.md)

## Summary

`gctree` is a lightweight global-context layer for AI coding tools. It keeps durable context in explicit markdown documents outside any single repository, lets users switch between gc-branches, and can restrict each gc-branch to the repositories where it actually applies.

## What `gctree` is

`gctree` is a CLI for managing reusable global context.
It is designed for teams and individuals who want long-lived context to survive across repositories, sessions, and tools without turning that context into hidden memory.

Instead of scattering important knowledge across prompt files, repo-local notes, and ad hoc instructions, `gctree` gives that knowledge a stable, file-backed home.

## What problem it solves

Many AI coding setups start small:

- one `AGENTS.md`
- one `CLAUDE.md`
- one repo-local prompt file
- a handful of notes copied into prompts as needed

That works for a while. Then the same setup starts to break under real-world needs:

- different products need different context
- client work must stay isolated
- reusable guidance should live outside any single repository
- multiple tools should be able to read the same source of truth
- long-lived context should evolve through a safe, reviewable flow
- one user may run many sessions across many repositories at the same time

`gctree` exists to solve that layer cleanly.

## Scope boundary

`gctree` is intentionally not:

- a request-to-commit delivery orchestrator
- a hidden memory system
- a browser collaboration runtime
- a general-purpose knowledge base product

It focuses on one job: managing reusable global-context branches and explicit updates.

## File model

A typical home directory looks like this:

```text
~/.gctree/
  HEAD
  settings.json
  branch-repo-map.json
  branches/
    main/
      branch.json
      index.md
      docs/
```

- `HEAD` tracks the fallback active gc-branch.
- `settings.json` stores the provider mode, the onboarding provider chosen for runtime launch, and the preferred workflow language.
- `branch-repo-map.json` stores which repositories are included or excluded for each gc-branch.
- `branch.json` stores lightweight gc-branch metadata.
- `index.md` is the compact entry point for tools.
- `docs/` holds source-of-truth markdown documents.

## Repo-aware behavior

A gc-branch does not have to apply everywhere.
If branch `A` is only relevant to repositories `B`, `C`, and `D`, `gctree` can record that in `branch-repo-map.json`.

When `gctree resolve` runs in another repository such as `F`, it can:

- continue once
- always use that gc-branch in `F`
- ignore that gc-branch in `F`

This makes gc-tree much safer for heavy users who keep many parallel sessions open across unrelated repositories.
