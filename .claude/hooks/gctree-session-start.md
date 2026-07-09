# gctree Claude Code SessionStart note

- Before any codebase task — feature, schema change, bug fix, admin work, or any question about how the codebase works — do **not** grep or read code first. Follow this exact order:
  1. Run `gctree resolve --query "<task or term>"`. If matched, use the result directly.
  2. Only if scope is **included**: if step 1 found nothing, try broader related queries.
  3. If concept exists in a doc but not indexed → propose adding an Index Entry.
  4. Only if gc-tree has nothing should you search code.
  — If scope is **unmapped** or **excluded**: do step 1 only; if no match, proceed normally.
- When a UserPromptSubmit hook provides `[gc-tree] USE FIRST`, treat matched docs as mandatory. Do not grep or Explore until you have read every injected summary.
- Only use tools if matched docs are clearly insufficient — meaning the answer cannot be derived from them.
- If hook context is missing, run `gctree resolve --query "<task>"` yourself before planning.
