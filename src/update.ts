import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { renderDocMarkdown, slugify } from './markdown.js';
import { branchDocsDir, DEFAULT_BRANCH } from './paths.js';
import { ensureBranchExists, updateBranchMeta, writeIndexFromDocs } from './store.js';
import type { GcTreeContextUpdateInput } from './types.js';

export async function updateBranchContext({
  home,
  input,
  branch,
}: {
  home: string;
  input: GcTreeContextUpdateInput;
  branch?: string;
}): Promise<{ gc_branch: string; updated_docs: string[]; index_path: string }> {
  const targetBranch = branch || input.branch || DEFAULT_BRANCH;
  await ensureBranchExists(home, targetBranch);
  await mkdir(branchDocsDir(home, targetBranch), { recursive: true });

  const written: string[] = [];
  for (const doc of input.docs) {
    const fileName = `${slugify(doc.slug || doc.title)}.md`;
    const fullPath = join(branchDocsDir(home, targetBranch), fileName);
    await writeFile(fullPath, renderDocMarkdown(doc), 'utf8');
    written.push(fullPath);
  }

  if (input.branchSummary?.trim()) {
    await updateBranchMeta(home, targetBranch, { summary: input.branchSummary.trim() });
  }

  const index = await writeIndexFromDocs(home, targetBranch);
  return {
    gc_branch: targetBranch,
    updated_docs: written,
    index_path: index.index_path,
  };
}
