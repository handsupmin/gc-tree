# Concept

[English](concept.md) | [한국어](concept.ko.md) | [简体中文](concept.zh.md) | [日本語](concept.ja.md) | [Español](concept.es.md)

## Summary

`gctree` is a lightweight global-context layer for AI coding tools. It keeps long-lived context in explicit markdown documents outside any single repository, lets you switch between gc-branches, and can limit each gc-branch to the repositories where it actually belongs.

## What `gctree` is

`gctree` is a CLI for managing reusable global context.
It is built for people and teams who want important context to survive across repositories, sessions, and tools without turning into hidden memory.

Instead of scattering key knowledge across prompt files, repo-local notes, and one-off instructions, `gctree` gives that knowledge a stable, file-backed place to live.

## What problem it solves

A lot of AI coding setups start small:

- one `AGENTS.md`
- one `CLAUDE.md`
- one repo-local prompt file
- a few notes copied into prompts when needed

That works for a while. Then real work shows up and the cracks start to show:

- different products need different context
- client work needs clean isolation
- reusable guidance should live outside any single repository
- multiple tools should be able to read the same source of truth
- long-lived context should change through an explicit, reviewable flow
- one person may have many sessions open across many repositories at once

`gctree` exists to handle that layer cleanly.

## Scope boundary

`gctree` is intentionally not:

- a request-to-commit delivery orchestrator
- a hidden memory system
- a browser collaboration runtime
- a general-purpose knowledge base product

It focuses on one job: managing reusable global-context branches and explicit durable updates.

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
- `docs/` holds the source-of-truth markdown documents.

## Repo-aware behavior

A gc-branch does not need to apply everywhere.
If branch `A` only matters to repositories `B`, `C`, and `D`, `gctree` can record that in `branch-repo-map.json`.

When `gctree resolve` runs in another repository such as `F`, it can:

- continue once
- always use that gc-branch in `F`
- ignore that gc-branch in `F`

That makes gc-tree much safer for heavy users who keep many parallel sessions open across unrelated repositories.
