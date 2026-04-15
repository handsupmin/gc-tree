import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { settingsPath } from './paths.js';
import type { GcTreeProvider, GcTreeSettings } from './types.js';

export async function readSettings(home: string): Promise<GcTreeSettings | null> {
  try {
    const raw = await readFile(settingsPath(home), 'utf8');
    return JSON.parse(raw) as GcTreeSettings;
  } catch {
    return null;
  }
}

export async function writeSettings(home: string, preferredProvider: GcTreeProvider): Promise<GcTreeSettings> {
  await mkdir(home, { recursive: true });
  const settings: GcTreeSettings = {
    version: 1,
    preferred_provider: preferredProvider,
    updated_at: new Date().toISOString(),
  };
  await writeFile(settingsPath(home), `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  return settings;
}

export async function requirePreferredProvider(home: string): Promise<GcTreeProvider> {
  const settings = await readSettings(home);
  if (!settings?.preferred_provider) {
    throw new Error('preferred provider is not configured. Run `gctree init` first.');
  }
  return settings.preferred_provider;
}
