import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

function globalEnvForArgs(args: string[]): Record<string, string> {
  const homeIndex = args.indexOf('--home');
  if (homeIndex === -1 || !args[homeIndex + 1]) return {};
  const home = args[homeIndex + 1]!;
  return {
    GCTREE_CODEX_GLOBAL_DIR: join(home, 'global-codex'),
    GCTREE_CLAUDE_GLOBAL_DIR: join(home, 'global-claude'),
  };
}

async function runCli(args: string[], cwd = REPO_ROOT): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/cli.ts', ...args], {
      cwd,
      env: {
        ...process.env,
        GCTREE_DISABLE_PROVIDER_LAUNCH: '1',
        ...globalEnvForArgs(args),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

test('resolve returns explicit empty_branch status when the gc-branch has no docs', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-cli-resolve-'));

  try {
    let result = await runCli(['init', '--home', home, '--provider', 'codex', '--no-launch']);
    assert.equal(result.code, 0, result.stderr);

    result = await runCli(['resolve', '--home', home, '--query', 'auth token rotation']);
    assert.equal(result.code, 0, result.stderr);

    const parsed = JSON.parse(result.stdout) as { status: string; matches: object[] };
    assert.equal(parsed.status, 'empty_branch');
    assert.equal(parsed.matches.length, 0);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('show-doc returns a full document payload by stable match id', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-cli-show-doc-'));

  try {
    let result = await runCli(['init', '--home', home, '--provider', 'codex', '--no-launch']);
    assert.equal(result.code, 0, result.stderr);

    const inputPath = join(home, 'onboard.json');
    await writeFile(
      inputPath,
      JSON.stringify(
        {
          branchSummary: 'Main branch summary',
          docs: [
            {
              title: 'Project Identity',
              summary: 'Auth-heavy CLI.',
              body: 'Token rotation policy matters.',
            },
            {
              title: 'Domain Glossary',
              summary: 'Token rotation is part of the glossary.',
              body: 'Auth policy and session continuity.',
            },
          ],
        },
        null,
        2,
      ),
      'utf8',
    );

    result = await runCli(['__apply-onboarding', '--home', home, '--input', inputPath]);
    assert.equal(result.code, 0, result.stderr);

    result = await runCli(['show-doc', '--home', home, '--id', 'project-identity']);
    assert.equal(result.code, 0, result.stderr);

    const parsed = JSON.parse(result.stdout) as { status: string; doc?: { id: string; content: string } };
    assert.equal(parsed.status, 'matched');
    assert.equal(parsed.doc?.id, 'project-identity');
    assert.match(parsed.doc?.content || '', /Token rotation policy matters/);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('related returns explicit supporting docs for a selected match id', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-cli-related-'));

  try {
    let result = await runCli(['init', '--home', home, '--provider', 'codex', '--no-launch']);
    assert.equal(result.code, 0, result.stderr);

    const inputPath = join(home, 'onboard.json');
    await writeFile(
      inputPath,
      JSON.stringify(
        {
          branchSummary: 'Main branch summary',
          docs: [
            {
              title: 'Project Identity',
              summary: 'Auth-heavy CLI.',
              body: 'Token rotation policy matters.',
            },
            {
              title: 'Domain Glossary',
              summary: 'Token rotation is part of the glossary.',
              body: 'Auth policy and session continuity.',
            },
          ],
        },
        null,
        2,
      ),
      'utf8',
    );

    result = await runCli(['__apply-onboarding', '--home', home, '--input', inputPath]);
    assert.equal(result.code, 0, result.stderr);

    result = await runCli(['related', '--home', home, '--id', 'project-identity']);
    assert.equal(result.code, 0, result.stderr);

    const parsed = JSON.parse(result.stdout) as { status: string; matches: Array<{ id: string }> };
    assert.equal(parsed.status, 'matched');
    assert.equal(parsed.matches[0]?.id, 'domain-glossary');
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('readSettings self-heals temporary scaffolded host records before later commands', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-cli-related-'));
  const tempTarget = await mkdtemp(join(tmpdir(), 'gctree-codex-target-'));

  try {
    let result = await runCli(['init', '--home', home, '--provider', 'codex', '--no-launch']);
    assert.equal(result.code, 0, result.stderr);

    const settingsPath = join(home, 'settings.json');
    const settings = JSON.parse(await readFile(settingsPath, 'utf8')) as any;
    settings.scaffolded_hosts = [
      { host: 'codex', scope: 'global', scaffolded_at: '2026-01-01T00:00:00.000Z' },
      { host: 'codex', scope: 'local', target_dir: tempTarget, scaffolded_at: '2026-01-01T00:00:00.000Z' },
    ];
    await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');

    result = await runCli(['status', '--home', home]);
    assert.equal(result.code, 0, result.stderr);

    const next = JSON.parse(await readFile(settingsPath, 'utf8')) as any;
    assert.equal(next.scaffolded_hosts.some((record: any) => record.scope === 'local'), false);
    assert.equal(next.scaffolded_hosts.some((record: any) => record.scope === 'global'), true);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(tempTarget, { recursive: true, force: true });
  }
});
