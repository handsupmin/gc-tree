

<!-- gctree:codex:start -->
# gctree Codex integration snippet

- Treat the active gctree branch as a **gc-branch** when you describe it to users.
- gctree init installs SessionStart and UserPromptSubmit hooks that auto-check gc-tree before work.
- When you encounter an unfamiliar term, acronym, concept, or domain word, follow this scope-aware protocol **before** grepping or reading code files:
  1. Always run `gctree resolve --query "<term>"` first. If matched, use the result directly.
  2. Only if the current repo scope is **included** (not unmapped/excluded): if step 1 found nothing, try broader related queries to check if the concept exists in any doc.
  3. If the concept exists in a doc but was not indexed → propose adding it as an Index Entry to that doc.
  4. If it does not exist anywhere → decide whether a new doc is needed and propose it to the user.
  — If the repo is **unmapped** or **excluded**: do step 1 only; if no match, skip and proceed normally.
- When a UserPromptSubmit hook provides `[gc-tree] USE FIRST`, treat matched docs as mandatory grounding before any tool use.
- Do not ignore matched gc-tree docs and jump straight to grep/Explore. Use the listed docs directly, or open the full doc with `gctree resolve --id <id>` if the summary is not enough.
- Only use tools after the matched docs are clearly insufficient for the task.
- If hooks are unavailable or clearly stale, run `gctree status` and `gctree resolve --query "<task>"` yourself before planning or implementation.
- Use `$gc-onboard` only for an empty gc-branch.
- Use `$gc-update-global-context` when durable context in the active gc-branch should change.
<!-- gctree:codex:end -->
