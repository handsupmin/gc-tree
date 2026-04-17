---
name: onboard
description: Launch guided onboarding for the active gc-branch through the configured provider.
---

# gctree Onboard

Use this when a user wants to create global context for a product, company, or workstream in an empty gc-branch.

## Rules
- ask one question at a time
- keep the active gc-branch explicit
- this is global-context onboarding, not repo-local onboarding
- wait for the user's first answer before inspecting anything on your own
- start by asking the user to paste or share organized docs or reference material if they have any; otherwise ask what kind of work they mainly do
- do not start with a repo scan, a company guess, or a broad hypothesis built from directories like `~/sources`
- do not ask for a full information dump up front
- if docs, reference material, or reference paths are provided, read them first and summarize your understanding back before asking for more
- ask whether that summary is correct before continuing, let the user correct it, and skip questions the docs already answered well
- if no docs are available, continue from the user's own description first and ask for the most relevant repo, path, or file only when needed
- only inspect docs, repos, directories, or files after the user has pointed you at them or confirmed they matter
- dig only through the user-provided material and the minimum related files needed for the next question
- do not inspect every source file; prefer docs, READMEs, summaries, and a few pointed paths first
- when you do present a hypothesis, keep it lightweight and only after the user has narrowed the scope
- use structured numbered confirmations like:
  1. This is basically correct.
  2. Part of it is wrong. I will explain what differs.
  3. This is the wrong frame. I will explain what you should inspect or how this gc-branch should be approached.
- if the user picks 2 or 3, ask only for the delta or better pointer instead of restarting from scratch
- ask whether anything important is still missing before continuing deeper
- do not start by asking what one repo does
- ask who the person is and what work they usually own only after the provided docs or description still leave real gaps
- ask for multiple work types if needed, then multiple repos inside each work type if needed
- ask about glossary terms and default verification commands before you finish
- write compact source docs with a required `## Summary` section near the top
- keep `index.md` as an index only
- use onboarding only for an empty gc-branch

## Procedure
1. Confirm which gc-branch should hold this context. Offer `main` as the default.
2. If the gc-branch already contains docs, stop and direct the user to `gctree reset-gc-branch --branch <current-gc-branch> --yes` or `gctree update-global-context`.
3. Wait for the user's first answer. Start by asking them to paste or share organized docs or reference material if they have any; otherwise ask what kind of work they mainly do.
4. Do not scan broad directories like `~/sources`, guess the company/product from unrelated repos, or inspect every source file before the user narrows the scope.
5. If docs, reference material, or reference paths are provided, read those first, summarize your understanding back, ask whether that summary is correct, and ask whether anything important is still missing before moving on.
6. If no docs are available, continue from the user's own description first and ask for the most relevant repo, path, or file only when needed.
7. Only inspect docs, repos, directories, or files after the user has pointed you at them or confirmed they matter.
8. When you inspect, dig only through the user-provided material and the minimum related files needed for the next question. Prefer docs, READMEs, summaries, and a few pointed paths first.
9. Once the scope is narrow enough, present a lightweight hypothesis from the evidence you inspected, then ask the user to choose one:
   1. This is basically correct.
   2. Part of it is wrong. I will explain what differs.
   3. This is the wrong frame. I will explain what you should inspect or how this gc-branch should be approached.
10. If the user picks 2 or 3, ask only for the delta or the next best pointer to inspect instead of requesting a full rewrite of the context.
11. When the inspected evidence already covers the basics well, confirm that and skip ahead to the missing parts instead of re-asking everything from scratch.
12. Start from the person only when the provided docs or description still do not make that clear:
   - who they are
   - what kind of work they usually own or lead
13. Ask for one core recurring work type only when the provided docs or description still do not make the work types clear, then ask whether there are more work types to capture.
14. For each work type, ask how it shows up in day-to-day work.
15. Only after that ask which repositories are involved in that work type, and ask whether there are more repositories for that same work type.
16. For each relevant repo, ask:
   - what role it plays
   - which paths matter most
   - what the actual workflow is
   - what hidden conventions, glossary terms, boundaries, or constraints matter
17. If a relevant repo, path, or doc is available locally and the user has pointed you to it, inspect it and show a lightweight hypothesis so the user can correct your frame.
18. Ask for company/domain glossary terms and acronyms that should become durable context.
19. Ask which verification commands should be treated as defaults for this gc-branch.
20. Launch the guided onboarding flow with `gctree onboard [--branch <name>]`.
21. After the onboarding docs are written, explicitly list which durable docs were saved.
22. Summarize what you now understand from the saved docs instead of ending at the filenames alone.
23. Ask whether that final summary matches the user's reality, and capture any corrections before you wrap up.
24. Ask whether anything else should be saved while the context is still fresh.
25. End with remaining risks, blind spots, or details that still need confirmation, and remind the user that future changes belong in `gctree update-global-context`.
26. Keep the current gc-branch explicit while gathering context.
