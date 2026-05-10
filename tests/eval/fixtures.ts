/**
 * Eval fixtures: dev (used for tuning) and holdout (used only for final reporting).
 *
 * Hard rule for autoresearch:
 *   - DEV is visible during fix selection.
 *   - HOLDOUT must NEVER influence which fix is kept; it is reported only.
 *
 * If you need to tune, add cases to DEV.
 * If you need a fairer evaluation, add cases to HOLDOUT.
 * Never copy a query between them.
 */

import type { FixtureSet } from './lib.js';

// ─────────────────────────────────────────────
// DEV fixture: e-com (alpha) + ML platform (beta)
// Same shape as the original eval fixture, plus expectedId labels.
// ─────────────────────────────────────────────
export const DEV_FIXTURE: FixtureSet = {
  name: 'dev',
  branches: [
    {
      branch: 'alpha',
      branchSummary: 'E-commerce frontend team: React/TypeScript SPA with cart, auth, and checkout.',
      docs: [
        {
          title: 'Project Identity',
          slug: 'project-identity',
          summary: 'Alpha is a React/TypeScript SPA for an e-commerce storefront. Key concerns: cart state, auth tokens, and Stripe checkout.',
          body: [
            'Alpha is the customer-facing storefront SPA.',
            'Stack: React 18, TypeScript, Zustand for cart state, React Query for data fetching.',
            'Auth uses short-lived JWTs refreshed via /api/auth/refresh. Tokens are stored in memory only.',
            'Stripe Elements handles payment UI. Never log card data or expose Stripe secret key on the client.',
            'The design system lives in packages/ui. Do not inline Tailwind classes in business logic components.',
          ].join('\n'),
          tags: ['frontend', 'react', 'auth', 'stripe'],
        },
        {
          title: 'Cart System',
          slug: 'cart-system',
          summary: 'Cart state is managed by Zustand. Items persist to localStorage on every change. The cart slice is in src/store/cart.ts.',
          body: [
            'Cart actions: addItem, removeItem, updateQuantity, clearCart.',
            'Cart persists to localStorage via the zustand persist middleware.',
            'Do NOT call the backend on every cart change; sync only at checkout.',
            'Max cart size: 50 items. Enforce this limit in the Zustand action, not in the API.',
            'Cart totals are calculated client-side; the server re-validates on checkout to prevent tampering.',
          ].join('\n'),
          tags: ['cart', 'zustand', 'localStorage'],
        },
        {
          title: 'Auth Flow',
          slug: 'auth-flow',
          summary: 'JWT auth with silent refresh via /api/auth/refresh. Tokens live in memory, refresh tokens in httpOnly cookies.',
          body: [
            'Access token lifetime: 15 minutes. Refresh token lifetime: 7 days.',
            'Silent refresh runs 60 seconds before expiry via a setInterval in AuthProvider.',
            'On 401, the auth interceptor in src/lib/axios.ts retries once after a refresh.',
            'Logout clears the in-memory token and calls /api/auth/logout to invalidate the refresh token cookie.',
            'Never store access tokens in localStorage or sessionStorage.',
          ].join('\n'),
          tags: ['auth', 'jwt', 'security'],
        },
        {
          title: 'Glossary',
          slug: 'alpha-glossary',
          summary: 'Key terms: SKU (product variant ID), PDP (product detail page), SFN (storefront navigation).',
          body: [
            'SKU: unique identifier for a product variant (size + colour combination).',
            'PDP: Product Detail Page, the per-product route at /products/:slug.',
            'SFN: Storefront Navigation — the top nav + mega-menu component.',
            'Hydration: the process of making a Next.js page interactive on the client.',
            'Ghost button: a secondary CTA with a transparent background and a border.',
          ].join('\n'),
          tags: ['glossary', 'terminology'],
        },
      ],
    },
    {
      branch: 'beta',
      branchSummary: 'ML platform team: Python data pipelines, model training, and batch inference.',
      docs: [
        {
          title: 'Project Identity',
          slug: 'project-identity',
          summary: 'Beta is the ML platform powering recommendations and demand forecasting. Stack: Python, Ray, MLflow, Spark.',
          body: [
            'Beta owns model training, batch inference, and feature engineering pipelines.',
            'Stack: Python 3.11, Ray for distributed training, MLflow for experiment tracking, PySpark for feature transforms.',
            'All experiments must be tracked in MLflow under the project namespace matching the ticket ID.',
            'Models are served via Ray Serve; latency SLA is p99 < 120 ms for online endpoints.',
            'Batch inference runs nightly via Airflow DAGs in the ml-batch-dag repo.',
          ].join('\n'),
          tags: ['ml', 'python', 'ray', 'mlflow'],
        },
        {
          title: 'Dataset Conventions',
          slug: 'dataset-conventions',
          summary: 'Raw datasets live in s3://ml-data-raw/. Processed features are written to s3://ml-data-features/ by Spark jobs.',
          body: [
            'Never modify data in the raw bucket. Write derived data to ml-data-features.',
            'Partitioning convention: year=YYYY/month=MM/day=DD for time-series datasets.',
            'Schema changes require a migration ticket and a backfill PR before merging.',
            'Personally identifiable information (PII) must be masked before feature extraction.',
            'Dataset lineage is tracked in DataHub; always update the lineage graph when adding a new source.',
          ].join('\n'),
          tags: ['datasets', 's3', 'spark', 'pii'],
        },
        {
          title: 'Model Training Workflow',
          slug: 'model-training',
          summary: 'Training runs are launched via scripts/train.py. Ray head node is at ray://ml-ray-head:10001.',
          body: [
            'Training entry point: scripts/train.py --config configs/<experiment>.yaml.',
            'All hyperparameters must live in the YAML config, not hardcoded in model code.',
            'Use Ray Tune for hyperparameter search; results are logged to MLflow automatically.',
            'GPU quota per team: 8 A100 GPUs. Do not exceed this without approval.',
            'Checkpoint every 10 epochs to s3://ml-checkpoints/. Resume with --resume-from <checkpoint>.',
          ].join('\n'),
          tags: ['training', 'ray', 'gpu'],
        },
        {
          title: 'Glossary',
          slug: 'beta-glossary',
          summary: 'Key terms: feature store, champion model, shadow deployment, data drift.',
          body: [
            'Feature store: centralised store for precomputed features shared across models.',
            'Champion model: the currently deployed production model version.',
            'Shadow deployment: running a new model in parallel without serving its predictions to users.',
            'Data drift: statistical shift between training data distribution and production data.',
            'Cold start: the problem of making recommendations for new users with no history.',
          ].join('\n'),
          tags: ['glossary', 'ml-terminology'],
        },
      ],
    },
  ],
  cases: [
    // alpha — exact keyword
    { branch: 'alpha', query: 'Zustand cart state', expectedId: 'cart-system', category: 'exact-keyword', lang: 'en' },
    { branch: 'alpha', query: 'JWT silent refresh', expectedId: 'auth-flow', category: 'exact-keyword', lang: 'en' },
    { branch: 'alpha', query: 'Stripe Elements checkout', expectedId: 'project-identity', category: 'exact-keyword', lang: 'en' },
    { branch: 'alpha', query: 'SKU PDP SFN', expectedId: 'alpha-glossary', category: 'glossary', lang: 'en' },
    // alpha — cross-branch negative
    { branch: 'alpha', query: 'Ray distributed training', expectedId: null, category: 'cross-branch-negative', lang: 'en' },
    { branch: 'alpha', query: 'MLflow experiment tracking', expectedId: null, category: 'cross-branch-negative', lang: 'en' },
    // beta — exact keyword
    { branch: 'beta', query: 'Ray training GPU quota', expectedId: 'model-training', category: 'exact-keyword', lang: 'en' },
    { branch: 'beta', query: 'PII masking dataset', expectedId: 'dataset-conventions', category: 'exact-keyword', lang: 'en' },
    { branch: 'beta', query: 'champion shadow deployment', expectedId: 'beta-glossary', category: 'glossary', lang: 'en' },
    // beta — cross-branch negative
    { branch: 'beta', query: 'React Zustand cart', expectedId: null, category: 'cross-branch-negative', lang: 'en' },
    { branch: 'beta', query: 'Stripe payment checkout', expectedId: null, category: 'cross-branch-negative', lang: 'en' },
    // alpha — paraphrase (no surface keywords from doc body)
    { branch: 'alpha', query: 'short-lived access token rotation', expectedId: 'auth-flow', category: 'paraphrase', lang: 'en' },
    { branch: 'alpha', query: 'in-browser shopping basket persistence', expectedId: 'cart-system', category: 'paraphrase', lang: 'en' },
    // alpha — same-domain distractor (multiple docs plausibly contain auth-ish words)
    { branch: 'alpha', query: '15 minute access token httpOnly cookie', expectedId: 'auth-flow', category: 'same-domain-distractor', lang: 'en' },
    // alpha — mixed-lang
    { branch: 'alpha', query: '카트 상태 Zustand 영속화', expectedId: 'cart-system', category: 'mixed-lang', lang: 'mixed' },
    // beta — paraphrase
    { branch: 'beta', query: 'distributed hyperparameter sweep on GPUs', expectedId: 'model-training', category: 'paraphrase', lang: 'en' },
    // beta — same-domain negative (in-genre but no doc covers it)
    { branch: 'beta', query: 'online A/B test guardrail metric', expectedId: null, category: 'same-domain-negative', lang: 'en' },
    // beta — mixed-lang
    { branch: 'beta', query: '데이터셋 PII 마스킹 spark job', expectedId: 'dataset-conventions', category: 'mixed-lang', lang: 'mixed' },
  ],
};

