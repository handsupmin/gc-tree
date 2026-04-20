

<!-- gctree:codex:start -->
# gctree Codex integration snippet

- Treat the active gctree branch as a **gc-branch** when you describe it to users.
- gctree init installs SessionStart and UserPromptSubmit hooks that auto-check gc-tree before work.
- Use the hook-injected gc-tree context first. If hooks are unavailable or clearly stale, run `gctree status` and `gctree resolve --query "<task>"` yourself before planning or implementation.
- Use `$gc-onboard` only for an empty gc-branch.
- Use `$gc-update-global-context` when durable context in the active gc-branch should change.
<!-- gctree:codex:end -->
