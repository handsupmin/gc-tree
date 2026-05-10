# gc-tree evaluation rubric

This file freezes the rules under which any change to `src/resolve.ts` (or
related retrieval code) is judged "an improvement". It exists so the
autoresearch loop cannot silently optimize for the same fixture it is
evaluated on.

## Fixtures

There are two fixture sets, defined in [`fixtures.ts`](./fixtures.ts):

- **DEV** (`alpha`/`beta`, e-commerce + ML platform) — visible to autoresearch
  during fix selection. Tune freely.
- **HOLDOUT** (`gaia`/`helix`, gamedev + biotech) — read by the rubric for
  reporting and gating only. Never copy queries from HOLDOUT into DEV.

If a query becomes diagnostic enough that it belongs in DEV, write a fresh
analogous query in HOLDOUT to keep the split honest.

## Case labeling

Each labeled case is `{ branch, query, expectedId, category, lang }` where
`expectedId` is the doc that should appear at rank 1, or `null` for hard
negatives.

Categories:

- `exact-keyword` — the query contains terms from the doc.
- `paraphrase` — semantically related but with little surface overlap.
- `multi-hop` — the answer requires synthesizing two docs (currently rare).
- `glossary` — short term-list query that should hit the glossary doc.
- `mixed-lang` — Korean + English in the same query.
- `same-domain-distractor` — multiple docs are plausible; the labelled one
  is the deepest source of truth.
- `same-domain-negative` — query is in-genre but no doc covers it.
- `cross-branch-negative` — query belongs to a different branch entirely.

## Metrics

Computed by [`lib.ts`](./lib.ts):

- **recall@1 / @3 / @5** over positive cases.
- **MRR** over positive cases.
- **negative precision** — fraction of negative cases that returned zero
  matches.
- **per-category** and **per-language** breakdowns of the above.
- **token injection ratio** — `returned chars / total branch doc chars`.
- **variance** — mean ± stdev of the composite score across N reruns.

The single-number objective for autoresearch is:

```
overall = 0.4 * recall@1 + 0.4 * MRR + 0.2 * negative_precision
```

When a fixture has no negatives this collapses to
`0.5 * recall@1 + 0.5 * MRR`.

## "Improvement" gate (autoresearch)

A candidate patch is **kept** only if both:

1. `dev.overall_after > dev.overall_before` (strict gain on DEV).
2. `holdout.overall_after >= holdout.overall_before − 0.01` (HOLDOUT does
   not regress by more than 1 percentage point; with `--strict` the budget
   is 0).

Otherwise the patch is reverted. The loop stops when no untried candidate
remains, or when both fixtures hit ≥99.9%.

## Variance / determinism

Resolve is currently deterministic per home, but home setup involves
filesystem ordering. The harness runs each fixture N times when invoked
with `--runs N` and reports `mean ± stdev`. Any patch that introduces a
visible stdev > 0.5% on either fixture should be flagged for review even
if the mean improves.

## Generalization gap

`gap = dev.overall − holdout.overall`. A gap above 10 points is annotated
as `⚠ possible overfit` in the report. The gap is **not** a hard reject;
it is a signal that DEV may have been over-fit and the next move should be
to enrich HOLDOUT, not to relax the rubric.

## What this rubric does NOT measure (yet)

- LLM-judge correctness on free-form answers (out of scope; gc-tree returns
  document references, not answers).
- BPE-accurate token counts (we count chars; consistent but not directly
  comparable to other systems' token figures).
- nDCG (R@k + MRR are sufficient for the current top-K size).

If those become important, add them to `lib.ts` first, freeze the formula
here, and only then run autoresearch against the new metric. Never tune
the metric to make a patch look better.
