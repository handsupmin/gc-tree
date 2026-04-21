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
        lines.push(`- ${doc.label || doc.title} -> ${doc.path}`);
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
  return String(indexContent || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .flatMap((line) => {
      if (!line) return [];
      const heading = line.match(/^##\s+(.+)$/);
      if (heading) {
        currentCategory = normalizeCategory(heading[1] || 'general');
        return [];
      }
      if (!/^-\s+.+\s+->\s+.+$/.test(line) || line.startsWith('- gc-branch:') || line.startsWith('- summary:')) {
        return [];
      }
      const body = line.slice(2);
      const [label, path] = body.split('->').map((part) => part.trim());
      const category = deriveCategoryFromPath(path) || currentCategory;
      return [{ id: docIdFromPath(path), title: label, label, category, path }];
    });
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
