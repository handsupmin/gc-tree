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

export function ensureSummary(summary: string): string {
  const trimmed = String(summary || '').trim();
  if (!trimmed) {
    throw new Error('summary is required for every source-of-truth doc');
  }
  return trimmed;
}

export function renderDocMarkdown(doc: GcTreeDocInput): string {
  const summary = ensureSummary(doc.summary);
  const body = String(doc.body || '').trim();
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
    ...(doc.indexEntries && doc.indexEntries.length > 0
      ? ['## Index Entries', '', ...doc.indexEntries.map((entry) => `- ${entry}`), '']
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
    const grouped = new Map<string, Array<{ title: string; label?: string; path: string }>>();
    for (const doc of input.docs) {
      const category = normalizeCategory(doc.category || deriveCategoryFromPath(doc.path));
      if (!grouped.has(category)) grouped.set(category, []);
      grouped.get(category)!.push(doc);
    }
    const categories = [...grouped.keys()].sort((a, b) => {
      const ai = categoryOrder.indexOf(a);
      const bi = categoryOrder.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    for (const category of categories) {
      lines.push(`## ${displayCategory(category)}`, '');
      for (const doc of grouped.get(category)!.sort((a, b) =>
        (a.label || a.title).localeCompare(b.label || b.title),
      )) {
        lines.push(`- ${doc.label || doc.title}`);
        lines.push(`  - ${doc.path}`);
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
  let pendingLabel: string | null = null;
  const entries: Array<{ id: string; title: string; label: string; category: string; path: string }> = [];

  for (const rawLine of String(indexContent || '').split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      pendingLabel = null;
      continue;
    }

    const heading = trimmed.match(/^##\s+(.+)$/);
    if (heading) {
      currentCategory = normalizeCategory(heading[1] || 'general');
      pendingLabel = null;
      continue;
    }

    if (trimmed.startsWith('- gc-branch:') || trimmed.startsWith('- summary:') || trimmed === '- No source docs yet.') {
      pendingLabel = null;
      continue;
    }

    const pathMatch = rawLine.match(/^\s{2,}-\s+(docs\/.+)$/);
    if (pathMatch && pendingLabel) {
      const path = pathMatch[1]!.trim();
      const category = deriveCategoryFromPath(path) || currentCategory;
      entries.push({
        id: docIdFromPath(path),
        title: pendingLabel,
        label: pendingLabel,
        category,
        path,
      });
      continue;
    }

    const labelMatch = trimmed.match(/^-\s+(.+)$/);
    if (labelMatch) {
      pendingLabel = labelMatch[1]!.trim();
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
}): { category: string | null; slug: string } {
  for (const candidate of [input.slug, input.indexLabel]) {
    const reference = parseDocReference(candidate || '');
    if (reference) {
      return { category: reference.category, slug: reference.slug };
    }
  }

  const explicitCategory = input.category ? slugify(input.category) : null;
  const slug = slugify(input.slug || input.indexLabel || input.title);
  return { category: explicitCategory, slug };
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
  const content = String(markdown || '').replace(/\s+/g, ' ').trim();
  if (!content) return '';
  const normalized = query.toLowerCase();
  const index = content.toLowerCase().indexOf(normalized);
  if (index === -1) return content.slice(0, 140);
  const start = Math.max(0, index - 40);
  const end = Math.min(content.length, index + normalized.length + 80);
  return content.slice(start, end).trim();
}
