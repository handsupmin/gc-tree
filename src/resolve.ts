import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { extractExcerpt, extractSummary, parseIndexEntries } from './markdown.js';
import { branchDir, branchIndexPath } from './paths.js';
import type { GcTreeResolveMatch } from './types.js';

function scoreText(text: string, query: string): number {
  const tokens = String(query || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);
  const haystack = String(text || '').toLowerCase();
  return tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
}

export async function resolveContext({
  home,
  branch,
  query,
}: {
  home: string;
  branch: string;
  query: string;
}): Promise<{ branch: string; query: string; matches: GcTreeResolveMatch[] }> {
  const indexRaw = await readFile(branchIndexPath(home, branch), 'utf8');
  const entries = parseIndexEntries(indexRaw);
  const matches: GcTreeResolveMatch[] = [];

  for (const entry of entries) {
    const fullPath = join(branchDir(home, branch), entry.path);
    const raw = await readFile(fullPath, 'utf8');
    const summary = extractSummary(raw);
    const combined = `${entry.title}\n${summary}\n${raw}`;
    const score = scoreText(combined, query);
    if (score <= 0) continue;
    matches.push({
      title: entry.title,
      path: entry.path,
      score,
      summary,
      excerpt: extractExcerpt(raw, query),
    });
  }

  return {
    branch,
    query,
    matches: matches.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)),
  };
}
