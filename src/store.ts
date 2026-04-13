import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  branchDir,
  branchDocsDir,
  branchIndexPath,
  branchMetaPath,
  branchProposalsDir,
  branchesRoot,
  DEFAULT_BRANCH,
  headPath,
  INDEX_WARNING_CHARS,
} from './paths.js';
import { renderIndexMarkdown } from './markdown.js';
import type { GcTreeBranchMeta } from './types.js';

export async function ensureHome(home: string): Promise<void> {
  await mkdir(branchesRoot(home), { recursive: true });
}

export async function readHead(home: string): Promise<string | null> {
  try {
    return (await readFile(headPath(home), 'utf8')).trim() || null;
  } catch {
    return null;
  }
}

export async function writeHead(home: string, branch: string): Promise<void> {
  await ensureHome(home);
  await writeFile(headPath(home), `${branch}\n`, 'utf8');
}

export async function initHome(home: string, branch = DEFAULT_BRANCH): Promise<{ home: string; branch: string; created: boolean }> {
  const already = existsSync(headPath(home));
  await ensureHome(home);
  await ensureBranch(home, branch, { copyFrom: null, summary: `Default global context branch for ${branch}.` });
  await writeHead(home, branch);
  return { home, branch, created: !already };
}

export async function ensureBranch(
  home: string,
  branch: string,
  options: { copyFrom: string | null; summary: string },
): Promise<void> {
  const dir = branchDir(home, branch);
  if (existsSync(dir)) return;
  await ensureHome(home);
  if (options.copyFrom) {
    await cp(branchDir(home, options.copyFrom), dir, { recursive: true });
    const meta = await readBranchMeta(home, branch);
    meta.branch = branch;
    meta.updated_at = new Date().toISOString();
    await writeFile(branchMetaPath(home, branch), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
    return;
  }
  await mkdir(branchDocsDir(home, branch), { recursive: true });
  await mkdir(branchProposalsDir(home, branch), { recursive: true });
  const now = new Date().toISOString();
  const meta: GcTreeBranchMeta = {
    version: 1,
    branch,
    created_at: now,
    updated_at: now,
    summary: options.summary,
  };
  await writeFile(branchMetaPath(home, branch), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
  await writeFile(branchIndexPath(home, branch), renderIndexMarkdown({ branch, branchSummary: meta.summary, docs: [] }), 'utf8');
}

export async function readBranchMeta(home: string, branch: string): Promise<GcTreeBranchMeta> {
  const raw = await readFile(branchMetaPath(home, branch), 'utf8');
  return JSON.parse(raw) as GcTreeBranchMeta;
}

export async function updateBranchMeta(home: string, branch: string, input: Partial<GcTreeBranchMeta>): Promise<GcTreeBranchMeta> {
  const current = await readBranchMeta(home, branch);
  const next: GcTreeBranchMeta = {
    ...current,
    ...input,
    updated_at: new Date().toISOString(),
  };
  await writeFile(branchMetaPath(home, branch), `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

export async function listBranches(home: string): Promise<{ branches: string[]; current: string | null }> {
  await ensureHome(home);
  const entries = await readdir(branchesRoot(home), { withFileTypes: true }).catch(() => []);
  const branches = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  return {
    branches,
    current: await readHead(home),
  };
}

export async function checkoutBranch(home: string, branch: string, create = false): Promise<{ branch: string; created: boolean; copied_from?: string | null }> {
  const current = await readHead(home);
  const exists = existsSync(branchDir(home, branch));
  if (!exists && !create) {
    throw new Error(`branch does not exist: ${branch}`);
  }
  if (!exists) {
    await ensureBranch(home, branch, {
      copyFrom: current,
      summary: current ? `Copied from ${current}.` : `Created branch ${branch}.`,
    });
  }
  await writeHead(home, branch);
  return {
    branch,
    created: !exists,
    ...( !exists ? { copied_from: current } : {}),
  };
}

export async function writeIndexFromDocs(home: string, branch: string): Promise<{ index_path: string; doc_count: number }> {
  const docsDir = branchDocsDir(home, branch);
  await mkdir(docsDir, { recursive: true });
  const files = (await readdir(docsDir)).filter((file) => file.endsWith('.md')).sort();
  const docs = await Promise.all(
    files.map(async (file) => {
      const raw = await readFile(join(docsDir, file), 'utf8');
      const title =
        raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ||
        file.replace(/\.md$/i, '').replace(/-/g, ' ');
      return { title, path: `docs/${file}` };
    }),
  );
  const meta = await readBranchMeta(home, branch);
  const index = renderIndexMarkdown({ branch, branchSummary: meta.summary, docs });
  await writeFile(branchIndexPath(home, branch), index, 'utf8');
  return { index_path: branchIndexPath(home, branch), doc_count: docs.length };
}

export async function statusForBranch(home: string, branch: string): Promise<{
  home: string;
  branch: string;
  index_path: string;
  index_chars: number;
  doc_count: number;
  proposal_count: number;
  warnings: string[];
}> {
  const indexRaw = await readFile(branchIndexPath(home, branch), 'utf8');
  const docs = (await readdir(branchDocsDir(home, branch)).catch(() => [])).filter((file) => file.endsWith('.md'));
  const proposals = (await readdir(branchProposalsDir(home, branch)).catch(() => [])).filter((file) => file.endsWith('.json'));
  const warnings: string[] = [];
  if (indexRaw.length > INDEX_WARNING_CHARS) {
    warnings.push(`index.md is ${indexRaw.length} chars; keep it closer to an index than a knowledge dump.`);
  }
  for (const doc of docs) {
    const raw = await readFile(join(branchDocsDir(home, branch), doc), 'utf8');
    if (!/^## Summary$/m.test(raw)) {
      warnings.push(`source doc is missing a Summary section: docs/${doc}`);
    }
  }
  return {
    home,
    branch,
    index_path: branchIndexPath(home, branch),
    index_chars: indexRaw.length,
    doc_count: docs.length,
    proposal_count: proposals.length,
    warnings,
  };
}
export async function ensureBranchExists(home: string, branch: string): Promise<void> {
  if (!existsSync(branchDir(home, branch))) {
    throw new Error(`branch does not exist: ${branch}`);
  }
}
