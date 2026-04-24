

<!-- gctree:claude:start -->
# gctree Claude Code integration snippet

- Treat the active gctree branch as a **gc-branch** in user-facing language.
- gctree init installs SessionStart and UserPromptSubmit hooks that auto-inject gc-tree context before every prompt.
- When you encounter an unfamiliar term, acronym, concept, or domain word, follow this scope-aware protocol **before** grepping or reading code files:
  1. Always run `gctree resolve --query "<term>"` first. If matched, use the result directly.
  2. Only if the current repo scope is **included** (not unmapped/excluded): if step 1 found nothing, try broader related queries to check if the concept exists in any doc.
  3. If the concept exists in a doc but was not indexed → propose adding it as an Index Entry to that doc.
  4. If it does not exist anywhere → decide whether a new doc is needed and propose it to the user.
  — If the repo is **unmapped** or **excluded**: do step 1 only; if no match, skip and proceed normally.
- When a UserPromptSubmit hook provides `[gc-tree] PRE-TASK CONTEXT`, treat it as mandatory pre-reading before any tool use.
- If the injected summaries contain enough information to answer the question or complete the task, respond directly from them **without calling any tools**. Do not grep, explore, or read code files to confirm what the summaries already cover.
- Only use tools if the summaries are clearly insufficient — meaning the answer cannot be derived from them at all.
- If hooks are unavailable or clearly stale, run `gctree status` and `gctree resolve --query "<task>"` yourself before planning or implementation.
- Use `/gc-onboard` only for an empty gc-branch.
- Use `/gc-update-global-context` when durable context in the active gc-branch should change.
<!-- gctree:claude:end -->
