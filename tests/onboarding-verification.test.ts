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

test('verify-onboarding reports incomplete when branch has no docs', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-verify-home-'));
  try {
    let result = await runCli(['init', '--home', home, '--provider', 'codex', '--no-launch']);
    assert.equal(result.code, 0, result.stderr);

    result = await runCli(['verify-onboarding', '--home', home]);
    assert.equal(result.code, 0, result.stderr);

    const parsed = JSON.parse(result.stdout) as { status: string; doc_count: number; indexed_doc_count: number };
    assert.equal(parsed.status, 'incomplete');
    assert.equal(parsed.doc_count, 0);
    assert.equal(parsed.indexed_doc_count, 0);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('verify-onboarding reports complete and lists saved docs after apply-onboarding', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-verify-home-'));
  const inputDir = await mkdtemp(join(tmpdir(), 'gctree-verify-input-'));
  try {
    let result = await runCli(['init', '--home', home, '--provider', 'codex', '--no-launch']);
    assert.equal(result.code, 0, result.stderr);

    const inputPath = join(inputDir, 'onboard.json');
    await writeFile(
      inputPath,
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

    result = await runCli(['__apply-onboarding', '--home', home, '--input', inputPath]);
    assert.equal(result.code, 0, result.stderr);

    result = await runCli(['verify-onboarding', '--home', home]);
    assert.equal(result.code, 0, result.stderr);

    const parsed = JSON.parse(result.stdout) as {
      status: string;
      doc_count: number;
      indexed_doc_count: number;
      docs: Array<{ title: string; path: string }>;
    };
    assert.equal(parsed.status, 'complete');
    assert.equal(parsed.doc_count, 1);
    assert.equal(parsed.indexed_doc_count, 1);
    assert.equal(parsed.docs[0]?.title, 'Project Identity');
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(inputDir, { recursive: true, force: true });
  }
});

test('verify-onboarding catches branches with docs present but empty index links', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-verify-home-'));
  const inputDir = await mkdtemp(join(tmpdir(), 'gctree-verify-input-'));
  try {
    let result = await runCli(['init', '--home', home, '--provider', 'codex', '--no-launch']);
    assert.equal(result.code, 0, result.stderr);

    const inputPath = join(inputDir, 'onboard.json');
    await writeFile(
      inputPath,
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

    result = await runCli(['__apply-onboarding', '--home', home, '--input', inputPath]);
    assert.equal(result.code, 0, result.stderr);

    const indexPath = join(home, 'branches', 'main', 'index.md');
    await writeFile(indexPath, '# gc-tree Index\n\n- gc-branch: main\n- summary: broken\n\n- No source docs yet.\n', 'utf8');

    result = await runCli(['verify-onboarding', '--home', home]);
    assert.equal(result.code, 0, result.stderr);

    const parsed = JSON.parse(result.stdout) as { status: string; doc_count: number; indexed_doc_count: number };
    assert.equal(parsed.status, 'incomplete');
    assert.equal(parsed.doc_count, 1);
    assert.equal(parsed.indexed_doc_count, 0);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(inputDir, { recursive: true, force: true });
  }
});

test('verify-onboarding catches dictionary quality issues before completion', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-verify-home-'));
  const inputDir = await mkdtemp(join(tmpdir(), 'gctree-verify-input-'));
  try {
    let result = await runCli(['init', '--home', home, '--provider', 'codex', '--no-launch']);
    assert.equal(result.code, 0, result.stderr);

    const inputPath = join(inputDir, 'onboard.json');
    await writeFile(
      inputPath,
      JSON.stringify(
        {
          branchSummary: 'Bad dictionary branch.',
          docs: [
            {
              title: 'Repo: api',
              summary: 'API repo.',
              body: 'API repo.',
            },
            {
              title: 'Workflow: feature work',
              summary: 'Feature workflow.',
              body: 'Feature workflow.',
            },
            {
              title: 'Domain: glossary',
              summary: 'Glossary.',
              body: 'Glossary.',
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

    await writeFile(
      join(home, 'branches', 'main', 'docs', 'index.md'),
      '# Index\n\n## Summary\n\nDuplicate index doc.\n\n## Details\n\nBad.\n',
      'utf8',
    );
    await writeFile(
      join(home, 'branches', 'main', 'index.md'),
      [
        '# gc-tree Index',
        '',
        '- gc-branch: main',
        '- summary: bad',
        '',
        '## General',
        '',
        '- docs/repos/api.md',
        '  - docs/repos/api.md',
        '',
      ].join('\n'),
      'utf8',
    );

    result = await runCli(['verify-onboarding', '--home', home]);
    assert.equal(result.code, 0, result.stderr);

    const parsed = JSON.parse(result.stdout) as { status: string; quality_issues: string[] };
    assert.equal(parsed.status, 'incomplete');
    assert.equal(parsed.quality_issues.some((issue) => /docs\/index\.md/i.test(issue)), true);
    assert.equal(parsed.quality_issues.some((issue) => /search terms, not paths/i.test(issue)), true);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(inputDir, { recursive: true, force: true });
  }
});
