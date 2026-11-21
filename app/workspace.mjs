import { browseSnippets, buildSnippet, defaultValues, paginateSnippets, snippets, snippetsPerPage } from './catalog.mjs?v=variant-backup-1';
import { restoreValues } from './parameters.mjs';
import { exportVariantBackup, isRecord, mergeVariantBackup, readVariantBackup } from './variant-backup.mjs?v=variant-backup-1';
import { readSnippetLink, snippetHref } from './snippet-links.mjs?v=variant-backup-1';

const byId = (id) => document.getElementById(id);
const search = byId('search');
const menu = byId('catalog-menu');
const disclosure = byId('catalog-disclosure');
const compactNavigation = matchMedia('(max-width: 720px)');
const browseHeading = byId('browse-heading');
const pagination = byId('pagination');
const previousPage = byId('previous-page');
const nextPage = byId('next-page');
const favorite = byId('favorite');
const favoriteStatus = byId('favorite-status');
const results = byId('results');
const detail = byId('detail');
const fullScreen = byId('snippet-full-screen');
const openFullScreen = byId('open-full-screen');
const builder = byId('builder');
const fields = byId('fields');
const output = byId('output');
const copy = byId('copy');
const save = byId('save-variant');
const nameInput = byId('variant-name');
const variantList = byId('variants');
const exportVariants = byId('export-variants');
const importVariants = byId('import-variants');
const backupFile = byId('variant-backup-file');
const transferStatus = byId('variant-transfer-status');
const builderStatus = byId('builder-status');
const variantStatus = byId('variant-status');
const storageKey = 'codefolio.variants.v1';
const favoritesStorageKey = 'codefolio.favorites.v1';

const allSnippets = { language: '', topic: '' };
const favoritesScope = { ...allSnippets, favorites: true };
let scope = history.state?.catalogScope ?? allSnippets;
let currentPage = history.state?.catalogPage ?? 1;
let favorites = readFavorites();
let selected;
let browseScroll;

function readFavorites() {
  try {
    const ids = JSON.parse(localStorage.getItem(favoritesStorageKey) ?? '[]');
    return new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function sameScope(left, right) {
  return left.language === right.language && left.topic === right.topic
    && Boolean(left.favorites) === Boolean(right.favorites);
}

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

function changeBrowsePage(page, nextScope = scope) {
  const url = new URL(location.href);
  url.searchParams.delete('snippet');
  if (!sameScope(scope, nextScope) || page !== currentPage || url.href !== location.href) {
    history.pushState({ catalogScope: nextScope, catalogPage: page }, '', url);
  }
  scope = nextScope;
  currentPage = page;
  updateResults({ fromHistory: true });
}

function browseScope(nextScope) {
  search.value = '';
  changeBrowsePage(1, nextScope);
  if (compactNavigation.matches) {
    disclosure.open = false;
    browseHeading.focus();
  }
}

function menuItem(label, itemScope) {
  const control = button(label, () => browseScope(itemScope));
  menuButtons.push({ control, itemScope });
  return control;
}

menu.append(menuItem('All snippets', allSnippets), menuItem('Favorites', favoritesScope));
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

disclosure.open = !compactNavigation.matches;
compactNavigation.addEventListener('change', (event) => { disclosure.open = !event.matches; });

function snippetLink(snippet) {
  const link = document.createElement('a');
  link.href = snippetHref(snippet.id);
  link.dataset.snippetId = snippet.id;
  link.textContent = snippet.title;
  link.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey
      || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (location.href !== link.href) history.pushState({ catalogScope: scope, catalogPage: currentPage }, '', link.href);
    updateResults();
    byId('snippet-title').focus();
  });
  return link;
}

