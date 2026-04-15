---
name: checkout
description: Switch or create a gctree gc-branch.
---

# gctree Checkout

Use this when the user wants to separate global context for different products, clients, companies, or work modes.

## Procedure
- `gctree checkout <branch>` switches to an existing gc-branch.
- `gctree checkout -b <branch>` creates a new empty gc-branch and switches to it.
- After checkout, run `gctree status` so the user can see which gc-branch is active.

## Notes
- In user-facing language, call these **gc-branches** so they are not confused with git branches.
- Keep gc-branch switching explicit so different products do not bleed into each other.
