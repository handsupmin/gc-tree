# Principles

[English](principles.md) | [한국어](principles.ko.md) | [简体中文](principles.zh.md) | [日本語](principles.ja.md) | [Español](principles.es.md)

## Summary

`gctree` follows a small set of product rules: keep context branch-aware, keep source docs summary-first, keep indexes slim, make repo scope explicit, inject only what is relevant, and support any provider that can run shell commands.

## 1. Keep context branch-aware

One machine should be able to hold multiple global-context trees without mixing them together.
That is why `gctree` uses git-like language such as `checkout` and `checkout -b`, while still referring to the active branch as a **gc-branch** in user-facing copy.

## 2. Keep repo scope explicit

A gc-branch should not quietly affect every repository on the machine.
`gctree` uses `branch-repo-map.json` to record whether a repository is:

- included for a gc-branch
- excluded for a gc-branch
- not mapped yet

If `resolve` is called from an unmapped repository, the user can decide whether to continue once, always use that gc-branch there, or ignore it there.

## 3. Keep `index.md` slim and keyword-rich

The top-level `index.md` is an index, not a dump.
Its job is to help tools and humans find the right source document quickly.

The format groups keywords under each document path, eliminating repeated path entries:

```
- docs/workflows/db.md
  - DB migration
  - prisma schema
  - poetry run rev
  - model.py
```

This keeps the index compact while maximizing search surface. Every document should have as many relevant keywords as possible — aliases, command names, field names, acronyms, and related terms — so that any plausible query hits something useful.

## 4. Make source docs summary-first with actionable content

Every source-of-truth markdown document should include a `## Summary` section near the top.
That section is injected into the AI context before every task — so it must contain **actual patterns, commands, and constraints**, not a description of what the document covers.

Bad summary: `"This document describes the updateCollection pattern."`
Good summary: `"updateCollection: spread { ...dto } into body. Return plainToInstance(Res, result satisfies Res). New field order: DTO → service → controller."`

A summary that reads like a table-of-contents entry is useless. The AI will skip it and go straight to code.

## 5. Make onboarding explicit and guided

A user should not have to hand-author onboarding JSON just to create a useful context tree.
`gctree init` and `gctree onboard` should guide the user through their preferred provider, enable that provider globally, and write the resulting context into the active gc-branch.

Onboarding is only for empty gc-branches.
If a gc-branch already contains context, the correct path is either:

- reset that gc-branch and onboard again
- or run a guided durable update

## 6. Keep durable updates intentional

Durable context should not change by accident or through hidden memory.
The update flow should be explicit, provider-driven, and tied to the currently active gc-branch.

## 7. Inject only what is relevant

A tool session should never receive the entire knowledge base.
`gctree resolve` scores documents against the query and returns only the matching ones — title, summary, and excerpt. The full document is read only when the summary is not enough.

In practice this means roughly 4% of total stored context is injected per query. The remaining 96% stays on disk, out of the token window, until it is actually needed.

## 8. Stay provider-agnostic

`gctree` stores context in plain markdown files that any tool can read.
Claude Code and Codex both use the same underlying store. `gctree init` installs the global provider-facing hook surface, and `gctree scaffold` is the local override path for one repository or workspace.
Adding support for a new provider means writing a new scaffold template — no changes to the core storage or resolve logic.
