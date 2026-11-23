import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCsv } from '../tools/csv/wwwroot/parser.mjs';
import { normalizeCsvInput, recipes } from '../tools/csv/wwwroot/recipes.mjs';
import { csvUsage } from '../tools/csv/wwwroot/usage.mjs';

test('JavaScript parses the CSV recipe fixtures and rejects the unclosed quote', () => {
  for (const recipe of recipes) {
    for (const sample of recipe.examples) {
      if (sample.output === null) assert.throws(() => parseCsv(sample.input), SyntaxError);
      else assert.deepEqual(parseCsv(sample.input), JSON.parse(sample.output), sample.label);
    }
  }
});

test('CSV keeps empty fields, spaces, Unicode, and rows of different lengths', () => {
  assert.deepEqual(parseCsv(normalizeCsvInput('\uFEFFfirst,\r\n\r\n"",  café☕  ,\r\nlast\r\n')), [
    ['first', ''], ['', '  café☕  ', ''], ['last'],
  ]);
  assert.deepEqual(parseCsv(''), []);
  assert.deepEqual(parseCsv('""'), [['']]);
  assert.throws(() => parseCsv('"field"suffix'), SyntaxError);
  assert.throws(() => parseCsv('un"quoted'), SyntaxError);
});

test('CSV usage examples show the parser for each platform', () => {
  for (const recipe of recipes) {
    assert.match(csvUsage(recipe, 'csharp'), /new CsvParser/);
    assert.match(csvUsage(recipe, 'javascript'), /console\.log\(parseCsv/);
    assert.match(csvUsage(recipe, 'python'), /csv\.reader/);
    assert.match(csvUsage(recipe, 'go'), /csv\.NewReader/);
  }
});
