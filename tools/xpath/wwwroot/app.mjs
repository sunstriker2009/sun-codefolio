import { createRunner } from '../regex/runner.mjs?v=date-topics-1';
import { evaluateBrowserXPath } from './browser-xpath.mjs?v=xpath-1';
import { platforms, prepareXPath, recipes } from './recipes.mjs?v=xpath-1';
import { xpathUsage } from './usage.mjs?v=xpath-1';

const byId = id => document.getElementById(id);
const platform = byId('xpath-platform');
const examples = byId('xpath-examples');
const xml = byId('xpath-xml');
const query = byId('xpath-query');
const namespaces = byId('xpath-namespaces');
const status = byId('xpath-status');
const output = byId('xpath-output');
const run = byId('xpath-run');
const code = byId('xpath-code');
const copyStatus = byId('xpath-copy-status');
const worker = new URL('./xpath-worker.mjs?v=xpath-1', import.meta.url);
const runners = { csharp: createRunner('csharp', worker), python: createRunner('python', worker) };
let recipe;
let version = 0;

for (const [id, label] of Object.entries(platforms)) platform.add(new Option(label, id));
for (const entry of recipes) examples.add(new Option(entry.title, entry.id));

function clearResult() {
  version++;
  status.textContent = '';
  output.hidden = true;
  run.disabled = false;
}

function renderUsage() {
  code.textContent = xpathUsage(recipe, platform.value);
  copyStatus.textContent = '';
}

function saveLocation() {
  const url = new URL(location.href);
  url.searchParams.set('recipe', recipe.id);
  url.searchParams.set('platform', platform.value);
  history.replaceState(null, '', url);
}

function loadExample(entry) {
  recipe = entry;
  xml.value = entry.xml;
  query.value = entry.query;
  namespaces.value = entry.namespaces;
  byId('xpath-namespace-section').open = Boolean(entry.namespaces);
  byId('xpath-description').textContent = entry.description;
  examples.value = '';
  renderUsage();
  clearResult();
}

function readLocation() {
  const params = new URL(location.href).searchParams;
  const engine = params.get('platform');
  platform.value = Object.hasOwn(platforms, engine) ? engine : 'csharp';
  loadExample(recipes.find(entry => entry.id === params.get('recipe')) ?? recipes[0]);
}

platform.addEventListener('change', () => {
  renderUsage();
  clearResult();
  saveLocation();
});
examples.addEventListener('change', () => {
  if (!examples.value) return;
  loadExample(recipes.find(entry => entry.id === examples.value));
  saveLocation();
});
for (const field of [xml, query, namespaces]) field.addEventListener('input', clearResult);
window.addEventListener('popstate', readLocation);

function showResult(result) {
  if (result.status === 'scalar') {
    status.textContent = 'Result · ' + result.kind;
    output.textContent = result.value === '' ? 'Empty string' : result.value;
    output.hidden = false;
    return;
  }
  if (result.status === 'nodes') {
    const count = result.nodes.length;
    status.textContent = result.truncated ? 'Showing the first ' + count + ' nodes.'
      : count + (count === 1 ? ' node selected.' : ' nodes selected.');
    output.textContent = result.nodes.map(({ kind, name, value }, index) =>
      (index + 1) + '. ' + kind + (name ? ' · ' + name : '') + '\n' + (value || 'Empty value')).join('\n\n');
    output.hidden = count === 0;
    return;
  }
  const labels = {
    timeout: 'The XPath evaluation timed out.',
    'load-error': 'The runner could not load. Try again.',
  };
  status.textContent = result.message ?? labels[result.status] ?? 'The runner could not complete the XPath expression.';
}

byId('xpath-try-it').addEventListener('submit', async event => {
  event.preventDefault();
  clearResult();
  let input;
  try {
    input = prepareXPath(xml.value, query.value, namespaces.value);
  } catch (error) {
    status.textContent = error.message;
    return;
  }

  const current = version;
  const engine = platform.value;
  run.disabled = true;
  status.textContent = 'Running ' + platforms[engine] + '…';
  const result = engine === 'javascript' ? evaluateBrowserXPath(input) : await runners[engine]('xpath', JSON.stringify(input));
  if (current !== version) return;
  run.disabled = false;
  showResult(result);
});

byId('xpath-copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(code.textContent);
    copyStatus.textContent = 'Usage example copied.';
  } catch {
    const range = document.createRange();
    range.selectNodeContents(code);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    copyStatus.textContent = 'Usage example selected. Copy the selection.';
  }
});

readLocation();
