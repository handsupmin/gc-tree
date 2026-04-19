import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { extractExcerpt, extractSummary, parseIndexEntries } from './markdown.js';
import { branchDir, branchIndexPath } from './paths.js';
import type { GcTreeResolveMatch } from './types.js';

// Common English stop words that are too short or generic to be meaningful query signals.
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'as', 'is', 'it', 'its', 'be', 'was', 'are', 'were',
  'do', 'did', 'has', 'had', 'not', 'no', 'so', 'up', 'out', 'off', 'via',
  'vs', 'per', 'set', 'get', 'run', 'add', 'use', 'new', 'old', 'all', 'any',
]);

function tokenize(text: string): string[] {
  // Split on whitespace, punctuation, and symbols — preserving Unicode letters
  // and digits (including Korean, Japanese, CJK, etc.).
  return String(text || '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

function makeTokenRegex(token: string): RegExp {
  // ASCII-only token: use \b word boundary (prevents "store" → "storefront").
  // Non-ASCII token (Korean, CJK, etc.): use Unicode letter lookbehind/lookahead
  // because \b doesn't work for non-ASCII characters.
  const isAscii = /^[a-z0-9]+$/.test(token);
  return isAscii
    ? new RegExp(`\\b${token}\\b`)
    : new RegExp(`(?<!\\p{L})${token}(?!\\p{L})`, 'u');
}

function scoreText(text: string, query: string): number {
  const tokens = tokenize(query);
  if (tokens.length === 0) return 0;
  const haystack = String(text || '').toLowerCase();
  return tokens.reduce((sum, token) => {
    try {
      return sum + (makeTokenRegex(token).test(haystack) ? 1 : 0);
    } catch {
      // Regex construction failed (e.g. special chars in token) — fall back to substring
      return sum + (haystack.includes(token) ? 1 : 0);
    }
  }, 0);
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
    // Title matches count double (higher signal density)
    const titleScore = scoreText(entry.title, query);
    const bodyScore = scoreText(`${summary}\n${raw}`, query);
    const score = titleScore * 2 + bodyScore;
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
