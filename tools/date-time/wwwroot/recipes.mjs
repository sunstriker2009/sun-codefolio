export const platforms = {
  csharp: 'C# / .NET 10',
  javascript: 'JavaScript',
  python: 'Python',
  go: 'Go',
};

const utcInput = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/;
const dayFirst = /^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/;

export const recipes = [
  {
    id: 'format-date',
    title: 'Format a UTC date',
    description: 'Take a UTC timestamp and return its calendar date as YYYY-MM-DD.',
    inputFormat: 'YYYY-MM-DDTHH:mm:ssZ',
    examples: [
      { input: '2026-11-22T03:30:00Z', output: '2026-11-22' },
      { input: '2024-02-29T23:59:59Z', output: '2024-02-29' },
      { input: '2025-02-29T12:00:00Z', output: null },
    ],
  },
  {
    id: 'utc-to-toronto',
    title: 'Convert UTC to Toronto',
    description: 'Convert a UTC timestamp to America/Toronto and show the local time and UTC offset, including daylight saving.',
    inputFormat: 'YYYY-MM-DDTHH:mm:ssZ (1970 onward)',
    examples: [
      { input: '2026-07-01T12:00:00Z', output: '2026-07-01T08:00:00-04:00' },
      { input: '2026-01-01T12:00:00Z', output: '2026-01-01T07:00:00-05:00' },
      { input: '2026-01-01T02:30:00Z', output: '2025-12-31T21:30:00-05:00' },
    ],
  },
  {
    id: 'parse-date',
    title: 'Parse an explicit date format',
    description: 'Read DD/MM/YYYY as day, month, and year, then return YYYY-MM-DD.',
    inputFormat: 'DD/MM/YYYY',
    examples: [
      { input: '03/07/2026', output: '2026-07-03' },
      { input: '29/02/2024', output: '2024-02-29' },
      { input: '31/04/2026', output: null },
    ],
  },
];

export function validInputShape(recipe, input) {
  if (recipe === 'parse-date') return input.length === 10 && dayFirst.test(input) && input.slice(6) !== '0000';
  if (input.length !== 20 || !utcInput.test(input) || input.startsWith('0000')) return false;
  return recipe !== 'utc-to-toronto' || Number(input.slice(0, 4)) >= 1970;
}

export function formatToronto(date) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Toronto',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    timeZoneName: 'longOffset',
  });
  const { year, month, day, hour, minute, second, timeZoneName } =
    Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]));
  return [year, month, day].join('-') + 'T' + [hour, minute, second].join(':') + timeZoneName.slice(3);
}

export function dateJavaScript(recipe, input) {
  const [day, month, year] = recipe === 'parse-date' ? input.split('/') : [];
  const utc = recipe === 'parse-date' ? [year, month, day].join('-') + 'T00:00:00Z' : input;
  const date = new Date(utc);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19) !== utc.slice(0, 19)) return null;
  return recipe === 'utc-to-toronto' ? formatToronto(date) : date.toISOString().slice(0, 10);
}
