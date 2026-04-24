import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { parseIndexEntries } from './markdown.js';
import { resolveContext } from './resolve.js';
import { branchDocsDir, branchIndexPath, DEFAULT_BRANCH } from './paths.js';
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
  search_quality: Array<{ query: string; expected_path: string; matched: boolean }>;
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
  const docsDir = branchDocsDir(home, gcBranch);
  const sourceDocs = await listSourceDocPaths(docsDir);
  const nonIndexSourceDocs = sourceDocs.filter((path) => !/(^|\/)index\.md$/i.test(path));

  if (sourceDocs.some((path) => /(^|\/)index\.md$/i.test(path))) {
    qualityIssues.push('Source docs must not include docs/index.md. The branch-level index.md is the only dictionary.');
  }

  const indexedPaths = new Set(docs.map((doc) => doc.path));
  for (const path of indexedPaths) {
    if (!existsSync(join(branchDirForDoc(home, gcBranch), path))) {
      qualityIssues.push(`Index points to a missing source doc: ${path}.`);
    }
  }

  for (const path of nonIndexSourceDocs) {
    const indexPath = `docs/${path}`;
    if (!indexedPaths.has(indexPath)) {
      qualityIssues.push(`Source doc is not reachable from index.md: ${indexPath}.`);
    }
  }

  const pathLikeLabels = docs
    .filter((doc) => /^\.?docs\//i.test(doc.label) || /\.md$/i.test(doc.label))
    .map((doc) => doc.label);
  if (pathLikeLabels.length > 0) {
    qualityIssues.push(`Index labels must be search terms, not paths: ${dedupe(pathLikeLabels).join(', ')}.`);
  }

  const prefixedLabels = docs
    .filter((doc) => /^(repo|repository|domain|workflow|convention|role|infra|verification)\s*:/i.test(doc.label))
    .map((doc) => doc.label);
  if (prefixedLabels.length > 0) {
    qualityIssues.push(`Index labels must not keep category prefixes: ${dedupe(prefixedLabels).join(', ')}.`);
  }

  const invalidCategories = docs
    .filter((doc) => doc.category !== 'general' && !VALID_CATEGORIES.has(doc.category))
    .map((doc) => `${doc.label} (${doc.category})`);
  if (invalidCategories.length > 0) {
    qualityIssues.push(`Index contains invalid categories: ${dedupe(invalidCategories).join(', ')}.`);
  }

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

    if (indexedDocCount >= 5) {
      const presentCategories = new Set(docs.map((doc) => doc.category));
      const missingCore = ['role', 'repos', 'domain', 'workflows'].filter((category) => !presentCategories.has(category));
      if (missingCore.length > 0) {
        qualityIssues.push(
          `Onboarding is missing core dictionary categories: ${missingCore.join(', ')}. Capture them or explicitly add small docs for unavailable categories.`,
        );
      }
    }
  }

  if (status.warnings.length > 0) {
    qualityIssues.push(...status.warnings);
  }

  const searchQuality: Array<{ query: string; expected_path: string; matched: boolean }> = [];
  for (const doc of docs.slice(0, 12)) {
    const resolved = await resolveContext({ home, branch: gcBranch, query: doc.label });
    const matched = resolved.matches.some((match) => match.path === doc.path);
    searchQuality.push({ query: doc.label, expected_path: doc.path, matched });
    if (!matched) {
      qualityIssues.push(`Resolve smoke test failed: query "${doc.label}" did not return ${doc.path}.`);
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
    search_quality: searchQuality,
    message: complete
      ? `Onboarding is complete for gc-branch "${gcBranch}".`
      : hasDocs
        ? `Onboarding has quality issues for gc-branch "${gcBranch}". Fix quality_issues before finishing.`
        : `Onboarding is incomplete for gc-branch "${gcBranch}". Docs or index entries are missing.`,
  };
}

async function listSourceDocPaths(dir: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await listSourceDocPaths(join(dir, entry.name), relative)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relative);
    }
  }
  return files.sort();
}

function branchDirForDoc(home: string, branch: string): string {
  return join(home, 'branches', branch);
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}
