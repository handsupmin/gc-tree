---
description: Guided durable update for the active gc-branch in gctree.
---

1. Run `gctree status` and explicitly state the active gc-branch to the user.
2. Ask what durable context should change, one question at a time.
3. If this repo clearly belongs to the current gc-branch but is not mapped yet, ask the user whether it should be added to the branch-repo map and run `gctree set-repo-scope --branch <current-gc-branch> --include` when they approve.
4. Create a temporary JSON file containing the updated `docs[]` and optional `branchSummary`.
5. Run `gctree __apply-update --input <temp-file>`.
6. Show the updated docs back to the user.
