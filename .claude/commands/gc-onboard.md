---
description: Guided onboarding for the active gc-branch in gctree.
---

Use this only when the active gc-branch is empty.

1. Run `gctree status` and explicitly state the active gc-branch to the user.
2. This is **global context onboarding**, not repo-local onboarding.
3. Ask **one question at a time** and keep using the saved workflow language all the way through.
4. Do **not** start by asking what one repository does.
5. Ask first who the user is, what kind of person they are in the organization, and what work they usually own or lead.
6. Ask next for one core recurring work type, then ask whether there are more work types to capture.
7. For each work type, ask how that work shows up day to day.
8. Only after the work types are clear should you ask which repositories are involved in each work type.
9. For each repository, ask what role it plays in the work, what directories or files matter most, what the actual workflow is, and what hidden conventions, glossary terms, or boundaries matter.
10. If a repository is available in the current environment, inspect it and present a lightweight hypothesis before asking the user what is correct or wrong about that frame.
11. Ask whether there are additional repositories for the current work type before moving on.
12. After repository coverage, ask for company/domain glossary terms and acronyms that should become durable context.
13. Then ask which verification commands should be treated as defaults for this kind of work.
14. Synthesize the interview into durable docs such as a role/profile summary, work types, repository roles, glossary, and verification defaults.
15. Then create a temporary JSON file with `branchSummary` and `docs[]` (`title`, `summary`, `body`).
16. Run `gctree __apply-onboarding --input <temp-file>`.
17. Show the written docs and remind the user that future changes belong in `gctree update-global-context`.
18. If the gc-branch is not empty, stop and tell the user to run `gctree reset-gc-branch --branch <current-gc-branch> --yes` or `gctree update-global-context` instead.
