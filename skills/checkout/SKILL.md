---
name: checkout
description: Switch or create a gctree branch.
---

# gctree Checkout

Use this when the user wants to separate global context for different products, clients, companies, or work modes.

## Procedure
- `gctree checkout <branch>` switches to an existing branch.
- `gctree checkout -b <branch>` creates a new branch from the current branch and switches to it.
- After checkout, run `gctree status` so the user can see which branch is active.

## Notes
- Treat branch names the way git treats branches: short, memorable, purpose-oriented.
- Keep branch switching explicit so different products do not bleed into each other.
