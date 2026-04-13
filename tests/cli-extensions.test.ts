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

test('update-global-context creates a proposal by default and requires approval to apply', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-cli-home-'));
  const inputDir = await mkdtemp(join(tmpdir(), 'gctree-cli-input-'));

  try {
    let result = await runCli(['init', '--home', home]);
    assert.equal(result.code, 0, result.stderr);

    await writeFile(
      join(inputDir, 'onboard.json'),
      JSON.stringify(
        {
          branchSummary: 'Main branch.',
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
    result = await runCli(['onboard', '--home', home, '--input', join(inputDir, 'onboard.json')]);
    assert.equal(result.code, 0, result.stderr);

    await writeFile(
      join(inputDir, 'proposal.json'),
      JSON.stringify(
        {
          title: 'Clarify identity',
          summary: 'Expand project identity wording.',
          docs: [
            {
              title: 'Project Identity',
              slug: 'project-identity',
              summary: 'CLI-first auth-heavy tool with session continuity focus.',
              body: 'Auth policy matters most. Session continuity matters too.',
            },
          ],
        },
        null,
        2,
      ),
      'utf8',
    );

    result = await runCli([
      'update-global-context',
      '--home',
      home,
      '--input',
      join(inputDir, 'proposal.json'),
    ]);
    assert.equal(result.code, 0, result.stderr);
    const proposalOnly = JSON.parse(result.stdout) as {
      approval_required: boolean;
      proposal_path: string;
      next_command: string;
    };
    assert.equal(proposalOnly.approval_required, true);
    assert.match(proposalOnly.next_command, /apply-update/);

    const docBefore = await readFile(
      join(home, 'branches', 'main', 'docs', 'project-identity.md'),
      'utf8',
    );
    assert.doesNotMatch(docBefore, /session continuity focus/i);

    result = await runCli([
      'update-global-context',
      '--home',
      home,
      '--input',
      join(inputDir, 'proposal.json'),
      '--yes',
    ]);
    assert.equal(result.code, 0, result.stderr);
    const applied = JSON.parse(result.stdout) as { mode: string; applied: { branch: string } };
    assert.equal(applied.mode, 'proposed_and_applied');
    assert.equal(applied.applied.branch, 'main');

    const docAfter = await readFile(
      join(home, 'branches', 'main', 'docs', 'project-identity.md'),
      'utf8',
    );
    assert.match(docAfter, /session continuity focus/i);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(inputDir, { recursive: true, force: true });
  }
});

test('scaffold writes host-specific Codex and Claude Code integration files', async () => {
  const codexTarget = await mkdtemp(join(tmpdir(), 'gctree-codex-target-'));
  const claudeTarget = await mkdtemp(join(tmpdir(), 'gctree-claude-target-'));

  try {
    let result = await runCli(['scaffold', '--host', 'codex', '--target', codexTarget]);
    assert.equal(result.code, 0, result.stderr);
    let parsed = JSON.parse(result.stdout) as { written: string[] };
    assert.equal(parsed.written.length, 4);
    assert.match(
      await readFile(join(codexTarget, 'AGENTS.gctree.md'), 'utf8'),
      /resolve reusable global context/i,
    );
    assert.match(
      await readFile(join(codexTarget, '.codex', 'skills', 'gctree-update-global-context', 'SKILL.md'), 'utf8'),
      /proposal-first/i,
    );

    result = await runCli(['scaffold', '--host', 'claude-code', '--target', claudeTarget]);
    assert.equal(result.code, 0, result.stderr);
    parsed = JSON.parse(result.stdout) as { written: string[] };
    assert.equal(parsed.written.length, 3);
    assert.match(
      await readFile(join(claudeTarget, 'CLAUDE.gctree.md'), 'utf8'),
      /gctree resolve/i,
    );
    assert.match(
      await readFile(join(claudeTarget, '.claude', 'commands', 'gctree-update-global-context.md'), 'utf8'),
      /explicit approval/i,
    );
  } finally {
    await rm(codexTarget, { recursive: true, force: true });
    await rm(claudeTarget, { recursive: true, force: true });
  }
});

test('scaffold refuses to overwrite existing files without --force', async () => {
  const codexTarget = await mkdtemp(join(tmpdir(), 'gctree-codex-force-'));

  try {
    let result = await runCli(['scaffold', '--host', 'codex', '--target', codexTarget]);
    assert.equal(result.code, 0, result.stderr);

    result = await runCli(['scaffold', '--host', 'codex', '--target', codexTarget]);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /refusing to overwrite/i);

    result = await runCli(['scaffold', '--host', 'codex', '--target', codexTarget, '--force']);
    assert.equal(result.code, 0, result.stderr);
  } finally {
    await rm(codexTarget, { recursive: true, force: true });
  }
});
