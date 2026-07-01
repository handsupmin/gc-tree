import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

import { branchRepoMapPath, detectCurrentRepoId, resolveBranchForRepo, setRepoScopeForBranch } from '../src/repo-map.js';
import { checkoutBranch, initHome } from '../src/store.js';
import { onboardBranch } from '../src/onboard.js';

async function makeRepo(root: string, name: string): Promise<string> {
  const dir = join(root, name);
  await mkdir(join(dir, '.git'), { recursive: true });
  return dir;
}

async function runCli(args: string[], cwd: string, stdinText = '', extraEnv: Record<string, string> = {}) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/cli.ts', ...args], {
      cwd,
      env: {
        ...process.env,
        GCTREE_DISABLE_PROVIDER_LAUNCH: '1',
        ...extraEnv,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk.toString('utf8')));
    child.stderr.on('data', (chunk) => (stderr += chunk.toString('utf8')));
    child.on('error', reject);
    child.on('exit', (code) => resolve({ code: code ?? 1, stdout, stderr }));
    if (stdinText) child.stdin.end(stdinText);
    else child.stdin.end();
  });
}

test('resolveBranchForRepo prefers mapped gc-branch over global HEAD', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-map-home-'));
  const reposRoot = await mkdtemp(join(tmpdir(), 'gctree-map-repos-'));
  try {
    await initHome(home);
    await setRepoScopeForBranch({ home, branch: 'main', repo: 'B', mode: 'include' });
    await setRepoScopeForBranch({ home, branch: 'client-c', repo: 'C', mode: 'include' });
    const repoC = await makeRepo(reposRoot, 'C');
    const resolved = await resolveBranchForRepo({ home, head: 'main', cwd: repoC });
    assert.equal(resolved.gc_branch, 'client-c');
    assert.equal(resolved.source, 'repo-map');
    assert.equal(resolved.current_repo, 'C');
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(reposRoot, { recursive: true, force: true });
  }
});

test('resolveBranchForRepo supports duplicate includes by preferring the included HEAD branch', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-map-home-'));
  const reposRoot = await mkdtemp(join(tmpdir(), 'gctree-map-repos-'));
  try {
    await initHome(home);
    await setRepoScopeForBranch({ home, branch: 'main', repo: 'shared-repo', mode: 'include' });
    await setRepoScopeForBranch({ home, branch: 'client-b', repo: 'shared-repo', mode: 'include' });
    const repo = await makeRepo(reposRoot, 'shared-repo');

    const resolved = await resolveBranchForRepo({ home, head: 'client-b', cwd: repo });

    assert.equal(resolved.gc_branch, 'client-b');
    assert.equal(resolved.source, 'repo-map');
    assert.equal(resolved.scope_status, 'included');
    assert.equal(resolved.current_repo, 'shared-repo');
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(reposRoot, { recursive: true, force: true });
  }
});

test('detectCurrentRepoId returns the nearest git repo basename', async () => {
  const reposRoot = await mkdtemp(join(tmpdir(), 'gctree-map-repos-'));
  try {
    const repo = await makeRepo(reposRoot, 'F');
    const nested = join(repo, 'src', 'module');
    await mkdir(nested, { recursive: true });
    assert.equal(await detectCurrentRepoId(nested), 'F');
  } finally {
    await rm(reposRoot, { recursive: true, force: true });
  }
});

