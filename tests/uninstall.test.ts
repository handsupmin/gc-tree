import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function runCli(args: string[], cwd = REPO_ROOT): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/cli.ts', ...args], {
      cwd,
      env: {
        ...process.env,
        GCTREE_DISABLE_PROVIDER_LAUNCH: '1',
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

test('uninstall removes both scaffold files and gc-tree home state', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-uninstall-home-'));
  const targetDir = await mkdtemp(join(tmpdir(), 'gctree-uninstall-target-'));

  try {
    let result = await runCli(['init', '--home', home, '--provider', 'both', '--target', targetDir, '--no-launch']);
    assert.equal(result.code, 0, result.stderr);

    assert.equal(await exists(join(targetDir, 'AGENTS.md')), true);
    assert.equal(await exists(join(targetDir, 'CLAUDE.md')), true);
    assert.equal(await exists(join(targetDir, '.codex', 'hooks.json')), true);
    assert.equal(await exists(join(targetDir, '.claude', 'hooks', 'hooks.json')), true);
    assert.equal(await exists(home), true);

    result = await runCli(['uninstall', '--home', home, '--target', targetDir, '--host', 'both', '--yes']);
    assert.equal(result.code, 0, result.stderr);

    const parsed = JSON.parse(result.stdout) as {
      home_removed: boolean;
      removed: string[];
    };
    assert.equal(parsed.home_removed, true);
    assert.equal(parsed.removed.some((entry) => entry.endsWith('AGENTS.md')), true);
    assert.equal(await exists(join(targetDir, 'AGENTS.md')), false);
    assert.equal(await exists(join(targetDir, 'CLAUDE.md')), false);
    assert.equal(await exists(join(targetDir, '.codex', 'hooks.json')), false);
    assert.equal(await exists(join(targetDir, '.claude', 'hooks', 'hooks.json')), false);
    assert.equal(await exists(home), false);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
  }
});

test('init/scaffold merges gctree hook entries without overwriting unrelated hooks', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-uninstall-home-'));
  const targetDir = await mkdtemp(join(tmpdir(), 'gctree-uninstall-target-'));

  try {
    await mkdir(join(targetDir, '.codex'), { recursive: true });
    await mkdir(join(targetDir, '.claude', 'hooks'), { recursive: true });
    await writeFile(
      join(targetDir, '.codex', 'hooks.json'),
      JSON.stringify(
        {
          hooks: {
            SessionStart: [
              {
                matcher: 'startup|resume',
                hooks: [{ type: 'command', command: 'other-tool session-start' }],
              },
            ],
          },
        },
        null,
        2,
      ),
      'utf8',
    );
    await writeFile(
      join(targetDir, '.claude', 'hooks', 'hooks.json'),
      JSON.stringify(
        {
          hooks: {
            UserPromptSubmit: [
              {
                matcher: '*',
                hooks: [{ type: 'command', command: 'other-tool prompt-submit', timeout: 3 }],
              },
            ],
          },
        },
        null,
        2,
      ),
      'utf8',
    );
    await writeFile(join(targetDir, 'AGENTS.md'), 'User content\n', 'utf8');
    await writeFile(join(targetDir, 'CLAUDE.md'), 'Project note\n', 'utf8');

    const result = await runCli(['init', '--home', home, '--provider', 'both', '--target', targetDir, '--no-launch']);
    assert.equal(result.code, 0, result.stderr);

    const codexHooks = JSON.parse(await readFile(join(targetDir, '.codex', 'hooks.json'), 'utf8')) as any;
    const claudeHooks = JSON.parse(await readFile(join(targetDir, '.claude', 'hooks', 'hooks.json'), 'utf8')) as any;
    const agents = await readFile(join(targetDir, 'AGENTS.md'), 'utf8');
    const claudeMd = await readFile(join(targetDir, 'CLAUDE.md'), 'utf8');

    assert.equal(
      codexHooks.hooks.SessionStart[0].hooks.some((entry: any) => entry.command === 'other-tool session-start'),
      true,
    );
    assert.equal(
      codexHooks.hooks.SessionStart.some((group: any) =>
        group.hooks.some((entry: any) => entry.command === 'gctree __hook --event SessionStart'),
      ),
      true,
    );
    assert.equal(
      claudeHooks.hooks.UserPromptSubmit[0].hooks.some((entry: any) => entry.command === 'other-tool prompt-submit'),
      true,
    );
    assert.equal(
      claudeHooks.hooks.UserPromptSubmit.some((group: any) =>
        group.hooks.some((entry: any) => entry.command === 'gctree __hook --event UserPromptSubmit'),
      ),
      true,
    );
    assert.match(agents, /User content/);
    assert.match(agents, /gctree:codex:start/);
    assert.match(claudeMd, /Project note/);
    assert.match(claudeMd, /gctree:claude:start/);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
  }
});

