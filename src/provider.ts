import { createInterface } from 'node:readline/promises';
import { stderr, stdin } from 'node:process';
import { spawn } from 'node:child_process';

import type { GcTreeProvider, GcTreeProviderLaunchPlan } from './types.js';

export function visibleProviderCommand(provider: GcTreeProvider, command: 'gc-onboard' | 'gc-update-global-context'): string {
  const prefix = provider === 'codex' ? '$' : '/';
  return `${prefix}${command}`;
}

export async function promptProviderSelection(): Promise<GcTreeProvider> {
  const rl = createInterface({ input: stdin, output: stderr });
  try {
    const answer = (await rl.question('Choose your LLM CLI provider:\n1. Codex\n2. Claude Code\n> ')).trim();
    return answer === '2' ? 'claude-code' : 'codex';
  } finally {
    rl.close();
  }
}

export function buildProviderLaunchPlan({
  provider,
  targetDir,
  gcBranch,
  command,
}: {
  provider: GcTreeProvider;
  targetDir: string;
  gcBranch: string;
  command: 'gc-onboard' | 'gc-update-global-context';
}): GcTreeProviderLaunchPlan {
  const providerCommand = visibleProviderCommand(provider, command);
  const binary = provider === 'codex' ? 'codex' : 'claude';
  const prompt = providerCommand;

  return {
    provider,
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
