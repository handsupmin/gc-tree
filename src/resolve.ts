import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { deriveCategoryFromPath, docIdFromPath, extractExcerpt, extractSummary, extractTitle, parseIndexEntries } from './markdown.js';
import { branchDir, branchIndexPath } from './paths.js';
import type { GcTreeDocRecord, GcTreeResolveMatch, GcTreeResolveStatus } from './types.js';

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

async function readBranchDocs(home: string, branch: string): Promise<GcTreeDocRecord[]> {
  const indexRaw = await readFile(branchIndexPath(home, branch), 'utf8');
  const entries = parseIndexEntries(indexRaw);
  const uniqueEntries = [...new Map(entries.map((entry) => [entry.path, entry])).values()];

  return Promise.all(
    uniqueEntries.map(async (entry) => {
      const fullPath = join(branchDir(home, branch), entry.path);
      const raw = await readFile(fullPath, 'utf8');
      return {
        id: entry.id || docIdFromPath(entry.path),
        title: extractTitle(raw) || entry.title,
        label: entry.label,
        category: entry.category || deriveCategoryFromPath(entry.path),
        path: entry.path,
        summary: extractSummary(raw),
        content: raw,
      };
    }),
  );
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
  const entries = await readBranchDocs(home, branch);
  const matches: GcTreeResolveMatch[] = [];

  for (const entry of entries) {
    const combined = `${entry.title}\n${entry.summary}\n${entry.content}`;
    // Title matches count double (higher signal density)
    const titleScore = scoreText(entry.title, query);
    const bodyScore = scoreText(`${entry.summary}\n${entry.content}`, query);
    const score = titleScore * 2 + bodyScore;
    if (score <= 0) continue;
    matches.push({
      id: entry.id,
      label: entry.label,
      category: entry.category,
      title: entry.title,
      path: entry.path,
      score,
      summary: entry.summary,
      excerpt: extractExcerpt(entry.content, query),
    });
  }

  return {
    branch,
    query,
    matches: matches.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)),
  };
}

export async function getDocById({
  home,
  branch,
  id,
}: {
  home: string;
  branch: string;
  id: string;
}): Promise<GcTreeDocRecord | null> {
  const docs = await readBranchDocs(home, branch);
  return docs.find((doc) => doc.id === id) || null;
}

export async function findRelatedDocs({
  home,
  branch,
  id,
  limit = 5,
}: {
  home: string;
  branch: string;
  id: string;
  limit?: number;
}): Promise<{ status: GcTreeResolveStatus; selected: GcTreeDocRecord | null; matches: GcTreeResolveMatch[] }> {
  const docs = await readBranchDocs(home, branch);
  if (docs.length === 0) {
    return { status: 'empty_branch', selected: null, matches: [] };
  }

  const selected = docs.find((doc) => doc.id === id) || null;
  if (!selected) {
    return { status: 'doc_not_found', selected: null, matches: [] };
  }

  const query = `${selected.title}\n${selected.summary}`;
  const matches = docs
    .filter((doc) => doc.id !== selected.id)
    .map((doc) => {
      const titleScore = scoreText(doc.title, query);
      const bodyScore = scoreText(`${doc.summary}\n${doc.content}`, query);
      const score = titleScore * 2 + bodyScore;
      return score > 0
        ? {
            id: doc.id,
            label: doc.label,
            category: doc.category,
            title: doc.title,
            path: doc.path,
            score,
            summary: doc.summary,
            excerpt: extractExcerpt(doc.content, query),
          }
        : null;
    })
    .filter((match): match is GcTreeResolveMatch => Boolean(match))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);

  return {
    status: matches.length > 0 ? 'matched' : 'no_related_docs',
    selected,
    matches,
  };
}
