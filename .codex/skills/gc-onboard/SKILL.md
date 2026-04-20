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
9. If no docs are available, continue from the user's own description first, then after the user's first answer, proactively inspect related repos, docs, paths, and workflows that appear materially connected.
10. Use bounded local inspection to confirm or challenge the user's description instead of waiting for the user to enumerate every related repo manually.
11. Do **not** scan broad directories or inspect every source file; prefer docs, READMEs, summaries, and a few pointed paths first.
12. Then ask whether anything important is still missing or worth adding before you continue into deeper discovery.
13. When you do present a hypothesis, offer only these structured numbered confirmations: 1. This is mostly correct. 2. Some parts are wrong. Please explain what differs. 3. Most of this is wrong. Please explain the right frame.
14. If the user picks 2 or 3, ask only for the delta, correction, or right frame instead of restarting from scratch.
15. Do **not** start by asking what one repository does.
16. Only ask the user who they are, what kind of person they are in the organization, and what work they usually own or lead after the provided docs or description still leave real gaps.
17. Ask next for one core recurring work type only when the provided docs or description still do not make the work types clear, then ask whether there are more work types to capture.
18. For each work type, ask how that work shows up day to day.
19. Only after the work types are clear should you ask which repositories are involved in each work type.
20. For each repository, ask what role it plays in the work, what directories or files matter most, what the actual workflow is, and what hidden conventions, glossary terms, or boundaries matter.
21. After the user's first answer, proactively inspect relevant local repos, docs, paths, and workflows whenever the connection is strong enough to test your current frame.
22. Ask whether there are additional repositories for the current work type before moving on.
23. After repository coverage, ask for company/domain glossary terms and acronyms that should become durable context.
24. Then ask which verification commands should be treated as defaults for this kind of work.
25. Synthesize the interview into durable docs such as a role/profile summary, work types, repository roles, glossary, and verification defaults.
26. Then create a temporary JSON file with `branchSummary` and `docs[]` (`title`, `summary`, `body`).
27. Run `gctree __apply-onboarding --input <temp-file>`.
28. After applying the onboarding docs, explicitly list which durable docs were saved.
29. Then summarize what you now understand from the saved docs instead of stopping at the filenames alone.
30. Ask whether that final summary matches the user's reality, and capture any corrections before you wrap up.
31. Ask whether anything else should be saved while the context is still fresh.
32. Do not finish onboarding while material related repos, workflows, or domain terms remain uninspected when recoverable local evidence is still available.
33. Only after the related repos, workflows, glossary, and default verification commands are either captured or explicitly unavailable should you wrap up, then remind the user that future changes belong in `gctree update-global-context`.
34. If the gc-branch is not empty, stop and tell the user to run `gctree reset-gc-branch --branch <current-gc-branch> --yes` or `gctree update-global-context` instead.
