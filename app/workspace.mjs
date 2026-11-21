import { browseSnippets, buildSnippet, defaultValues, snippets } from './catalog.mjs';
import { restoreValues } from './parameters.mjs';
import { readSnippetLink, snippetHref } from './snippet-links.mjs';

const byId = (id) => document.getElementById(id);
const search = byId('search');
const menu = byId('catalog-menu');
const menuToggle = byId('menu-toggle');
const browseHeading = byId('browse-heading');
const results = byId('results');
const detail = byId('detail');
const builder = byId('builder');
const fields = byId('fields');
const output = byId('output');
const copy = byId('copy');
const save = byId('save-variant');
const nameInput = byId('variant-name');
const variantList = byId('variants');
const builderStatus = byId('builder-status');
const variantStatus = byId('variant-status');
const storageKey = 'codefolio.variants.v1';

const allSnippets = { language: '', topic: '' };
let scope = history.state?.catalogScope ?? allSnippets;
let selected;

function button(label, onClick) {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  element.addEventListener('click', onClick);
  return element;
}

const menuButtons = [];
const languages = new Map();
for (const { language, topic } of snippets) {
  if (!languages.has(language)) languages.set(language, new Set());
  languages.get(language).add(topic);
}

function setMenuOpen(open) {
  menuToggle.setAttribute('aria-expanded', open);
}

function browseScope(nextScope) {
  const url = new URL(location.href);
  url.searchParams.delete('snippet');
  if (scope.language !== nextScope.language || scope.topic !== nextScope.topic || url.href !== location.href) {
    history.pushState({ catalogScope: nextScope }, '', url);
  }
  scope = nextScope;
  search.value = '';
  updateResults({ fromHistory: true });
  if (getComputedStyle(menuToggle).display !== 'none') {
    setMenuOpen(false);
    browseHeading.focus();
  }
}

function menuItem(label, itemScope) {
  const control = button(label, () => browseScope(itemScope));
  menuButtons.push({ control, itemScope });
  return control;
}

menu.append(menuItem('All snippets', allSnippets));
for (const [language, topics] of languages) {
  const group = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = language;
  group.dataset.language = language;
  group.open = scope.language === language;
  const items = document.createElement('div');
  items.className = 'menu-items';
  items.append(menuItem('All ' + language, { language, topic: '' }));
  for (const topic of [...topics].sort((left, right) => left.localeCompare(right))) {
    items.append(menuItem(topic, { language, topic }));
  }
  group.append(summary, items);
  menu.append(group);
}

menuToggle.addEventListener('click', () => setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true'));

function snippetLink(snippet) {
  const link = document.createElement('a');
  link.href = snippetHref(snippet.id);
  link.dataset.snippetId = snippet.id;
  link.textContent = snippet.title;
  link.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey
      || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (location.href !== link.href) history.pushState({ catalogScope: scope }, '', link.href);
    updateResults();
    byId('snippet-title').focus();
  });
  return link;
}

function updateResults({ fromHistory = false } = {}) {
  const searching = Boolean(search.value.trim());
  const shownSnippets = browseSnippets(search.value, scope);
  const { id, snippet } = readSnippetLink(location.search);
  const scopeLabel = [scope.language, scope.topic].filter(Boolean).join(' / ');
  browseHeading.textContent = searching ? 'Search results' : scopeLabel || 'All snippets';
  for (const { control, itemScope } of menuButtons) {
    control.setAttribute('aria-pressed',
      !searching && itemScope.language === scope.language && itemScope.topic === scope.topic);
  }
  for (const group of menu.querySelectorAll('details')) {
    const active = !searching && group.dataset.language === scope.language;
    group.classList.toggle('active-language', active);
    if (fromHistory && active) group.open = true;
  }

  const count = shownSnippets.length;
  byId('result-count').textContent = count + (count === 1 ? ' snippet' : ' snippets');
  byId('no-results').hidden = count > 0;
  byId('unknown-snippet').hidden = id === null || Boolean(snippet);
  const preferred = !fromHistory && shownSnippets.includes(selected) ? selected : shownSnippets[0];
  selectSnippet(id === null ? preferred : snippet);

  results.replaceChildren(...shownSnippets.map((entry) => {
    const row = document.createElement('li');
    const link = snippetLink(entry);
    link.className = 'result';
    if (entry === selected) link.setAttribute('aria-current', 'page');
    const languageLabel = document.createElement('span');
    languageLabel.textContent = entry.language + ' · ' + entry.topic;
    link.append(languageLabel);
    row.append(link);
    return row;
  }));
}

