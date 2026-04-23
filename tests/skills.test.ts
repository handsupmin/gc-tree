import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = [
  'skills/onboard/SKILL.md',
  'skills/checkout/SKILL.md',
  'skills/resolve-context/SKILL.md',
  'skills/update-global-context/SKILL.md',
  'skills/reset-gc-branch/SKILL.md',
];

test('skills mention summary-first docs, gc-branches, and guided updates where relevant', async () => {
  const contents = await Promise.all(files.map((file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8')));
  assert.match(contents[0]!, /one question at a time/i);
  assert.match(contents[0]!, /empty gc-branch/i);
  assert.match(contents[0]!, /wait for the user's first answer/i);
  assert.match(contents[0]!, /paste or share organized docs/i);
  assert.match(contents[0]!, /what kind of work they mainly do/i);
  assert.match(contents[0]!, /do .*not.* start with a repo scan/i);
  assert.match(contents[0]!, /after the user's first answer, proactively inspect/i);
  assert.match(contents[0]!, /related repos, docs, paths, and workflows/i);
  assert.match(contents[0]!, /bounded local inspection/i);
  assert.match(contents[0]!, /do not start by asking what one repo does/i);
  assert.match(contents[0]!, /organized docs/i);
  assert.match(contents[0]!, /reference material/i);
  assert.match(contents[0]!, /summarize your understanding back/i);
  assert.match(contents[0]!, /whether that summary is correct/i);
  assert.match(contents[0]!, /anything important is still missing/i);
  assert.match(contents[0]!, /summarize what you now understand from the saved docs/i);
  assert.match(contents[0]!, /final summary, do not ask an open-ended validation question first/i);
  assert.match(contents[0]!, /1\. This matches well enough\./i);
  assert.match(contents[0]!, /2\. Some parts are wrong\. I will give the delta\./i);
  assert.match(contents[0]!, /3\. The frame is wrong\. I will restate it\./i);
  assert.match(contents[0]!, /propose the concrete repository candidates/i);
  assert.match(contents[0]!, /1\. Map these candidates\./i);
  assert.match(contents[0]!, /2\. Map these, but with corrections\./i);
  assert.match(contents[0]!, /3\. Skip repo mapping for now\./i);
  assert.match(contents[0]!, /quality_issues|verification returns anything other than `status: "complete"`/i);
  assert.match(contents[0]!, /heal what can be healed automatically|heal them autonomously/i);
  assert.match(contents[0]!, /onboarding is finished/i);
  assert.match(contents[0]!, /gctree update-global-context/i);
  assert.match(contents[0]!, /\$gc-update-global-context \{prompt\}/i);
  assert.match(contents[0]!, /\/gc-update-global-context \{prompt\}/i);
  assert.match(contents[0]!, /close this session and start fresh in a new one/i);
  assert.match(contents[0]!, /do not finish onboarding while material related repos, workflows, or domain terms remain uninspected/i);
  assert.match(contents[0]!, /verify-onboarding/i);
  assert.match(contents[0]!, /do not claim onboarding is complete unless verification returns `status: "complete"`/i);
  assert.match(contents[0]!, /encyclopedia-style context set/i);
  assert.match(contents[0]!, /docs\/role\//i);
  assert.match(contents[0]!, /docs\/repos\//i);
  assert.match(contents[0]!, /docs\/domain\//i);
  assert.match(contents[0]!, /one concept, one repository, one workflow, or one convention per file/i);
  assert.match(contents[0]!, /concept-first/i);
  assert.match(contents[0]!, /repository nicknames/i);
  assert.match(contents[0]!, /split glossary docs when a concept is likely to be searched directly/i);
  assert.match(contents[0]!, /dictionary-style TOC/i);
  assert.match(contents[0]!, /do not ask for a full information dump/i);
  assert.match(contents[0]!, /when you do present a hypothesis/i);
  assert.match(contents[0]!, /1\. This is mostly correct\./i);
  assert.match(contents[0]!, /2\. Some parts are wrong\. Please explain what differs\./i);
  assert.match(contents[0]!, /3\. Most of this is wrong\. Please explain the right frame\./i);
  assert.match(contents[0]!, /do not ask them to explain those repositories from scratch/i);
  assert.match(contents[0]!, /read the strongest available evidence first/i);
  assert.match(contents[0]!, /repository-level hypothesis/i);
  assert.match(contents[0]!, /ask only for the missing deltas|ask only for missing deltas/i);
  assert.match(contents[0]!, /only ask open-ended repository questions when the needed detail cannot be recovered responsibly from local evidence/i);
  assert.match(contents[0]!, /what kind of work/i);
  assert.match(contents[0]!, /glossary terms/i);
  assert.match(contents[0]!, /verification commands/i);
  assert.match(contents[1]!, /checkout -b/i);
  assert.match(contents[1]!, /gc-branches/i);
  assert.match(contents[2]!, /index\.md/i);
  assert.match(contents[2]!, /active gc-branch/i);
  assert.match(contents[3]!, /update-gc/i);
  assert.match(contents[3]!, /ugc/i);
  assert.match(contents[4]!, /reset-gc-branch --branch <name> --yes/i);
});
