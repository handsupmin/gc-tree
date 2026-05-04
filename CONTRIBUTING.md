# Contributing

Thanks for your interest in improving `gc-tree`.

## Before you start

- Use Node.js 20+
- Install dependencies with `npm install`
- Build once with `npm run build`

## Development workflow

1. make your change in small, reviewable steps
2. keep the CLI behavior and docs aligned
3. update examples or documentation when command flow changes
4. prefer minimal, reversible diffs

## Verification

Before opening a pull request, run:

```bash
npm run build
npm test
```

## Documentation expectations

If your change affects onboarding, branching, context resolution, updates, or scaffolding, update the relevant docs as part of the same change.

That usually means one or more of:

- `README.md`
- language README files (`README.ko.md`, `README.zh.md`, `README.ja.md`, `README.es.md`)
- `docs/concept.md`
- `docs/principles.md`
- `docs/usage.md`
- `docs/local-development.md`

## Pull requests

A good pull request should explain:

- what changed
- why it changed
- how it was verified
- which docs were updated, if applicable
