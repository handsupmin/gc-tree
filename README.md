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

Built for developers whose real work spans **multiple repos, products, clients, and workflows**.

`gc-tree` gives AI coding tools a reusable context layer **above the repo level**. Keep long-lived context across sessions, scope it to the right repos, and let `gc-tree` stay out of the way when the current repo is unrelated.

---

## Why gc-tree?

If you use AI agents seriously, repo-local context stops being enough.

Once your work spans multiple repos and workstreams, the usual setup starts to break:

- durable context gets stuffed into prompts
- unrelated context leaks into the wrong repo
- every new session needs the same onboarding again
- client or product knowledge lives in hidden chat history
- switching workstreams means manually switching mental context too

`gc-tree` is for the people who already use Codex, Claude Code, and other AI coding tools heavily — and want context management to stop being another manual workflow.

---

## What you get

- **Multiple durable contexts**
  Keep separate context lanes for different products, clients, or workstreams.

- **Repo-scoped relevance**
  Map each context to the repos where it actually belongs.

- **Smart scope guard**
  If you enter a repo that is not mapped yet, `gc-tree` can ask whether to continue once, always use this context here, or ignore it here.

- **Guided onboarding and updates**
  Use Codex, Claude Code, or both to onboard and maintain context over time.

- **Summary-first markdown knowledge**
  Store reusable context in files, not hidden memory, and let tools read the short version first.

---

## Install & quick start

```bash
npm install -g @handsupmin/gc-tree
gctree init
```

That is enough to get started.
After that, keep working the way you already do — `gc-tree` adds a reusable global context lane around your normal workflow.

- **CLI command:** `gctree`
- **Requirements:** Node.js 20+

For source-based development, see [docs/local-development.md](https://github.com/handsupmin/gc-tree/blob/main/docs/local-development.md).

---

## Common moves

### Create a new context when a workstream deserves its own lane

```bash
gctree checkout -b client-b
gctree onboard
```

When a client, product, migration, or initiative deserves its own durable lane, give it its own gc-branch.

### Update durable context later

```bash
gctree update-global-context
```

Refresh the active gc-branch as the work evolves.

Short aliases:

```bash
gctree update-gc
gctree ugc
```

### Resolve context when you need it

```bash
gctree resolve --query "auth token rotation"
```

Pull relevant context back into the current moment when you want it.

---

## Why it feels natural

**Keep multiple contexts like Git branches — without babysitting them like Git branches.**

You can create separate contexts for:

- a client
- a product line
- a platform team
- a shared backend + frontend stack
- a temporary initiative or migration

Then switch between them with familiar branch-like commands:

```bash
gctree checkout -b client-b
gctree checkout main
```

But unlike Git, you do **not** have to manually manage that switch all the time.

If the repo you are in is outside the scope of the current context, `gc-tree` can detect that and treat the context as irrelevant instead of leaking it into the wrong session.

That means you can keep multiple long-lived contexts around without dragging unrelated context into every tool session.

---

## A realistic workflow

You work across:

- one shared platform repo
- two client repos
- one internal tooling repo

Without `gc-tree`, every AI session has to be re-taught:

- which client this is
- which repos belong together
- which workflows matter here
- which context is irrelevant right now

With `gc-tree`, you can keep separate contexts for each lane, reuse them across sessions, and let repo-scope rules prevent irrelevant context from showing up where it should not.

This is the real job to be done:

> not “store more prompt text,”
> but **manage the right context at the right level of work**.

---

## Core concepts

- **gc-branch**
  A durable context lane for one product, client, workstream, or domain.

- **repo scope**
  Rules that decide which repos a context should apply to.

- **provider-guided flow**
  Use your preferred AI coding tool to onboard and update context instead of hand-authoring JSON.

- **context tree**
  Under the hood, `gc-tree` organizes context as branch-aware, file-backed knowledge.
  The “tree” is the implementation model; the user-facing benefit is reusable context beyond the project.

---

## Provider-facing commands inside the runtime

After scaffolding, the visible commands are:

- **Codex:** `$gc-onboard`, `$gc-update-global-context`
- **Claude Code:** `/gc-onboard`, `/gc-update-global-context`

Those commands should always mention the current active gc-branch before gathering or updating durable context, and they should keep using the saved workflow language unless the user explicitly asks to switch.

---

## Core commands at a glance

| Goal                                              | Command                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| Initialize gc-tree and choose a provider          | `gctree init`                                                      |
| Confirm the active gc-branch                      | `gctree status`                                                    |
| Search the active context                         | `gctree resolve --query "..."`                                     |
| Show repo-scope rules                             | `gctree repo-map`                                                  |
| Explicitly include/exclude a repo for a gc-branch | `gctree set-repo-scope --branch <name> --include` / `--exclude`    |
| Create or switch gc-branches                      | `gctree checkout <branch>` / `gctree checkout -b <branch>`         |
| Guided onboarding for an empty gc-branch          | `gctree onboard`                                                   |
| Guided durable update for the active gc-branch    | `gctree update-global-context` / `gctree update-gc` / `gctree ugc` |
| Reset a gc-branch before re-onboarding            | `gctree reset-gc-branch --branch <name> --yes`                     |
| Scaffold another environment manually             | `gctree scaffold --host codex --target /path/to/repo`              |

---

## Documentation

Detailed docs live in the [`docs/`](https://github.com/handsupmin/gc-tree/tree/main/docs) directory.

- **Concept** — [`docs/concept.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/concept.md)
  Learn what `gctree` is, which problem it solves, and what belongs in the global-context layer.
- **Principles** — [`docs/principles.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/principles.md)
  Read the rules behind gc-branches, repo scope, slim indexes, summary-first docs, and guided updates.
- **Usage** — [`docs/usage.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/usage.md)
  See the standard CLI flow, provider-facing commands, repo-scope behavior, and integration patterns.
- **Local development** — [`docs/local-development.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/local-development.md)
  Learn how to run the CLI locally and verify changes before contributing.

---

## Contribution

Contributions are welcome. See [CONTRIBUTING.md](https://github.com/handsupmin/gc-tree/blob/main/CONTRIBUTING.md) for the development workflow and pull request checklist.

---

## License

MIT. See [`LICENSE`](https://github.com/handsupmin/gc-tree/blob/main/LICENSE).