test('uninstall can keep gc-tree home while removing local scaffold files', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-uninstall-home-'));
  const targetDir = await mkdtemp(join(tmpdir(), 'gctree-uninstall-target-'));

  try {
    let result = await runCli(['init', '--home', home, '--provider', 'codex', '--target', targetDir, '--no-launch']);
    assert.equal(result.code, 0, result.stderr);

    result = await runCli(['uninstall', '--home', home, '--target', targetDir, '--host', 'codex', '--yes', '--keep-home']);
    assert.equal(result.code, 0, result.stderr);

    const parsed = JSON.parse(result.stdout) as {
      home_removed: boolean;
      removed: string[];
    };
    assert.equal(parsed.home_removed, false);
    assert.equal(await exists(home), true);
    assert.equal(await exists(join(targetDir, 'AGENTS.md')), false);
    assert.equal(await exists(join(targetDir, '.codex', 'hooks.json')), false);
    assert.equal(parsed.removed.some((entry) => entry.endsWith('.codex/hooks.json')), true);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
  }
});

test('uninstall removes only gctree-managed hook entries and markdown blocks', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-uninstall-home-'));
  const targetDir = await mkdtemp(join(tmpdir(), 'gctree-uninstall-target-'));

  try {
    await mkdir(join(targetDir, '.codex'), { recursive: true });
    await writeFile(
      join(targetDir, '.codex', 'hooks.json'),
      JSON.stringify(
        {
          hooks: {
            SessionStart: [
              {
                matcher: 'startup|resume',
                hooks: [
                  { type: 'command', command: 'other-tool session-start' },
                  { type: 'command', command: 'gctree __hook --event SessionStart', metadata: { owner: 'gctree' } },
                ],
              },
            ],
          },
        },
        null,
        2,
      ),
      'utf8',
    );
    await writeFile(
      join(targetDir, 'AGENTS.md'),
      'User content\n\n<!-- gctree:codex:start -->\nmanaged\n<!-- gctree:codex:end -->\n',
      'utf8',
    );

    const result = await runCli(['uninstall', '--home', home, '--target', targetDir, '--host', 'codex', '--yes', '--keep-home']);
    assert.equal(result.code, 0, result.stderr);

    const codexHooks = JSON.parse(await readFile(join(targetDir, '.codex', 'hooks.json'), 'utf8')) as any;
    const agents = await readFile(join(targetDir, 'AGENTS.md'), 'utf8');

    assert.equal(
      codexHooks.hooks.SessionStart[0].hooks.some((entry: any) => entry.command === 'other-tool session-start'),
      true,
    );
    assert.equal(
      codexHooks.hooks.SessionStart[0].hooks.some((entry: any) => entry.command === 'gctree __hook --event SessionStart'),
      false,
    );
    assert.doesNotMatch(agents, /gctree:codex:start/);
    assert.match(agents, /User content/);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
  }
});

test('uninstall refuses destructive cleanup without --yes', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-uninstall-home-'));
  const targetDir = await mkdtemp(join(tmpdir(), 'gctree-uninstall-target-'));

  try {
    const result = await runCli(['uninstall', '--home', home, '--target', targetDir]);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /destructive/i);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
  }
});
