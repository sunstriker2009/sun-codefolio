export const maxTestCases = 20;
export const maxCaseName = 80;
export const maxCaseInput = 10_000;

export function readTestCases(cases) {
  if (!Array.isArray(cases) || cases.length > maxTestCases) {
    throw new Error('A pattern can have up to ' + maxTestCases + ' test cases.');
  }
  const names = new Set();
  return cases.map(entry => {
    const name = typeof entry?.name === 'string' ? entry.name.trim() : '';
    if (!name || name.length > maxCaseName) {
      throw new Error('Enter a name of up to ' + maxCaseName + ' characters for each test case.');
    }
    const key = name.toLowerCase();
    if (names.has(key)) throw new Error('Give each test case a unique name.');
    names.add(key);
    if (typeof entry.input !== 'string' || entry.input.length > maxCaseInput
      || !['match', 'no-match'].includes(entry.expected)) {
      throw new Error('Test case “' + name + '” has invalid input or an invalid expectation.');
    }
    return { name, input: entry.input, expected: entry.expected };
  });
}

export async function evaluateTestCases(cases, match, isCurrent, onResult) {
  for (const [index, entry] of cases.entries()) {
    if (!isCurrent()) break;
    const result = await match(entry.input);
    if (!isCurrent()) break;
    const completed = result.status === 'match' || result.status === 'no-match';
    const outcome = completed ? (result.status === entry.expected ? 'pass' : 'fail') : 'error';
    onResult(index, outcome, result);
    if (['invalid', 'load-error', 'canceled'].includes(result.status)) break;
  }
}
