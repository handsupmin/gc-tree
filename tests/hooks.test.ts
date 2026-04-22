import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
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

async function runCli(
  args: string[],
  {
    cwd = REPO_ROOT,
    stdinJson,
  }: {
    cwd?: string;
    stdinJson?: unknown;
  } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/cli.ts', ...args], {
      cwd,
      env: {
        ...process.env,
        GCTREE_DISABLE_PROVIDER_LAUNCH: '1',
        ...globalEnvForArgs(args),
      },
      stdio: ['pipe', 'pipe', 'pipe'],
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

    if (stdinJson) {
      child.stdin.end(JSON.stringify(stdinJson));
    } else {
      child.stdin.end();
    }
  });
}

test('init scaffolds Codex and Claude hook configs', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-hooks-home-'));
  const targetDir = await mkdtemp(join(tmpdir(), 'gctree-hooks-target-'));

  try {
    const result = await runCli(['init', '--home', home, '--provider', 'both', '--target', targetDir]);
    assert.equal(result.code, 0, result.stderr);

    const codexHooks = await import('node:fs/promises').then((fs) =>
      fs.readFile(join(targetDir, '.codex', 'hooks.json'), 'utf8'),
    );
    const claudeHooks = await import('node:fs/promises').then((fs) =>
      fs.readFile(join(targetDir, '.claude', 'hooks', 'hooks.json'), 'utf8'),
    );

    assert.match(codexHooks, /UserPromptSubmit/);
    assert.match(codexHooks, /gctree __hook --event UserPromptSubmit/);
    assert.match(claudeHooks, /SessionStart/);
    assert.match(claudeHooks, /gctree __hook --event SessionStart/);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
  }
});

test('UserPromptSubmit hook resolves matching gc-tree docs into additionalContext', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-hook-home-'));

  try {
    const init = await runCli(['init', '--home', home, '--provider', 'codex', '--no-launch']);
    assert.equal(init.code, 0, init.stderr);

    const onboardingInputPath = join(home, 'onboard.json');
    await writeFile(
      onboardingInputPath,
      JSON.stringify(
        {
          branchSummary: 'Main branch summary',
          docs: [
            {
              title: 'Resolve Policy',
              summary: 'Always resolve auth policy before implementation.',
              body: '## Summary\nAlways resolve auth policy before implementation.\n\nAuth token rotation policy lives here.',
            },
          ],
        },
        null,
        2,
      ),
      'utf8',
    );

    const onboard = await runCli(['__apply-onboarding', '--home', home, '--input', onboardingInputPath]);
    assert.equal(onboard.code, 0, onboard.stderr);

    const hook = await runCli(
      ['__hook', '--home', home, '--event', 'UserPromptSubmit'],
      {
        stdinJson: {
          session_id: 'session-1',
          cwd: REPO_ROOT,
          hook_event_name: 'UserPromptSubmit',
          user_prompt: 'Please check auth token rotation policy before implementation',
        },
      },
    );
    assert.equal(hook.code, 0, hook.stderr);

    const parsed = JSON.parse(hook.stdout) as {
      hookSpecificOutput?: { additionalContext?: string };
    };
    assert.match(parsed.hookSpecificOutput?.additionalContext || '', /Resolve Policy/);
    assert.match(parsed.hookSpecificOutput?.additionalContext || '', /auth token rotation policy/i);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('UserPromptSubmit hook caches empty-branch no-match state per session', async () => {
  const home = await mkdtemp(join(tmpdir(), 'gctree-hook-home-'));

  try {
    const init = await runCli(['init', '--home', home, '--provider', 'codex', '--no-launch']);
    assert.equal(init.code, 0, init.stderr);

    const first = await runCli(
      ['__hook', '--home', home, '--event', 'UserPromptSubmit'],
      {
        stdinJson: {
          session_id: 'session-cache',
          cwd: REPO_ROOT,
          hook_event_name: 'UserPromptSubmit',
          user_prompt: 'first task prompt',
        },
      },
    );
    assert.equal(first.code, 0, first.stderr);

    const second = await runCli(
      ['__hook', '--home', home, '--event', 'UserPromptSubmit'],
      {
        stdinJson: {
          session_id: 'session-cache',
          cwd: REPO_ROOT,
          hook_event_name: 'UserPromptSubmit',
          user_prompt: 'second task prompt',
        },
      },
    );
    assert.equal(second.code, 0, second.stderr);

    const parsed = JSON.parse(second.stdout) as {
      hookSpecificOutput?: { additionalContext?: string };
    };
    assert.match(parsed.hookSpecificOutput?.additionalContext || '', /cached/i);
    assert.match(parsed.hookSpecificOutput?.additionalContext || '', /no reusable global context/i);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});
