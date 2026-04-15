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
  assert.match(contents[1]!, /checkout -b/i);
  assert.match(contents[1]!, /gc-branches/i);
  assert.match(contents[2]!, /index\.md/i);
  assert.match(contents[2]!, /active gc-branch/i);
  assert.match(contents[3]!, /update-gc/i);
  assert.match(contents[3]!, /ugc/i);
  assert.match(contents[4]!, /reset-gc-branch --branch <name> --yes/i);
});
