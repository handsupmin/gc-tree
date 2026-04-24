import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

import { settingsPath } from './paths.js';
import type { GcTreeProvider, GcTreeProviderMode, GcTreeSettings, ScaffoldedHostRecord } from './types.js';

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function isTemporaryScaffoldTarget(targetDir: string | undefined): boolean {
  if (!targetDir) return false;
  const normalized = resolve(targetDir);
  const tempRoot = resolve(tmpdir());
  return normalized.startsWith(tempRoot) || normalized.includes('/gctree-');
}

async function sanitizeScaffoldedHosts(records: ScaffoldedHostRecord[] | undefined): Promise<ScaffoldedHostRecord[]> {
  const input = records || [];
  const next: ScaffoldedHostRecord[] = [];

  for (const record of input) {
    if (record.scope === 'local') {
      if (!record.target_dir) continue;
      if (isTemporaryScaffoldTarget(record.target_dir)) continue;
      if (!(await pathExists(record.target_dir))) continue;
    }

    if (next.some((entry) =>
      entry.host === record.host &&
      entry.scope === record.scope &&
      entry.target_dir === record.target_dir,
    )) {
      continue;
    }

    next.push(record);
  }

  return next;
}

export async function readSettings(home: string): Promise<GcTreeSettings | null> {
  try {
    const raw = await readFile(settingsPath(home), 'utf8');
    const parsed = JSON.parse(raw) as GcTreeSettings;
    const sanitizedHosts = await sanitizeScaffoldedHosts(parsed.scaffolded_hosts);
    const hostsChanged = JSON.stringify(sanitizedHosts) !== JSON.stringify(parsed.scaffolded_hosts || []);
    const next: GcTreeSettings = hostsChanged
      ? { ...parsed, scaffolded_hosts: sanitizedHosts, updated_at: new Date().toISOString() }
      : { ...parsed, scaffolded_hosts: sanitizedHosts };
    if (hostsChanged) {
      await mkdir(home, { recursive: true });
      await writeFile(settingsPath(home), `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    }
    return next;
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
  if (record.scope === 'local' && isTemporaryScaffoldTarget(record.target_dir)) return;
  const settings = await readSettings(home);
  if (!settings) return;
  const existing = await sanitizeScaffoldedHosts(settings.scaffolded_hosts);
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
