import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { browseSnippets, buildSnippet, defaultValues, findSnippets, paginateSnippets, snippets, snippetsPerPage } from '../app/catalog.mjs';
import { restoreValues } from '../app/parameters.mjs';
import { exportVariantBackup, mergeVariantBackup, readVariantBackup } from '../app/variant-backup.mjs';
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
  assert.equal(findSnippets('  GiT HISTORY  ', 'Git')[0].id, 'git-file-history');
  assert.deepEqual(findSnippets('filter array').map((snippet) => snippet.id), ['js-filter-array']);
  assert.deepEqual(findSnippets('git history', 'XPath'), []);
  assert.deepEqual(findSnippets(''), snippets);
});

test('Git file history passes the path as one literal shell argument', () => {
  const path = "src/my team's [draft].js";
  const { output } = buildSnippet(byId('git-file-history'), { ...defaultValues(byId('git-file-history')), path, limit: '3' });
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
    assert.equal(readSnippetLink(url.search, snippets).snippet, snippet);
  }
});

test('an empty location means browse and an unknown link does not resolve', () => {
  assert.deepEqual(readSnippetLink('', snippets), { id: null, snippet: undefined });
  assert.deepEqual(readSnippetLink('?snippet=missing', snippets), { id: 'missing', snippet: undefined });
});

test('legacy saved values keep their custom settings and use defaults for new fields', () => {
  const history = byId('git-file-history');
  const saved = { path: 'docs/notes.md', limit: '6' };
  const restored = buildSnippet(history, restoreValues(history, saved));
  assert.deepEqual(restored.parameters, { path: 'docs/notes.md', limit: 6, branch: '', fileChanges: false });
  assert.equal(restored.output, "git --literal-pathspecs log --oneline -n 6 -- 'docs/notes.md'");
  assert.ok(buildSnippet(history, restoreValues(history, { ...saved, limit: 'bad' })).error);

  const branches = byId('git-branch-list');
  assert.equal(buildSnippet(branches, restoreValues(branches, { limit: '7' })).parameters.sort, '-committerdate');
  assert.match(buildSnippet(branches, { limit: 2, sort: 'refname' }).output, /--sort=refname/);
  assert.ok(buildSnippet(branches, { limit: 2, sort: '' }).error);
});

test('Git history emits optional branch and file detail arguments', () => {
  const snippet = byId('git-file-history');
  const defaults = defaultValues(snippet);
  const result = buildSnippet(snippet, { ...defaults, branch: 'release/v1', fileChanges: true });
  assert.equal(result.output,
    "git --literal-pathspecs log --oneline -n 5 --name-status --end-of-options 'refs/heads/release/v1' -- 'src/app.js'");
  assert.ok(buildSnippet(snippet, { ...defaults, fileChanges: 'true' }).error);
});

test('the first-release catalog covers each of the four starting languages', () => {
  for (const language of ['Git', 'JavaScript', 'C#', 'XPath']) {
    assert.ok(findSnippets('', language).length >= 3, language);
  }
});

test('new text snippets encode literal values and reject invalid XPath names', () => {
  const map = byId('js-map-property');
  assert.equal(buildSnippet(map, { property: 'a"b' }).output,
    'const values = items.map((item) => item["a\\"b"]);');
  const contains = byId('xpath-contains-text');
  assert.match(buildSnippet(contains, { element: 'a', text: `Bob's "guide"` }).output, /concat\(/);
  assert.ok(buildSnippet(contains, { element: 'a b', text: 'guide' }).error);
});

test('C# builder supports case choices and signed thresholds', () => {
  assert.match(buildSnippet(byId('csharp-distinct-strings'), { ignoreCase: false }).output, /StringComparer\.Ordinal\)/);
  assert.match(buildSnippet(byId('csharp-any-above'), { threshold: '-2' }).output, /item > -2/);
});

test('Git history and Regex entries are findable by task and syntax', () => {
  assert.equal(findSnippets('find the commit that introduced a line', 'Git')[0].id, 'git-line-history');
  assert.equal(findSnippets('git log -L')[0].id, 'git-line-history');
  assert.equal(findSnippets('review changes between two releases')[0].id, 'git-tag-commits');
  assert.equal(findSnippets('extract a log level', 'C#')[0].id, 'csharp-regex-named-group');
  assert.equal(findSnippets('Regex.Replace(')[0].id, 'csharp-regex-reformat-date');
  assert.equal(findSnippets('Regex.IsMatch(')[0].id, 'csharp-regex-repeated-words');
});

test('Git line history passes paths with spaces and apostrophes as one argument', () => {
  const path = "src/my team's [draft].js";
  const { output } = buildSnippet(byId('git-line-history'), { path, line: '4' });
  const args = execFileSync('bash', ['-c', 'git() { printf "%s\\n" "$@"; }; ' + output], { encoding: 'utf8' });
  assert.deepEqual(args.trimEnd().split('\n'), ['log', '-L', '4,4:' + path]);
});

