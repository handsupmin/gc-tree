---
description: Resolve reusable global context from the active gc-branch.
argument-hint: "<query>"
---

1. Run `gctree status` if the active gc-branch is unclear.
2. Explicitly mention the active gc-branch before using the result.
3. Run `gctree resolve --query "$ARGUMENTS"`.
4. If the current repo is outside the mapped scope, choose whether to continue once, always use this gc-branch for this repo, or ignore this gc-branch here.
5. Read summaries first and only open full docs if needed.
