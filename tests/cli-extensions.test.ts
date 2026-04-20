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
    assert.match(result.stderr, /__\s*$/m);

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
    assert.match(parsed.launch.args[0]!, /wait for the user's first answer/i);
    assert.match(parsed.launch.args[0]!, /paste or share organized docs/i);
    assert.match(parsed.launch.args[0]!, /what kind of work they mainly do/i);
    assert.match(parsed.launch.args[0]!, /do .*not.* start with a repo scan/i);
    assert.match(parsed.launch.args[0]!, /after the user's first answer, proactively inspect/i);
    assert.match(parsed.launch.args[0]!, /related repos, docs, paths, and workflows/i);
    assert.match(parsed.launch.args[0]!, /bounded local inspection/i);
    assert.match(parsed.launch.args[0]!, /organized docs/i);
    assert.match(parsed.launch.args[0]!, /reference material/i);
    assert.match(parsed.launch.args[0]!, /summary is correct before continuing/i);
    assert.match(parsed.launch.args[0]!, /summarize what you now understand from the saved docs/i);
    assert.match(parsed.launch.args[0]!, /ask whether that final summary matches the user's reality/i);
    assert.match(parsed.launch.args[0]!, /do not finish onboarding while material related repos, workflows, or domain terms remain uninspected/i);
    assert.match(parsed.launch.args[0]!, /run `gctree verify-onboarding/i);
    assert.match(parsed.launch.args[0]!, /do not claim onboarding is complete unless verification returns `status: "complete"`/i);
    assert.match(parsed.launch.args[0]!, /encyclopedia-style context set/i);
    assert.match(parsed.launch.args[0]!, /docs\/role\/.*docs\/repos\/.*docs\/domain\//i);
    assert.match(parsed.launch.args[0]!, /one concept, one repository, one workflow, or one convention per file/i);
    assert.match(parsed.launch.args[0]!, /dictionary-style table of contents/i);
    assert.match(parsed.launch.args[0]!, /full information dump/i);
    assert.match(parsed.launch.args[0]!, /when you do present a hypothesis/i);
    assert.match(parsed.launch.args[0]!, /offer only these structured numbered confirmations/i);
    assert.match(parsed.launch.args[0]!, /1\. This is mostly correct\./i);
    assert.match(parsed.launch.args[0]!, /2\. Some parts are wrong\. Please explain what differs\./i);
    assert.match(parsed.launch.args[0]!, /3\. Most of this is wrong\. Please explain the right frame\./i);
    assert.equal(parsed.launch.launched, false);
    assert.equal(parsed.scaffold.hosts, 'codex');
    assert.equal(parsed.scaffold.written.length, 6);

    const settings = JSON.parse(await readFile(join(home, 'settings.json'), 'utf8')) as {
      provider_mode: string;
      preferred_provider: string;
      preferred_language: string;
    };
    assert.equal(settings.provider_mode, 'codex');
    assert.equal(settings.preferred_provider, 'codex');
    assert.equal(settings.preferred_language, 'English');
    assert.match(await readFile(join(targetDir, 'AGENTS.md'), 'utf8'), /gc-branch/i);
    assert.match(await readFile(join(targetDir, '.codex', 'hooks.json'), 'utf8'), /UserPromptSubmit/);
    assert.match(await readFile(join(targetDir, '.codex', 'skills', 'gc-onboard', 'SKILL.md'), 'utf8'), /active gc-branch/i);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
  }
});

test('--version prints the installed package version', async () => {
  const result = await runCli(['--version']);
  assert.equal(result.code, 0, result.stderr);
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as {
    version: string;
  };
  assert.equal(result.stdout.trim(), pkg.version);
});

test('plant prints the ascii tree easter egg', async () => {
  const result = await runCli(['plant']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /QzczXO/);
  assert.match(result.stdout, /YYYYYYYYUXO/);
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
    assert.equal(parsed.scaffold.written.length, 12);

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
    assert.match(await readFile(join(targetDir, '.codex', 'hooks.json'), 'utf8'), /SessionStart/);
    assert.match(await readFile(join(targetDir, '.claude', 'hooks', 'hooks.json'), 'utf8'), /UserPromptSubmit/);
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
        launch: { provider_command: string; args: string[] };
      };
      assert.equal(parsed.mode, 'guided_update');
      assert.equal(parsed.gc_branch, 'main');
      assert.equal(parsed.launch.provider_command, '$gc-update-global-context');
      assert.doesNotMatch(parsed.launch.args[0]!, /IMPORTANT ONBOARDING RULES/i);
      assert.doesNotMatch(parsed.launch.args[0]!, /organized docs or reference material/i);
      assert.doesNotMatch(parsed.launch.args[0]!, /summarize what you now understand from the saved docs/i);
      assert.doesNotMatch(parsed.launch.args[0]!, /do not finish onboarding while material related repos, workflows, or domain terms remain uninspected/i);
      assert.doesNotMatch(parsed.launch.args[0]!, /do not ask for a full information dump/i);
      assert.doesNotMatch(parsed.launch.args[0]!, /1\. This is basically correct\./i);
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
    assert.equal(parsed.written.length, 6);
    const codexOnboardSkill = await readFile(join(codexTarget, '.codex', 'skills', 'gc-onboard', 'SKILL.md'), 'utf8');
    assert.match(codexOnboardSkill, /gc-branch/i);
    assert.match(codexOnboardSkill, /wait for the user's first answer/i);
    assert.match(codexOnboardSkill, /paste or share organized docs/i);
    assert.match(codexOnboardSkill, /what kind of work they mainly do/i);
    assert.match(codexOnboardSkill, /do .*not.* start with a repo scan/i);
    assert.match(codexOnboardSkill, /after the user's first answer, proactively inspect/i);
    assert.match(codexOnboardSkill, /related repos, docs, paths, and workflows/i);
    assert.match(codexOnboardSkill, /bounded local inspection/i);
    assert.match(codexOnboardSkill, /Do \*\*not\*\* start by asking what one repository does/i);
    assert.match(codexOnboardSkill, /organized docs/i);
    assert.match(codexOnboardSkill, /reference material/i);
    assert.match(codexOnboardSkill, /read those first.*summarize your understanding back/i);
    assert.match(codexOnboardSkill, /ask whether that summary is correct before continuing/i);
    assert.match(codexOnboardSkill, /anything important is still missing/i);
    assert.match(codexOnboardSkill, /summarize what you now understand from the saved docs/i);
    assert.match(codexOnboardSkill, /ask whether that final summary matches the user's reality/i);
    assert.match(codexOnboardSkill, /do not finish onboarding while material related repos, workflows, or domain terms remain uninspected/i);
    assert.match(codexOnboardSkill, /verify-onboarding/i);
    assert.match(codexOnboardSkill, /do not claim onboarding is complete unless verification returns `status: "complete"`/i);
    assert.match(codexOnboardSkill, /encyclopedia-style context set/i);
    assert.match(codexOnboardSkill, /docs\/role\//i);
    assert.match(codexOnboardSkill, /docs\/repos\//i);
    assert.match(codexOnboardSkill, /docs\/domain\//i);
    assert.match(codexOnboardSkill, /one concept, one repository, one workflow, or one convention per file/i);
    assert.match(codexOnboardSkill, /dictionary-style table of contents/i);
    assert.match(codexOnboardSkill, /do .*not.* ask for a full information dump/i);
    assert.match(codexOnboardSkill, /when you do present a hypothesis/i);
    assert.match(codexOnboardSkill, /offer only these structured numbered confirmations/i);
    assert.match(codexOnboardSkill, /1\. This is mostly correct\./i);
    assert.match(codexOnboardSkill, /2\. Some parts are wrong\. Please explain what differs\./i);
    assert.match(codexOnboardSkill, /3\. Most of this is wrong\. Please explain the right frame\./i);
    assert.match(codexOnboardSkill, /what kind of person/i);
    assert.match(codexOnboardSkill, /glossary terms/i);
    assert.match(codexOnboardSkill, /verification commands/i);
    assert.match(await readFile(join(codexTarget, '.codex', 'hooks.json'), 'utf8'), /gctree __hook --event UserPromptSubmit/);
    assert.match(await readFile(join(codexTarget, '.codex', 'skills', 'gc-update-global-context', 'SKILL.md'), 'utf8'), /__apply-update/i);

    result = await runCli(['scaffold', '--host', 'claude-code', '--target', claudeTarget]);
    assert.equal(result.code, 0, result.stderr);
    parsed = JSON.parse(result.stdout) as { written: string[] };
    assert.equal(parsed.written.length, 6);
    assert.match(await readFile(join(claudeTarget, 'CLAUDE.md'), 'utf8'), /gc-branch/i);
    const claudeOnboardCommand = await readFile(join(claudeTarget, '.claude', 'commands', 'gc-onboard.md'), 'utf8');
    assert.match(claudeOnboardCommand, /gc-branch/i);
    assert.match(claudeOnboardCommand, /wait for the user's first answer/i);
    assert.match(claudeOnboardCommand, /paste or share organized docs/i);
    assert.match(claudeOnboardCommand, /what kind of work they mainly do/i);
    assert.match(claudeOnboardCommand, /do .*not.* start with a repo scan/i);
    assert.match(claudeOnboardCommand, /after the user's first answer, proactively inspect/i);
    assert.match(claudeOnboardCommand, /related repos, docs, paths, and workflows/i);
    assert.match(claudeOnboardCommand, /bounded local inspection/i);
    assert.match(claudeOnboardCommand, /Do \*\*not\*\* start by asking what one repository does/i);
    assert.match(claudeOnboardCommand, /organized docs/i);
    assert.match(claudeOnboardCommand, /reference material/i);
    assert.match(claudeOnboardCommand, /read those first.*summarize your understanding back/i);
    assert.match(claudeOnboardCommand, /ask whether that summary is correct before continuing/i);
    assert.match(claudeOnboardCommand, /anything important is still missing/i);
    assert.match(claudeOnboardCommand, /summarize what you now understand from the saved docs/i);
    assert.match(claudeOnboardCommand, /ask whether that final summary matches the user's reality/i);
    assert.match(claudeOnboardCommand, /do not finish onboarding while material related repos, workflows, or domain terms remain uninspected/i);
    assert.match(claudeOnboardCommand, /verify-onboarding/i);
    assert.match(claudeOnboardCommand, /do not claim onboarding is complete unless verification returns `status: "complete"`/i);
    assert.match(claudeOnboardCommand, /encyclopedia-style context set/i);
    assert.match(claudeOnboardCommand, /docs\/role\/.*docs\/repos\/.*docs\/domain\//i);
    assert.match(claudeOnboardCommand, /one concept, one repository, one workflow, or one convention per file/i);
    assert.match(claudeOnboardCommand, /dictionary-style table of contents/i);
    assert.match(claudeOnboardCommand, /do .*not.* ask for a full information dump/i);
    assert.match(claudeOnboardCommand, /when you do present a hypothesis/i);
    assert.match(claudeOnboardCommand, /offer only these structured numbered confirmations/i);
    assert.match(claudeOnboardCommand, /1\. This is mostly correct\./i);
    assert.match(claudeOnboardCommand, /2\. Some parts are wrong\. Please explain what differs\./i);
    assert.match(claudeOnboardCommand, /3\. Most of this is wrong\. Please explain the right frame\./i);
    assert.match(claudeOnboardCommand, /what kind of person/i);
    assert.match(claudeOnboardCommand, /glossary terms/i);
    assert.match(claudeOnboardCommand, /verification commands/i);
    assert.match(await readFile(join(claudeTarget, '.claude', 'hooks', 'hooks.json'), 'utf8'), /gctree __hook --event SessionStart/);
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
