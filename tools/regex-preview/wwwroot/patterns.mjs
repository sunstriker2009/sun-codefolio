const whole = (source) => ({
  csharp: '\\A(?:' + source + ')\\z',
  javascript: '^(?:' + source + ')(?![\\s\\S])',
  python: '\\A(?:' + source + ')\\Z',
  pcre2: '\\A(?:' + source + ')\\z',
  go: '\\A(?:' + source + ')\\z',
});

export const platforms = { csharp: 'C# / .NET 10', javascript: 'JavaScript', python: 'Python', pcre2: 'PCRE2', go: 'Go' };

export const patterns = [
  {
    id: 'email-format', title: 'Email format', mode: 'whole',
    description: 'Checks for a name, @, and a dot-separated domain without whitespace. This is a basic format check.',
    expressions: whole(String.raw`[^@\s]+@[^@\s.]+(?:\.[^@\s.]+)+`),
    examples: { match: 'ada+news@example.com', noMatch: 'ada@example' },
  },
  {
    id: 'signed-integer', title: 'Signed integer', mode: 'whole',
    description: 'Matches one or more ASCII digits with an optional plus or minus sign.',
    expressions: whole('[+-]?[0-9]+'),
    examples: { match: '-42', noMatch: '3.5' },
  },
  {
    id: 'decimal-number', title: 'Decimal number', mode: 'whole',
    description: 'Matches an optional sign, at least one digit, and an optional dot and fractional digits. Captures the sign, integer part, and fraction.',
    expressions: whole(String.raw`([+-]?)([0-9]+)(?:\.([0-9]+))?`),
    examples: { match: '-12.50', noMatch: '.50' },
  },
  {
    id: 'alphanumeric', title: 'ASCII alphanumeric', mode: 'whole',
    description: 'Matches one or more English letters or ASCII digits. Spaces, punctuation, and underscores are excluded.',
    expressions: whole('[A-Za-z0-9]+'),
    examples: { match: 'CodeFolio42', noMatch: 'Code_Folio' },
  },
  {
    id: 'spaces-tabs', title: 'Spaces and tabs', mode: 'find',
    description: 'Finds the first run of spaces or tabs within text. A line break alone is excluded.',
    expressions: Object.fromEntries(Object.keys(platforms).map(engine => [engine, String.raw`[ \t]+`])),
    examples: { match: 'one\t two', noMatch: 'one\ntwo' },
  },
].map(entry => ({ ...entry, source: 'native' }));

export function matchJavaScript(pattern, text) {
  const match = new RegExp(pattern).exec(text);
  if (!match) return { status: 'no-match' };
  return { status: 'match', text: match[0], index: match.index, groups: match.slice(1).map(value => value ?? null) };
}
