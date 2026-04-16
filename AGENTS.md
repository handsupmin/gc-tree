# gctree Codex integration snippet

- Treat the active gctree branch as a **gc-branch** when you describe it to users.
- Before planning or implementation, run `gctree status` to confirm the active gc-branch if it is unclear.
- Use `gctree resolve --query "<task>"` when reusable global context may matter.
- Use `$gc-onboard` only for an empty gc-branch.
- Use `$gc-update-global-context` when durable context in the active gc-branch should change.
