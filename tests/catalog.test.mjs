import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { buildSnippet, defaultValues, findSnippets, snippets } from '../app/catalog.mjs';
import { readSnippetLink, snippetHref } from '../app/snippet-links.mjs';

const byId = (id) => snippets.find((snippet) => snippet.id === id);

test('all published examples have valid defaults and distinct IDs and fields', () => {
  assert.equal(new Set(snippets.map((snippet) => snippet.id)).size, snippets.length);
  for (const snippet of snippets) {
    assert.equal(new Set(snippet.fields.map((field) => field.id)).size, snippet.fields.length);
    assert.ok(buildSnippet(snippet, defaultValues(snippet)).output, snippet.id);
  }
});

test('search matches multiple terms across metadata and respects language filters', () => {
  assert.deepEqual(findSnippets('  GiT HISTORY  ', 'Git').map((snippet) => snippet.id), ['git-file-history']);
  assert.deepEqual(findSnippets('filter array').map((snippet) => snippet.id), ['js-filter-array']);
  assert.deepEqual(findSnippets('git history', 'XPath'), []);
  assert.deepEqual(findSnippets(''), snippets);
});

test('Git file history passes the path as one literal shell argument', () => {
  const path = "src/my team's [draft].js";
  const { output } = buildSnippet(byId('git-file-history'), { path, limit: '3' });
  // Replace git with a shell function to inspect its arguments.
  const args = execFileSync('bash', ['-c', 'git() { printf "%s\\n" "$@"; }; ' + output], { encoding: 'utf8' });
  assert.deepEqual(args.trimEnd().split('\n'), [
    '--literal-pathspecs', 'log', '--oneline', '-n', '3', '--', path,
  ]);
});

test('JavaScript escapes string literals and preserves empty values', () => {
  const property = 'a"b';
  const value = '';
  const snippet = byId('js-filter-array');
  assert.equal(buildSnippet(snippet, { property, value }).output,
    'const matches = items.filter((item) => item[' + JSON.stringify(property) + '] === "");');
  assert.equal(buildSnippet(byId('js-join-array'), { separator: ' ' }).output,
    'const joined = items.join(" ");');
});

test('XPath handles both quote characters in a value and validates attribute names', () => {
  const snippet = byId('xpath-match-attribute');
  const value = `O'Reilly "guide"`;
  const { output } = buildSnippet(snippet, { attribute: 'data-name', value });
  assert.equal(output, `//*[@data-name=concat('O', "'", 'Reilly "guide"')]`);
  assert.ok(buildSnippet(snippet, { attribute: 'data name', value }).error);
});

test('numeric parameters reject non-integers and out-of-range values', () => {
  const snippet = byId('csharp-take-items');
  for (const limit of ['0', '-1', '1.5', '10000', ' 2', '']) {
    assert.ok(buildSnippet(snippet, { limit }).error, limit);
  }
});

test('catalog entries have stable URL-safe IDs and valid related snippets', () => {
  for (const snippet of snippets) {
    assert.match(snippet.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(snippet.aliases.length && snippet.useCases.length);
    assert.equal(new Set(snippet.relatedIds).size, snippet.relatedIds.length);
    for (const relatedId of snippet.relatedIds) {
      assert.notEqual(relatedId, snippet.id);
      assert.ok(byId(relatedId), relatedId);
    }
  }
});

test('plain-language searches use aliases and use cases', () => {
  assert.equal(findSnippets('find old changes to a file')[0].id, 'git-file-history');
  assert.equal(findSnippets('Find the changes to a file')[0].id, 'git-file-history');
  assert.equal(findSnippets('git branch list')[0].id, 'git-branch-list');
});

test('syntax search preserves punctuation and ranks matching example code first', () => {
  assert.equal(findSnippets('git log --oneline')[0].id, 'git-file-history');
  assert.deepEqual(findSnippets('items.Take(').map(({ id }) => id), ['csharp-take-items']);
  assert.deepEqual(findSnippets('//*[@').map(({ id }) => id), ['xpath-match-attribute']);
  assert.deepEqual(findSnippets('items.Take(', 'JavaScript'), []);
  assert.deepEqual(findSnippets('items.Take['), []);
});

test('every snippet has reference details and a shareable URL that resolves to it', () => {
  for (const snippet of snippets) {
    assert.ok(snippet.prerequisites && snippet.expected && snippet.effects, snippet.id);
    const url = new URL(snippetHref(snippet.id), 'https://example.test/codefolio/');
    assert.equal(url.pathname, '/codefolio/');
    assert.deepEqual([...url.searchParams], [['snippet', snippet.id]]);
    assert.equal(readSnippetLink(url.search).snippet, snippet);
  }
});

test('an empty location means browse and an unknown link does not resolve', () => {
  assert.deepEqual(readSnippetLink(''), { id: null, snippet: undefined });
  assert.deepEqual(readSnippetLink('?snippet=missing'), { id: 'missing', snippet: undefined });
});
