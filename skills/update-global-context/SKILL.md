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
4. Before writing update JSON, find the target doc with `gctree resolve --query "<new fact or term>"`. If the summary is insufficient, read the full doc with `gctree show-doc --id "<id>"`.
5. For an existing doc, preserve useful existing Details and Index Entries unless the user explicitly wants them removed.
6. Use `slug` as the durable path without `docs/` and without `.md`. Example: `docs/conventions/mvldev-assignment-backend-smson.md` becomes `"slug": "conventions/mvldev-assignment-backend-smson"`.
7. Use exactly this `gctree __apply-update` JSON schema. Do not invent fields. In particular, never use `id`, `path`, or `content`; use `slug`, `body`, and `indexEntries`.

```json
{
  "branch": "<gc-branch>",
  "docs": [
    {
      "title": "conventions: example repo",
      "slug": "conventions/example-repo",
      "category": "conventions",
      "summary": "Actionable one-paragraph summary with patterns, commands, and constraints.",
      "body": "## Patterns\n\n- Details body only. Do not include # title, ## Summary, or ## Index Entries here.",
      "indexLabel": "example repo conventions",
      "indexEntries": ["example repo", "ExampleRepo", "주요 한국어 검색어", "command names", "field names"]
    }
  ]
}
```

8. `body` is only the Details body. It may contain useful second-level sections such as `## Patterns`, but must not contain the top-level title, `## Summary`, or `## Index Entries`.
9. `indexEntries` is mandatory. Add aliases, related terms, command names, field names, workflow names, acronyms, Korean terms, and English terms so `gctree resolve` can find the doc without translation.
10. Apply the update with `gctree __apply-update --input <temp-file>`.
11. Verify immediately:
    - `gctree verify-onboarding --branch <gc-branch>`
    - `gctree resolve --query "<new keyword>"`
    - `gctree show-doc --id "<slug>"`
12. If you intended to update an existing doc and `doc_count` increases unexpectedly, do not report success. Inspect the duplicate, remove the accidental doc, and re-apply with the correct `slug`.
13. Keep the current gc-branch explicit throughout the conversation and tell the user exactly which docs changed.
