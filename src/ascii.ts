import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

async function readAsciiAsset(fileName: 'ascii-logo.txt' | 'ascii-tree.txt'): Promise<string> {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, '..', fileName),
    join(here, '..', '..', fileName),
  ];

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, 'utf8');
    } catch {
      continue;
    }
  }

  throw new Error(`ascii asset not found: ${fileName}`);
}

export async function readAsciiLogo(): Promise<string> {
  return readAsciiAsset('ascii-logo.txt');
}

export async function readAsciiTree(): Promise<string> {
  return readAsciiAsset('ascii-tree.txt');
}
