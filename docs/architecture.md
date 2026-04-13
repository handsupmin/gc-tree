# gc-tree Architecture

## Goals

- keep global context reusable across tools
- keep user-facing commands simple
- keep source documents authoritative
- avoid hidden mutations
- make branch isolation explicit

## File model

Each branch is a full context tree under `branches/<name>/`.
The active branch is tracked by `HEAD`.

## Index discipline

`index.md` should remain small and link-oriented. It should not contain full knowledge dumps.

## Summary-first docs

Every source document must contain a `## Summary` section near the top. The summary exists so downstream tools can often avoid reading the whole file.

## Update flow

1. draft a proposal with `propose-update`
2. present the summary to the user
3. apply only after explicit approval via `apply-update`
