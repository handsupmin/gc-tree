---
name: resolve-context
description: Resolve relevant context from the active gctree branch.
---

# gctree Resolve Context

Use this before planning or implementation when the current tool supports reading external markdown context.

## Rules
- consult `index.md` first
- prefer summaries before full-document reads
- stay inside the active branch only
- do not treat linked docs as hidden memory; they are explicit source-of-truth docs

## Procedure
1. Run `gctree status` if the active branch is unclear.
2. Run `gctree resolve --query <text>`.
3. Read the returned summaries first.
4. Read the full linked docs only if the summary is not enough.
