#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

import { onboardBranch } from './onboard.js';
import { DEFAULT_BRANCH, resolveHome } from './paths.js';
import { applyProposal, listProposals, proposalBasename, proposeUpdate } from './proposals.js';
import { resolveContext } from './resolve.js';
import { scaffoldHostIntegration } from './scaffold.js';
import { checkoutBranch, initHome, listBranches, readHead, statusForBranch } from './store.js';
import type { GcTreeOnboardingInput, GcTreeProposalInput } from './types.js';

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function shellQuote(value: string): string {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function usage(): never {
  console.error(`Usage:
  gctree init [--home DIR] [--branch NAME]
  gctree checkout <branch> [--home DIR]
  gctree checkout -b <branch> [--home DIR]
  gctree branches [--home DIR]
  gctree status [--home DIR]
  gctree onboard --input FILE [--home DIR] [--branch NAME]
  gctree resolve --query TEXT [--home DIR]
  gctree propose-update --input FILE [--home DIR] [--branch NAME]
  gctree apply-update --proposal FILE [--home DIR]
  gctree update-global-context --input FILE [--home DIR] [--branch NAME] [--yes]
  gctree scaffold --host <codex|claude-code> [--target DIR] [--force]
  gctree proposals [--home DIR]
`);
  process.exit(1);
}

async function readJsonFile<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (!command || command === '--help' || command === 'help') usage();
  const home = resolveHome(readArg('--home'));

  switch (command) {
    case 'init': {
      const branch = readArg('--branch') || DEFAULT_BRANCH;
      const result = await initHome(home, branch);
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case 'checkout': {
      const create = hasFlag('-b');
      const branch = create ? process.argv[4] : process.argv[3];
      if (!branch) usage();
      const result = await checkoutBranch(home, branch, create);
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case 'branches': {
      const result = await listBranches(home);
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case 'status': {
      const branch = (await readHead(home)) || DEFAULT_BRANCH;
      const result = await statusForBranch(home, branch);
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case 'onboard': {
      const inputPath = readArg('--input');
      if (!inputPath) usage();
      const input = await readJsonFile<GcTreeOnboardingInput>(inputPath);
      const result = await onboardBranch({ home, input, branch: readArg('--branch') || undefined });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case 'resolve': {
      const query = readArg('--query');
      if (!query) usage();
      const branch = (await readHead(home)) || DEFAULT_BRANCH;
      const result = await resolveContext({ home, branch, query });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case 'propose-update': {
      const inputPath = readArg('--input');
      if (!inputPath) usage();
      const input = await readJsonFile<GcTreeProposalInput>(inputPath);
      const result = await proposeUpdate({ home, input, branch: readArg('--branch') || undefined });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case 'apply-update': {
      const proposalPath = readArg('--proposal');
      if (!proposalPath) usage();
      const result = await applyProposal({ home, proposalPath });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case 'update-global-context': {
      const inputPath = readArg('--input');
      if (!inputPath) usage();
      const input = await readJsonFile<GcTreeProposalInput>(inputPath);
      const proposed = await proposeUpdate({
        home,
        input,
        branch: readArg('--branch') || undefined,
      });
      if (!hasFlag('--yes')) {
        console.log(
          JSON.stringify(
            {
              mode: 'proposal_only',
              approval_required: true,
              proposal_path: proposed.proposal_path,
              branch: proposed.proposal.branch,
              summary: proposed.proposal.summary,
              next_command: `gctree apply-update --proposal ${shellQuote(proposed.proposal_path)}`,
              next_args: ['apply-update', '--proposal', proposed.proposal_path],
            },
            null,
            2,
          ),
        );
        return;
      }

      const applied = await applyProposal({
        home,
        proposalPath: proposed.proposal_path,
      });
      console.log(
        JSON.stringify(
          {
            mode: 'proposed_and_applied',
            proposal_path: proposed.proposal_path,
            applied,
          },
          null,
          2,
        ),
      );
      return;
    }
    case 'scaffold': {
      const host = readArg('--host');
      if (host !== 'codex' && host !== 'claude-code') usage();
      const targetDir = readArg('--target') || process.cwd();
      const result = await scaffoldHostIntegration({
        host,
        targetDir,
        force: hasFlag('--force'),
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case 'proposals': {
      const branch = (await readHead(home)) || DEFAULT_BRANCH;
      const result = await listProposals(home, branch);
      console.log(JSON.stringify({ branch, proposals: result.map(proposalBasename) }, null, 2));
      return;
    }
    default:
      usage();
  }
}

await main();
