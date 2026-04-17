---
name: update-global-context
description: Launch a guided durable update for the active gc-branch.
---

# gctree Update Global Context

Use this when work has revealed a durable change that should update the active gc-branch's global context.

## Hard rule
Do not re-onboard a non-empty gc-branch.
Use guided updates for durable changes and reserve onboarding for empty gc-branches only.

## Procedure
1. Summarize what changed and why it should become durable context.
2. Confirm the active gc-branch with `gctree status`.
3. Launch the guided update flow with one of:
   - `gctree update-global-context`
   - `gctree update-gc`
   - `gctree ugc`
4. Keep the current gc-branch explicit throughout the conversation.
