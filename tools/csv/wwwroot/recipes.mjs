export const platforms = { csharp: 'C#', javascript: 'JavaScript', python: 'Python', go: 'Go' };

export function normalizeCsvInput(text) {
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

const inputFormat = 'Paste comma-separated text. Each record appears as an array of strings, including any header row.';

function example(label, input, rows) {
  return { label, input, output: rows === null ? null : JSON.stringify(rows, null, 2) };
}

export const recipes = [
  {
    id: 'quoted-commas',
    title: 'Quoted commas',
    description: 'Wrap a field in double quotes to keep its commas in a single value.',
    inputFormat,
    examples: [
      example('City and country', 'name,location\nAri,"Toronto, Canada"', [
        ['name', 'location'], ['Ari', 'Toronto, Canada'],
      ]),
      example('Empty field and a quoted value', 'id,tags,note\n42,"red,blue",', [
        ['id', 'tags', 'note'], ['42', 'red,blue', ''],
      ]),
    ],
  },
  {
    id: 'escaped-quotes',
    title: 'Escaped quotes',
    description: 'Use two consecutive double quotes to write a literal quote inside a quoted field.',
    inputFormat,
    examples: [
      example('Quoted dialogue', 'name,note\nAri,"She said ""hello""."', [
        ['name', 'note'], ['Ari', 'She said "hello".'],
      ]),
      example('Unclosed quote', 'name,note\nAri,"hello', null),
    ],
  },
  {
    id: 'multiline-fields',
    title: 'Multiline fields',
    description: 'Keep line breaks inside a quoted field so the value stays in the same record.',
    inputFormat,
    examples: [
      example('Two-line delivery note', 'id,note\n42,"Side door\nRing once"\n43,Reception', [
        ['id', 'note'], ['42', 'Side door\nRing once'], ['43', 'Reception'],
      ]),
      example('Blank line inside a note', 'id,note\n42,"First line\n\nLast line"', [
        ['id', 'note'], ['42', 'First line\n\nLast line'],
      ]),
    ],
  },
];
