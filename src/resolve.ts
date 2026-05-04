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
  return String(text || '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    // Split at ASCII/non-ASCII boundaries so Korean particles don't corrupt ASCII tokens
    // e.g. "fco가" → ["fco", "가"], "g3에서" → ["g3", "에서"]
    .flatMap((t) => t.split(/(?<=[a-z0-9])(?=[^\x00-\x7f])|(?<=[^\x00-\x7f])(?=[a-z0-9])/))
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

function countTokenMatches(text: string, tokens: string[]): number {
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

function scoreText(text: string, query: string): number {
  return countTokenMatches(text, tokenize(query));
}

function exactPhraseScore(text: string, query: string): number {
  const phrase = String(query || '').trim().toLowerCase();
  if (phrase.length < 4) return 0;
  return String(text || '').toLowerCase().includes(phrase) ? 6 : 0;
}

function scoreDoc(entry: GcTreeDocRecord, query: string): number {
  const tokens = tokenize(query);
  if (tokens.length === 0) return 0;

  const labelScore = countTokenMatches(entry.label, tokens) * 10;
  const titleScore = countTokenMatches(entry.title, tokens) * 7;
  const summaryScore = countTokenMatches(entry.summary, tokens) * 5;
  const categoryScore = countTokenMatches(entry.category, tokens) * 2;
  const pathScore = countTokenMatches(entry.path, tokens) * 2;
  const contentScore = countTokenMatches(entry.content, tokens);
  const phraseScore =
    exactPhraseScore(entry.label, query) +
    exactPhraseScore(entry.title, query) +
    exactPhraseScore(entry.summary, query) +
    exactPhraseScore(entry.content, query);

  return labelScore + titleScore + summaryScore + categoryScore + pathScore + contentScore + phraseScore;
}

function minimumUsefulScore(query: string): number {
  return tokenize(query).length <= 1 ? 1 : 2;
}

function labelQueryPosition(label: string, query: string): number {
  const normalizedQuery = String(query || '').toLowerCase();
  const positions = tokenize(label)
    .map((token) => normalizedQuery.indexOf(token))
    .filter((index) => index >= 0);
  return positions.length > 0 ? Math.min(...positions) : Number.MAX_SAFE_INTEGER;
}

function betterMatch(candidate: GcTreeResolveMatch, previous: GcTreeResolveMatch | undefined, query: string): boolean {
  return (
    !previous ||
    candidate.score > previous.score ||
    (candidate.score === previous.score &&
      labelQueryPosition(candidate.label, query) < labelQueryPosition(previous.label, query))
  );
}

async function readBranchDocs(home: string, branch: string): Promise<GcTreeDocRecord[]> {
  const indexRaw = await readFile(branchIndexPath(home, branch), 'utf8');
  const entries = parseIndexEntries(indexRaw);
  const contentCache = new Map<string, string>();

  return Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(branchDir(home, branch), entry.path);
      let raw = contentCache.get(fullPath);
      if (!raw) {
        raw = await readFile(fullPath, 'utf8');
        contentCache.set(fullPath, raw);
      }
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
  const matchesById = new Map<string, GcTreeResolveMatch>();
  const minScore = minimumUsefulScore(query);

  for (const entry of entries) {
    const score = scoreDoc(entry, query);
    if (score < minScore) continue;
    const match = {
      id: entry.id,
      label: entry.label,
      category: entry.category,
      title: entry.title,
      path: entry.path,
      score,
      summary: entry.summary,
      excerpt: extractExcerpt(entry.content, query),
    };
    if (betterMatch(match, matchesById.get(match.id), query)) {
      matchesById.set(match.id, match);
    }
  }

  return {
    branch,
    query,
    matches: [...matchesById.values()].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)),
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
  const matchesById = new Map<string, GcTreeResolveMatch>();
  for (const doc of docs.filter((doc) => doc.id !== selected.id)) {
    const score = scoreDoc(doc, query);
    if (score <= 0) continue;
    const match = {
      id: doc.id,
      label: doc.label,
      category: doc.category,
      title: doc.title,
      path: doc.path,
      score,
      summary: doc.summary,
      excerpt: extractExcerpt(doc.content, query),
    };
    if (betterMatch(match, matchesById.get(match.id), query)) {
      matchesById.set(match.id, match);
    }
  }
  const matches = [...matchesById.values()]
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);

  return {
    status: matches.length > 0 ? 'matched' : 'no_related_docs',
    selected,
    matches,
  };
}
