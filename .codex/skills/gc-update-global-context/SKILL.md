---
description: Guided durable update for the active gc-branch in gctree.
---

1. Run `gctree status` and state the active gc-branch.
2. Understand what changed — read the user's request, inspect relevant code or docs if needed, and determine the right content to capture.
3. Decide category and path automatically based on content — never ask the user about scope or placement:
   - `docs/workflows/<name>.md` — cross-repo action sequences, step-by-step procedures
   - `docs/conventions/<repo>.md` — code patterns, naming, validation, DTO/service conventions for a repo
   - `docs/repos/<repo>.md` — repo role, key paths, cross-repo dependencies
   - `docs/domain/<concept>.md` — domain terms, acronyms, business logic
   - `docs/infra/<topic>.md` — infra, deployment, environment config
   - `docs/role/<name>.md` — team member roles, responsibilities
4. Write a `## Summary` that is actionable: actual patterns/commands/constraints a developer needs — not a sentence about what the doc covers.
5. Create a temporary JSON file with the updated `docs[]` and run `gctree __apply-update --input <temp-file>`.
6. Run `gctree verify-onboarding --branch <gc-branch>` and inspect the output:
   - Check that every updated doc appears in the verified doc list.
   - Check that index entries for the new content exist and are searchable (not just generic titles).
   - Check that no doc has `category: "general"` — reassign to correct category if so.
   - Check that important concepts from the update are present as index labels — if missing, re-apply with added index entries.
   - Self-heal any issues without asking the user: fix category, add index entries, re-run `gctree __apply-update`, re-verify.
7. Show the user which docs were updated and confirm the index now covers the new content.
