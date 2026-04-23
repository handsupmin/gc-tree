import { readFile } from 'node:fs/promises';

import { parseIndexEntries } from './markdown.js';
import { branchIndexPath, DEFAULT_BRANCH } from './paths.js';
import { ensureBranchExists, statusForBranch } from './store.js';

const VALID_CATEGORIES = new Set(['role', 'repos', 'domain', 'workflows', 'conventions', 'infra', 'verification']);

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
  docs: Array<{ id: string; title: string; label: string; category: string; path: string }>;
  warnings: string[];
  quality_issues: string[];
  message: string;
}> {
  const gcBranch = branch || DEFAULT_BRANCH;
  await ensureBranchExists(home, gcBranch);
  const status = await statusForBranch(home, gcBranch);
  const indexRaw = await readFile(branchIndexPath(home, gcBranch), 'utf8');
  const docs = parseIndexEntries(indexRaw);
  const indexedDocCount = docs.length;
  const hasDocs = status.doc_count > 0 && indexedDocCount > 0;

  const qualityIssues: string[] = [];

  if (hasDocs && indexedDocCount >= 3) {
    const categoryCounts = new Map<string, number>();
    for (const doc of docs) {
      categoryCounts.set(doc.category, (categoryCounts.get(doc.category) ?? 0) + 1);
    }
    const generalCount = categoryCounts.get('general') ?? 0;
    if (generalCount === indexedDocCount) {
      qualityIssues.push(
        `All ${indexedDocCount} docs have category "general". Valid categories are: ${[...VALID_CATEGORIES].join(', ')}. Re-apply onboarding with correct category fields in the JSON.`,
      );
    } else if (generalCount > 0) {
      const generalDocLabels = docs.filter((d) => d.category === 'general').map((d) => d.label);
      qualityIssues.push(
        `${generalCount} doc(s) still have category "general": ${generalDocLabels.join(', ')}. Move them to one of: ${[...VALID_CATEGORIES].join(', ')}.`,
      );
    }
  }

  const complete = hasDocs && qualityIssues.length === 0;

  return {
    status: complete ? 'complete' : 'incomplete',
    gc_branch: gcBranch,
    doc_count: status.doc_count,
    indexed_doc_count: indexedDocCount,
    docs,
    warnings: status.warnings,
    quality_issues: qualityIssues,
    message: complete
      ? `Onboarding is complete for gc-branch "${gcBranch}".`
      : hasDocs
        ? `Onboarding has quality issues for gc-branch "${gcBranch}". Fix quality_issues before finishing.`
        : `Onboarding is incomplete for gc-branch "${gcBranch}". Docs or index entries are missing.`,
  };
}