function updateResults({ fromHistory = false } = {}) {
  const searching = Boolean(search.value.trim());
  const showingFavorites = !searching && scope.favorites;
  const matches = browseSnippets(search.value, scope);
  const filtered = showingFavorites ? matches.filter(({ id }) => favorites.has(id)) : matches;
  const { id, snippet } = readSnippetLink(location.search, snippets);
  const linkedIndex = searching ? -1 : filtered.indexOf(snippet);
  if (linkedIndex >= 0) currentPage = Math.floor(linkedIndex / snippetsPerPage) + 1;
  const { page, pageCount, items } = paginateSnippets(filtered, currentPage);
  currentPage = page;

  const scopeLabel = scope.favorites ? 'Favorites' : [scope.language, scope.topic].filter(Boolean).join(' / ');
  browseHeading.textContent = searching ? 'Search results' : scopeLabel || 'All snippets';
  for (const { control, itemScope } of menuButtons) {
    control.setAttribute('aria-pressed', !searching && sameScope(itemScope, scope));
  }
  for (const group of menu.querySelectorAll('details')) {
    const active = !searching && group.dataset.language === scope.language;
    group.classList.toggle('active-language', active);
    if (fromHistory && active) group.open = true;
  }

  const count = filtered.length;
  byId('result-count').textContent = count + (count === 1 ? ' snippet' : ' snippets');
  byId('no-results').hidden = count > 0;
  byId('no-results').textContent = showingFavorites
    ? 'Mark a snippet as a favorite to see it here.'
    : 'Try a different search term.';
  byId('unknown-snippet').hidden = id === null || Boolean(snippet);
  pagination.hidden = pageCount <= 1;
  previousPage.disabled = page <= 1;
  nextPage.disabled = page >= pageCount;
  byId('page-number').textContent = 'Page ' + page + ' of ' + pageCount;
  const preferred = !fromHistory && items.includes(selected) ? selected : items[0];
  selectSnippet(id === null ? preferred : snippet);
  updateFavoriteButton();

  results.replaceChildren(...items.map((entry) => {
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
  favoriteStatus.hidden = true;
  detail.hidden = !snippet;
  if (!snippet) {
    if (fullScreen.open) fullScreen.close();
    return;
  }

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

openFullScreen.addEventListener('click', () => {
  browseScroll = { left: window.scrollX, top: window.scrollY };
  byId('full-screen-content').append(detail);
  fullScreen.showModal();
  fullScreen.scrollTop = 0;
});

fullScreen.addEventListener('close', () => {
  fullScreen.before(detail);
  if (!detail.hidden) {
    window.scrollTo(browseScroll);
    openFullScreen.focus({ preventScroll: true });
  }
});

function updateFavoriteButton() {
  const starred = Boolean(selected && favorites.has(selected.id));
  favorite.setAttribute('aria-pressed', starred);
  favorite.querySelector('span').textContent = starred ? '★' : '☆';
}

favorite.addEventListener('click', () => {
  const updated = readFavorites();
  if (updated.has(selected.id)) {
    updated.delete(selected.id);
  } else {
    updated.add(selected.id);
  }
  try {
    localStorage.setItem(favoritesStorageKey, JSON.stringify([...updated]));
  } catch {
    favoriteStatus.textContent = 'Favorites couldn’t be saved in this browser.';
    favoriteStatus.hidden = false;
    return;
  }
  favoriteStatus.hidden = true;
  favorites = updated;
  updateResults();
  if (detail.hidden) browseHeading.focus();
});

function movePage(offset, control, otherControl) {
  changeBrowsePage(currentPage + offset);
  if (pagination.hidden) browseHeading.focus();
  else if (control.disabled) otherControl.focus();
}

previousPage.addEventListener('click', () => movePage(-1, previousPage, nextPage));
nextPage.addEventListener('click', () => movePage(1, nextPage, previousPage));

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

function readVariantStore() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
    if (isRecord(stored)) return stored;
  } catch {
    // Storage can be blocked, or the browser may contain invalid data.
  }
  throw new Error('Saved variants couldn’t be read from this browser.');
}

function writeVariantStore(stored) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(stored));
  } catch {
    throw new Error('Saved variants couldn’t be written to this browser.');
  }
}

function readVariants() {
  const stored = readVariantStore();
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
      const validObject = isRecord(variant.values);
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
    writeVariantStore(stored);
    showVariants();
    return true;
  } catch {
    variantStatus.textContent = 'Your variants could not be updated in this browser.';
    return false;
  }
}

exportVariants.addEventListener('click', () => {
  let backup;
  try {
    backup = exportVariantBackup(readVariantStore());
  } catch {
    transferStatus.textContent = 'Saved variants couldn’t be exported.';
    return;
  }
  if (!backup.count) {
    transferStatus.textContent = 'Save a variant before exporting.';
    return;
  }

  const href = URL.createObjectURL(new Blob([backup.json], { type: 'application/json' }));
  const download = document.createElement('a');
  download.href = href;
  download.download = 'codefolio-variants.json';
  document.body.append(download);
  download.click();
  download.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
  transferStatus.textContent = 'Exported ' + backup.count + ' saved ' + (backup.count === 1 ? 'variant.' : 'variants.');
});

importVariants.addEventListener('click', () => backupFile.click());

backupFile.addEventListener('change', async () => {
  const file = backupFile.files[0];
  if (!file) return;
  backupFile.value = '';
  importVariants.disabled = true;
  transferStatus.textContent = 'Reading backup…';
  try {
    const imported = readVariantBackup(await file.text());
    const { variants, added, renamed, duplicates, unavailable } = mergeVariantBackup(readVariantStore(), imported, snippets);
    if (added) writeVariantStore(variants);
    const summary = ['Imported ' + added + ' ' + (added === 1 ? 'variant.' : 'variants.')];
    if (renamed) summary.push(renamed + ' renamed to keep existing variants.');
    if (duplicates) summary.push(duplicates + ' already saved.');
    if (unavailable) summary.push(unavailable + ' skipped because the snippets are unavailable.');
    transferStatus.textContent = summary.join(' ');
    if (selected) showVariants();
  } catch (error) {
    transferStatus.textContent = error.message;
  } finally {
    importVariants.disabled = false;
  }
});

search.addEventListener('input', () => {
  currentPage = 1;
  updateResults();
});
window.addEventListener('storage', (event) => {
  if (event.key === favoritesStorageKey || event.key === null) {
    favorites = readFavorites();
    updateResults();
  }
  if ((event.key === storageKey || event.key === null) && selected) showVariants();
});
window.addEventListener('popstate', () => {
  scope = history.state?.catalogScope ?? allSnippets;
  currentPage = history.state?.catalogPage ?? 1;
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
