# Principles

[English](principles.md) | [한국어](principles.ko.md) | [简体中文](principles.zh.md) | [日本語](principles.ja.md) | [Español](principles.es.md)

## Summary

`gctree` follows a small set of product rules: keep context branch-aware, keep source docs summary-first, keep indexes slim, and make repo scope explicit so a gc-branch only influences the repositories where it belongs.

## 1. Keep context branch-aware

One machine should be able to hold multiple global-context trees without mixing them together.
That is why `gctree` uses git-like language such as `checkout` and `checkout -b`, while still referring to the active branch as a **gc-branch** in user-facing copy.

## 2. Keep repo scope explicit

A gc-branch should not quietly affect every repository on the machine.
`gctree` uses `branch-repo-map.json` to record whether a repository is:

- included for a gc-branch
- excluded for a gc-branch
- not mapped yet

If `resolve` is called from an unmapped repository, the user can decide whether to continue once, always use that gc-branch there, or ignore it there.

## 3. Keep `index.md` slim

The top-level `index.md` is an index, not a dump.
Its job is to help tools and humans find the right source document quickly.
It should stay compact and link-oriented instead of duplicating full knowledge inline.

## 4. Make source docs summary-first

Every source-of-truth markdown document should include a `## Summary` section near the top.
That gives downstream tools a fast path: read the short version first, then expand only when more detail is actually needed.

## 5. Make onboarding explicit and guided

A user should not have to hand-author onboarding JSON just to create a useful context tree.
`gctree init` and `gctree onboard` should guide the user through their preferred provider and write the resulting context into the active gc-branch.

Onboarding is only for empty gc-branches.
If a gc-branch already contains context, the correct path is either:

- reset that gc-branch and onboard again
- or run a guided durable update

## 6. Keep durable updates intentional

Durable context should not change by accident or through hidden memory.
The update flow should be explicit, provider-driven, and tied to the currently active gc-branch.
