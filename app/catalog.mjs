const shellLiteral = (value) => "'" + value.replaceAll("'", "'\\''") + "'";

function xpathLiteral(value) {
  if (!value.includes("'")) return "'" + value + "'";
  if (!value.includes('"')) return '"' + value + '"';
  return 'concat(' + value.split("'").map((part) => "'" + part + "'").join(', "\'", ') + ')';
}

export const snippets = [
  {
    id: 'git-file-history',
    aliases: ["git log --oneline", "file history"],
    useCases: ["Find old changes to a file", "See which commits changed a path"],
    relatedIds: ["git-branch-list"],
    language: 'Git',
    title: 'View a file’s commit history',
    description: 'List recent commits that changed a path in the current Git history. Use a path relative to the repository root and run the command from there.',
    keywords: 'log commits history changes file path bash shell',
    example: 'Show the last five commits affecting src/app.js in a POSIX shell.',
    fields: [
      { id: 'path', label: 'File path', default: 'src/app.js' },
      { id: 'limit', label: 'Commit count', default: '5', pattern: '[1-9][0-9]{0,3}', hint: 'Enter a number from 1 to 9999.' },
    ],
    render: ({ path, limit }) => 'git --literal-pathspecs log --oneline -n ' + limit + ' -- ' + shellLiteral(path),
  },
  {
    id: 'git-branch-list',
    aliases: ["git branch list", "recent branches"],
    useCases: ["Find recently updated local branches"],
    relatedIds: ["git-file-history"],
    language: 'Git',
    title: 'List recent local branches',
    description: 'Show local branches in order of the date of their latest commit, with the most recent first.',
    keywords: 'branch list recent refs sort terminal bash',
    example: 'List the three branches with the most recent commits.',
    fields: [
      { id: 'limit', label: 'Branch count', default: '3', pattern: '[1-9][0-9]{0,3}', hint: 'Enter a number from 1 to 9999.' },
    ],
    render: ({ limit }) => 'git for-each-ref --sort=-committerdate --count=' + limit
      + " --format='%(refname:short)' refs/heads/",
  },
  {
    id: 'js-filter-array',
    aliases: ["Array.filter", "filter array"],
    useCases: ["Find objects with a matching field", "Keep records with a particular status"],
    relatedIds: ["js-join-array", "csharp-take-items"],
    language: 'JavaScript',
    title: 'Filter an array by property',
    description: 'Keep objects whose chosen property equals a string. Property names can contain spaces or punctuation.',
    keywords: 'js filter array object match equality select list',
    example: 'From an array called items, keep only objects with status set to active.',
    fields: [
      { id: 'property', label: 'Property name', default: 'status' },
      { id: 'value', label: 'Matching text', default: 'active', allowEmpty: true },
    ],
    render: ({ property, value }) => 'const matches = items.filter((item) => item['
      + JSON.stringify(property) + '] === ' + JSON.stringify(value) + ');',
  },
  {
    id: 'js-join-array',
    aliases: ["Array.join", "join array"],
    useCases: ["Turn a list of labels into comma-separated text"],
    relatedIds: ["js-filter-array"],
    language: 'JavaScript',
    title: 'Join an array into a string',
    description: 'Combine the elements of an array called items into a string with a separator.',
    keywords: 'js array join delimiter concatenate string separator list',
    example: 'Convert an array of labels into a string separated by commas and spaces.',
    fields: [{ id: 'separator', label: 'Separator', default: ', ', allowEmpty: true }],
    render: ({ separator }) => 'const joined = items.join(' + JSON.stringify(separator) + ');',
  },
  {
    id: 'csharp-take-items',
    aliases: ["Enumerable.Take", "LINQ Take"],
    useCases: ["Get the first N items from a collection"],
    relatedIds: ["js-filter-array"],
    language: 'C#',
    title: 'Take the first items from a sequence',
    description: 'Use LINQ to take up to a fixed number of items from an enumerable called items. Calling ToList materializes the result.',
    keywords: 'csharp dotnet .net linq enumerable list limit',
    example: 'Take up to ten items from the input sequence. Add using System.Linq if needed.',
    fields: [
      { id: 'limit', label: 'Item count', default: '10', pattern: '[1-9][0-9]{0,3}', hint: 'Enter a number from 1 to 9999.' },
    ],
    render: ({ limit }) => 'var firstItems = items.Take(' + limit + ').ToList();',
  },
  {
    id: 'xpath-match-attribute',
    aliases: ["attribute selector", "attribute predicate"],
    useCases: ["Find HTML or XML elements with a matching attribute"],
    relatedIds: ["js-filter-array"],
    language: 'XPath',
    title: 'Find elements by attribute value',
    description: 'Find elements anywhere in a document whose selected unprefixed attribute exactly matches a value. Works in XPath 1.0.',
    keywords: 'xml xpath html locator select attribute predicate quotes',
    example: 'Find every element with a data-state attribute equal to ready.',
    fields: [
      { id: 'attribute', label: 'Attribute name', default: 'data-state', pattern: '[A-Za-z_][A-Za-z0-9_.\\-]*', hint: 'Use an unprefixed ASCII attribute name.' },
      { id: 'value', label: 'Attribute value', default: 'ready', allowEmpty: true },
    ],
    render: ({ attribute, value }) => '//*[@' + attribute + '=' + xpathLiteral(value) + ']',
  },
];

export function defaultValues(snippet) {
  return Object.fromEntries(snippet.fields.map((field) => [field.id, field.default]));
}

export function buildSnippet(snippet, values) {
  for (const field of snippet.fields) {
    const value = values[field.id];
    if (typeof value !== 'string' || (!field.allowEmpty && !value.trim())) {
      return { error: field.label + ' is required.' };
    }
    if (field.pattern && !new RegExp('^(?:' + field.pattern + ')$', 'v').test(value)) {
      return { error: field.hint };
    }
  }

  return { output: snippet.render(values) };
}

const normalizeSearch = (value) => value.toLowerCase().trim().replace(/\s+/g, ' ');
const taskWords = new Set(['a', 'an', 'i', 'in', 'me', 'of', 'the', 'to', 'with']);

const searchIndex = snippets.map((snippet) => {
  const names = [snippet.title, ...snippet.aliases].map(normalizeSearch);
  const exampleCode = normalizeSearch(buildSnippet(snippet, defaultValues(snippet)).output);
  const searchable = normalizeSearch([
    ...names, snippet.language, snippet.description, snippet.keywords, snippet.example,
    ...snippet.useCases, exampleCode,
  ].join(' '));
  return { snippet, names, exampleCode, searchable };
});

function relevance(entry, phrase, terms) {
  if (entry.names.includes(phrase)) return 4;
  if (entry.exampleCode.includes(phrase)) return 3;
  if (entry.searchable.includes(phrase)) return 2;
  return terms.every((term) => entry.searchable.includes(term)) ? 1 : 0;
}

export function findSnippets(query, language) {
  const phrase = normalizeSearch(query);
  const words = phrase.split(' ');
  const taskTerms = words.filter((word) => !taskWords.has(word));
  const terms = taskTerms.length ? taskTerms : words;

  return searchIndex
    .filter(({ snippet }) => !language || snippet.language === language)
    .map((entry) => ({ snippet: entry.snippet, score: phrase ? relevance(entry, phrase, terms) : 1 }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .map(({ snippet }) => snippet);
}
