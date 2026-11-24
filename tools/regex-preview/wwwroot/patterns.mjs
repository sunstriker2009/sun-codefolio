const whole = (source) => ({
  csharp: '\\A(?:' + source + ')\\z',
  javascript: '^(?:' + source + ')(?![\\s\\S])',
  python: '\\A(?:' + source + ')\\Z',
  pcre2: '\\A(?:' + source + ')\\z',
  go: '\\A(?:' + source + ')\\z',
});

export const platforms = { csharp: 'C# / .NET 10', javascript: 'JavaScript', python: 'Python', pcre2: 'PCRE2', go: 'Go' };
const sameExpression = source => Object.fromEntries(Object.keys(platforms).map(engine => [engine, source]));

const mixedPasswordExpressions = whole(
  '(?=[!-~]*[A-Z])(?=[!-~]*[a-z])(?=[!-~]*[0-9])' +
  '(?=[!-~]*[\\x21-\\x2F\\x3A-\\x40\\x5B-\\x60\\x7B-\\x7E])[!-~]{8,}',
);
delete mixedPasswordExpressions.go;

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
    id: 'ipv4-address', title: 'IPv4 address', mode: 'whole',
    description: 'Checks four decimal octets from 0 to 255. An octet cannot have a leading zero.',
    expressions: whole('(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])'),
    examples: { match: '192.0.2.255', noMatch: '192.0.2.256' },
  },
  {
    id: 'uuid-v4', title: 'UUID v4', mode: 'whole',
    description: 'Checks the hyphenated UUID v4 format, including the version and variant digits.',
    expressions: whole('[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}'),
    examples: { match: '123e4567-e89b-42d3-a456-426614174000', noMatch: '123e4567-e89b-12d3-a456-426614174000' },
  },
  {
    id: 'css-hex-color', title: 'CSS hex color', mode: 'whole',
    description: 'Checks #RGB, #RGBA, #RRGGBB, or #RRGGBBAA using hexadecimal digits.',
    expressions: whole('#(?:[0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})'),
    examples: { match: '#ff9e4080', noMatch: '#ff9e4' },
  },
  {
    id: 'canadian-postal-code', title: 'Canadian postal code format', mode: 'whole',
    description: 'Checks the uppercase A1A 1A1 format with a single space. Use an address lookup to confirm delivery.',
    expressions: whole('[ABCEGHJ-NPRSTVXY][0-9][ABCEGHJ-NPRSTV-Z] [0-9][ABCEGHJ-NPRSTV-Z][0-9]'),
    examples: { match: 'K1A 0B1', noMatch: 'D1A 0B1' },
  },
  {
    id: 'iso-date-format', title: 'ISO date format', mode: 'whole',
    description: 'Checks YYYY-MM-DD with months 01–12 and days 01–31. Use a date parser to check month lengths and leap years.',
    expressions: whole('[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])'),
    examples: { match: '2026-11-23', noMatch: '2026-13-23' },
  },
  {
    id: 'time-24-hour', title: '24-hour time', mode: 'whole',
    description: 'Checks HH:MM or HH:MM:SS, with hours 00–23 and minutes and seconds 00–59.',
    expressions: whole('(?:[01][0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?'),
    examples: { match: '23:59:59', noMatch: '24:00' },
  },
  {
    id: 'url-slug', title: 'URL slug', mode: 'whole',
    description: 'Checks lowercase letters and digits with single hyphens between segments.',
    expressions: whole('[a-z0-9]+(?:-[a-z0-9]+)*'),
    examples: { match: 'release-notes-2026', noMatch: 'release--notes' },
  },
  {
    id: 'credit-card-number', title: 'Credit-card number format', mode: 'whole',
    description: 'Checks for 13–19 digits without spaces or hyphens. Use a Luhn checksum for a separate check. Try the test number in Examples.',
    expressions: whole('[0-9]{13,19}'),
    examples: { match: '4111111111111111', noMatch: '4111-1111-1111-1111' },
  },
  {
    id: 'password-min-length', title: 'Password · minimum 8 characters', mode: 'whole',
    description: 'Checks for at least eight printable ASCII characters. Spaces are allowed. This demonstrates a length rule for a sample policy.',
    expressions: whole('[ -~]{8,}'),
    examples: { match: 'sample phrase', noMatch: 'short' },
  },
  {
    id: 'password-character-mix', title: 'Password · 8+ with mixed characters', mode: 'whole',
    description: 'Demonstrates a sample rule for 8 or more printable ASCII characters with an uppercase letter, a lowercase letter, a digit, and a symbol. Spaces are excluded. The lookaheads used by this example are unavailable in Go.',
    expressions: mixedPasswordExpressions,
    examples: { match: 'DemoPass7!', noMatch: 'DemoPass7' },
  },
  {
    id: 'person-name-latin', title: 'Person name · Latin letters', mode: 'whole',
    description: 'Checks one or more name segments in the basic Latin, Latin-1, or Latin Extended-A alphabets. A single space, hyphen, or apostrophe can separate segments.',
    expressions: whole("[A-Za-zÀ-ÖØ-öø-ſ]+(?:[ '’-][A-Za-zÀ-ÖØ-öø-ſ]+)*"),
    examples: { match: 'Ana-María O’Neill', noMatch: 'Ana 42' },
  },
  {
    id: 'canadian-phone-format', title: 'Canadian phone number format', mode: 'whole',
    description: 'Checks the North American format used by Canadian mobile and landline numbers, with an optional +1. Format alone cannot identify the region or line type.',
    expressions: whole('(?:\\+1[ -]?)?(?:\\([2-9][0-9]{2}\\)[ -]?|[2-9][0-9]{2}[ -]?)[2-9][0-9]{2}[ -]?[0-9]{4}'),
    examples: { match: '+1 (416) 555-0101', noMatch: '+1 (116) 555-0101' },
  },
  {
    id: 'username-format', title: 'Username format', mode: 'whole',
    description: 'Checks a 3–20 character username that starts with a letter and uses letters, digits, or underscores.',
    expressions: whole('[A-Za-z][A-Za-z0-9_]{2,19}'),
    examples: { match: 'Ada_42', noMatch: '_Ada' },
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
].map(entry => ({
  ...entry,
  source: 'native',
  tags: entry.recipe ? ['extractor'] : entry.mode === 'whole' ? ['validator'] : [],
}));

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
