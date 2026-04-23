

<!-- gctree:claude:start -->
# gctree Claude Code integration snippet

- Treat the active gctree branch as a **gc-branch** in user-facing language.
- gctree init installs SessionStart and UserPromptSubmit hooks that auto-inject gc-tree context before every prompt.
- When a UserPromptSubmit hook provides `[gc-tree] PRE-TASK CONTEXT`, treat it as mandatory pre-reading. Read and internalize the injected summaries **before** calling any tools (Explore, grep, Read, Bash). Do not explore code first.
- If hooks are unavailable or clearly stale, run `gctree status` and `gctree resolve --query "<task>"` yourself before planning or implementation.
- Use `/gc-onboard` only for an empty gc-branch.
- Use `/gc-update-global-context` when durable context in the active gc-branch should change.
<!-- gctree:claude:end -->
