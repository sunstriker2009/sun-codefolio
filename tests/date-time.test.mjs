import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { dateJavaScript, recipes, validInputShape } from '../tools/date-time/wwwroot/recipes.mjs';
import { dateUsage } from '../tools/date-time/wwwroot/usage.mjs';

test('the Date & Time recipes have real, deterministic results in JavaScript', () => {
  for (const recipe of recipes) {
    for (const { input, output } of recipe.examples) {
      assert.equal(validInputShape(recipe.id, input), true, input);
      assert.equal(dateJavaScript(recipe.id, input), output, recipe.id + ' ' + input);
    }
  }
  assert.equal(dateJavaScript('format-date', '2026-01-01T24:00:00Z'), null);
  assert.equal(dateJavaScript('utc-to-toronto', '2026-03-08T06:59:59Z'), '2026-03-08T01:59:59-05:00');
  assert.equal(dateJavaScript('utc-to-toronto', '2026-03-08T07:00:00Z'), '2026-03-08T03:00:00-04:00');
});

test('each Date & Time recipe checks the documented input format', () => {
  assert.equal(validInputShape('parse-date', '3/07/2026'), false);
  assert.equal(validInputShape('parse-date', '01/01/0000'), false);
  assert.equal(validInputShape('format-date', '2026-01-01T12:00:00+00:00'), false);
  assert.equal(validInputShape('format-date', '2026-01-01T12:00:00Z\n'), false);
  assert.equal(validInputShape('utc-to-toronto', '1969-12-31T12:00:00Z'), false);
});

test('each copyable JavaScript example produces its documented result', () => {
  for (const recipe of recipes) {
    const printed = [];
    vm.runInNewContext(dateUsage(recipe, 'javascript'), { console: { log: value => printed.push(value) } });
    assert.deepEqual(printed, [recipe.examples[0].output]);
  }
});
