import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { renderDocMarkdown, slugify } from './markdown.js';
import { branchDir, branchDocsDir, branchProposalsDir, DEFAULT_BRANCH } from './paths.js';
import { ensureBranchExists, updateBranchMeta, writeIndexFromDocs } from './store.js';
import type { GcTreeProposal, GcTreeProposalInput } from './types.js';

export async function proposeUpdate({
  home,
  input,
  branch,
}: {
  home: string;
  input: GcTreeProposalInput;
  branch?: string;
}): Promise<{ proposal_path: string; proposal: GcTreeProposal }> {
  const targetBranch = branch || input.branch || DEFAULT_BRANCH;
  await ensureBranchExists(home, targetBranch);
  await mkdir(branchProposalsDir(home, targetBranch), { recursive: true });
  const now = new Date().toISOString();
  const id = `${now.replace(/[:.]/g, '-')}-${slugify(input.title)}`;
  const proposal: GcTreeProposal = {
    version: 1,
    id,
    status: 'proposed',
    branch: targetBranch,
    title: input.title.trim(),
    summary: input.summary.trim(),
    created_at: now,
    changes: input.docs.map((doc) => ({
      path: `docs/${slugify(doc.slug || doc.title)}.md`,
      title: doc.title.trim(),
      summary: doc.summary.trim(),
      body: doc.body.trim(),
      ...(doc.tags?.length ? { tags: doc.tags } : {}),
    })),
  };
  const proposalPath = join(branchProposalsDir(home, targetBranch), `${id}.json`);
  await writeFile(proposalPath, `${JSON.stringify(proposal, null, 2)}\n`, 'utf8');
  return { proposal_path: proposalPath, proposal };
}

export async function applyProposal({
  home,
  proposalPath,
}: {
  home: string;
  proposalPath: string;
}): Promise<{ branch: string; updated_docs: string[]; proposal_path: string }> {
  const raw = await readFile(proposalPath, 'utf8');
  const proposal = JSON.parse(raw) as GcTreeProposal;
  await ensureBranchExists(home, proposal.branch);
  await mkdir(branchDocsDir(home, proposal.branch), { recursive: true });
  const updatedDocs: string[] = [];

  for (const change of proposal.changes) {
    const fullPath = join(branchDir(home, proposal.branch), change.path);
    await writeFile(
      fullPath,
      renderDocMarkdown({
        title: change.title,
        summary: change.summary,
        body: change.body,
        tags: change.tags,
      }),
      'utf8',
    );
    updatedDocs.push(fullPath);
  }

  proposal.status = 'applied';
  proposal.applied_at = new Date().toISOString();
  await writeFile(proposalPath, `${JSON.stringify(proposal, null, 2)}\n`, 'utf8');
  await writeIndexFromDocs(home, proposal.branch);
  await updateBranchMeta(home, proposal.branch, {
    summary: proposal.summary || (await readBranchSummary(home, proposal.branch)),
  });
  return {
    branch: proposal.branch,
    updated_docs: updatedDocs,
    proposal_path: proposalPath,
  };
}

async function readBranchSummary(home: string, branch: string): Promise<string> {
  const branchJson = await readFile(join(branchDir(home, branch), 'branch.json'), 'utf8');
  return (JSON.parse(branchJson) as { summary?: string }).summary || '';
}

export async function listProposals(home: string, branch: string): Promise<string[]> {
  return (await readdir(branchProposalsDir(home, branch)).catch(() => []))
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => join(branchProposalsDir(home, branch), file));
}

export function proposalBasename(path: string): string {
  return basename(path);
}