test('C# Regex builders escape input and enforce a bounded match timeout', () => {
  const snippet = byId('csharp-regex-named-group');
  const parameters = defaultValues(snippet);
  const { output } = buildSnippet(snippet, { ...parameters, input: 'a"b\\c\u2028d', timeout: '50' });
  assert.ok(output.includes('"a\\"b\\\\c\\u2028d"'));
  assert.ok(output.includes('TimeSpan.FromMilliseconds(50)'));
  assert.equal(buildSnippet(snippet, { ...parameters, timeout: 0 }).fieldId, 'timeout');
  assert.equal(buildSnippet(snippet, { ...parameters, timeout: 5001 }).fieldId, 'timeout');
});

test('Regex source generation validates the ticket format and exposes compiler options', () => {
  const snippet = byId('csharp-regex-generated');
  const defaults = defaultValues(snippet);
  const { output } = buildSnippet(snippet, { ...defaults, prefix: 'ENG', digits: '6', ignoreCase: true, timeout: 80 });
  assert.match(output, /GeneratedRegex\("\\\\AENG-\[0-9\]\{6\}\\\\z", RegexOptions.CultureInvariant \| RegexOptions.IgnoreCase, 80\)/);
  assert.ok(buildSnippet(snippet, { ...defaults, prefix: 'OPS+' }).error);
  assert.ok(buildSnippet(snippet, { ...defaults, digits: 0 }).error);
  assert.equal(findSnippets('GeneratedRegex')[0].id, snippet.id);
});

test('literal Regex search escapes both the term and optional label', () => {
  const snippet = byId('csharp-regex-escape-literal');
  const defaults = defaultValues(snippet);
  const { output } = buildSnippet(snippet, { ...defaults, label: 'type[0]:', term: 'a.b' });
  assert.ok(output.includes('Regex.Escape("type[0]:") + @"\\s*" + Regex.Escape("a.b")'));
  assert.match(buildSnippet(snippet, { ...defaults, label: '' }).output, /var pattern = Regex.Escape\("C\+\+"\);/);
  assert.equal(findSnippets('Regex.Escape')[0].id, snippet.id);
});

test('catalog browsing includes a topic for every snippet and narrows by language or topic', () => {
  assert.ok(snippets.every(({ topic }) => topic?.trim()));
  const csharp = browseSnippets('', { language: 'C#' });
  assert.deepEqual([...new Set(csharp.map(({ topic }) => topic))].sort(), ['LINQ', 'Regex']);
  assert.deepEqual(
    browseSnippets('', { language: 'C#', topic: 'Regex' }).map(({ id }) => id),
    csharp.filter(({ topic }) => topic === 'Regex').map(({ id }) => id),
  );
  assert.deepEqual(browseSnippets('', { language: 'Git', topic: 'Regex' }), []);
});

test('a search uses the full All ranking regardless of the active language or topic', () => {
  const scope = { language: 'C#', topic: 'Regex' };
  const query = 'git log -L';
  assert.deepEqual(browseSnippets(query, scope), findSnippets(query));
  assert.equal(browseSnippets(query, scope)[0].id, 'git-line-history');
  assert.equal(browseSnippets('items.Take(', scope)[0].topic, 'LINQ');
  assert.deepEqual(browseSnippets('  ', scope), browseSnippets('', scope));
});

test('pagination preserves result order and clamps an out-of-range page', () => {
  const matches = findSnippets('a');
  assert.ok(matches.length > snippetsPerPage);
  const first = paginateSnippets(matches, 1);
  const second = paginateSnippets(matches, 2);
  assert.deepEqual(first.items, matches.slice(0, snippetsPerPage));
  assert.deepEqual(second.items, matches.slice(snippetsPerPage, snippetsPerPage * 2));
  const last = paginateSnippets(matches, 999);
  assert.equal(last.page, last.pageCount);
  assert.deepEqual(last.items, matches.slice((last.page - 1) * snippetsPerPage));
  assert.deepEqual(paginateSnippets([], 8), { page: 1, pageCount: 1, items: [] });
});

test('variant backups round-trip typed values for multiple snippets and skip empty lists', () => {
  const stored = {
    'git-file-history': [{ name: 'Daily', values: { path: 'work.txt', limit: 7, fileChanges: true } }],
    'csharp-take-items': [{ name: 'Top 3', values: { limit: '3' } }],
  };
  const backup = exportVariantBackup({ ...stored, 'git-branch-list': [] });
  assert.equal(backup.count, 2);
  assert.deepEqual(readVariantBackup(backup.json), stored);
  assert.equal(exportVariantBackup({}).count, 0);
});

test('invalid backup files fail before they can be merged', () => {
  assert.throws(() => readVariantBackup('{unfinished'), /valid JSON/);
  assert.throws(() => readVariantBackup('{"version":1}'), /exported by CodeFolio/);
  assert.throws(() => readVariantBackup('{"format":"codefolio.saved-variants","version":2}'), /version/);
  assert.throws(() => readVariantBackup(
    '{"format":"codefolio.saved-variants","version":1,"variants":{"git-file-history":[{"name":"Daily","values":{"path":[]}}]}}',
  ), /invalid saved variants/);
});

