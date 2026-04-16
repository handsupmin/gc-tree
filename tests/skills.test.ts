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
  assert.match(contents[0]!, /do not start by asking what one repo does/i);
  assert.match(contents[0]!, /organized docs/i);
  assert.match(contents[0]!, /reference material/i);
  assert.match(contents[0]!, /summarize your understanding back/i);
  assert.match(contents[0]!, /whether that summary is correct/i);
  assert.match(contents[0]!, /anything important is still missing/i);
  assert.match(contents[0]!, /summarize what you now understand from the saved docs/i);
  assert.match(contents[0]!, /whether that final summary matches the user's reality/i);
  assert.match(contents[0]!, /remaining risks, blind spots, or details that still need confirmation/i);
  assert.match(contents[0]!, /do not ask for a full information dump/i);
  assert.match(contents[0]!, /inspect any relevant docs, repos, directories, or files that are already available/i);
  assert.match(contents[0]!, /present your hypothesis before asking the user to type more/i);
  assert.match(contents[0]!, /1\. This is basically correct\./i);
  assert.match(contents[0]!, /2\. Part of it is wrong/i);
  assert.match(contents[0]!, /3\. This is the wrong frame/i);
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