function selectSnippet(snippet) {
  if (selected === snippet) return;
  selected = snippet;
  detail.hidden = !snippet;
  if (!snippet) return;

  byId('snippet-title').textContent = snippet.title;
  byId('snippet-language').textContent = snippet.language + ' · ' + snippet.topic;
  byId('snippet-description').textContent = snippet.description;
  byId('example-context').textContent = snippet.example;
  byId('example').textContent = buildSnippet(snippet, defaultValues(snippet)).output;
  for (const field of ['prerequisites', 'expected', 'effects']) {
    byId(field).textContent = snippet[field];
  }
  byId('related').replaceChildren(...snippet.relatedIds.map((id) => {
    const row = document.createElement('li');
    row.append(snippetLink(snippets.find((entry) => entry.id === id)));
    return row;
  }));

  fields.replaceChildren(...snippet.fields.map(parameterControl));
  nameInput.value = '';
  variantStatus.textContent = '';
  updateOutput();
  showVariants();
}

function setControlValue(control, value) {
  if (control.type === 'checkbox') {
    control.checked = value === true;
  } else {
    control.value = typeof value === 'string' || typeof value === 'number' ? value : '';
  }
}

function parameterControl(field) {
  const row = document.createElement('div');
  const label = document.createElement('label');
  const control = document.createElement(field.type === 'choice' ? 'select' : 'input');
  control.id = 'parameter-' + field.id;
  control.name = field.id;
  control.setAttribute('aria-describedby', 'builder-status');
  label.htmlFor = control.id;
  label.textContent = field.label;

  if (field.type === 'choice') {
    for (const { value, label } of field.options) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      control.append(option);
    }
  } else if (field.type === 'toggle') {
    control.type = 'checkbox';
    row.className = 'toggle-field';
  } else if (field.type === 'integer') {
    control.type = 'number';
    control.min = field.min;
    control.max = field.max;
    control.required = true;
  } else {
    control.required = !field.allowEmpty;
    control.autocomplete = 'off';
    control.spellcheck = false;
    if (field.pattern) control.pattern = field.pattern;
  }

  setControlValue(control, field.default);
  row.append(label, control);
  return row;
}

function parameterControls() {
  return fields.querySelectorAll('input, select');
}

function fieldValues() {
  return Object.fromEntries(Array.from(parameterControls(), (control) => [
    control.name, control.type === 'checkbox' ? control.checked : control.value,
  ]));
}

function updateOutput() {
  const result = buildSnippet(selected, fieldValues());
  output.value = result.output ?? '';
  copy.disabled = Boolean(result.error);
  save.disabled = Boolean(result.error);
  builderStatus.textContent = result.error ?? '';
  for (const control of parameterControls()) {
    if (control.name === result.fieldId) {
      control.setAttribute('aria-invalid', 'true');
    } else {
      control.removeAttribute('aria-invalid');
    }
  }
}

function readVariants() {
  const stored = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) {
    throw new Error('Invalid saved variants');
  }

  const variants = stored[selected.id] ?? [];
  if (!Array.isArray(variants) || variants.some((variant) => typeof variant?.name !== 'string')) {
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
      const validObject = variant.values && typeof variant.values === 'object' && !Array.isArray(variant.values);
      const values = restoreValues(selected, validObject ? variant.values : {});
      for (const control of parameterControls()) {
        setControlValue(control, values[control.name]);
      }
      nameInput.value = variant.name;
      updateOutput();
      variantStatus.textContent = !validObject || buildSnippet(selected, values).error
        ? 'Review the parameters and save this variant again.'
        : 'Loaded ' + variant.name + '.';
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

search.addEventListener('input', () => updateResults());
window.addEventListener('popstate', () => {
  scope = history.state?.catalogScope ?? allSnippets;
  updateResults({ fromHistory: true });
});
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

  const { parameters, error } = buildSnippet(selected, fieldValues());
  if (error) return;
  if (modifyVariants((variants) => {
    const variant = { name, values: parameters };
    const existing = variants.findIndex((variant) => variant.name === name);
    if (existing === -1) return [...variants, variant];
    return variants.map((entry, index) => index === existing ? variant : entry);
  })) {
    variantStatus.textContent = 'Saved ' + name + '.';
  }
});

updateResults();
