import { readFile } from 'node:fs/promises';

import { parseIndexEntries } from './markdown.js';
import { branchIndexPath, DEFAULT_BRANCH } from './paths.js';
import { ensureBranchExists, statusForBranch } from './store.js';

export async function verifyOnboarding({
  home,
  branch,
}: {
  home: string;
  branch?: string;
}): Promise<{
  status: 'complete' | 'incomplete';
  gc_branch: string;
  doc_count: number;
  indexed_doc_count: number;
  docs: Array<{ id: string; title: string; path: string }>;
  warnings: string[];
  message: string;
}> {
  const gcBranch = branch || DEFAULT_BRANCH;
  await ensureBranchExists(home, gcBranch);
  const status = await statusForBranch(home, gcBranch);
  const indexRaw = await readFile(branchIndexPath(home, gcBranch), 'utf8');
  const docs = parseIndexEntries(indexRaw);
  const indexedDocCount = docs.length;
  const complete = status.doc_count > 0 && indexedDocCount > 0;

  return {
    status: complete ? 'complete' : 'incomplete',
    gc_branch: gcBranch,
    doc_count: status.doc_count,
    indexed_doc_count: indexedDocCount,
    docs,
    warnings: status.warnings,
    message: complete
      ? `Onboarding is complete for gc-branch "${gcBranch}".`
      : `Onboarding is incomplete for gc-branch "${gcBranch}". Docs or index entries are missing.`,
  };
}
