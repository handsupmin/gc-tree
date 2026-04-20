# gctree Claude Code SessionStart note

- gctree init installs real SessionStart/UserPromptSubmit hooks via `.claude/hooks/hooks.json`.
- At session start, use the injected hook context to confirm the active gc-branch.
- Refer to gctree branches as **gc-branches** in user-facing language.
- If hook context is missing or stale, resolve summaries before planning or implementation when branch-level context may change the answer.