test('status show-doc and related default to repo-mapped gc-branch when HEAD differs', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-map-home-'));
  const reposRoot = await mkdtemp(join(tmpdir(), 'gctree-map-repos-'));
  try {
    await initHome(home);
    await checkoutBranch(home, 'mapped', true);
    await onboardBranch({
      home,
      branch: 'mapped',
      input: {
        branchSummary: 'Mapped branch summary.',
        docs: [
          {
            title: 'Scoped Policy',
            summary: 'Shared token policy for mapped repo.',
            body: 'Mapped branch owns the scoped token workflow.',
          },
          {
            title: 'Scoped Token Notes',
            summary: 'Shared token policy support for mapped repo.',
            body: 'Support notes for the same scoped token workflow.',
          },
        ],
      },
    });
    await checkoutBranch(home, 'other', true);
    await onboardBranch({
      home,
      branch: 'other',
      input: {
        branchSummary: 'Other branch summary.',
        docs: [{ title: 'Other Context', summary: 'Wrong branch only.', body: 'This should not answer mapped repo lookups.' }],
      },
    });
    await setRepoScopeForBranch({ home, branch: 'mapped', repo: 'target-repo', mode: 'include' });
    const repo = await makeRepo(reposRoot, 'target-repo');

    const status = await runCli(['status', '--home', home, '--cwd', repo], process.cwd());
    assert.equal(status.code, 0, status.stderr);
    const statusParsed = JSON.parse(status.stdout) as { gc_branch: string; current_repo: string; source: string; repo_scope_status: string };
    assert.equal(statusParsed.gc_branch, 'mapped');
    assert.equal(statusParsed.current_repo, 'target-repo');
    assert.equal(statusParsed.source, 'repo-map');
    assert.equal(statusParsed.repo_scope_status, 'included');

    const showDoc = await runCli(['show-doc', '--home', home, '--cwd', repo, '--id', 'scoped-policy'], process.cwd());
    assert.equal(showDoc.code, 0, showDoc.stderr);
    const showDocParsed = JSON.parse(showDoc.stdout) as { status: string; gc_branch: string; doc?: { id: string; content: string } };
    assert.equal(showDocParsed.status, 'matched');
    assert.equal(showDocParsed.gc_branch, 'mapped');
    assert.equal(showDocParsed.doc?.id, 'scoped-policy');
    assert.match(showDocParsed.doc?.content || '', /Mapped branch owns/);

    const related = await runCli(['related', '--home', home, '--cwd', repo, '--id', 'scoped-policy'], process.cwd());
    assert.equal(related.code, 0, related.stderr);
    const relatedParsed = JSON.parse(related.stdout) as { status: string; gc_branch: string; matches: Array<{ id: string }> };
    assert.equal(relatedParsed.status, 'matched');
    assert.equal(relatedParsed.gc_branch, 'mapped');
    assert.equal(relatedParsed.matches[0]?.id, 'scoped-token-notes');
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(reposRoot, { recursive: true, force: true });
  }
});

test('interactive resolve can add an unmapped repo to include list', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-map-home-'));
  const reposRoot = await mkdtemp(join(tmpdir(), 'gctree-map-repos-'));
  try {
    await initHome(home);
    await onboardBranch({
      home,
      input: {
        branchSummary: 'Main gc-branch.',
        docs: [{ title: 'Project Identity', summary: 'CLI-first auth-heavy tool.', body: 'Auth policy matters most.' }],
      },
    });
    await setRepoScopeForBranch({ home, branch: 'main', repo: 'B', mode: 'include' });
    const repoE = await makeRepo(reposRoot, 'E');
    const result = await runCli(['resolve', '--home', home, '--cwd', repoE, '--query', 'auth token rotation', '--json'], process.cwd(), '2\n', {
      GCTREE_ALLOW_STDIN_PROMPT: '1',
    });
    assert.equal(result.code, 0, result.stderr);
    const parsed = JSON.parse(result.stdout) as { current_repo: string; repo_scope_status: string; matches: object[] };
    assert.equal(parsed.current_repo, 'E');
    assert.equal(parsed.repo_scope_status, 'included');
    assert.equal(parsed.matches.length > 0, true);
    const mapping = JSON.parse(await readFile(branchRepoMapPath(home), 'utf8')) as Record<string, { include?: string[] }>;
    assert.deepEqual(mapping.main.include, ['B', 'E']);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(reposRoot, { recursive: true, force: true });
  }
});

test('interactive resolve can exclude an unmapped repo and return no matches', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-map-home-'));
  const reposRoot = await mkdtemp(join(tmpdir(), 'gctree-map-repos-'));
  try {
    await initHome(home);
    await onboardBranch({
      home,
      input: {
        branchSummary: 'Main gc-branch.',
        docs: [{ title: 'Project Identity', summary: 'CLI-first auth-heavy tool.', body: 'Auth policy matters most.' }],
      },
    });
    await setRepoScopeForBranch({ home, branch: 'main', repo: 'B', mode: 'include' });
    const repoF = await makeRepo(reposRoot, 'F');
    const result = await runCli(['resolve', '--home', home, '--cwd', repoF, '--query', 'auth token rotation', '--json'], process.cwd(), '3\n', {
      GCTREE_ALLOW_STDIN_PROMPT: '1',
    });
    assert.equal(result.code, 0, result.stderr);
    const parsed = JSON.parse(result.stdout) as { current_repo: string; repo_scope_status: string; matches: object[] };
    assert.equal(parsed.current_repo, 'F');
    assert.equal(parsed.repo_scope_status, 'excluded');
    assert.equal(parsed.matches.length, 0);
    const mapping = JSON.parse(await readFile(branchRepoMapPath(home), 'utf8')) as Record<string, { exclude?: string[] }>;
    assert.deepEqual(mapping.main.exclude, ['F']);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(reposRoot, { recursive: true, force: true });
  }
});
