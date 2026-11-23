const whole = (source) => ({
  csharp: '\\A(?:' + source + ')\\z',
  javascript: '^(?:' + source + ')(?![\\s\\S])',
  python: '\\A(?:' + source + ')\\Z',
  pcre2: '\\A(?:' + source + ')\\z',
  go: '\\A(?:' + source + ')\\z',
});

export const platforms = { csharp: 'C# / .NET 10', javascript: 'JavaScript', python: 'Python', pcre2: 'PCRE2', go: 'Go' };
const sameExpression = source => Object.fromEntries(Object.keys(platforms).map(engine => [engine, source]));

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
    expressions: sameExpression(String.raw`[ \t]+`),
    examples: { match: 'one\t two', noMatch: 'one\ntwo' },
  },
  {
    id: 'structured-log-line', title: 'Structured log line', mode: 'whole',
    description: 'Extracts a UTC timestamp, severity level, and message from one log line. The timestamp check verifies the format.',
    expressions: whole(String.raw`([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z)[ \t]+(TRACE|DEBUG|INFO|WARN|ERROR|FATAL)[ \t]+([^ \t\r\n][^\r\n]*)`),
    examples: {
      match: '2026-11-22T14:05:17Z WARN Cache miss for order 42',
      noMatch: 'WARN Cache miss for order 42',
      edge: '2026-11-22T14:05:17Z INFO ',
    },
    recipe: {
      captures: ['Timestamp', 'Level', 'Message'],
      matchGroups: ['2026-11-22T14:05:17Z', 'WARN', 'Cache miss for order 42'],
      edgeGroups: null,
    },
  },
  {
    id: 'key-value-field', title: 'Key-value field', mode: 'find',
    description: 'Extracts the first key=value field separated by whitespace. Values start with an unquoted character and can contain equals signs. The match can include a leading separator.',
    expressions: sameExpression(String.raw`(?:^|[ \t\r\n])([A-Za-z_][A-Za-z0-9_.-]*)=([^ \t\r\n"'][^ \t\r\n]*)`),
    examples: {
      match: 'host=api-1 env=prod',
      noMatch: 'request-id: 42',
      edge: 'route=/orders?id=42',
    },
    recipe: {
      captures: ['Key', 'Value'],
      matchGroups: ['host', 'api-1'],
      edgeGroups: ['route', '/orders?id=42'],
    },
  },
  {
    id: 'double-quoted-string', title: 'Double-quoted string', mode: 'find',
    description: 'Extracts the contents of the first double-quoted string, including escaped quotes and backslashes. The capture preserves escape sequences.',
    expressions: sameExpression(String.raw`"((?:[^"\\\r\n]|\\[^\r\n])*)"`),
    examples: {
      match: String.raw`name="Ada \"A\" Lovelace"`,
      noMatch: 'name="Ada',
      edge: 'name=""',
    },
    recipe: {
      captures: ['Quoted contents'],
      matchGroups: [String.raw`Ada \"A\" Lovelace`],
      edgeGroups: [''],
    },
  },
].map(entry => ({ ...entry, source: 'native' }));

export function matchJavaScript(pattern, text, limit = 1) {
  const matches = [];
  for (const match of text.matchAll(new RegExp(pattern, 'g'))) {
    matches.push({
      text: match[0],
      index: match.index,
      groups: match.slice(1).map(value => value ?? null),
      named: Object.entries(match.groups ?? {}).map(([name, value]) => ({ name, value: value ?? null })),
    });
    if (matches.length === limit) break;
  }
  return matches.length ? { status: 'match', matches } : { status: 'no-match' };
}