test('variant import preserves local settings, renames conflicts, and skips repeated imports', () => {
  const git = 'git-file-history';
  const stored = {
    [git]: [{ name: 'Daily', values: { path: 'local.txt', limit: '5' } }],
    'csharp-take-items': [{ name: 'Local only', values: { limit: 4 } }],
  };
  const changes = {
    [git]: [
      { name: 'Daily', values: { path: 'local.txt', limit: 5 } },
      { name: 'Daily', values: { path: 'imported.txt', limit: 7 } },
    ],
    'removed-snippet': [{ name: 'Unknown', values: {} }],
  };
  const merged = mergeVariantBackup(stored, changes, snippets);
  assert.equal(merged.added, 1);
  assert.equal(merged.renamed, 1);
  assert.equal(merged.duplicates, 1);
  assert.equal(merged.unavailable, 1);
  assert.deepEqual(merged.variants[git], [
    stored[git][0], { name: 'Daily (imported)', values: changes[git][1].values },
  ]);
  assert.deepEqual(merged.variants['csharp-take-items'], stored['csharp-take-items']);
  assert.equal(stored[git].length, 1);
  const repeated = mergeVariantBackup(merged.variants, changes, snippets);
  assert.equal(repeated.added, 0);
  assert.equal(repeated.duplicates, 2);
});

test('renaming conflicts keeps long variant names within the builder limit', () => {
  const id = 'csharp-take-items';
  const name = '🟢'.repeat(40);
  const repeated = { name, values: { limit: 3 } };
  const stored = { [id]: [{ name, values: { limit: 5 } }] };
  const merged = mergeVariantBackup(stored, { [id]: [repeated, { name, values: { limit: 4 } }] }, snippets);
  assert.equal(merged.renamed, 2);
  assert.ok(merged.variants[id].every((item) => item.name.length <= 80 && item.name.isWellFormed()));
  assert.equal(new Set(merged.variants[id].map((item) => item.name)).size, 3);
  assert.doesNotThrow(() => readVariantBackup(exportVariantBackup(merged.variants).json));
});

test('variant import checks names across snippets in the same language and topic only', () => {
  const capture = 'csharp-regex-named-group';
  const replace = 'csharp-regex-reformat-date';
  const repeat = 'csharp-regex-repeated-words';
  const linq = 'csharp-take-items';
  const name = 'Review';
  const stored = {
    [capture]: [{ name, values: { group: 'level' } }],
    [repeat]: [{ name: 'Review (imported)', values: { ignoreCase: false } }],
  };
  const incoming = {
    [replace]: [{ name, values: {} }],
    [linq]: [{ name, values: { limit: 5 } }],
  };
  const merged = mergeVariantBackup(stored, incoming, snippets);
  assert.equal(merged.added, 2);
  assert.equal(merged.renamed, 1);
  assert.equal(merged.variants[replace][0].name, 'Review (imported 2)');
  assert.equal(merged.variants[linq][0].name, name);
  assert.deepEqual(merged.variants[capture], stored[capture]);
  assert.deepEqual(merged.variants[repeat], stored[repeat]);
  const repeated = mergeVariantBackup(merged.variants, incoming, snippets);
  assert.equal(repeated.added, 0);
  assert.equal(repeated.duplicates, 2);
});

test('variant import detects a same-snippet duplicate when another snippet has a legacy name collision', () => {
  const capture = 'csharp-regex-named-group';
  const replace = 'csharp-regex-reformat-date';
  const name = 'Review';
  const stored = {
    [capture]: [{ name, values: { group: 'level' } }],
    [replace]: [{ name, values: {} }],
  };
  const merged = mergeVariantBackup(stored, { [capture]: stored[capture] }, snippets);
  assert.equal(merged.duplicates, 1);
  assert.equal(merged.added, 0);
  assert.deepEqual(merged.variants, stored);
});

test('backup export and import follow the selected language or topic', () => {
  const git = 'git-file-history';
  const linq = 'csharp-take-items';
  const regex = 'csharp-regex-named-group';
  const stored = {
    [git]: [{ name: 'Daily', values: { limit: 4 } }],
    [linq]: [{ name: 'Daily', values: { limit: 10 } }],
    [regex]: [{ name: 'Daily', values: { group: 'level' } }],
  };
  const idsFor = (scope) => new Set(browseSnippets('', scope).map(({ id }) => id));
  const csharp = exportVariantBackup(stored, idsFor({ language: 'C#' }));
  assert.deepEqual(readVariantBackup(csharp.json), { [linq]: stored[linq], [regex]: stored[regex] });
  const regexOnly = idsFor({ language: 'C#', topic: 'Regex' });
  assert.deepEqual(readVariantBackup(exportVariantBackup(stored, regexOnly).json), { [regex]: stored[regex] });
  const imported = mergeVariantBackup({ [git]: stored[git] }, stored, snippets, regexOnly);
  assert.deepEqual(imported.variants, { [git]: stored[git], [regex]: stored[regex] });
  assert.equal(imported.added, 1);
  assert.equal(imported.outsideScope, 2);
});
