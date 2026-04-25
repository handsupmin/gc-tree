import { execSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { renderDocMarkdown, slugify } from './markdown.js';
import { branchDocsDir, DEFAULT_BRANCH, settingsPath } from './paths.js';
import { ensureBranchExists, updateBranchMeta, writeIndexFromDocs } from './store.js';
import type { GcTreeContextUpdateInput, GcTreeSettings, ScaffoldedHostRecord } from './types.js';

function docRelativePath(doc: GcTreeContextUpdateInput['docs'][number]): string {
  if (doc.slug?.includes('/')) return `${doc.slug.replace(/\.md$/i, '')}.md`;
  const fileBase = slugify(doc.slug || doc.indexLabel || doc.title);
  const category = doc.category ? slugify(doc.category) : '';
  return category ? `${category}/${fileBase}.md` : `${fileBase}.md`;
}

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
    const fullPath = join(branchDocsDir(home, targetBranch), docRelativePath(doc));
    await mkdir(dirname(fullPath), { recursive: true });
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

async function readScaffoldedHosts(home: string): Promise<ScaffoldedHostRecord[]> {
  try {
    const raw = await readFile(settingsPath(home), 'utf8');
    const settings = JSON.parse(raw) as GcTreeSettings;
    return settings.scaffolded_hosts || [];
  } catch {
    return [];
  }
}

export async function selfUpdate(home: string): Promise<void> {
  const hosts = await readScaffoldedHosts(home);

  if (hosts.length === 0) {
    process.stderr.write('No scaffolded providers found in settings. Run `gctree scaffold --host <host>` first.\n');
  } else {
    process.stderr.write(`Found ${hosts.length} scaffolded provider(s): ${hosts.map((h) => `${h.host}(${h.scope})`).join(', ')}\n`);
  }

  process.stderr.write('\nUpdating gctree to latest...\n');
  try {
    execSync('npm install -g @handsupmin/gc-tree', { stdio: 'inherit' });
  } catch {
    process.stderr.write('\nnpm registry may not have propagated the latest version yet. Wait a minute and retry: gctree update\n');
    process.exit(1);
  }

  if (hosts.length > 0) {
    process.stderr.write('\nRe-scaffolding providers with new version...\n');
    for (const record of hosts) {
      const args = ['gctree', 'scaffold', '--host', record.host, '--force'];
      if (record.scope === 'local' && record.target_dir) args.push('--target', record.target_dir);
      process.stderr.write(`  ${args.join(' ')}\n`);
      execSync(args.join(' '), { stdio: 'inherit' });
    }
  }

  process.stderr.write('\ngctree update complete.\n');
}
