# gc-tree

`gctree` is a lightweight **Global Context Tree** for AI coding tools.

It extracts the reusable **global context** layer from heavier delivery systems and keeps it:

- branch-aware
- summary-first
- file-backed
- tool-agnostic
- approval-first for updates

The goal is simple:

> keep long-lived context reusable across tools without dragging in a full workflow platform.

---

## What gc-tree is for

Many AI coding setups need more than a single `CLAUDE.md`, `AGENTS.md`, or prompt snippet.
They need:

- a reusable global context home
- separation between different products/clients/companies
- slim indexing so tokens are not wasted
- durable source docs that tools can read explicitly
- a safe update path that does not mutate context silently

`gctree` provides exactly that.

It is meant to attach cleanly to tools like:

- Codex CLI
- Claude Code CLI
- OmO
- OmX
- OmC

without forcing them to adopt a larger request-to-commit system.

---

## Core ideas

### 1. Branch-aware global context

One machine can hold multiple global context trees without mixing them.

Think:

- `main` for your default product
- `client-b` for a consulting client
- `infra` for platform work
- `research` for a temporary branch of context

This is why the command surface intentionally follows git-like language:

- `gctree checkout <branch>`
- `gctree checkout -b <branch>`

### 2. `index.md` must stay small

The top-level `index.md` is an **index**, not a dump.

It should:

- list titles
- point to doc paths
- help tools find the right source doc quickly

It should **not** become the place where all knowledge is copied inline.

### 3. Summary-first source docs

Every source-of-truth markdown doc must contain a `## Summary` section near the top.

Why:

- tools can read the summary first
- many requests stop there
- full-document reads happen only when needed
- token waste goes down

### 4. Proposal-first updates

Global context should not change silently.

The intended flow is:

1. draft a change proposal
2. show the summary to the user
3. get explicit approval
4. apply the change

That is why gc-tree ships both low-level and high-level commands:

- low-level:
  - `propose-update`
  - `apply-update`
- high-level:
  - `update-global-context`

---

## Command surface

### Base commands

- `gctree init [--home DIR] [--branch NAME]`
- `gctree checkout <branch> [--home DIR]`
- `gctree checkout -b <branch> [--home DIR]`
- `gctree branches [--home DIR]`
- `gctree status [--home DIR]`
- `gctree onboard --input FILE [--home DIR] [--branch NAME]`
- `gctree resolve --query TEXT [--home DIR]`
- `gctree propose-update --input FILE [--home DIR] [--branch NAME]`
- `gctree apply-update --proposal FILE [--home DIR]`
- `gctree update-global-context --input FILE [--home DIR] [--branch NAME] [--yes]`
- `gctree scaffold --host <codex|claude-code> [--target DIR] [--force]`
- `gctree proposals [--home DIR]`

### High-level update flow

`gctree update-global-context` is the convenience wrapper.

By default:

```bash
gctree update-global-context --input proposal.json
```

This:

- creates a proposal
- does **not** mutate source docs
- returns a summary and the follow-up apply command

If explicit approval already exists:

```bash
gctree update-global-context --input proposal.json --yes
```

This:

- creates the proposal
- applies it immediately

Use `--yes` only when approval is already explicit.

---

## Home layout

Default home:

```text
~/.gctree/
  HEAD
  branches/
    main/
      branch.json
      index.md
      docs/
      proposals/
```

### `HEAD`

Tracks the currently checked-out global context branch.

### `branch.json`

Stores lightweight branch metadata:

- branch name
- created/updated timestamps
- branch summary

### `index.md`

Compact entry point for tools.

### `docs/`

Authoritative source-of-truth markdown documents.

### `proposals/`

Pending or applied proposal artifacts for durable updates.

---

## Quick start

### 1. Initialize the home

```bash
gctree init
```

### 2. Onboard your first branch

Create a JSON file:

```json
{
  "branchSummary": "Main branch for product A global context.",
  "docs": [
    {
      "title": "Project Identity",
      "summary": "Product A is a CLI-first auth-heavy tool.",
      "body": "Auth policy and API ergonomics matter most in this branch."
    }
  ]
}
```

Then:

```bash
gctree onboard --input onboarding.json
```

### 3. Create another branch

```bash
gctree checkout -b client-b
```

### 4. Resolve context

```bash
gctree resolve --query "token rotation"
```

### 5. Draft a durable update

```bash
gctree update-global-context --input update.json
```

Review the summary, then apply only after approval.

---

## Integration scaffolds

gc-tree ships install scaffolds for:

- Codex CLI
- Claude Code CLI

Generate them with:

```bash
gctree scaffold --host codex --target /path/to/repo
gctree scaffold --host claude-code --target /path/to/repo
```

These scaffolds write small host-specific bootstrap files and command/skill snippets without trying to own the whole host workflow.
They refuse to overwrite existing files unless you pass `--force`.

### Codex scaffold output

- `AGENTS.gctree.md`
- `.codex/prompts/gctree-bootstrap.md`
- `.codex/skills/gctree-resolve-context/SKILL.md`
- `.codex/skills/gctree-update-global-context/SKILL.md`

### Claude Code scaffold output

- `CLAUDE.gctree.md`
- `.claude/commands/gctree-resolve-context.md`
- `.claude/commands/gctree-update-global-context.md`

See `docs/integration.md` for the philosophy boundary.

---

## Example usage patterns

### Separate two products on one machine

```bash
gctree init
gctree onboard --input product-a.json
gctree checkout -b product-b
gctree onboard --branch product-b --input product-b.json
```

### Switch contexts before working

```bash
gctree checkout product-a
gctree resolve --query "auth token rotation"

gctree checkout product-b
gctree resolve --query "billing retry policy"
```

### Update durable context safely

```bash
gctree update-global-context --input proposal.json
```

Then:

- show the proposal summary to the user
- ask whether to apply it
- apply only after explicit approval

---

## Design boundaries

gc-tree is intentionally **not**:

- a request-to-commit delivery orchestrator
- a browser collaboration runtime
- a dashboard product
- a hidden memory system

It is the **global context layer only**.

That constraint is deliberate.

---

## Architecture docs

- `docs/architecture.md`
- `docs/integration.md`

---

## Skills

Tool-agnostic skills ship in:

- `skills/onboard`
- `skills/checkout`
- `skills/resolve-context`
- `skills/update-global-context`
- `skills/feedback`

These can be copied, referenced, or adapted into existing toolchains.

---

## Verification

Current local verification:

- `npm run build`
- `npm test`
- `npx tsc --noEmit`
- manual dogfood:
  - init
  - onboard main
  - checkout -b
  - branch-specific resolve
  - propose-update
  - apply-update
  - status
