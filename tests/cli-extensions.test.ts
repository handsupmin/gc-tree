import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

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

test('init persists the preferred provider, creates main gc-branch, and prepares guided onboarding', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-cli-home-'));
  const targetDir = await mkdtemp(join(tmpdir(), 'gctree-cli-target-'));

  try {
    const result = await runCli(['init', '--home', home, '--provider', 'codex', '--target', targetDir]);
    assert.equal(result.code, 0, result.stderr);

    const parsed = JSON.parse(result.stdout) as {
      gc_branch: string;
      provider_mode: string;
      preferred_provider: string;
      preferred_language: string;
      launch: { provider_command: string; launched: boolean; preferred_language: string; args: string[] };
      scaffold: { written: string[]; hosts: string };
    };
    assert.equal(parsed.gc_branch, 'main');
    assert.equal(parsed.provider_mode, 'codex');
    assert.equal(parsed.preferred_provider, 'codex');
    assert.equal(parsed.preferred_language, 'English');
    assert.equal(parsed.launch.provider_command, '$gc-onboard');
    assert.equal(parsed.launch.preferred_language, 'English');
    assert.match(parsed.launch.args[0]!, /Use English for every message/i);
    assert.equal(parsed.launch.launched, false);
    assert.equal(parsed.scaffold.hosts, 'codex');
    assert.equal(parsed.scaffold.written.length, 5);

    const settings = JSON.parse(await readFile(join(home, 'settings.json'), 'utf8')) as {
      provider_mode: string;
      preferred_provider: string;
      preferred_language: string;
    };
    assert.equal(settings.provider_mode, 'codex');
    assert.equal(settings.preferred_provider, 'codex');
    assert.equal(settings.preferred_language, 'English');
    assert.match(await readFile(join(targetDir, 'AGENTS.md'), 'utf8'), /gc-branch/i);
    assert.match(await readFile(join(targetDir, '.codex', 'skills', 'gc-onboard', 'SKILL.md'), 'utf8'), /active gc-branch/i);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
  }
});

test('init supports provider mode both, scaffolds both runtimes, and stores preferred language', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-cli-home-'));
  const targetDir = await mkdtemp(join(tmpdir(), 'gctree-cli-target-'));

  try {
    const result = await runCli(['init', '--home', home, '--provider', 'both', '--language', 'Korean', '--target', targetDir]);
    assert.equal(result.code, 0, result.stderr);

    const parsed = JSON.parse(result.stdout) as {
      provider_mode: string;
      preferred_provider: string;
      preferred_language: string;
      launch: { provider_command: string; preferred_language: string; args: string[] };
      scaffold: { written: string[]; hosts: string };
    };
    assert.equal(parsed.provider_mode, 'both');
    assert.equal(parsed.preferred_provider, 'claude-code');
    assert.equal(parsed.preferred_language, 'Korean');
    assert.equal(parsed.launch.provider_command, '/gc-onboard');
    assert.equal(parsed.launch.preferred_language, 'Korean');
    assert.match(parsed.launch.args[0]!, /Use Korean for every message/i);
    assert.equal(parsed.scaffold.hosts, 'both');
    assert.equal(parsed.scaffold.written.length, 10);

    const settings = JSON.parse(await readFile(join(home, 'settings.json'), 'utf8')) as {
      provider_mode: string;
      preferred_provider: string;
      preferred_language: string;
    };
    assert.equal(settings.provider_mode, 'both');
    assert.equal(settings.preferred_provider, 'claude-code');
    assert.equal(settings.preferred_language, 'Korean');
    assert.match(await readFile(join(targetDir, 'AGENTS.md'), 'utf8'), /gc-branch/i);
    assert.match(await readFile(join(targetDir, 'CLAUDE.md'), 'utf8'), /gc-branch/i);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
  }
});

