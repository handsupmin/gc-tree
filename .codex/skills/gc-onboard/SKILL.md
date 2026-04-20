---
description: Guided onboarding for the active gc-branch in gctree.
---

Use this only when the active gc-branch is empty.

1. Run `gctree status` and explicitly state the active gc-branch to the user.
2. This is **global context onboarding**, not repo-local onboarding.
3. Ask **one question at a time** and keep using the saved workflow language all the way through.
4. Wait for the user's first answer before you inspect docs, repos, directories, or files on your own.
5. Start by asking the user to paste or share organized docs or reference material if they have any; otherwise ask what kind of work they mainly do.
6. Do **not** start with a repo scan, a company guess, or a broad hypothesis built from directories like `~/sources`.
7. Do **not** ask for a full information dump up front.
8. If docs, reference material, or reference paths are provided, read those first, summarize your understanding back, ask whether that summary is correct before continuing, and skip any questions the docs already answered well.
9. If no docs are available, continue from the user's own description first and ask for the most relevant repo, path, or file only when needed.
10. Only inspect docs, repos, directories, or files after the user has pointed you at them or confirmed they matter.
11. When you inspect, dig only through the user-provided material and the minimum related files needed for the next question.
12. Do **not** scan broad directories or inspect every source file; prefer docs, READMEs, summaries, and a few pointed paths first.
13. Then ask whether anything important is still missing or worth adding before you continue into deeper discovery.
14. When you do present a hypothesis, offer structured numbered confirmations such as: 1. This is basically correct. 2. Part of it is wrong. I will explain what differs. 3. This is the wrong frame. I will explain what you should inspect or how this gc-branch should be approached.
15. If the user picks 2 or 3, ask only for the delta, correction, or better pointer instead of restarting from scratch.
16. Do **not** start by asking what one repository does.
17. Only ask the user who they are, what kind of person they are in the organization, and what work they usually own or lead after the provided docs or description still leave real gaps.
18. Ask next for one core recurring work type only when the provided docs or description still do not make the work types clear, then ask whether there are more work types to capture.
19. For each work type, ask how that work shows up day to day.
20. Only after the work types are clear should you ask which repositories are involved in each work type.
21. For each repository, ask what role it plays in the work, what directories or files matter most, what the actual workflow is, and what hidden conventions, glossary terms, or boundaries matter.
22. If a relevant repo, path, or doc is available locally and the user has pointed you to it, inspect it and present a lightweight hypothesis before asking what is correct or wrong about that frame.
23. Ask whether there are additional repositories for the current work type before moving on.
24. After repository coverage, ask for company/domain glossary terms and acronyms that should become durable context.
25. Then ask which verification commands should be treated as defaults for this kind of work.
26. Synthesize the interview into durable docs such as a role/profile summary, work types, repository roles, glossary, and verification defaults.
27. Then create a temporary JSON file with `branchSummary` and `docs[]` (`title`, `summary`, `body`).
28. Run `gctree __apply-onboarding --input <temp-file>`.
29. After applying the onboarding docs, explicitly list which durable docs were saved.
30. Then summarize what you now understand from the saved docs instead of stopping at the filenames alone.
31. Ask whether that final summary matches the user's reality, and capture any corrections before you wrap up.
32. Ask whether anything else should be saved while the context is still fresh.
33. End with remaining risks, blind spots, or details that still need confirmation, then remind the user that future changes belong in `gctree update-global-context`.
34. If the gc-branch is not empty, stop and tell the user to run `gctree reset-gc-branch --branch <current-gc-branch> --yes` or `gctree update-global-context` instead.
