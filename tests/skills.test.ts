import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = [
  'skills/onboard/SKILL.md',
  'skills/checkout/SKILL.md',
  'skills/resolve-context/SKILL.md',
  'skills/update-global-context/SKILL.md',
  'skills/feedback/SKILL.md',
];

test('skills mention summary-first docs, branches, and approval-first updates where relevant', async () => {
  const contents = await Promise.all(files.map((file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8')));
  assert.match(contents[0]!, /one question at a time/i);
  assert.match(contents[0]!, /summary/i);
  assert.match(contents[1]!, /checkout -b/i);
  assert.match(contents[2]!, /index\.md/i);
  assert.match(contents[3]!, /ask the user/i);
  assert.match(contents[3]!, /apply only after explicit approval/i);
  assert.match(contents[4]!, /proposal/i);
});
