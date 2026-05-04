import type { GcTreeDocInput } from './types.js';

export function slugify(value: string): string {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || 'doc';
}

function parseDocReference(value: string): { category: string; slug: string; label: string } | null {
  const trimmed = String(value || '').trim().replace(/^\.?\//, '');
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\\/g, '/');
  const docsMatch = normalized.match(/^docs\/([^/]+)\/([^/]+?)(?:\.md)?$/i);
  if (docsMatch) {
    const category = normalizeCategory(docsMatch[1]!);
    const slug = slugify(docsMatch[2]!);
    if (slug === 'index') return null;
    return { category, slug, label: docsMatch[2]!.replace(/\.md$/i, '').trim() };
  }
  const directMatch = normalized.match(/^(role|repos|domain|workflows|conventions|infra|verification)\/([^/]+?)(?:\.md)?$/i);
  if (directMatch) {
    const category = normalizeCategory(directMatch[1]!);
    const slug = slugify(directMatch[2]!);
    if (slug === 'index') return null;
    return { category, slug, label: directMatch[2]!.replace(/\.md$/i, '').trim() };
  }
  return null;
}

function parseTitlePlacement(value: string): { category: string; slug: string; label: string } | null {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  if (/^index$/i.test(trimmed)) return { category: 'index', slug: 'index', label: 'Index' };

  const match = trimmed.match(/^(role|repo|repos|repository|repositories|domain|workflow|workflows|convention|conventions|infra|verification)\s*:\s*(.+)$/i);
  if (!match) return null;

  const rawCategory = match[1]!.toLowerCase();
  const categoryMap: Record<string, string> = {
    role: 'role',
    repo: 'repos',
    repos: 'repos',
    repository: 'repos',
    repositories: 'repos',
    domain: 'domain',
    workflow: 'workflows',
    workflows: 'workflows',
    convention: 'conventions',
    conventions: 'conventions',
    infra: 'infra',
    verification: 'verification',
  };
  const label = match[2]!.trim();
  const category = categoryMap[rawCategory];
  if (!category || !label) return null;
  return {
    category,
    slug: slugify(label),
    label,
  };
}

export function ensureSummary(summary: string): string {
  const trimmed = String(summary || '').trim();
  if (!trimmed) {
    throw new Error('summary is required for every source-of-truth doc');
  }
  return trimmed;
}

