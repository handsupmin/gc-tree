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
20. Once the user names concrete repositories, do not ask them to explain those repositories from scratch when recoverable local evidence exists.
21. For each repository that can be inspected locally, read the strongest available evidence first (README, docs, package metadata, top-level entrypoints, deployment/config files, and a few pointed paths), then present your current understanding back as a short hypothesis.
22. After that repository-level hypothesis, ask the user to choose only one structured confirmation: 1. This is mostly correct. 2. Some parts are wrong. Please explain what differs. 3. Most of this is wrong. Please explain the right frame.
23. When local evidence already covers the repository role, important paths, workflow, or conventions well enough, skip the open-ended questions and ask only for missing deltas.
24. Only ask open-ended repository questions when the needed detail cannot be recovered responsibly from local evidence.
25. After the user's first answer, proactively inspect relevant local repos, docs, paths, and workflows whenever the connection is strong enough to test your current frame.
26. Ask whether there are additional repositories for the current work type before moving on.
27. After repository coverage, ask for company/domain glossary terms and acronyms that should become durable context.
28. Then ask which verification commands should be treated as defaults for this kind of work.
29. Synthesize the interview into durable docs such as a role/profile summary, work types, repository roles, glossary, and verification defaults.
30. Then create a temporary JSON file with `branchSummary` and `docs[]` (`title`, `summary`, `body`).
31. Run `gctree __apply-onboarding --input <temp-file>`.
32. Before you claim onboarding is complete, run `gctree verify-onboarding --branch <current-gc-branch>` and inspect the real gc-tree files.
33. Do not claim onboarding is complete unless verification returns `status: "complete"`.
34. If verification returns anything other than `status: "complete"`, do not tell the user onboarding is done; inspect the reported failures, heal what can be healed automatically, rerun verification, and repeat until it passes or a real blocker remains.
35. After applying the onboarding docs, explicitly list which durable docs were saved.
36. Then summarize what you now understand from the saved docs instead of stopping at the filenames alone.
37. For that final summary, do not ask an open-ended validation question first; present the summary and ask the user to choose only one structured confirmation: 1. This matches well enough. 2. Some parts are wrong. I will give the delta. 3. The frame is wrong. I will restate it.
38. If the user picks 2 or 3 for the final summary, ask only for the correction delta or replacement frame, then update the saved understanding instead of restarting the interview.
39. Ask whether anything else should be saved while the context is still fresh.
40. After docs are confirmed correct, do not ask the user to recall repo-scope mappings from scratch; propose the concrete repository candidates that appear materially tied to this gc-branch, then ask the user to choose only one structured confirmation: 1. Map these candidates. 2. Map these, but with corrections. 3. Skip repo mapping for now.
41. If the user picks 2 for repo mapping, ask only for the repo delta to add or remove. If the user picks 1 or gives corrected candidates, navigate to each confirmed repository and run `gctree set-repo-scope --branch <current-gc-branch> --include`. Skip mapping only if the user picks 3 or explicitly says mapping is not needed.
42. Do not finish onboarding while material related repos, workflows, or domain terms remain uninspected when recoverable local evidence is still available.
43. Only after the related repos, workflows, glossary, and default verification commands are either captured or explicitly unavailable should you wrap up.
44. When you wrap up, explicitly tell the user three things in plain language: onboarding is finished; future durable changes can be made with `gctree update-global-context`, or directly through the provider command surface as Codex `$gc-update-global-context {prompt}` and Claude Code `/gc-update-global-context {prompt}`; and they can close this session and start fresh in a new one.
45. If the gc-branch is not empty, stop and tell the user to run `gctree reset-gc-branch --branch <current-gc-branch> --yes` or `gctree update-global-context` instead.
