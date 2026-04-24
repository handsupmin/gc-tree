---
description: Guided onboarding for the active gc-branch in gctree.
---

Use this only when the active gc-branch is empty.

1. Run `gctree status` and explicitly state the active gc-branch to the user.
2. This is **global context onboarding**, not repo-local onboarding.
3. Ask **one question at a time**.
4. **Language lock**: detect the language the user writes in from their very first response and use it for every subsequent message without exception — numbered confirmations (1/2/3), hypotheses, summaries, doc content, and wrap-up must all be in that language. Never revert to English mid-session regardless of what language appears in repo names, code comments, or source docs.
5. Wait for the user's first answer before you inspect docs, repos, directories, or files on your own.
6. Start by asking the user to paste or share organized docs or reference material if they have any; otherwise ask what kind of work they mainly do.
7. Do **not** start with a repo scan, a company guess, or a broad hypothesis built from directories like `~/sources`.
8. Do **not** ask for a full information dump up front.
9. If docs, reference material, or reference paths are provided, read those first, summarize your understanding back, ask whether that summary is correct before continuing, and skip any questions the docs already answered well.
10. If no docs are available, continue from the user's own description first, then after the user's first answer, proactively inspect related repos, docs, paths, and workflows that appear materially connected.
11. Use bounded local inspection to confirm or challenge the user's description instead of waiting for the user to enumerate every related repo manually.
12. Do **not** scan broad directories or inspect every source file; prefer docs, READMEs, summaries, and a few pointed paths first.
13. Then ask whether anything important is still missing or worth adding before you continue into deeper discovery.
14. When you do present a hypothesis, offer only these structured numbered confirmations: 1. This is mostly correct. 2. Some parts are wrong. Please explain what differs. 3. Most of this is wrong. Please explain the right frame.
15. If the user picks 2 or 3, ask only for the delta, correction, or right frame instead of restarting from scratch.
16. Do **not** start by asking what one repository does.
17. Only ask the user who they are, what kind of person they are in the organization, and what work they usually own or lead after the provided docs or description still leave real gaps.
18. Ask next for one core recurring work type only when the provided docs or description still do not make the work types clear, then ask whether there are more work types to capture.
19. For each work type, ask how that work shows up day to day.
20. Only after the work types are clear should you ask which repositories are involved in each work type.
21. Once the user names concrete repositories, do not ask them to explain those repositories from scratch when recoverable local evidence exists.
22. For each repository that can be inspected locally, read the strongest available evidence first (README, docs, package metadata, top-level entrypoints, deployment/config files, and a few pointed paths), then present your current understanding back as a short hypothesis.
23. After that repository-level hypothesis, ask the user to choose only one structured confirmation: 1. This is mostly correct. 2. Some parts are wrong. Please explain what differs. 3. Most of this is wrong. Please explain the right frame.
24. When local evidence already covers the repository role, important paths, workflow, or conventions well enough, skip the open-ended questions and ask only for missing deltas.
25. Only ask open-ended repository questions when the needed detail cannot be recovered responsibly from local evidence.
26. After the user's first answer, proactively inspect relevant local repos, docs, paths, and workflows whenever the connection is strong enough to test your current frame.
27. Ask whether there are additional repositories for the current work type before moving on.
28. After repository coverage, ask for company/domain glossary terms and acronyms that should become durable context.
29. Then ask which verification commands should be treated as defaults for this kind of work.
30. Synthesize the interview into an encyclopedia-style context set with many small docs instead of a few broad docs.
31. Prefer category directories such as `docs/role/`, `docs/repos/`, `docs/domain/`, `docs/workflows/`, `docs/conventions/`, and `docs/infra/` whenever that split fits the material.
32. Prefer one concept, one repository, one workflow, or one convention per file when possible.
33. Treat `index.md` as concept-first: show the keywords a user or AI would search for, not just broad document titles.
34. Generate index entries automatically from primary concept names, aliases, repository nicknames, and workflow labels when those are clear.
35. Split glossary docs when a concept is likely to be searched directly, needs more than a short definition, or carries workflow/constraint details; keep only low-value leftover terms in a shared glossary.
36. Keep each doc summary-first so the top section gives the gist before deeper details.
37. Treat `index.md` as a human-readable dictionary-style table of contents grouped by category headings and `label -> path` entries.
38. Then create a temporary JSON file with `branchSummary` and `docs[]` (`title`, `summary`, `body`).
39. Run `gctree __apply-onboarding --input <temp-file>`.
40. Before you claim onboarding is complete, run `gctree verify-onboarding --branch <current-gc-branch>` and inspect the real gc-tree files.
41. Do not claim onboarding is complete unless verification returns `status: "complete"` **and** `quality_issues` is an empty array.
42. If `quality_issues` is non-empty, do **not** tell the user onboarding is done. Self-heal immediately without asking the user: (a) identify which docs have `category: "general"`, (b) assign each a correct category from `role | repos | domain | workflows | conventions | infra | verification` based on content, (c) rebuild the full onboarding JSON with every doc having an explicit `category` field set to one of those values, (d) run `gctree __apply-onboarding --input <temp-file>` again, (e) rerun `gctree verify-onboarding` and repeat until `quality_issues` is empty. Never use `"general"` as a category in the JSON — it is a fallback for missing data, not a valid category.
43. If verification returns `status: "incomplete"` for reasons other than quality_issues, do not tell the user onboarding is done; inspect the reported failures, heal what can be healed automatically, rerun verification, and repeat until it passes or a real blocker remains.
44. After applying the onboarding docs, explicitly list which durable docs were saved.
45. Then summarize what you now understand from the saved docs instead of stopping at the filenames alone.
46. For that final summary, do not ask an open-ended validation question first; present the summary and ask the user to choose only one structured confirmation: 1. This matches well enough. 2. Some parts are wrong. I will give the delta. 3. The frame is wrong. I will restate it.
47. If the user picks 2 or 3 for the final summary, ask only for the correction delta or replacement frame, then update the saved understanding instead of restarting the interview.
48. Ask whether anything else should be saved while the context is still fresh.
49. After docs are confirmed correct, do not ask the user to recall repo-scope mappings from scratch; propose the concrete repository candidates that appear materially tied to this gc-branch, then ask the user to choose only one structured confirmation: 1. Map these candidates. 2. Map these, but with corrections. 3. Skip repo mapping for now.
50. If the user picks 2 for repo mapping, ask only for the repo delta to add or remove. If the user picks 1 or gives corrected candidates, navigate to each confirmed repository and run `gctree set-repo-scope --branch <current-gc-branch> --include`. Skip mapping only if the user picks 3 or explicitly says mapping is not needed.
51. Do not finish onboarding while material related repos, workflows, or domain terms remain uninspected when recoverable local evidence is still available.
52. Only after the related repos, workflows, glossary, default verification commands, repo-scope mapping, and verification gate are all complete should you wrap up.
53. When you do wrap up, explicitly tell the user three things in plain language: onboarding is finished; future durable changes can be made with `gctree update-global-context`, or directly through the provider command surface as Codex `$gc-update-global-context {prompt}` and Claude Code `/gc-update-global-context {prompt}`; and they can close this session and start fresh in a new one.
54. If the gc-branch is not empty, stop and tell the user to run `gctree reset-gc-branch --branch <current-gc-branch> --yes` or `gctree update-global-context` instead.