test('guided onboard only works for an empty gc-branch and __apply-onboarding writes docs', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-cli-home-'));
  const targetDir = await mkdtemp(join(tmpdir(), 'gctree-cli-target-'));
  const inputDir = await mkdtemp(join(tmpdir(), 'gctree-cli-input-'));

  try {
    let result = await runCli(['init', '--home', home, '--provider', 'codex', '--target', targetDir]);
    assert.equal(result.code, 0, result.stderr);

    result = await runCli(['onboard', '--home', home, '--target', targetDir]);
    assert.equal(result.code, 0, result.stderr);
    const guided = JSON.parse(result.stdout) as {
      mode: string;
      gc_branch: string;
      launch: { provider_command: string };
    };
    assert.equal(guided.mode, 'guided_onboarding');
    assert.equal(guided.gc_branch, 'main');
    assert.equal(guided.launch.provider_command, '$gc-onboard');

    await writeFile(
      join(inputDir, 'onboard.json'),
      JSON.stringify(
        {
          branchSummary: 'Main gc-branch.',
          docs: [
            {
              title: 'Project Identity',
              summary: 'CLI-first auth-heavy tool.',
              body: 'Auth policy matters most.',
            },
          ],
        },
        null,
        2,
      ),
      'utf8',
    );

    result = await runCli(['__apply-onboarding', '--home', home, '--input', join(inputDir, 'onboard.json')]);
    assert.equal(result.code, 0, result.stderr);
    const applied = JSON.parse(result.stdout) as { gc_branch: string };
    assert.equal(applied.gc_branch, 'main');

    result = await runCli(['onboard', '--home', home, '--target', targetDir]);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /reset-gc-branch/i);
    assert.match(result.stderr, /update-global-context/i);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
    await rm(inputDir, { recursive: true, force: true });
  }
});


test('init skips auto-onboarding when main gc-branch already has context', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-cli-home-'));
  const targetDir = await mkdtemp(join(tmpdir(), 'gctree-cli-target-'));
  const inputDir = await mkdtemp(join(tmpdir(), 'gctree-cli-input-'));

  try {
    let result = await runCli(['init', '--home', home, '--provider', 'codex', '--target', targetDir]);
    assert.equal(result.code, 0, result.stderr);

    await writeFile(
      join(inputDir, 'onboard.json'),
      JSON.stringify({ branchSummary: 'Main gc-branch.', docs: [{ title: 'Project Identity', summary: 'CLI-first auth-heavy tool.', body: 'Auth policy matters most.' }] }, null, 2),
      'utf8',
    );
    result = await runCli(['__apply-onboarding', '--home', home, '--input', join(inputDir, 'onboard.json')]);
    assert.equal(result.code, 0, result.stderr);

    result = await runCli(['init', '--home', home, '--provider', 'codex', '--target', targetDir]);
    assert.equal(result.code, 0, result.stderr);
    const parsed = JSON.parse(result.stdout) as { launch: null | object };
    assert.equal(parsed.launch, null);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
    await rm(inputDir, { recursive: true, force: true });
  }
});
test('reset-gc-branch clears docs and allows guided onboarding again', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-cli-home-'));
  const targetDir = await mkdtemp(join(tmpdir(), 'gctree-cli-target-'));
  const inputDir = await mkdtemp(join(tmpdir(), 'gctree-cli-input-'));

  try {
    let result = await runCli(['init', '--home', home, '--provider', 'claude-code', '--target', targetDir]);
    assert.equal(result.code, 0, result.stderr);

    await writeFile(
      join(inputDir, 'onboard.json'),
      JSON.stringify(
        {
          branchSummary: 'Main gc-branch.',
          docs: [
            {
              title: 'Project Identity',
              summary: 'CLI-first auth-heavy tool.',
              body: 'Auth policy matters most.',
            },
          ],
        },
        null,
        2,
      ),
      'utf8',
    );

    result = await runCli(['__apply-onboarding', '--home', home, '--input', join(inputDir, 'onboard.json')]);
    assert.equal(result.code, 0, result.stderr);

    result = await runCli(['reset-gc-branch', '--home', home, '--yes']);
    assert.equal(result.code, 0, result.stderr);
    const reset = JSON.parse(result.stdout) as { gc_branch: string; reset: boolean };
    assert.equal(reset.gc_branch, 'main');
    assert.equal(reset.reset, true);

    result = await runCli(['onboard', '--home', home, '--target', targetDir]);
    assert.equal(result.code, 0, result.stderr);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
    await rm(inputDir, { recursive: true, force: true });
  }
});

