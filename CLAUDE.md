# gctree Claude Code integration snippet

- Treat the active gctree branch as a **gc-branch** in user-facing language.
- Run `gctree status` before relying on global context if the active gc-branch is unclear.
- Use `gctree resolve --query "<task>"` when reusable global context may matter.
- Use `/gc-onboard` only for an empty gc-branch.
- Use `/gc-update-global-context` when durable context in the active gc-branch should change.
