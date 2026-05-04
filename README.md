# gc-tree

<div align="center">

```text
              __                          
             /\ \__                       
   __     ___\ \ ,_\  _ __    __     __   
 /'_ `\  /'___\ \ \/ /\`'__\/'__`\ /'__`\ 
/\ \L\ \/\ \__/\ \ \_\ \ \//\  __//\  __/ 
\ \____ \ \____\\ \__\\ \_\\ \____\ \____\
 \/___L\ \/____/ \/__/ \/_/ \/____/\/____/
   /\____/                                
   \_/__/                                 
```

<img src="./logo.png" alt="gc-tree logo" width="260" />

### Global context beyond CLAUDE.md and AGENTS.md.

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

AI does not know you.

It does not know how you work, which terms your team uses, how one repo connects to another, or which routines you repeat without thinking. If you do not explain those things precisely, you rarely get the result you actually wanted.

So you end up doing this every session:

- Re-introduce who you are and how you work
- Re-explain the domain language your team uses
- Re-explain which repos belong together
- Paste the same architecture doc into the prompt again
- Remind the agent about conventions it already "knew" last week
- Manually strip context that's irrelevant to the current repo

That's not because AI is stupid. It's because this kind of context is hard to keep alive inside one workspace, especially when real work moves across multiple repos and projects.

`CLAUDE.md` and `AGENTS.md` help a lot inside one repo. But once work crosses repo boundaries, shared background knowledge gets duplicated, repo relationships are hard to express, and every new session starts from too little.

`gc-tree` exists to remove that repetition.

---

## Who this is for

You'll get the most out of `gc-tree` if you:

- Work across **multiple repos** (monorepo teams, platform repos, backend + frontend stacks)
- Move between **multiple products, projects, or workstreams**
- Find yourself **re-explaining the same context** at the start of every AI session
- Want AI tools to understand your **working style, team terminology, architecture, and domain knowledge** — not just the current file

If you only ever work in one repo and one product, you probably don't need this. `CLAUDE.md` or `AGENTS.md` is enough.

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

After that, your AI tool gets real SessionStart/UserPromptSubmit hook integration, so it auto-checks gc-tree before work and caches empty/no-match results for the session. Hook output injects matched document summaries directly into context — so the AI sees actual patterns and commands, not just titles. Full docs are always available on demand via `gctree resolve --id <id>`.

- **CLI:** `gctree`
- **Requires:** Node.js 20+

---

## What gc-tree does

`gc-tree` sits **above the repo level**. It stores your working style, team terminology, repo relationships, and shared background knowledge as durable global context. Your AI tools then pull only what's relevant before each session, automatically.

`gctree resolve` is the compact **index layer** in a progressive-disclosure workflow:

- `gctree resolve --query "..."` → compact matches with stable IDs
- `gctree related --id <match-id>` → supporting docs around one match
- `gctree show-doc --id <match-id>` → full markdown for that doc

When no docs exist, a repo is excluded, or a query has no hits, gc-tree returns an explicit status instead of failing ambiguously.

```bash
gctree resolve --query "auth token rotation policy"
```

```
[gc-tree] 1 matching doc  gc-branch="main"  repo="my-repo"
[Auth & Session Conventions] JWT rotation on every request, refresh tokens in httpOnly cookies, 15-min access token TTL
[Auth & Session Conventions] show full doc: gctree show-doc --id "auth" --branch "main"
```

Your AI tool gets the right context. Not the whole knowledge base — just the relevant slice.

**In practice: only ~4% of your total context is injected per query.** The other 96% stays on disk, out of the token window, until it's actually needed.

---

## Why not just use CLAUDE.md or AGENTS.md?

`CLAUDE.md` and `AGENTS.md` are great — for one repo.

The moment you have multiple repos, projects, or workstreams:

|                        | `CLAUDE.md` / `AGENTS.md` | `gc-tree`                                    |
| ---------------------- | -------------------------- | -------------------------------------------- |
| Scope                  | One repo                   | Multiple repos, one context                  |
| Persistence            | Per-repo file              | Stored outside repos, reused across sessions |
| Switching contexts     | Manual file edits          | `gctree checkout project-b`                  |
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
gctree init                         # sets up ~/.gctree and global activation for your chosen provider(s)
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
[gc-tree] 1 matching doc  gc-branch="main"  repo="my-repo"
[Backend Coding Conventions] DTO: class-transformer plainToInstance, class-validator required. Error handling: HttpException-based custom exceptions, no raw Error throws.
[Backend Coding Conventions] show full doc: gctree show-doc --id "backend-conventions" --branch "main"
```

---

## Common moves

### Separate contexts for separate workstreams

```bash
gctree checkout -b project-b
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
gctree set-repo-scope --branch project-b --include   # include current repo
gctree set-repo-scope --branch project-b --exclude   # exclude current repo
```

`gc-tree` won't inject a context into repos where it doesn't belong.

---

## How context is stored

```
~/.gctree/
  branches/
    main/
      index.md          ← compact index, loaded first
      docs/
        auth.md         ← full doc, read only when needed
        architecture.md
    project-b/
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
| Add a local override in one repo               | `gctree scaffold --host codex --target /path/to/repo`           |
| Update gctree and re-scaffold all providers    | `gctree update`                                                 |
| Remove global gc-tree activation and context   | `gctree uninstall --yes`                                        |

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
