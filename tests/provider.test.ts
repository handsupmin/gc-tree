import test from 'node:test';
import assert from 'node:assert/strict';

import { LANGUAGE_SELECTION_PROMPT, parseLanguageSelectionInput } from '../src/provider.ts';

test('parseLanguageSelectionInput keeps preset numeric choices', () => {
  assert.deepEqual(parseLanguageSelectionInput('1'), { language: 'English', needsFollowUp: false });
  assert.deepEqual(parseLanguageSelectionInput('2'), { language: 'Korean', needsFollowUp: false });
  assert.deepEqual(parseLanguageSelectionInput('3'), { language: null, needsFollowUp: true });
});

test('parseLanguageSelectionInput accepts inline custom language after option 3', () => {
  assert.deepEqual(parseLanguageSelectionInput('3 Korean'), { language: 'Korean', needsFollowUp: false });
  assert.deepEqual(parseLanguageSelectionInput('3. Korean'), { language: 'Korean', needsFollowUp: false });
  assert.deepEqual(parseLanguageSelectionInput('3) English'), { language: 'English', needsFollowUp: false });
});

test('parseLanguageSelectionInput accepts direct language names without falling back to English', () => {
  assert.deepEqual(parseLanguageSelectionInput('Korean'), { language: 'Korean', needsFollowUp: false });
  assert.deepEqual(parseLanguageSelectionInput('English'), { language: 'English', needsFollowUp: false });
  assert.deepEqual(parseLanguageSelectionInput('Japanese'), { language: 'Japanese', needsFollowUp: false });
});

test('language selection prompt labels option 3 as Other language', () => {
  assert.match(LANGUAGE_SELECTION_PROMPT, /3\. Other language/i);
  assert.doesNotMatch(LANGUAGE_SELECTION_PROMPT, /Type your language please/i);
});
