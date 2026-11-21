import { defaultValues, parseValues } from './parameters.mjs';

export { defaultValues } from './parameters.mjs';

const shellLiteral = (value) => "'" + value.replaceAll("'", "'\\''") + "'";

function xpathLiteral(value) {
  if (!value.includes("'")) return "'" + value + "'";
  if (!value.includes('"')) return '"' + value + '"';
  return 'concat(' + value.split("'").map((part) => "'" + part + "'").join(', "\'", ') + ')';
}

export const snippets = [
  {
    id: 'git-file-history',
    prerequisites: "Git and a POSIX shell. Run from the repository root.",
    expected: "Up to five lines with a short commit hash and subject, newest first, for commits that changed src/app.js.",
    effects: "Reads commit history for the selected branch and path. File change details show the status and path of changed files.",
    aliases: ["git log --oneline", "file history"],
    useCases: ["Find old changes to a file", "See which commits changed a path"],
    relatedIds: ["git-branch-list"],
    language: 'Git',
    title: 'View a file’s commit history',
    description: 'List commits that changed a file. Leave the branch blank to use the current history, or enter a local branch name. Use a path relative to the repository root.',
    keywords: 'log commits history changes file path bash shell',
    example: 'Show the last five commits affecting src/app.js in a POSIX shell.',
    fields: [
      { id: 'path', type: 'text', label: 'File path', default: 'src/app.js' },
      { id: 'limit', type: 'integer', label: 'Commit count', default: 5, min: 1, max: 9999, hint: 'Commit count must be between 1 and 9999.' },
      { id: 'branch', type: 'text', label: 'Local branch (optional)', default: '', allowEmpty: true },
      { id: 'fileChanges', type: 'toggle', label: 'Show file change details', default: false },
    ],
    render: ({ path, limit, branch, fileChanges }) => {
      const args = ['git --literal-pathspecs log --oneline', '-n ' + limit];
      if (fileChanges) args.push('--name-status');
      if (branch.trim()) args.push('--end-of-options', shellLiteral('refs/heads/' + branch.trim()));
      args.push('--', shellLiteral(path));
      return args.join(' ');
    },
  },
  {
    id: 'git-branch-list',
    prerequisites: "Git in a local repository.",
    expected: "With the default sort order, up to three short branch names ordered by the date of each branch’s latest commit.",
    effects: "Reads local branch references.",
    aliases: ["git branch list", "recent branches"],
    useCases: ["Find recently updated local branches"],
    relatedIds: ["git-file-history"],
    language: 'Git',
    title: 'List recent local branches',
    description: 'Show local branches by date of their latest commit or in name order.',
    keywords: 'branch list recent refs sort terminal bash',
    example: 'List the three branches with the most recent commits.',
    fields: [
      { id: 'limit', type: 'integer', label: 'Branch count', default: 3, min: 1, max: 9999, hint: 'Branch count must be between 1 and 9999.' },
      {
        id: 'sort', type: 'choice', label: 'Sort by', default: '-committerdate',
        options: [
          { value: '-committerdate', label: 'Latest commit' },
          { value: 'refname', label: 'Branch name' },
        ],
      },
    ],
    render: ({ limit, sort }) => 'git for-each-ref --sort=' + sort + ' --count=' + limit
      + " --format='%(refname:short)' refs/heads/",
  },
  {
    id: 'js-filter-array',
    prerequisites: "An array named items. Each element should be an object.",
    expected: "For [{ status: \"active\" }, { status: \"archived\" }], matches contains only the active record.",
    effects: "Creates a new array that shares references to the matching objects.",
    aliases: ["Array.filter", "filter array"],
    useCases: ["Find objects with a matching field", "Keep records with a particular status"],
    relatedIds: ["js-join-array", "csharp-take-items"],
    language: 'JavaScript',
    title: 'Filter an array by property',
    description: 'Keep objects whose chosen property equals a string. Property names can contain spaces or punctuation.',
    keywords: 'js filter array object match equality select list',
    example: 'From an array called items, keep only objects with status set to active.',
    fields: [
      { id: 'property', type: 'text', label: 'Property name', default: 'status' },
      { id: 'value', type: 'text', label: 'Matching text', default: 'active', allowEmpty: true },
    ],
    render: ({ property, value }) => 'const matches = items.filter((item) => item['
      + JSON.stringify(property) + '] === ' + JSON.stringify(value) + ');',
  },
  {
    id: 'js-join-array',
    prerequisites: "An array named items.",
    expected: "For [\"alpha\", \"beta\", \"gamma\"], joined is \"alpha, beta, gamma\".",
    effects: "Creates a string and coerces non-string elements to text where applicable.",
    aliases: ["Array.join", "join array"],
    useCases: ["Turn a list of labels into comma-separated text"],
    relatedIds: ["js-filter-array"],
    language: 'JavaScript',
    title: 'Join an array into a string',
    description: 'Combine the elements of an array called items into a string with a separator.',
    keywords: 'js array join delimiter concatenate string separator list',
    example: 'Convert an array of labels into a string separated by commas and spaces.',
    fields: [{ id: 'separator', type: 'text', label: 'Separator', default: ', ', allowEmpty: true }],
    render: ({ separator }) => 'const joined = items.join(' + JSON.stringify(separator) + ');',
  },
  {
    id: 'csharp-take-items',
    prerequisites: "A sequence named items and System.Linq in scope.",
    expected: "For twelve input elements, firstItems is a list containing the first ten in input order.",
    effects: "Enumerates up to the requested number of elements and materializes a new list.",
    aliases: ["Enumerable.Take", "LINQ Take"],
    useCases: ["Get the first N items from a collection"],
    relatedIds: ["js-filter-array"],
    language: 'C#',
    title: 'Take the first items from a sequence',
    description: 'Use LINQ to take up to a fixed number of items from an enumerable called items. Calling ToList materializes the result.',
    keywords: 'csharp dotnet .net linq enumerable list limit',
    example: 'Take up to ten items from the input sequence. Add using System.Linq if needed.',
    fields: [
      { id: 'limit', type: 'integer', label: 'Item count', default: 10, min: 1, max: 9999, hint: 'Item count must be between 1 and 9999.' },
    ],
    render: ({ limit }) => 'var firstItems = items.Take(' + limit + ').ToList();',
  },
  {
    id: 'xpath-match-attribute',
    prerequisites: "An XML or HTML document and an XPath 1.0 evaluator.",
    expected: "For a document with one data-state=\"ready\" element and one data-state=\"queued\" element, only the ready element matches.",
    effects: "Evaluates the document and returns matching element nodes.",
    aliases: ["attribute selector", "attribute predicate"],
    useCases: ["Find HTML or XML elements with a matching attribute"],
    relatedIds: ["js-filter-array"],
    language: 'XPath',
    title: 'Find elements by attribute value',
    description: 'Find elements anywhere in a document whose selected unprefixed attribute exactly matches a value. Works in XPath 1.0.',
    keywords: 'xml xpath html locator select attribute predicate quotes',
    example: 'Find every element with a data-state attribute equal to ready.',
    fields: [
      { id: 'attribute', type: 'text', label: 'Attribute name', default: 'data-state', pattern: '[A-Za-z_][A-Za-z0-9_.\\-]*', hint: 'Use an unprefixed ASCII attribute name.' },
      { id: 'value', type: 'text', label: 'Attribute value', default: 'ready', allowEmpty: true },
    ],
    render: ({ attribute, value }) => '//*[@' + attribute + '=' + xpathLiteral(value) + ']',
  },
];

export function buildSnippet(snippet, values) {
  const parsed = parseValues(snippet, values);
  if (parsed.error) return parsed;
  return { output: snippet.render(parsed.parameters), parameters: parsed.parameters };
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
