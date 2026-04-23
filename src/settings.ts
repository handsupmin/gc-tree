import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { settingsPath } from './paths.js';
import type { GcTreeProvider, GcTreeProviderMode, GcTreeSettings, ScaffoldedHostRecord } from './types.js';

export async function readSettings(home: string): Promise<GcTreeSettings | null> {
  try {
    const raw = await readFile(settingsPath(home), 'utf8');
    return JSON.parse(raw) as GcTreeSettings;
  } catch {
    return null;
  }
}

export async function writeSettings({
  home,
  providerMode,
  preferredProvider,
  preferredLanguage,
}: {
  home: string;
  providerMode: GcTreeProviderMode;
  preferredProvider: GcTreeProvider;
  preferredLanguage: string;
}): Promise<GcTreeSettings> {
  await mkdir(home, { recursive: true });
  const settings: GcTreeSettings = {
    version: 1,
    provider_mode: providerMode,
    preferred_provider: preferredProvider,
    preferred_language: preferredLanguage.trim() || 'English',
    updated_at: new Date().toISOString(),
  };
  await writeFile(settingsPath(home), `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  return settings;
}

export async function appendScaffoldedHost(
  home: string,
  record: Omit<ScaffoldedHostRecord, 'scaffolded_at'>,
): Promise<void> {
  const settings = await readSettings(home);
  if (!settings) return;
  const existing = settings.scaffolded_hosts || [];
  const filtered = existing.filter(
    (h) => !(h.host === record.host && h.scope === record.scope && h.target_dir === record.target_dir),
  );
  filtered.push({ ...record, scaffolded_at: new Date().toISOString() });
  const updated: GcTreeSettings = { ...settings, scaffolded_hosts: filtered, updated_at: new Date().toISOString() };
  await mkdir(home, { recursive: true });
  await writeFile(settingsPath(home), `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
}

export async function requirePreferredProvider(home: string): Promise<GcTreeProvider> {
  const settings = await readSettings(home);
  if (!settings?.preferred_provider) {
    throw new Error('preferred provider is not configured. Run `gctree init` first.');
  }
  return settings.preferred_provider;
}
