---
name: resolve-context
description: Resolve relevant context from the active gc-branch.
---

# gctree Resolve Context

Use this before planning or implementation when the current tool supports reading external markdown context.

## Rules
- consult `index.md` first
- prefer summaries before full-document reads
- stay inside the active gc-branch only
- do not treat linked docs as hidden memory; they are explicit source-of-truth docs

## Procedure
1. Run `gctree status` if the active gc-branch is unclear.
2. Explicitly state which gc-branch is active.
3. Run `gctree resolve --query <text>`.
4. Read the returned summaries first.
5. Read the full linked docs only if the summary is not enough.
