# gctree Bootstrap

- Keep the active gc-branch explicit whenever global context matters.
- Before any codebase task — feature, schema change, bug fix, admin work — do **not** grep or read code first. Follow this exact order:
  1. Run `gctree resolve --query "<task or term>"`.
  2. If that misses, run broader related `gctree resolve` queries.
  3. If the concept is documented but not indexed, propose adding it as an Index Entry to the right doc.
  4. Only if gc-tree still does not answer it should you search code or repo docs.
- When hook-injected gc-tree matches are present, treat them as mandatory grounding. Use them directly or open the full doc with `gctree resolve --id <id>` before grep/file reads/code exploration.
- Only use tools (grep, file read, explore) if matched docs are clearly insufficient — meaning the answer cannot be derived from them at all.
- If hook context is missing, resolve reusable global context before planning or implementation.
- Treat gctree docs as explicit source-of-truth markdown, not hidden memory.
