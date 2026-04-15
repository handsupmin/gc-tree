---
name: onboard
description: Launch guided onboarding for the active gc-branch through the configured provider.
---

# gctree Onboard

Use this when a user wants to create global context for a product, company, or workstream in an empty gc-branch.

## Rules
- ask one question at a time
- keep the active gc-branch explicit
- write compact source docs with a required `## Summary` section near the top
- keep `index.md` as an index only
- use onboarding only for an empty gc-branch

## Procedure
1. Confirm which gc-branch should hold this context. Offer `main` as the default.
2. If the gc-branch already contains docs, stop and direct the user to `gctree reset-gc-branch --branch <current-gc-branch> --yes` or `gctree update-global-context`.
3. Launch the guided onboarding flow with `gctree onboard [--branch <name>]`.
4. Keep the current gc-branch explicit while gathering context.
