import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { encodeJavaScript, recipes } from '../tools/encoding/wwwroot/recipes.mjs';
import { encodingUsage } from '../tools/encoding/wwwroot/usage.mjs';

function assertEncoding(recipe, sample, output) {
  if (recipe.id === 'json-string') assert.equal(JSON.parse(output), sample.input);
  else assert.equal(output, sample.output);
}

test('JavaScript encoding preserves Unicode, whitespace and JSON meaning', () => {
  for (const recipe of recipes) {
    for (const sample of recipe.examples) {
      assertEncoding(recipe, sample, encodeJavaScript(recipe.id, sample.input));
    }
  }
  assert.equal(encodeJavaScript('url-component', ''), '');
  assert.equal(encodeJavaScript('base64-utf8', ''), 'Base64: \nDecoded: ');
});

test('copyable JavaScript encoding recipes produce the example results', () => {
  for (const recipe of recipes) {
    const messages = [];
    vm.runInNewContext(encodingUsage(recipe, 'javascript'), {
      btoa, atob, TextEncoder, TextDecoder, console: { log: value => messages.push(value) },
    });
    assert.equal(messages.length, 1);
    assertEncoding(recipe, recipe.examples[0], messages[0]);
  }
});
