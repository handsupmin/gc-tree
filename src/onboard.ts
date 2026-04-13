import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { renderDocMarkdown } from './markdown.js';
import { branchDocsDir, DEFAULT_BRANCH } from './paths.js';
import { ensureBranchExists, updateBranchMeta, writeIndexFromDocs } from './store.js';
import type { GcTreeOnboardingInput } from './types.js';

export async function onboardBranch({
  home,
  input,
  branch,
}: {
  home: string;
  input: GcTreeOnboardingInput;
  branch?: string;
}): Promise<{ branch: string; docs_written: string[]; index_path: string }> {
  const targetBranch = branch || input.branch || DEFAULT_BRANCH;
  await ensureBranchExists(home, targetBranch);
  await mkdir(branchDocsDir(home, targetBranch), { recursive: true });
  const existing = await readdir(branchDocsDir(home, targetBranch)).catch(() => []);
  await Promise.all(
    existing
      .filter((file) => file.endsWith('.md'))
      .map((file) => unlink(join(branchDocsDir(home, targetBranch), file))),
  );

  const written: string[] = [];
  for (const doc of input.docs) {
    const relativePath = `${doc.slug ? doc.slug : doc.title}`;
    const fileName = `${relativePath
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'doc'}.md`;
    const fullPath = join(branchDocsDir(home, targetBranch), fileName);
    await writeFile(fullPath, renderDocMarkdown(doc), 'utf8');
    written.push(fullPath);
  }

  if (input.branchSummary?.trim()) {
    await updateBranchMeta(home, targetBranch, { summary: input.branchSummary.trim() });
  }
  const index = await writeIndexFromDocs(home, targetBranch);
  return {
    branch: targetBranch,
    docs_written: written,
    index_path: index.index_path,
  };
}
