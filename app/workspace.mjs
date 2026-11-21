import { buildSnippet, defaultValues, findSnippets, snippets } from './catalog.mjs';

const byId = (id) => document.getElementById(id);
const search = byId('search');
const filters = byId('filters');
const results = byId('results');
const detail = byId('detail');
const builder = byId('builder');
const fields = byId('fields');
const output = byId('output');
const copy = byId('copy');
const nameInput = byId('variant-name');
const variantList = byId('variants');
const builderStatus = byId('builder-status');
const variantStatus = byId('variant-status');
const storageKey = 'codefolio.variants.v1';

let language = '';
let selected;
let shownSnippets = [];

function button(label, onClick) {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  element.addEventListener('click', onClick);
  return element;
}

const filterButtons = new Map(
  ['', ...new Set(snippets.map((snippet) => snippet.language))].map((option) => [
    option,
    button(option || 'All', () => {
      language = option;
      updateResults();
    }),
  ])
);

filters.append(...filterButtons.values());

function updateResults() {
  shownSnippets = findSnippets(search.value, language);
  for (const [option, control] of filterButtons) {
    control.setAttribute('aria-pressed', option === language);
  }

  const count = shownSnippets.length;
  byId('result-count').textContent = count + (count === 1 ? ' snippet' : ' snippets');
  if (!shownSnippets.includes(selected)) selectSnippet(shownSnippets[0]);

  results.replaceChildren(...shownSnippets.map((snippet) => {
    const row = document.createElement('li');
    const control = button('', () => {
      selectSnippet(snippet);
      if (matchMedia('(max-width: 720px)').matches) {
        byId('snippet-title').focus();
      }
    });
    control.className = 'result';
    control.dataset.snippetId = snippet.id;
    control.setAttribute('aria-controls', 'detail');
    for (const text of [snippet.title, snippet.language]) {
      const label = document.createElement('span');
      label.textContent = text;
      control.append(label);
    }
    row.append(control);
    return row;
  }));
  markSelection();
}

function markSelection() {
  for (const control of results.querySelectorAll('button')) {
    control.setAttribute('aria-current', control.dataset.snippetId === selected?.id);
  }
}

function selectSnippet(snippet) {
  if (selected === snippet) return;
  selected = snippet;
  detail.hidden = !snippet;
  byId('empty').hidden = Boolean(snippet);
  markSelection();
  if (!snippet) return;

  byId('snippet-title').textContent = snippet.title;
  byId('snippet-language').textContent = snippet.language;
  byId('snippet-description').textContent = snippet.description;
  byId('example-context').textContent = snippet.example;
  byId('example').textContent = buildSnippet(snippet, defaultValues(snippet)).output;

  fields.replaceChildren(...snippet.fields.map((field) => {
    const row = document.createElement('div');
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.id = 'parameter-' + field.id;
    input.name = field.id;
    input.value = field.default;
    input.required = !field.allowEmpty;
    input.autocomplete = 'off';
    input.spellcheck = false;
    if (field.pattern) input.pattern = field.pattern;
    if (field.id === 'limit') input.inputMode = 'numeric';
    label.htmlFor = input.id;
    label.textContent = field.label;
    row.append(label, input);
    return row;
  }));
  nameInput.value = '';
  variantStatus.textContent = '';
  updateOutput();
  showVariants();
}

function fieldValues() {
  return Object.fromEntries(Array.from(fields.querySelectorAll('input'), (input) => [
    input.name, input.value,
  ]));
}

function updateOutput() {
  const result = buildSnippet(selected, fieldValues());
  output.value = result.output ?? '';
  copy.disabled = Boolean(result.error);
  builderStatus.textContent = result.error ?? '';
}

function readVariants() {
  const stored = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) {
    throw new Error('Invalid saved variants');
  }

  const variants = stored[selected.id] ?? [];
  if (!Array.isArray(variants) || variants.some((variant) =>
    typeof variant?.name !== 'string' || !variant.values || buildSnippet(selected, variant.values).error
  )) {
    throw new Error('Invalid saved variants');
  }

  return { stored, variants };
}

function showVariants() {
  variantList.replaceChildren();
  const empty = byId('variants-empty');
  let variants;
  try {
    ({ variants } = readVariants());
  } catch {
    empty.hidden = false;
    empty.textContent = 'Saved variants are unavailable in this browser.';
    return;
  }

  empty.hidden = variants.length > 0;
  empty.textContent = 'Save a named variant to reuse these values in this browser.';
  for (const variant of variants) {
    const row = document.createElement('li');
    const load = button(variant.name, () => {
      for (const input of fields.querySelectorAll('input')) {
        input.value = variant.values[input.name];
      }
      nameInput.value = variant.name;
      updateOutput();
      variantStatus.textContent = 'Loaded ' + variant.name + '.';
    });
    load.setAttribute('aria-label', 'Load ' + variant.name);
    const remove = button('Delete', () => {
      if (modifyVariants((current) => current.filter((item) => item.name !== variant.name))) {
        variantStatus.textContent = 'Deleted ' + variant.name + '.';
        nameInput.focus();
      }
    });
    remove.setAttribute('aria-label', 'Delete ' + variant.name);
    row.append(load, remove);
    variantList.append(row);
  }
}

function modifyVariants(change) {
  try {
    const { stored, variants } = readVariants();
    stored[selected.id] = change(variants);
    localStorage.setItem(storageKey, JSON.stringify(stored));
    showVariants();
    return true;
  } catch {
    variantStatus.textContent = 'Your variants could not be updated in this browser.';
    return false;
  }
}

search.addEventListener('input', updateResults);
fields.addEventListener('input', updateOutput);

copy.addEventListener('click', async () => {
  const copiedSnippet = selected;
  const copiedOutput = output.value;
  try {
    await navigator.clipboard.writeText(copiedOutput);
    if (selected === copiedSnippet && output.value === copiedOutput) {
      builderStatus.textContent = 'Copied to clipboard.';
    }
  } catch {
    if (selected === copiedSnippet && output.value === copiedOutput) {
      output.focus();
      output.select();
      builderStatus.textContent = 'Use your device’s Copy command to copy the selected snippet.';
    }
  }
});

builder.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  if (!name) {
    variantStatus.textContent = 'Enter a name for this variant.';
    return;
  }

  const values = fieldValues();
  if (buildSnippet(selected, values).error) return;
  if (modifyVariants((variants) => {
    const existing = variants.findIndex((variant) => variant.name === name);
    if (existing === -1) return [...variants, { name, values }];
    return variants.map((variant, index) => index === existing ? { name, values } : variant);
  })) {
    variantStatus.textContent = 'Saved ' + name + '.';
  }
});

updateResults();
