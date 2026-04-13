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
    '## Details',
    '',
    body || '(no details yet)',
    '',
  ].join('\n');
}

export function renderIndexMarkdown(input: {
  branch: string;
  branchSummary: string;
  docs: Array<{ title: string; path: string }>;
}): string {
  const lines = [
    '# gc-tree Index',
    '',
    `- branch: ${input.branch}`,
    `- summary: ${input.branchSummary.trim()}`,
    '',
  ];

  if (input.docs.length === 0) {
    lines.push('- No source docs yet.', '');
  } else {
    for (const doc of input.docs.sort((a, b) => a.title.localeCompare(b.title))) {
      lines.push(`- ${doc.title} -> ${doc.path}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function parseIndexEntries(indexContent: string): Array<{ title: string; path: string }> {
  return String(indexContent || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^- .+ -> .+$/.test(line) && !line.startsWith('- branch:') && !line.startsWith('- summary:'))
    .map((line) => {
      const body = line.slice(2);
      const [title, path] = body.split('->').map((part) => part.trim());
      return { title, path };
    });
}

export function extractSummary(markdown: string): string {
  const match = String(markdown || '').match(/## Summary\s+([\s\S]*?)(?:\n## |$)/);
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
