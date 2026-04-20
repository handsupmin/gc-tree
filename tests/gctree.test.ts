import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { onboardBranch } from '../src/onboard.js';
import { DEFAULT_BRANCH, branchDocsDir, branchIndexPath } from '../src/paths.js';
import { getDocById, findRelatedDocs, resolveContext } from '../src/resolve.js';
import { checkoutBranch, initHome, listBranches, readHead, resetBranchContext, statusForBranch } from '../src/store.js';
import { updateBranchContext } from '../src/update.js';

async function createHome(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

const onboardingInput = {
  branchSummary: 'Main branch for product A global context.',
  docs: [
    {
      title: 'Project Identity',
      summary: 'Product A is a CLI-first tool for auth-heavy API work.',
      body: 'This gc-branch is for product A. Auth policy and API ergonomics matter most.',
    },
    {
      title: 'Domain Glossary',
      summary: 'Token rotation and auth policy are core vocabulary in this gc-branch.',
      body: 'Token rotation preserves sessions. Auth policy forbids schema drift.',
    },
  ],
};

test('init creates the home and default gc-branch', async () => {
  const home = await createHome('gctree-home-');
  try {
    const result = await initHome(home);
    assert.equal(result.gc_branch, DEFAULT_BRANCH);
    assert.equal(await readHead(home), DEFAULT_BRANCH);
    const index = await readFile(branchIndexPath(home, DEFAULT_BRANCH), 'utf8');
    assert.match(index, /gc-tree Index/);
    assert.match(index, /gc-branch: main/);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('checkout -b creates an empty gc-branch and switches HEAD', async () => {
  const home = await createHome('gctree-checkout-');
  try {
    await initHome(home);
    await onboardBranch({ home, input: onboardingInput });
    const created = await checkoutBranch(home, 'client-b', true);
    assert.equal(created.created, true);
    assert.equal(await readHead(home), 'client-b');

    const copiedIndex = await readFile(branchIndexPath(home, 'client-b'), 'utf8');
    assert.match(copiedIndex, /No source docs yet/);

    const branches = await listBranches(home);
    assert.deepEqual(branches.gc_branches, ['client-b', 'main']);
    assert.equal(branches.current_gc_branch, 'client-b');
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('onboard writes summary-first docs and a compact index', async () => {
  const home = await createHome('gctree-onboard-');
  try {
    await initHome(home);
    const result = await onboardBranch({ home, input: onboardingInput });
    assert.equal(result.gc_branch, DEFAULT_BRANCH);
    const index = await readFile(branchIndexPath(home, DEFAULT_BRANCH), 'utf8');
    assert.match(index, /Project Identity -> docs\/project-identity.md/);
    assert.doesNotMatch(index, /Auth policy and API ergonomics matter most/);

    const doc = await readFile(join(branchDocsDir(home, DEFAULT_BRANCH), 'project-identity.md'), 'utf8');
    assert.match(doc, /## Summary/);
    assert.match(doc, /CLI-first tool for auth-heavy API work/);
    assert.match(doc, /## Details/);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('resolve searches only the active gc-branch', async () => {
  const home = await createHome('gctree-resolve-');
  try {
    await initHome(home);
    await onboardBranch({ home, input: onboardingInput });
    await checkoutBranch(home, 'client-b', true);
    await onboardBranch({
      home,
      branch: 'client-b',
      input: {
        branchSummary: 'Client B gc-branch.',
        docs: [
          {
            title: 'Project Identity',
            summary: 'Client B is a billing-focused dashboard.',
            body: 'Billing and invoicing matter here.',
          },
        ],
      },
    });

    const branchA = await resolveContext({ home, branch: 'main', query: 'token rotation' });
    const branchB = await resolveContext({ home, branch: 'client-b', query: 'token rotation' });

    assert.equal(branchA.matches.length > 0, true);
    assert.equal(branchA.matches[0]?.id, 'domain-glossary');
    assert.equal(branchB.matches.length, 0);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('getDocById returns full doc payload for progressive disclosure', async () => {
  const home = await createHome('gctree-doc-');
  try {
    await initHome(home);
    await onboardBranch({ home, input: onboardingInput });

    const doc = await getDocById({ home, branch: 'main', id: 'project-identity' });
    assert.equal(doc?.id, 'project-identity');
    assert.equal(doc?.title, 'Project Identity');
    assert.match(doc?.content || '', /CLI-first tool for auth-heavy API work/);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('findRelatedDocs returns supporting docs for a selected resolve result', async () => {
  const home = await createHome('gctree-related-');
  try {
    await initHome(home);
    await onboardBranch({ home, input: onboardingInput });

    const related = await findRelatedDocs({ home, branch: 'main', id: 'project-identity' });
    assert.equal(related.status, 'matched');
    assert.equal(related.matches[0]?.id, 'domain-glossary');
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('updateBranchContext updates targeted docs without replacing the whole gc-branch', async () => {
  const home = await createHome('gctree-update-');
  try {
    await initHome(home);
    await onboardBranch({ home, input: onboardingInput });

    const result = await updateBranchContext({
      home,
      input: {
        docs: [
          {
            title: 'Domain Glossary',
            slug: 'domain-glossary',
            summary: 'Token rotation, auth policy, and session continuity are core vocabulary.',
            body: 'Token rotation preserves sessions. Auth policy forbids schema drift. Session continuity is a key UX requirement.',
          },
        ],
      },
    });

    assert.equal(result.gc_branch, 'main');
    const glossary = await readFile(join(branchDocsDir(home, 'main'), 'domain-glossary.md'), 'utf8');
    const identity = await readFile(join(branchDocsDir(home, 'main'), 'project-identity.md'), 'utf8');
    assert.match(glossary, /session continuity/i);
    assert.match(identity, /Auth policy and API ergonomics matter most/i);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('resetBranchContext clears docs so the gc-branch can be onboarded again', async () => {
  const home = await createHome('gctree-reset-');
  try {
    await initHome(home);
    await onboardBranch({ home, input: onboardingInput });
    const reset = await resetBranchContext(home, 'main');
    assert.equal(reset.gc_branch, 'main');

    const docs = await readFile(branchIndexPath(home, 'main'), 'utf8');
    assert.match(docs, /No source docs yet/);
    const status = await statusForBranch(home, 'main');
    assert.equal(status.doc_count, 0);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('status warns when index grows beyond the compact budget', async () => {
  const home = await createHome('gctree-status-');
  try {
    await initHome(home);
    await onboardBranch({
      home,
      input: {
        branchSummary: 'x'.repeat(2500),
        docs: onboardingInput.docs,
      },
    });
    const status = await statusForBranch(home, DEFAULT_BRANCH);
    assert.equal(status.warnings.length > 0, true);
    assert.match(status.warnings[0] ?? '', /index\.md/i);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});
