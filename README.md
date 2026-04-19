# gc-tree

<div align="center">

<img src="./logo.png" alt="gc-tree logo" width="260" />

### Global context, beyond the project.

Attach durable, reusable context to your existing AI tools.
Manage multiple contexts like Git branches.

[![npm version](https://img.shields.io/npm/v/%40handsupmin%2Fgc-tree)](https://www.npmjs.com/package/@handsupmin/gc-tree)
[![npm downloads](https://img.shields.io/npm/dm/%40handsupmin%2Fgc-tree)](https://www.npmjs.com/package/@handsupmin/gc-tree)
[![GitHub stars](https://img.shields.io/github/stars/handsupmin/gc-tree)](https://github.com/handsupmin/gc-tree/stargazers)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](https://github.com/handsupmin/gc-tree/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

[English](https://github.com/handsupmin/gc-tree/blob/main/README.md) | [한국어](https://github.com/handsupmin/gc-tree/blob/main/README.ko.md) | [简体中文](https://github.com/handsupmin/gc-tree/blob/main/README.zh.md) | [日本語](https://github.com/handsupmin/gc-tree/blob/main/README.ja.md) | [Español](https://github.com/handsupmin/gc-tree/blob/main/README.es.md)

</div>

---

## The problem

You use Claude Code or Codex every day. But your real work spans multiple repos, products, and clients — and your AI tools only know about the current file.

So you end up doing this every session:

- Re-explain which repos belong together
- Paste the same architecture doc into the prompt again
- Remind the agent about conventions it already "knew" last week
- Manually strip context that's irrelevant to the current repo

That's not an AI problem. It's a **context management problem**.

---

## Who this is for

You'll get the most out of `gc-tree` if you:

- Work across **multiple repos** (monorepo teams, platform + client repos, backend + frontend stacks)
- Switch between **multiple products or clients** in the same week
- Find yourself **re-explaining the same context** at the start of every AI session
- Want AI tools to understand your **conventions, architecture, and domain knowledge** — not just the current file

If you only ever work in one repo and one product, you probably don't need this. `CLAUDE.md` or `.cursorrules` is enough.

---

## Install & quick start

```bash
npm install -g @handsupmin/gc-tree
gctree init
```

`gctree init` walks you through:

1. Choose provider: `claude-code`, `codex`, or `both`
2. Scaffold the integration files into your current repo
3. Run guided onboarding for the `main` gc-branch

After that, your AI tool will know to call `gctree resolve` before planning or implementing.

- **CLI:** `gctree`
- **Requires:** Node.js 20+

---

## What gc-tree does

`gc-tree` sits **above the repo level**. It stores durable context in structured markdown files and lets your AI tools pull only what's relevant — before each session, automatically.

```bash
gctree resolve --query "auth token rotation policy"
```

```json
{
  "gc_branch": "main",
  "matches": [
    {
      "title": "Auth & Session Conventions",
      "score": 4,
      "summary": "JWT rotation on every request, refresh tokens stored in httpOnly cookies, 15-min access token TTL",
      "excerpt": "## Auth Flow\nAccess token: 15-min TTL, rotated on every authenticated request..."
    }
  ]
}
```

Your AI tool gets the right context. Not the whole knowledge base — just the relevant slice.

**In practice: only ~4% of your total context is injected per query.** The other 96% stays on disk, out of the token window, until it's actually needed.

---

## Why not just use CLAUDE.md or cursor rules?

`CLAUDE.md` is great — for one repo.

The moment you have multiple repos, clients, or workstreams:

|                        | `CLAUDE.md` / cursor rules | `gc-tree`                                    |
| ---------------------- | -------------------------- | -------------------------------------------- |
| Scope                  | One repo                   | Multiple repos, one context                  |
| Persistence            | Per-repo file              | Stored outside repos, reused across sessions |
| Switching contexts     | Manual file edits          | `gctree checkout client-b`                   |
| Relevance filtering    | Everything or nothing      | Only injects matching docs (~4% of total)    |
| Onboarding             | Hand-written               | Guided by your AI tool                       |
| Works with Codex       | ✅                         | ✅                                           |
| Works with Claude Code | ✅                         | ✅                                           |

---

## Validated performance

Tested against real internal documentation (4 Notion exports, Korean + English mixed queries):

| Metric                                       | Result           |
| -------------------------------------------- | ---------------- |
| Recall — relevant queries find the right doc | **100%** (16/16) |
| Precision — irrelevant queries return empty  | **80%** (4/5)    |
| F1 score                                     | **88.9%**        |
| Tokens injected per query vs. total context  | **~4%**          |
| Works with mixed Korean + English queries    | ✅               |

---

## Works with Claude Code and Codex — both verified

```bash
gctree scaffold --host claude-code   # installs CLAUDE.md snippet + /gc-onboard, /gc-update-global-context
gctree scaffold --host codex         # installs AGENTS.md snippet + $gc-onboard, $gc-update-global-context
gctree scaffold --host both          # both at once
```

Both providers use the same underlying context store. Onboard once, use from either tool.

**Claude Code** — uses `/gc-resolve-context`, `/gc-onboard`, `/gc-update-global-context` slash commands.

**Codex** — uses `$gc-resolve-context`, `$gc-onboard`, `$gc-update-global-context` skills. Verified with `codex exec`:

```
gctree status → gc_branch: main, doc_count: 2
gctree resolve --query 'NestJS DTO plainToInstance'
→ matched "Backend Coding Conventions" (score: 3)
→ DTO: class-transformer plainToInstance, class-validator required
→ Error handling: HttpException-based custom exceptions, no raw Error throws
```

---

## Common moves

### Separate contexts for separate workstreams

```bash
gctree checkout -b client-b
gctree onboard
```

Each gc-branch is a fully independent context lane. Switch between them like Git branches.

### Pull relevant context on demand

```bash
gctree resolve --query "billing retry policy"
```

Returns only the matching docs — title, summary, and excerpt. Your tool reads the full doc only if the summary isn't enough.

### Keep context current

```bash
gctree update-global-context   # or: gctree update-gc / gctree ugc
```

Guided update flow — your AI tool asks what changed and writes the new context back to the gc-branch.

### Scope a context to specific repos

```bash
gctree set-repo-scope --branch client-b --include   # include current repo
gctree set-repo-scope --branch client-b --exclude   # exclude current repo
```

`gc-tree` won't inject a context into repos where it doesn't belong.

---

## How context is stored

```
~/.gctree/
  branches/
    main/
      index.md          ← compact index, ≤2000 chars, loaded first
      docs/
        auth.md         ← full doc, read only when needed
        architecture.md
    client-b/
      index.md
      docs/
        ...
  branch-repo-map.json  ← which repos belong to which gc-branch
  settings.json         ← preferred provider, language
```

Context lives outside your repos — no `.gitignore` rules needed, no accidental commits, reusable across every project that uses the same gc-branch.

---

## Core commands

| Goal                                           | Command                                                         |
| ---------------------------------------------- | --------------------------------------------------------------- |
| Initialize gc-tree and choose a provider       | `gctree init`                                                   |
| Confirm the active gc-branch                   | `gctree status`                                                 |
| Search the active context                      | `gctree resolve --query "..."`                                  |
| Create or switch gc-branches                   | `gctree checkout <branch>` / `gctree checkout -b <branch>`      |
| List all gc-branches                           | `gctree branches`                                               |
| Guided onboarding for an empty gc-branch       | `gctree onboard`                                                |
| Guided durable update for the active gc-branch | `gctree update-global-context` / `gctree ugc`                   |
| Show repo-scope rules                          | `gctree repo-map`                                               |
| Include/exclude current repo for a gc-branch   | `gctree set-repo-scope --branch <name> --include` / `--exclude` |
| Reset a gc-branch before re-onboarding         | `gctree reset-gc-branch --branch <name> --yes`                  |
| Scaffold a new environment                     | `gctree scaffold --host codex --target /path/to/repo`           |

---

## Documentation

- **Concept** — [`docs/concept.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/concept.md)
- **Principles** — [`docs/principles.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/principles.md)
- **Usage** — [`docs/usage.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/usage.md)
- **Local development** — [`docs/local-development.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/local-development.md)

---

## Contribution

Contributions are welcome. See [CONTRIBUTING.md](https://github.com/handsupmin/gc-tree/blob/main/CONTRIBUTING.md) for the development workflow and pull request checklist.

---

## License

MIT. See [`LICENSE`](https://github.com/handsupmin/gc-tree/blob/main/LICENSE).
