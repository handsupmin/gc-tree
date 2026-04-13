---
name: update-global-context
description: Propose and, after approval, apply a global context update in gctree.
---

# gctree Update Global Context

Use this when work has revealed a durable change that should update the active branch's global context.

## Hard rule
Do not mutate global context silently.
Draft a proposal, ask the user, and apply only after explicit approval.

## Procedure
1. Summarize what changed and why it should become durable context.
2. Draft a proposal JSON with:
   - `title`
   - `summary`
   - `docs[]` containing the updated summary/body for each source doc
3. Run `gctree propose-update --input <file>`.
4. Show the proposal summary to the user and ask:
   - should this be applied as-is?
   - should anything be revised first?
5. Apply only after explicit approval with `gctree apply-update --proposal <file>`.
