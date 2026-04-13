import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { onboardBranch } from '../src/onboard.js';
import { DEFAULT_BRANCH, branchDocsDir, branchIndexPath } from '../src/paths.js';
import { applyProposal, proposeUpdate } from '../src/proposals.js';
import { resolveContext } from '../src/resolve.js';
import { checkoutBranch, initHome, listBranches, readHead, statusForBranch } from '../src/store.js';

async function createHome(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

const onboardingInput = {
  branchSummary: 'Main branch for product A global context.',
  docs: [
    {
      title: 'Project Identity',
      summary: 'Product A is a CLI-first tool for auth-heavy API work.',
      body: 'This branch is for product A. Auth policy and API ergonomics matter most.',
    },
    {
      title: 'Domain Glossary',
      summary: 'Token rotation and auth policy are core vocabulary in this branch.',
      body: 'Token rotation preserves sessions. Auth policy forbids schema drift.',
    },
  ],
};

test('init creates the home and default branch', async () => {
  const home = await createHome('gctree-home-');
  try {
    const result = await initHome(home);
    assert.equal(result.branch, DEFAULT_BRANCH);
    assert.equal(await readHead(home), DEFAULT_BRANCH);
    const index = await readFile(branchIndexPath(home, DEFAULT_BRANCH), 'utf8');
    assert.match(index, /gc-tree Index/);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('checkout -b copies the current branch and switches HEAD', async () => {
  const home = await createHome('gctree-checkout-');
  try {
    await initHome(home);
    await onboardBranch({ home, input: onboardingInput });
    const created = await checkoutBranch(home, 'client-b', true);
    assert.equal(created.created, true);
    assert.equal(created.copied_from, DEFAULT_BRANCH);
    assert.equal(await readHead(home), 'client-b');

    const copiedIndex = await readFile(branchIndexPath(home, 'client-b'), 'utf8');
    assert.match(copiedIndex, /Project Identity/);

    const branches = await listBranches(home);
    assert.deepEqual(branches.branches, ['client-b', 'main']);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('onboard writes summary-first docs and a compact index', async () => {
  const home = await createHome('gctree-onboard-');
  try {
    await initHome(home);
    const result = await onboardBranch({ home, input: onboardingInput });
    assert.equal(result.branch, DEFAULT_BRANCH);
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

test('resolve searches only the active branch', async () => {
  const home = await createHome('gctree-resolve-');
  try {
    await initHome(home);
    await onboardBranch({ home, input: onboardingInput });
    await checkoutBranch(home, 'client-b', true);
    await onboardBranch({
      home,
      branch: 'client-b',
      input: {
        branchSummary: 'Client B branch.',
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
    assert.equal(branchB.matches.length, 0);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('propose-update does not mutate docs until apply-update runs', async () => {
  const home = await createHome('gctree-proposal-');
  try {
    await initHome(home);
    await onboardBranch({ home, input: onboardingInput });

    const before = await readFile(join(branchDocsDir(home, DEFAULT_BRANCH), 'domain-glossary.md'), 'utf8');
    const proposal = await proposeUpdate({
      home,
      input: {
        title: 'Clarify glossary',
        summary: 'Add session continuity language to the glossary.',
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

    const afterProposal = await readFile(join(branchDocsDir(home, DEFAULT_BRANCH), 'domain-glossary.md'), 'utf8');
    assert.equal(afterProposal, before);
    assert.equal(proposal.proposal.status, 'proposed');

    const applied = await applyProposal({ home, proposalPath: proposal.proposal_path });
    assert.equal(applied.branch, DEFAULT_BRANCH);
    const afterApply = await readFile(join(branchDocsDir(home, DEFAULT_BRANCH), 'domain-glossary.md'), 'utf8');
    assert.match(afterApply, /session continuity/i);
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
