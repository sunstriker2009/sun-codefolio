import { evaluateTestCases, maxCaseInput, maxCaseName, maxTestCases, readTestCases } from './test-cases.mjs?v=regex-cases-1';

const expectations = { match: 'Match', 'no-match': 'No match' };
const messages = {
  timeout: 'Timed out',
  limit: 'Engine limit reached',
  'load-error': 'Runner could not load',
  canceled: 'Canceled',
  error: 'Runner could not complete the case',
};

function field(name, control) {
  const label = document.createElement('label');
  label.append(name, control);
  return label;
}

export function createCasePanel({ expression, engine, run, onStart, onBusyChange }) {
  const byId = id => document.getElementById(id);
  const panel = byId('test-cases');
  const summary = byId('test-cases-summary');
  const list = byId('test-case-list');
  const fields = byId('test-case-fields');
  const add = byId('add-test-case');
  const runButton = byId('run-test-cases');
  const status = byId('test-cases-status');
  let cases;
  let editing = false;
  let locked = false;
  let busy = false;
  let version = 0;
  let rows = [];

  function updateControls() {
    add.hidden = !editing;
    add.disabled = locked || cases?.length >= maxTestCases;
    fields.disabled = locked;
    runButton.disabled = locked || (!busy && (!cases?.length || !expression()));
    runButton.textContent = busy ? 'Stop' : 'Run cases';
    onBusyChange();
  }

  function invalidate() {
    version++;
    busy = false;
    status.textContent = '';
    for (const row of rows) row.result.textContent = '';
    updateControls();
  }

  function renderRow(entry, index) {
    const item = document.createElement('li');
    const detail = document.createElement('details');
    const header = document.createElement('summary');
    const name = document.createElement('span');
    const result = document.createElement('span');
    const title = () => entry.name.trim() || 'Case ' + (index + 1);
    name.textContent = title();
    header.append(name, result);
    detail.append(header);
    item.append(detail);

    let nameInput;
    if (editing) {
      nameInput = document.createElement('input');
      nameInput.maxLength = maxCaseName;
      nameInput.value = entry.name;
      const input = document.createElement('textarea');
      input.rows = 2;
      input.maxLength = maxCaseInput;
      input.spellcheck = false;
      input.value = entry.input;
      const expected = document.createElement('select');
      for (const [value, label] of Object.entries(expectations)) expected.add(new Option(label, value));
      expected.value = entry.expected;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Remove case';
      nameInput.addEventListener('input', () => {
        entry.name = nameInput.value;
        name.textContent = title();
        invalidate();
      });
      input.addEventListener('input', () => {
        entry.input = input.value;
        invalidate();
      });
      expected.addEventListener('change', () => {
        entry.expected = expected.value;
        invalidate();
      });
      remove.addEventListener('click', () => {
        cases.splice(index, 1);
        render(cases, true, index);
        if (!rows[index]) add.focus();
      });
      detail.append(field('Case name', nameInput), field('Case input', input), field('Expected result', expected), remove);
    } else {
      const expected = document.createElement('p');
      expected.textContent = 'Expected ' + expectations[entry.expected].toLowerCase() + '.';
      const input = document.createElement('pre');
      input.textContent = entry.input || 'Empty input';
      detail.append(expected, input);
    }
    return { item, detail, nameInput, result };
  }

  function render(nextCases, editable, focusIndex) {
    cases = nextCases;
    editing = editable;
    panel.hidden = !cases;
    byId('no-test-cases').hidden = editing || Boolean(cases?.length);
    summary.textContent = cases?.length ? 'Test cases (' + cases.length + ')' : 'Test cases';
    rows = (cases ?? []).map(renderRow);
    list.replaceChildren(...rows.map(row => row.item));
    if (rows[focusIndex]) {
      rows[focusIndex].detail.open = true;
      rows[focusIndex].nameInput.focus();
    }
    invalidate();
  }

  add.addEventListener('click', () => {
    cases.push({ name: '', input: '', expected: 'match' });
    render(cases, true, cases.length - 1);
  });

  runButton.addEventListener('click', async () => {
    if (busy) {
      invalidate();
      status.textContent = 'Stopped.';
      return;
    }
    let tests;
    try {
      tests = readTestCases(cases);
    } catch (error) {
      status.textContent = error.message;
      return;
    }
    invalidate();
    const runVersion = version;
    const pattern = expression();
    const platform = engine();
    const isCurrent = () => runVersion === version;
    const counts = { pass: 0, fail: 0, error: 0 };
    busy = true;
    updateControls();
    onStart();
    status.textContent = 'Running ' + tests.length + ' test cases…';
    await evaluateTestCases(tests, text => run(platform, pattern, text), isCurrent, (index, outcome, result) => {
      counts[outcome]++;
      const label = { pass: 'Passed', fail: 'Failed', error: 'Error' }[outcome];
      const actual = result.status === 'invalid' ? result.message : expectations[result.status] ?? messages[result.status];
      rows[index].result.textContent = ' · ' + label + (actual ? ' · ' + actual : '');
    });
    if (!isCurrent()) return;
    busy = false;
    const skipped = tests.length - counts.pass - counts.fail - counts.error;
    status.textContent = counts.pass + ' passed, ' + counts.fail + ' failed, ' + counts.error + ' errors.'
      + (skipped ? ' ' + skipped + ' not run.' : '');
    updateControls();
  });

  return {
    render,
    invalidate,
    get busy() { return busy; },
    lock(value) {
      locked = value;
      invalidate();
    },
  };
}
