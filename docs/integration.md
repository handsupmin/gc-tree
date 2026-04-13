# gc-tree Integration Notes

`gctree` is meant to be attached to existing AI coding tools, not replace them.

## Common pattern

1. install the `gctree` CLI somewhere on the machine
2. initialize `~/.gctree/`
3. place or reference the Markdown skills from `skills/`
4. make the host tool call `gctree resolve --query ...` before planning or implementation when global context may matter
5. use `gctree propose-update` / `apply-update` for durable context changes

## Codex CLI / Claude Code CLI

- reference the `skills/` directory directly or copy the relevant `SKILL.md` files
- prefer the following skill flow:
  - `onboard`
  - `checkout`
  - `resolve-context`
  - `update-global-context`
  - `feedback`

## OmO / OmX / OmC

These systems can treat `gctree` as a support-layer global context service:
- `checkout` selects which global context tree is active for the current work mode
- `resolve-context` returns compact matches from the active branch
- `propose-update` lets the orchestration layer draft a durable update without mutating global context silently
- `apply-update` is invoked only after explicit user approval

## Philosophy boundary

`gctree` should stay smaller than a full delivery orchestrator.
It owns reusable global context branches and proposal-first updates, not request-to-commit workflow control.