// ─────────────────────────────────────────────
// HOLDOUT fixture: gamedev (gaia) + biotech (helix)
// Different domains and query phrasing from DEV. Includes:
//   - paraphrase (no surface-keyword overlap with the doc)
//   - same-domain distractors (correct doc among multiple plausible)
//   - mixed Korean+English queries
//   - same-domain negatives (a query that *sounds* in-domain but should not match any doc)
// NOTHING in here is touched by autoresearch's fix-selection signal.
// ─────────────────────────────────────────────
export const HOLDOUT_FIXTURE: FixtureSet = {
  name: 'holdout',
  branches: [
    {
      branch: 'gaia',
      branchSummary: 'Gaia: Unity multiplayer roguelike game studio. Client, dedicated server, and content pipeline.',
      docs: [
        {
          title: 'Project Identity',
          slug: 'project-identity',
          summary: 'Gaia is a co-op multiplayer roguelike built in Unity 2023 LTS. Backend is a Rust dedicated server using Tokio.',
          body: [
            'Gaia is a 4-player co-op roguelike with procedural dungeons.',
            'Client: Unity 2023 LTS, C#, URP rendering.',
            'Dedicated server: Rust + Tokio + tonic for gRPC.',
            'Match coordinator runs on Cloud Run; per-room servers spin up on Agones in GKE.',
            'Telemetry pipeline ships gameplay events to BigQuery via Pub/Sub.',
          ].join('\n'),
          tags: ['unity', 'rust', 'gameserver'],
        },
        {
          title: 'Netcode and Replication',
          slug: 'netcode',
          summary: 'Snapshot-based replication at 30 Hz with client-side prediction and server reconciliation. Lag compensation via rewind buffers.',
          body: [
            'The server is authoritative; clients send inputs, never positions.',
            'Snapshots are delta-compressed at 30 Hz over UDP (QUIC fallback for restrictive NATs).',
            'Client-side prediction simulates locally and reconciles when the server snapshot lands.',
            'Hit registration uses a 250 ms rewind buffer to compensate for latency.',
            'Cheating mitigation: input rate limiter and a server-side movement validator.',
          ].join('\n'),
          tags: ['netcode', 'replication', 'cheating'],
        },
        {
          title: 'Procedural Dungeon Generation',
          slug: 'dungeon-gen',
          summary: 'Dungeons are generated by a wave-function-collapse pass over hand-authored room tiles. Seeded per match for reproducibility.',
          body: [
            'Layout is produced by a wave-function-collapse algorithm operating on tagged room tiles.',
            'Room tiles are authored in Unity and exported as ScriptableObjects with adjacency tags.',
            'A post-pass places encounters using a difficulty curve keyed to floor depth.',
            'The seed is broadcast from the server so every client renders the same dungeon.',
            'Smoke test: scripts/dungen-fuzz.sh runs 1000 seeds and reports unreachable rooms.',
          ].join('\n'),
          tags: ['procgen', 'wfc', 'dungeon'],
        },
        {
          title: 'Glossary',
          slug: 'gaia-glossary',
          summary: 'Key terms: tickrate, snapshot, rewind buffer, agones, room server, content build.',
          body: [
            'Tickrate: server simulation steps per second (Gaia: 30 Hz).',
            'Snapshot: a serialized world state delta sent to clients.',
            'Rewind buffer: a server-side ring of past world states used for hit-reg lag compensation.',
            'Agones: Kubernetes operator that manages dedicated game server lifecycles.',
            'Room server: an instance of the dedicated server bound to one match.',
            'Content build: an addressable bundle of art, audio, and ScriptableObjects.',
          ].join('\n'),
          tags: ['glossary'],
        },
      ],
    },
    {
      branch: 'helix',
      branchSummary: 'Helix: bioinformatics pipeline team. Variant calling, FHIR ingestion, regulatory submission.',
      docs: [
        {
          title: 'Project Identity',
          slug: 'project-identity',
          summary: 'Helix is a clinical-grade bioinformatics platform. Pipelines run on Nextflow against AWS HealthOmics; results land in a FHIR store.',
          body: [
            'Helix processes whole-genome and exome data for clinical labs under CLIA/CAP.',
            'Pipelines are written in Nextflow DSL2 and run on AWS HealthOmics workflows.',
            'Variant call format (VCF) outputs are normalised and annotated by VEP.',
            'Final reports are written to a FHIR R4 store with DiagnosticReport resources.',
            'All audit logs are immutable and retained for 7 years per regulatory policy.',
          ].join('\n'),
          tags: ['bioinformatics', 'nextflow', 'fhir', 'clinical'],
        },
        {
          title: 'Variant Calling Pipeline',
          slug: 'variant-calling',
          summary: 'Reads are aligned with BWA-MEM, duplicates marked with MarkDuplicates, variants called with DeepVariant, joint-genotyped with GLnexus.',
          body: [
            'FASTQ → BAM with BWA-MEM2; duplicate marking via Picard MarkDuplicates.',
            'Per-sample variant calling uses DeepVariant 1.6 in WGS mode.',
            'Joint genotyping across cohorts uses GLnexus with the DeepVariantWGS configuration.',
            'Quality filtering applies hard cutoffs from the GA4GH precisionFDA truth set.',
            'Annotation step: Ensembl VEP with ClinVar, gnomAD, and dbSNP plugins.',
          ].join('\n'),
          tags: ['variant', 'deepvariant', 'glnexus', 'bwa'],
        },
        {
          title: 'FHIR Ingestion',
          slug: 'fhir-ingestion',
          summary: 'Lab orders arrive as HL7 v2 messages, normalised to FHIR R4 ServiceRequest, then matched to incoming sequencing samples.',
          body: [
            'HL7 v2 ORM messages are parsed and converted to FHIR ServiceRequest resources.',
            'Patient demographics are reconciled against the master patient index using EMPI.',
            'Sample identifiers from the wet lab LIMS are linked to the ServiceRequest by accession number.',
            'Resulting DiagnosticReport resources reference Observation entries for each variant of interest.',
            'PHI access is gated by SMART-on-FHIR scopes; service-to-service uses signed JWTs.',
          ].join('\n'),
          tags: ['fhir', 'hl7', 'phi'],
        },
        {
          title: 'Glossary',
          slug: 'helix-glossary',
          summary: 'Key terms: VCF, BAM, FASTQ, EMPI, joint genotyping, CLIA, CAP, gnomAD, ClinVar.',
          body: [
            'VCF: Variant Call Format, a tab-separated file describing variants relative to a reference.',
            'BAM: compressed binary form of SAM (Sequence Alignment/Map).',
            'FASTQ: sequencing read file with quality scores.',
            'EMPI: Enterprise Master Patient Index, used to deduplicate patient records.',
            'Joint genotyping: combining per-sample gVCFs into a multi-sample callset.',
            'CLIA / CAP: US regulatory frameworks for clinical lab certification.',
            'gnomAD / ClinVar: population frequency and clinical significance databases.',
          ].join('\n'),
          tags: ['glossary', 'bioinformatics'],
        },
      ],
    },
  ],
  cases: [
    // ── gaia: paraphrase (no surface keyword overlap with the doc title) ──
    { branch: 'gaia', query: 'authoritative server replication', expectedId: 'netcode', category: 'paraphrase', lang: 'en' },
    { branch: 'gaia', query: 'random map generation per match seed', expectedId: 'dungeon-gen', category: 'paraphrase', lang: 'en' },
    // ── gaia: same-domain distractor — multiple docs plausible, glossary should NOT win over the deep doc ──
    { branch: 'gaia', query: 'wave function collapse room tiles', expectedId: 'dungeon-gen', category: 'same-domain-distractor', lang: 'en' },
    { branch: 'gaia', query: 'rewind buffer lag compensation hit registration', expectedId: 'netcode', category: 'same-domain-distractor', lang: 'en' },
    // ── gaia: glossary — exact term should hit the glossary doc ──
    { branch: 'gaia', query: 'agones room server tickrate', expectedId: 'gaia-glossary', category: 'glossary', lang: 'en' },
    // ── gaia: mixed-lang ──
    { branch: 'gaia', query: 'Unity 클라이언트 서버 권위 모델', expectedId: 'netcode', category: 'mixed-lang', lang: 'mixed' },
    { branch: 'gaia', query: '던전 절차적 생성 시드 reproducibility', expectedId: 'dungeon-gen', category: 'mixed-lang', lang: 'mixed' },
    // ── gaia: same-domain negative (in-genre query, no matching doc in this branch) ──
    { branch: 'gaia', query: 'matchmaking ELO rating skill', expectedId: null, category: 'same-domain-negative', lang: 'en' },
    { branch: 'gaia', query: 'voice chat opus codec', expectedId: null, category: 'same-domain-negative', lang: 'en' },
    // ── gaia: cross-branch negative ──
    { branch: 'gaia', query: 'DeepVariant joint genotyping', expectedId: null, category: 'cross-branch-negative', lang: 'en' },

    // ── helix: paraphrase ──
    { branch: 'helix', query: 'sequencing reads to aligned BAM file', expectedId: 'variant-calling', category: 'paraphrase', lang: 'en' },
    { branch: 'helix', query: 'lab order to clinical record reconciliation', expectedId: 'fhir-ingestion', category: 'paraphrase', lang: 'en' },
    // ── helix: same-domain distractor ──
    { branch: 'helix', query: 'BWA MarkDuplicates DeepVariant pipeline', expectedId: 'variant-calling', category: 'same-domain-distractor', lang: 'en' },
    { branch: 'helix', query: 'HL7 ORM ServiceRequest accession EMPI', expectedId: 'fhir-ingestion', category: 'same-domain-distractor', lang: 'en' },
    // ── helix: glossary ──
    { branch: 'helix', query: 'VCF BAM FASTQ EMPI definitions', expectedId: 'helix-glossary', category: 'glossary', lang: 'en' },
    // ── helix: mixed-lang ──
    { branch: 'helix', query: '환자 식별자 EMPI reconciliation', expectedId: 'fhir-ingestion', category: 'mixed-lang', lang: 'mixed' },
    { branch: 'helix', query: '변이 호출 GLnexus joint genotyping', expectedId: 'variant-calling', category: 'mixed-lang', lang: 'mixed' },
    // ── helix: same-domain negative ──
    { branch: 'helix', query: 'CRISPR knockout screen analysis', expectedId: null, category: 'same-domain-negative', lang: 'en' },
    { branch: 'helix', query: 'single cell RNA-seq clustering UMAP', expectedId: null, category: 'same-domain-negative', lang: 'en' },
    // ── helix: cross-branch negative ──
    { branch: 'helix', query: 'Unity netcode replication snapshot', expectedId: null, category: 'cross-branch-negative', lang: 'en' },
  ],
};
