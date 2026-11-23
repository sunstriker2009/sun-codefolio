import assert from 'node:assert/strict';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { evaluateTestCases, maxTestCases, readTestCases } from '../tools/regex-preview/wwwroot/test-cases.mjs';

const site = await mkdtemp(join(tmpdir(), 'codefolio-cases-'));
after(() => rm(site, { recursive: true, force: true }));
await Promise.all([
  cp(new URL('../shared/', import.meta.url), join(site, 'shared'), { recursive: true }),
  cp(new URL('../tools/regex-preview/wwwroot/', import.meta.url), join(site, 'regex'), { recursive: true }),
]);
const { matchJavaScript } = await import(pathToFileURL(join(site, 'regex/patterns.mjs')));
const { exportRegexBackup, mergeRegexBackup, readRegexBackup } = await import(pathToFileURL(join(site, 'regex/personal.mjs')));

const cases = [
  { name: 'Digits', input: '42', expected: 'match' },
  { name: 'Blank input', input: '', expected: 'no-match' },
];
const custom = {
  id: 'custom-12345678-abcd-abcd-abcd-123456789012',
  source: 'custom',
  title: 'Digits only',
  expressions: { javascript: '^[0-9]+$' },
  testCases: cases,
};
const personal = { customPatterns: [custom], tags: {}, favorites: [] };

test('case definitions accept empty input and trim names', () => {
  assert.deepEqual(readTestCases([{ ...cases[1], name: '  Blank input  ' }]), [cases[1]]);
  assert.throws(() => readTestCases([cases[0], { ...cases[0], name: 'digits' }]), /unique/);
  assert.throws(() => readTestCases([{ ...cases[0], expected: 'invalid' }]), /expectation/);
  assert.throws(() => readTestCases(Array(maxTestCases + 1).fill(cases[0])), /up to 20/);
});

test('cases detect pattern regressions and separate runner errors from failed expectations', async () => {
  for (const [expression, expected] of [
    [custom.expressions.javascript, ['pass', 'pass']],
    ['^$', ['fail', 'fail']],
  ]) {
    const actual = [];
    await evaluateTestCases(cases, text => matchJavaScript(expression, text), () => true, (_, outcome) => actual.push(outcome));
    assert.deepEqual(actual, expected);
  }
  const errors = [];
  await evaluateTestCases(cases, () => ({ status: 'load-error' }), () => true, (_, outcome) => errors.push(outcome));
  assert.deepEqual(errors, ['error']);
});

test('a canceled suite ignores an in-flight result and does not start another case', async () => {
  let current = true;
  let invoked = 0;
  await evaluateTestCases(cases, async () => {
    invoked++;
    current = false;
    return { status: 'match' };
  }, () => current, () => assert.fail('A stale result was published'));
  assert.equal(invoked, 1);
});

test('v3 backups round trip cases and earlier backups still import', () => {
  const { json } = exportRegexBackup(personal);
  assert.equal(JSON.parse(json).version, 3);
  assert.deepEqual(readRegexBackup(json), personal);
  const legacy = JSON.parse(json);
  legacy.version = 2;
  delete legacy.customPatterns[0].testCases;
  assert.deepEqual(readRegexBackup(JSON.stringify(legacy)).customPatterns[0].testCases, []);
  legacy.version = 1;
  delete legacy.customPatterns;
  assert.deepEqual(readRegexBackup(JSON.stringify(legacy)).customPatterns, []);
});

test('import is idempotent and protects conflicting saved cases', () => {
  assert.equal(mergeRegexBackup(personal, readRegexBackup(exportRegexBackup(personal).json)).conflicts, 0);
  const imported = structuredClone(personal);
  imported.customPatterns[0].testCases[0].input = '99';
  const merged = mergeRegexBackup(personal, imported);
  assert.equal(merged.conflicts, 1);
  assert.deepEqual(merged.data, personal);
  imported.customPatterns[0].testCases[0].expected = 'timeout';
  assert.throws(() => readRegexBackup(exportRegexBackup(imported).json), /expectation/);
});