test('update-global-context and its aliases share the same guided update behavior', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-cli-home-'));
  const targetDir = await mkdtemp(join(tmpdir(), 'gctree-cli-target-'));
  const inputDir = await mkdtemp(join(tmpdir(), 'gctree-cli-input-'));

  try {
    let result = await runCli(['init', '--home', home, '--provider', 'codex', '--target', targetDir]);
    assert.equal(result.code, 0, result.stderr);

    await writeFile(
      join(inputDir, 'onboard.json'),
      JSON.stringify(
        {
          branchSummary: 'Main gc-branch.',
          docs: [
            {
              title: 'Project Identity',
              summary: 'CLI-first auth-heavy tool.',
              body: 'Auth policy matters most.',
            },
          ],
        },
        null,
        2,
      ),
      'utf8',
    );
    result = await runCli(['__apply-onboarding', '--home', home, '--input', join(inputDir, 'onboard.json')]);
    assert.equal(result.code, 0, result.stderr);

    for (const alias of ['update-global-context', 'update-gc', 'ugc']) {
      result = await runCli([alias, '--home', home, '--target', targetDir]);
      assert.equal(result.code, 0, `${alias}: ${result.stderr}`);
      const parsed = JSON.parse(result.stdout) as {
        mode: string;
        gc_branch: string;
        launch: { provider_command: string };
      };
      assert.equal(parsed.mode, 'guided_update');
      assert.equal(parsed.gc_branch, 'main');
      assert.equal(parsed.launch.provider_command, '$gc-update-global-context');
    }
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
    await rm(inputDir, { recursive: true, force: true });
  }
});


test('update-global-context refuses to run on an empty gc-branch', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-cli-home-'));
  const targetDir = await mkdtemp(join(tmpdir(), 'gctree-cli-target-'));

  try {
    let result = await runCli(['init', '--home', home, '--provider', 'codex', '--target', targetDir]);
    assert.equal(result.code, 0, result.stderr);

    result = await runCli(['update-global-context', '--home', home, '--target', targetDir]);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /gc-branch is empty/i);
    assert.match(result.stderr, /gctree onboard/i);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
  }
});
test('scaffold writes provider-specific gc command files and gc-branch wording', async () => {
  const codexTarget = await mkdtemp(join(tmpdir(), 'gctree-codex-target-'));
  const claudeTarget = await mkdtemp(join(tmpdir(), 'gctree-claude-target-'));

  try {
    let result = await runCli(['scaffold', '--host', 'codex', '--target', codexTarget]);
    assert.equal(result.code, 0, result.stderr);
    let parsed = JSON.parse(result.stdout) as { written: string[] };
    assert.equal(parsed.written.length, 5);
    assert.match(await readFile(join(codexTarget, '.codex', 'skills', 'gc-onboard', 'SKILL.md'), 'utf8'), /gc-branch/i);
    assert.match(await readFile(join(codexTarget, '.codex', 'skills', 'gc-update-global-context', 'SKILL.md'), 'utf8'), /__apply-update/i);

    result = await runCli(['scaffold', '--host', 'claude-code', '--target', claudeTarget]);
    assert.equal(result.code, 0, result.stderr);
    parsed = JSON.parse(result.stdout) as { written: string[] };
    assert.equal(parsed.written.length, 5);
    assert.match(await readFile(join(claudeTarget, 'CLAUDE.md'), 'utf8'), /gc-branch/i);
    assert.match(await readFile(join(claudeTarget, '.claude', 'commands', 'gc-onboard.md'), 'utf8'), /gc-branch/i);
    assert.match(await readFile(join(claudeTarget, '.claude', 'hooks', 'gctree-session-start.md'), 'utf8'), /gc-branch/i);
  } finally {
    await rm(codexTarget, { recursive: true, force: true });
    await rm(claudeTarget, { recursive: true, force: true });
  }
});

test('removed proposal commands are no longer available', async () => {
  for (const command of ['propose-update', 'apply-update', 'proposals']) {
    const result = await runCli([command]);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /Usage:/);
  }
});
