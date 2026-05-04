---
name: reset-gc-branch
description: Clear an existing gc-branch so it can be onboarded again.
---

# gctree Reset gc-branch

Use this when a gc-branch already contains context but the user truly wants to start that gc-branch over from an empty state.

## Procedure
1. Confirm which gc-branch will be reset.
2. Remind the user that this clears the current branch context so onboarding can run again.
3. Run `gctree reset-gc-branch --branch <name> --yes`.
4. After reset, use `gctree onboard` to launch guided onboarding again.
