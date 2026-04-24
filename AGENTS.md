

<!-- gctree:codex:start -->
# gctree Codex integration snippet

- Treat the active gctree branch as a **gc-branch** when you describe it to users.
- gctree init installs SessionStart and UserPromptSubmit hooks that auto-check gc-tree before work.
- When you encounter an unfamiliar term, acronym, concept, or domain word, follow this protocol **before** grepping or reading code files:
  1. Run `gctree resolve --query "<term>"` — if matched, use the result directly.
  2. If no match, try broader related queries to check if the concept lives in any doc.
  3. If the concept exists in a doc but was not indexed -> propose adding it as an Index Entry to that doc.
  4. Only if gc-tree still does not answer it should you grep or read code.
- When a UserPromptSubmit hook provides `[gc-tree] PRE-TASK CONTEXT`, treat it as mandatory pre-reading before any tool use.
- If the injected summaries contain enough information to answer the question or complete the task, respond directly from them without calling tools.
- Use the hook-injected gc-tree context first. If hooks are unavailable or clearly stale, run `gctree status` and `gctree resolve --query "<task>"` yourself before planning or implementation.
- Use `$gc-onboard` only for an empty gc-branch.
- Use `$gc-update-global-context` when durable context in the active gc-branch should change.
<!-- gctree:codex:end -->
