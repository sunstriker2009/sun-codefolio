import assert from 'node:assert/strict';
import test from 'node:test';
import { findTaggedSnippets } from '../shared/snippet-tags.mjs';
import { matchJavaScript, patterns } from '../tools/regex-preview/wwwroot/patterns.mjs';

test('validator examples match the entire input', () => {
  const validators = findTaggedSnippets(patterns, {}, ['validator']);
  assert.ok(validators.some(entry => entry.id === 'ipv4-address'));
  assert.ok(validators.some(entry => entry.id === 'email-format'));
  assert.ok(validators.every(entry => !entry.recipe));
  for (const entry of validators) {
    const expression = entry.expressions.javascript;
    const { match, noMatch } = entry.examples;
    assert.equal(matchJavaScript(expression, match).status, 'match', entry.id);
    for (const input of [noMatch, match + '\n', ' ' + match]) {
      assert.equal(matchJavaScript(expression, input).status, 'no-match', entry.id);
    }
  }
});

test('catalog tags work alongside personal tags', () => {
  const entries = findTaggedSnippets(patterns, { 'spaces-tabs': ['Whitespace'] }, ['VALIDATOR', 'whitespace']);
  assert.ok(entries.some(entry => entry.id === 'signed-integer'));
  assert.ok(entries.some(entry => entry.id === 'spaces-tabs'));
  assert.ok(!entries.some(entry => entry.id === 'structured-log-line'));
});
