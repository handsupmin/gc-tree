import { execSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { renderDocMarkdown, slugify } from './markdown.js';
import { branchDocsDir, DEFAULT_BRANCH, settingsPath } from './paths.js';
import { ensureBranchExists, updateBranchMeta, writeIndexFromDocs } from './store.js';
import type { GcTreeContextUpdateInput, GcTreeSettings, ScaffoldedHostRecord } from './types.js';

const UPDATE_ROOT_KEYS = new Set(['branch', 'branchSummary', 'docs']);
const UPDATE_DOC_KEYS = new Set(['title', 'slug', 'summary', 'body', 'tags', 'category', 'indexLabel', 'indexEntries']);
const VALID_UPDATE_CATEGORIES = new Set(['role', 'repos', 'domain', 'workflows', 'conventions', 'infra', 'verification']);
const LEGACY_DOC_FIELD_HINTS: Record<string, string> = {
  id: 'use `slug` instead, without `docs/` or `.md`',
  path: 'use `slug` instead, without `docs/` or `.md`',
  content: 'use `body` instead, and put search terms in `indexEntries`',
};

function docRelativePath(doc: GcTreeContextUpdateInput['docs'][number]): string {
  if (doc.slug?.includes('/')) return `${doc.slug.replace(/\.md$/i, '')}.md`;
  const fileBase = slugify(doc.slug || doc.indexLabel || doc.title);
  const category = doc.category ? slugify(doc.category) : '';
  return category ? `${category}/${fileBase}.md` : `${fileBase}.md`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function unknownKeys(record: Record<string, unknown>, allowed: Set<string>): string[] {
  return Object.keys(record).filter((key) => !allowed.has(key));
}

function requireNonEmptyString(record: Record<string, unknown>, key: string, subject: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid gctree update input: ${subject}.${key} must be a non-empty string.`);
  }
  return value.trim();
}

function validateOptionalString(record: Record<string, unknown>, key: string, subject: string): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid gctree update input: ${subject}.${key} must be a non-empty string when provided.`);
  }
  return value.trim();
}

function validateOptionalStringArray(record: Record<string, unknown>, key: string, subject: string): string[] | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`Invalid gctree update input: ${subject}.${key} must be an array of strings when provided.`);
  }
  const entries = value.map((entry) => entry.trim()).filter(Boolean);
  if (entries.length === 0) {
    throw new Error(`Invalid gctree update input: ${subject}.${key} must contain at least one non-empty string when provided.`);
  }
  return entries;
}

function validateUpdateSlug(slug: string, subject: string): void {
  if (slug.startsWith('docs/')) {
    throw new Error(
      `Invalid gctree update input: ${subject}.slug must omit the docs/ prefix. Example: use "conventions/example" instead of "docs/conventions/example.md".`,
    );
  }
  if (slug.endsWith('.md')) {
    throw new Error(
      `Invalid gctree update input: ${subject}.slug must omit the .md suffix. Example: use "conventions/example" instead of "conventions/example.md".`,
    );
  }
  if (slug.startsWith('/') || slug.includes('\\') || slug.split('/').includes('..')) {
    throw new Error(`Invalid gctree update input: ${subject}.slug must be a relative doc slug without absolute paths, backslashes, or "..".`);
  }
  if (slug.includes('/')) {
    const category = slug.split('/')[0]!;
    if (!VALID_UPDATE_CATEGORIES.has(category)) {
      throw new Error(
        `Invalid gctree update input: ${subject}.slug category must be one of ${[...VALID_UPDATE_CATEGORIES].join(', ')}.`,
      );
    }
  }
}

function validateUpdateBody(body: string, subject: string): void {
  if (/^\s*#\s+/.test(body)) {
    throw new Error(`Invalid gctree update input: ${subject}.body must not include the top-level markdown title; use the title field.`);
  }
  if (/^## Summary\b/m.test(body)) {
    throw new Error(`Invalid gctree update input: ${subject}.body must not include ## Summary; use the summary field.`);
  }
  if (/^## Index Entries\b/m.test(body)) {
    throw new Error(`Invalid gctree update input: ${subject}.body must not include ## Index Entries; use the indexEntries array.`);
  }
}

function validateContextUpdateInput(input: unknown): asserts input is GcTreeContextUpdateInput {
  if (!isRecord(input)) {
    throw new Error('Invalid gctree update input: root must be an object with docs[].');
  }

  const extraRootKeys = unknownKeys(input, UPDATE_ROOT_KEYS);
  if (extraRootKeys.length > 0) {
    throw new Error(`Invalid gctree update input: unsupported root field(s): ${extraRootKeys.join(', ')}.`);
  }

  validateOptionalString(input, 'branch', 'input');
  validateOptionalString(input, 'branchSummary', 'input');

  if (!Array.isArray(input.docs) || input.docs.length === 0) {
    throw new Error('Invalid gctree update input: docs must be a non-empty array.');
  }

  input.docs.forEach((doc, index) => {
    const subject = `docs[${index}]`;
    if (!isRecord(doc)) {
      throw new Error(`Invalid gctree update input: ${subject} must be an object.`);
    }

    const extraDocKeys = unknownKeys(doc, UPDATE_DOC_KEYS);
    if (extraDocKeys.length > 0) {
      const hints = extraDocKeys
        .map((key) => LEGACY_DOC_FIELD_HINTS[key])
        .filter((hint): hint is string => Boolean(hint));
      const suffix = hints.length > 0 ? ` ${[...new Set(hints)].join('; ')}.` : '';
      throw new Error(`Invalid gctree update input: ${subject} has unsupported field(s): ${extraDocKeys.join(', ')}.${suffix}`);
    }

    requireNonEmptyString(doc, 'title', subject);
    const slug = requireNonEmptyString(doc, 'slug', subject);
    requireNonEmptyString(doc, 'summary', subject);
    const body = requireNonEmptyString(doc, 'body', subject);
    const category = validateOptionalString(doc, 'category', subject);
    validateOptionalString(doc, 'indexLabel', subject);
    validateOptionalStringArray(doc, 'tags', subject);
    const indexEntries = validateOptionalStringArray(doc, 'indexEntries', subject);
    if (!indexEntries) {
      throw new Error(`Invalid gctree update input: ${subject}.indexEntries must be a non-empty array of search terms.`);
    }
    validateUpdateSlug(slug, subject);
    validateUpdateBody(body, subject);
    if (category && !VALID_UPDATE_CATEGORIES.has(category)) {
      throw new Error(`Invalid gctree update input: ${subject}.category must be one of ${[...VALID_UPDATE_CATEGORIES].join(', ')}.`);
    }
    if (category && slug.includes('/') && slug.split('/')[0] !== category) {
      throw new Error(`Invalid gctree update input: ${subject}.category must match the first segment of slug "${slug}".`);
    }
  });
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
  validateContextUpdateInput(input);
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
    execSync('npm install -g @handsupmin/gc-tree --force', { stdio: 'inherit' });
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
