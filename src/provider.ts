import { createInterface } from 'node:readline/promises';
import { stderr, stdin } from 'node:process';
import { spawn } from 'node:child_process';

import type { GcTreeProvider, GcTreeProviderLaunchPlan, GcTreeProviderMode } from './types.js';

export function visibleProviderCommand(provider: GcTreeProvider, command: 'gc-onboard' | 'gc-update-global-context'): string {
  const prefix = provider === 'codex' ? '$' : '/';
  return `${prefix}${command}`;
}

export async function promptProviderSelection(): Promise<GcTreeProviderMode> {
  const rl = createInterface({ input: stdin, output: stderr });
  try {
    const answer = (await rl.question('Choose your LLM CLI provider:\n1. Claude Code\n2. Codex\n3. Both\n> ')).trim();
    if (answer === '2') return 'codex';
    if (answer === '3') return 'both';
    return 'claude-code';
  } finally {
    rl.close();
  }
}

export async function promptLaunchProviderSelection(): Promise<GcTreeProvider> {
  const rl = createInterface({ input: stdin, output: stderr });
  try {
    const answer = (await rl.question('Both providers are enabled. Which one should start onboarding now?\n1. Claude Code\n2. Codex\n> ')).trim();
    return answer === '2' ? 'codex' : 'claude-code';
  } finally {
    rl.close();
  }
}

export async function promptLanguageSelection(): Promise<string> {
  const rl = createInterface({ input: stdin, output: stderr });
  try {
    const answer = (await rl.question('Choose language:\n1. English (default)\n2. Korean\n3. Type your language please\n> ')).trim();
    if (answer === '2') return 'Korean';
    if (answer === '3') {
      const typed = (await rl.question('Type your language: ')).trim();
      return typed || 'English';
    }
    return 'English';
  } finally {
    rl.close();
  }
}

export function buildProviderLaunchPlan({
  provider,
  providerMode,
  preferredLanguage,
  targetDir,
  gcBranch,
  command,
}: {
  provider: GcTreeProvider;
  providerMode: GcTreeProviderMode;
  preferredLanguage: string;
  targetDir: string;
  gcBranch: string;
  command: 'gc-onboard' | 'gc-update-global-context';
}): GcTreeProviderLaunchPlan {
  const providerCommand = visibleProviderCommand(provider, command);
  const binary = provider === 'codex' ? 'codex' : 'claude';
  const prompt = [
    providerCommand,
    '',
    `IMPORTANT LANGUAGE RULE: Use ${preferredLanguage} for every message in this workflow.`,
    `Do not switch to English or another language unless the user explicitly asks you to.`,
    `At the start, explicitly say that the active gc-branch is "${gcBranch}" and that the required workflow language is "${preferredLanguage}".`,
  ].join('\n');

  return {
    provider,
    provider_mode: providerMode,
    preferred_language: preferredLanguage,
    binary,
    args: [prompt],
    target_dir: targetDir,
    gc_branch: gcBranch,
    provider_command: providerCommand,
    launched: false,
  };
}

export async function maybeLaunchProvider(plan: GcTreeProviderLaunchPlan): Promise<GcTreeProviderLaunchPlan> {
  if (process.env.GCTREE_DISABLE_PROVIDER_LAUNCH === '1' || !stdin.isTTY || !process.stdout.isTTY) {
    return plan;
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(plan.binary, plan.args, {
      cwd: plan.target_dir,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code && code !== 0) {
        reject(new Error(`${plan.binary} exited with code ${code}`));
        return;
      }
      resolve();
    });
  });

  return {
    ...plan,
    launched: true,
  };
}