function normalizeBody(raw: string, title: string): string {
  let s = raw.trim();
  // Strip leading "# <title>" line (already rendered at top level)
  const titleLine = `# ${title.trim()}`;
  if (s.startsWith(titleLine)) s = s.slice(titleLine.length).trimStart();
  // Strip leading "## Summary" block (already rendered at top level)
  if (s.startsWith('## Summary')) {
    const next = s.match(/\n(?=## )/);
    s = next ? s.slice(next.index!).trimStart() : '';
  }
  return s;
}

export function renderDocMarkdown(doc: GcTreeDocInput): string {
  const summary = ensureSummary(doc.summary);
  const body = normalizeBody(String(doc.body || ''), doc.title);
  const normalizedIndexEntries = [...new Set([
    ...(doc.indexLabel?.trim() ? [doc.indexLabel.trim()] : []),
    ...(doc.indexEntries || []).map((entry) => String(entry || '').trim()).filter(Boolean),
  ])];
  return [
    `# ${doc.title.trim()}`,
    '',
    '## Summary',
    '',
    summary,
    '',
    ...(doc.tags && doc.tags.length > 0
      ? ['## Tags', '', ...doc.tags.map((tag) => `- ${tag}`), '']
      : []),
    ...(normalizedIndexEntries.length > 0
      ? ['## Index Entries', '', ...normalizedIndexEntries.map((entry) => `- ${entry}`), '']
      : []),
    '## Details',
    '',
    body || '(no details yet)',
    '',
  ].join('\n');
}

export function renderIndexMarkdown(input: {
  branch: string;
  branchSummary: string;
  docs: Array<{ title: string; label?: string; category?: string; path: string }>;
}): string {
  const lines = [
    '# gc-tree Index',
    '',
    `- gc-branch: ${input.branch}`,
    `- summary: ${input.branchSummary.trim()}`,
    '',
  ];

  if (input.docs.length === 0) {
    lines.push('- No source docs yet.', '');
  } else {
    const categoryOrder = ['role', 'repos', 'domain', 'workflows', 'conventions', 'infra', 'verification', 'general'];

    // Group by category, then by path within category
    const byCategory = new Map<string, Map<string, string[]>>();
    for (const doc of input.docs) {
      const category = normalizeCategory(doc.category || deriveCategoryFromPath(doc.path));
      if (!byCategory.has(category)) byCategory.set(category, new Map());
      const byPath = byCategory.get(category)!;
      if (!byPath.has(doc.path)) byPath.set(doc.path, []);
      const label = (doc.label || doc.title).trim();
      if (label && !byPath.get(doc.path)!.includes(label)) {
        byPath.get(doc.path)!.push(label);
      }
    }

    const categories = [...byCategory.keys()].sort((a, b) => {
      const ai = categoryOrder.indexOf(a);
      const bi = categoryOrder.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    for (const category of categories) {
      lines.push(`## ${displayCategory(category)}`, '');
      const byPath = byCategory.get(category)!;
      for (const [path, labels] of [...byPath.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        lines.push(`- ${path}`);
        for (const label of labels) {
          lines.push(`  - ${label}`);
        }
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function docIdFromPath(docPath: string): string {
  const normalized = String(docPath || '').trim().replace(/^docs\//, '');
  return normalized.replace(/\.md$/i, '') || 'doc';
}

export function normalizeCategory(value: string): string {
  return slugify(value || 'general');
}

export function deriveCategoryFromPath(docPath: string): string {
  const normalized = String(docPath || '').trim().replace(/^docs\//, '');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length > 1) return normalizeCategory(parts[0]!);
  return 'general';
}

export function displayCategory(category: string): string {
  const normalized = normalizeCategory(category);
  const predefined: Record<string, string> = {
    role: 'Role',
    repos: 'Repos',
    domain: 'Domain',
    workflows: 'Workflows',
    conventions: 'Conventions',
    infra: 'Infra',
    verification: 'Verification',
    general: 'General',
  };
  return predefined[normalized] || normalized.split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ');
}

export function parseIndexEntries(indexContent: string): Array<{ id: string; title: string; label: string; category: string; path: string }> {
  let currentCategory = 'general';
  let pendingLabel: string | null = null; // legacy: label before indented path
  let currentPath: string | null = null;  // new: path before indented labels
  const entries: Array<{ id: string; title: string; label: string; category: string; path: string }> = [];

  for (const rawLine of String(indexContent || '').split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      pendingLabel = null;
      currentPath = null;
      continue;
    }

    const heading = trimmed.match(/^##\s+(.+)$/);
    if (heading) {
      currentCategory = normalizeCategory(heading[1] || 'general');
      pendingLabel = null;
      currentPath = null;
      continue;
    }

    if (trimmed.startsWith('- gc-branch:') || trimmed.startsWith('- summary:') || trimmed === '- No source docs yet.') {
      pendingLabel = null;
      currentPath = null;
      continue;
    }

    const isIndented = /^\s{2,}/.test(rawLine);
    const itemText = trimmed.replace(/^-\s*/, '');

    if (!isIndented) {
      // Top-level list item
      if (itemText.startsWith('docs/')) {
        // New format: path is top-level
        currentPath = itemText;
        pendingLabel = null;
      } else {
        // Legacy format: label is top-level
        pendingLabel = itemText;
        currentPath = null;
      }
      continue;
    }

    // Indented item
    if (currentPath && !itemText.startsWith('docs/')) {
      // New format: keyword under path
      const category = deriveCategoryFromPath(currentPath) || currentCategory;
      entries.push({ id: docIdFromPath(currentPath), title: itemText, label: itemText, category, path: currentPath });
    } else if (pendingLabel && itemText.startsWith('docs/')) {
      // Legacy format: path under label
      const category = deriveCategoryFromPath(itemText) || currentCategory;
      entries.push({ id: docIdFromPath(itemText), title: pendingLabel, label: pendingLabel, category, path: itemText });
    }
  }

  return entries;
}

export function extractIndexEntries(markdown: string): string[] {
  const match = String(markdown || '').match(/## Index Entries\s+([\s\S]*?)(?:\n## |$)/);
  if (!match?.[1]) return [];
  return match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

export function normalizeIndexEntry(
  value: string,
  fallback: { category: string; label: string },
): { category: string; label: string } | null {
  const reference = parseDocReference(value);
  if (reference) {
    return {
      category: reference.category,
      label: reference.label,
    };
  }

  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  if (/^docs\/index\.md$/i.test(trimmed) || /^index\.md$/i.test(trimmed)) return null;

  const titlePlacement = parseTitlePlacement(trimmed);
  if (titlePlacement) {
    if (titlePlacement.category === 'index') return null;
    return {
      category: titlePlacement.category,
      label: titlePlacement.label,
    };
  }

  return {
    category: fallback.category,
    label: trimmed,
  };
}

export function inferDocPlacement(input: {
  slug?: string;
  indexLabel?: string;
  title: string;
  category?: string;
}): { category: string | null; slug: string; label: string; isIndexDoc: boolean } {
  for (const candidate of [input.slug, input.indexLabel]) {
    const reference = parseDocReference(candidate || '');
    if (reference) {
      return { category: reference.category, slug: reference.slug, label: reference.label, isIndexDoc: false };
    }
  }

  const titlePlacement = parseTitlePlacement(input.title);
  const explicitLabel = String(input.indexLabel || '').trim();
  const preferredLabel = explicitLabel && !parseDocReference(explicitLabel) ? explicitLabel : input.title.trim();
  if (titlePlacement) {
    return {
      category: titlePlacement.category === 'index' ? null : titlePlacement.category,
      slug: titlePlacement.slug,
      label: explicitLabel && !parseDocReference(explicitLabel) ? explicitLabel : titlePlacement.label,
      isIndexDoc: titlePlacement.category === 'index',
    };
  }

  const explicitCategory = input.category ? slugify(input.category) : null;
  const slug = slugify(input.slug || input.indexLabel || input.title);
  return {
    category: explicitCategory,
    slug,
    label: preferredLabel,
    isIndexDoc: slug === 'index' && explicitCategory === null,
  };
}

export function extractSummary(markdown: string): string {
  const match = String(markdown || '').match(/## Summary\s+([\s\S]*?)(?:\n## |$)/);
  return match?.[1]?.trim() || '';
}

export function extractTitle(markdown: string): string {
  const match = String(markdown || '').match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || '';
}

export function extractExcerpt(markdown: string, query: string): string {
  const content = String(markdown || '')
    .replace(/^#+\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!content) return '';
  const tokens = String(query || '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .flatMap((t) => t.split(/(?<=[a-z0-9])(?=[^\x00-\x7f])|(?<=[^\x00-\x7f])(?=[a-z0-9])/))
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return content.slice(0, 180);

  const chunks = content
    .split(/(?<=[.!?。！？])\s+|\s+-\s+|(?=\b[A-Z][A-Za-z ]+:)/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const scored = chunks
    .map((chunk, index) => ({
      chunk,
      index,
      score: tokens.reduce((sum, token) => sum + (chunk.toLowerCase().includes(token) ? 1 : 0), 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const best = scored[0]?.chunk || content;
  return best.length > 220 ? `${best.slice(0, 217).trim()}...` : best;
}
