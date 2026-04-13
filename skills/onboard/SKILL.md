---
name: onboard
description: Create or refresh a gctree branch from structured onboarding knowledge.
---

# gctree Onboard

Use this when a user wants to create or refresh global context for a product, company, or workstream.

## Rules
- ask one question at a time
- keep the active branch explicit
- write compact source docs with a required `## Summary` section near the top
- keep `index.md` as an index only

## Procedure
1. Confirm which branch should hold this context. Offer `main` as the default.
2. Gather the minimum source documents needed to describe the branch.
3. Produce a JSON onboarding input with:
   - `branchSummary`
   - `docs[]` containing `title`, `summary`, and `body`
4. Run `gctree onboard --input <file> [--branch <name>]`.
5. Show the user the written docs and remind them that future updates should go through proposals.
