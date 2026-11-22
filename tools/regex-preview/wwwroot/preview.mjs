import { cleanTag, findTaggedSnippets, tagKey } from '../app/snippet-tags.mjs?v=regex-reference-1';
import { patterns, platforms } from './patterns.mjs?v=regex-python-1';
import { createRunner } from './runner.mjs?v=regex-python-1';
import { exportRegexBackup, loadPersonalData, mergeRegexBackup, readRegexBackup, savePersonalData } from './personal.mjs?v=regex-python-1';

const byId = id => document.getElementById(id);
const search = byId('pattern-search');
const platform = byId('detail-platform');
const newPattern = byId('new-pattern');
const customTitle = byId('custom-title');
const customExpression = byId('custom-expression');
const editorStatus = byId('editor-status');
const savePattern = byId('save-pattern');
const previous = byId('previous-pattern');
const next = byId('next-pattern');
const results = byId('patterns');
const chips = byId('active-filters');
const favorite = byId('favorite');
const favoritesOnly = byId('favorites-only');
const tagOptions = byId('tag-options');
const tagEditor = byId('tag-editor');
const tagName = byId('tag-name');
const detail = byId('detail');
const detailStatus = byId('detail-status');
const input = byId('test-input');
const examplePicker = byId('example-picker');
const toast = byId('regex-toast');
let toastTimer;
const testButton = byId('test-button');
const testStatus = byId('test-status');
const matchResult = byId('match-result');
const backupFile = byId('backup-file');
const backupStatus = byId('backup-status');
const runners = Object.fromEntries(Object.keys(platforms).map(key => [key, createRunner(key)]));

let personal = loadPersonalData();
const selectedTags = new Set();
const tagControls = new Map();
let selected;
let draft;
let validating = false;
let entries = [];
let backPlatform;
let testVersion = 0;
let linked = false;

function button(text, act) {
  const control = document.createElement('button');
  control.type = 'button';
  control.textContent = text;
  control.addEventListener('click', act);
  return control;
}

function patternUrl(id, engine) {
  const url = new URL('./', location.href);
  if (id) url.searchParams.set('pattern', id);
  if (engine !== 'csharp') url.searchParams.set('platform', engine);
  return url;
}

function save(data, status) {
  try {
    savePersonalData(data);
    personal = data;
    return true;
  } catch {
    status.textContent = 'Your changes couldn’t be saved in this browser.';
    return false;
  }
}

function updateTagOptions() {
  const names = new Map();
  for (const raw of Object.values(personal.tags).flat()) {
    const name = cleanTag(raw);
    if (name && !names.has(tagKey(name))) names.set(tagKey(name), name);
  }
  for (const key of selectedTags) if (!names.has(key)) selectedTags.delete(key);
  tagControls.clear();
  tagOptions.replaceChildren();
  for (const [key, name] of [...names].sort((left, right) => left[1].localeCompare(right[1]))) {
    const label = document.createElement('label');
    const control = document.createElement('input');
    control.type = 'checkbox';
    control.addEventListener('change', () => {
      if (control.checked) selectedTags.add(key);
      else selectedTags.delete(key);
      renderResults();
    });
    label.append(control, name);
    tagOptions.append(label);
    tagControls.set(key, { control, name });
  }
  byId('no-tags').hidden = Boolean(names.size);
}

function filterChip(label, remove, focus) {
  const item = document.createElement('li');
  const chip = button(label + ' ×', () => {
    remove();
    renderResults();
    focus();
  });
  chip.setAttribute('aria-label', 'Remove filter ' + label);
  item.append(chip);
  chips.append(item);
}

function focusTagPicker() {
  const picker = tagOptions.closest('details');
  const outer = picker.closest('.search-filters');
  (outer.open ? picker : outer).querySelector(':scope > summary').focus();
}

function allPatterns() {
  return [...patterns, ...personal.customPatterns];
}

function renderResults() {
  chips.replaceChildren();
  for (const [key, { control, name }] of tagControls) {
    control.checked = selectedTags.has(key);
    if (control.checked) filterChip('Tag · ' + name, () => selectedTags.delete(key), focusTagPicker);
  }
  if (favoritesOnly.checked) filterChip('Favorites', () => { favoritesOnly.checked = false; }, () => {
    const panel = favoritesOnly.closest('details');
    (panel.open ? favoritesOnly : panel.querySelector('summary')).focus();
  });
  chips.hidden = !chips.childElementCount;

  const query = search.value.trim().toLowerCase();
  entries = findTaggedSnippets(allPatterns(), personal.tags, selectedTags)
    .filter(entry => !favoritesOnly.checked || personal.favorites.includes(entry.id))
    .filter(entry => [entry.title, entry.description ?? '', ...Object.values(entry.expressions)].some(text => text.toLowerCase().includes(query)))
    .sort((left, right) => Number(personal.favorites.includes(right.id)) - Number(personal.favorites.includes(left.id))
      || left.title.localeCompare(right.title));

  byId('pattern-count').textContent = '(' + entries.length + ')';
  byId('empty-patterns').hidden = Boolean(entries.length);
  const selectedIndex = entries.indexOf(selected);
  previous.disabled = selectedIndex <= 0;
  next.disabled = selectedIndex < 0 || selectedIndex >= entries.length - 1;
  results.replaceChildren(...entries.map(entry => {
    const row = document.createElement('li');
    const link = document.createElement('a');
    link.className = 'result';
    link.href = patternUrl(entry.id, platform.value);
    if (selected === entry) link.setAttribute('aria-current', 'page');
    const caption = document.createElement('span');
    caption.className = 'result-caption';
    caption.textContent = entry.title;
    if (personal.favorites.includes(entry.id)) {
      const star = document.createElement('span');
      star.className = 'result-star';
      star.setAttribute('role', 'img');
      star.setAttribute('aria-label', 'Favorite');
      star.textContent = '★';
      caption.prepend(star);
    }
    link.append(caption);
    if (entry.source === 'custom') {
      const kind = document.createElement('span');
      kind.className = 'muted';
      kind.textContent = 'Custom';
      link.append(kind);
    }
    link.addEventListener('click', event => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openPattern(entry);
    });
    row.append(link);
    return row;
  }));
}

function openPattern(entry, step = false) {
  if (validating) return;
  if (draft && !window.confirm('Discard the unsaved pattern changes?')) return;
  draft = undefined;
  const url = patternUrl(entry.id, platform.value);
  if (url.href !== location.href) {
    if (step && linked) history.replaceState(history.state, '', url);
    else history.pushState({ regexResults: !linked }, '', url);
  }
  linked = true;
  renderDetail(entry);
  renderResults();
  byId('pattern-title').focus();
}

for (const [control, offset] of [[previous, -1], [next, 1]]) {
  control.addEventListener('click', () => {
    const index = entries.indexOf(selected);
    if (index >= 0 && entries[index + offset]) openPattern(entries[index + offset], true);
  });
}

function activeExpression() {
  return (draft ?? selected)?.expressions[platform.value] ?? '';
}

function clearTest() {
  testVersion++;
  testStatus.textContent = '';
  matchResult.hidden = true;
  testButton.disabled = validating || !activeExpression();
}

function renderPersonal() {
  favorite.setAttribute('aria-pressed', personal.favorites.includes(selected.id));
  byId('pattern-tags').replaceChildren(...(personal.tags[selected.id] ?? []).map(name => {
    const item = document.createElement('li');
    const text = document.createElement('span');
    text.textContent = name;
    const remove = button('×', () => {
      setTags((personal.tags[selected.id] ?? []).filter(tag => tagKey(tag) !== tagKey(name)));
      byId('toggle-tag-editor').focus();
    });
    remove.setAttribute('aria-label', 'Remove tag ' + name);
    item.append(text, remove);
    return item;
  }));
}

function setTags(names) {
  if (!save({ ...personal, tags: { ...personal.tags, [selected.id]: names } }, detailStatus)) return false;
  updateTagOptions();
  renderPersonal();
  renderResults();
  return true;
}

function setTagEditor(open) {
  tagEditor.hidden = !open;
  byId('toggle-tag-editor').setAttribute('aria-expanded', open);
  if (!open) tagName.value = '';
}

function showEditor(editing) {
  const custom = selected?.source === 'custom';
  const controls = {
    'pattern-name-field': !editing,
    'pattern-editor-actions': !editing,
    'custom-expression': !editing,
    'pattern-display': editing,
    'pattern-notes': editing || custom,
    'back-to-results': editing,
    'detail-tags': editing,
    'copy-link': editing,
    'copy-pattern': editing,
    'favorite': editing,
    'edit-pattern': editing || !custom,
    'delete-pattern': editing || !custom,
    'duplicate-pattern': editing,
    'example-picker': editing || custom,
  };
  for (const [id, hidden] of Object.entries(controls)) byId(id).hidden = hidden;
  detail.querySelector('.pattern-navigation').hidden = editing;
  newPattern.disabled = editing;
  detail.classList.toggle('editing-pattern', editing);
}

function renderDraft() {
  detail.hidden = false;
  document.querySelector('.regex-reference').classList.add('mobile-detail');
  showEditor(true);
  byId('copy-fallback').hidden = true;
  byId('pattern-title').textContent = draft.isNew ? 'New custom pattern' : 'Edit custom pattern';
  customTitle.value = draft.title;
  customExpression.value = activeExpression();
  customExpression.removeAttribute('aria-invalid');
  editorStatus.textContent = '';
  clearTest();
}

function renderDetail(entry) {
  const changed = entry !== selected;
  selected = entry;
  detail.hidden = !entry;
  document.querySelector('.regex-reference').classList.toggle('mobile-detail', Boolean(entry && linked));
  if (!entry) return;
  showEditor(false);
  editorStatus.textContent = '';
  clearTest();
  if (changed) {
    input.value = entry.examples?.match ?? '';
    setTagEditor(false);
  }
  detailStatus.textContent = '';
  byId('copy-fallback').hidden = true;
  byId('pattern-title').textContent = entry.title;
  byId('pattern-description').textContent = entry.description ?? '';
  const expression = activeExpression();
  const source = byId('pattern-source');
  source.textContent = expression || 'Not provided';
  source.classList.toggle('pattern-placeholder', !expression);
  byId('copy-pattern').disabled = !expression;
  byId('pattern-mode').textContent = entry.mode === 'whole' ? 'Validates the whole input' : 'Finds the first match within the input';
  examplePicker.options[1].textContent = 'Match · ' + JSON.stringify(entry.examples?.match ?? '');
  examplePicker.options[2].textContent = 'No match · ' + JSON.stringify(entry.examples?.noMatch ?? '');
  examplePicker.value = '';
  renderPersonal();
}

function readLocation() {
  draft = undefined;
  const query = new URLSearchParams(location.search);
  const engine = backPlatform ?? query.get('platform');
  platform.value = Object.hasOwn(platforms, engine) ? engine : 'csharp';
  const entry = allPatterns().find(pattern => pattern.id === query.get('pattern'));
  if (backPlatform) {
    backPlatform = undefined;
    history.replaceState(history.state, '', patternUrl(entry?.id, platform.value));
  }
  linked = Boolean(entry);
  renderDetail(entry ?? patterns[0]);
  renderResults();
}

search.addEventListener('input', renderResults);
favoritesOnly.addEventListener('change', renderResults);
function changePlatform(engine) {
  platform.value = engine;
  if (draft) {
    renderDraft();
    return;
  }
  history.replaceState(history.state, '', patternUrl(linked ? selected.id : null, engine));
  renderDetail(selected);
  renderResults();
}

platform.addEventListener('change', () => changePlatform(platform.value));
window.addEventListener('popstate', () => {
  const returning = Boolean(backPlatform);
  readLocation();
  if (returning) byId('pattern-list-title').focus();
});
byId('back-to-results').addEventListener('click', () => {
  if (history.state?.regexResults) {
    backPlatform = platform.value;
    history.back();
    return;
  }
  history.replaceState(null, '', patternUrl(null, platform.value));
  readLocation();
  byId('pattern-list-title').focus();
});

function beginDraft(entry, duplicate = false) {
  if (validating) return;
  const isNew = !entry || duplicate;
  draft = {
    isNew,
    id: isNew ? 'custom-' + crypto.randomUUID() : entry.id,
    title: duplicate ? (entry.title + ' copy').slice(0, 100) : entry?.title ?? '',
    expressions: { ...entry?.expressions },
  };
  if (isNew) input.value = '';
  renderDraft();
  customTitle.focus();
}

newPattern.addEventListener('click', () => beginDraft());
byId('edit-pattern').addEventListener('click', () => beginDraft(selected));
byId('duplicate-pattern').addEventListener('click', () => beginDraft(selected, true));
byId('cancel-pattern').addEventListener('click', readLocation);
customTitle.addEventListener('input', () => { draft.title = customTitle.value; });
customExpression.addEventListener('input', () => {
  draft.expressions[platform.value] = customExpression.value;
  customExpression.removeAttribute('aria-invalid');
  editorStatus.textContent = '';
  clearTest();
});

function setValidating(value) {
  validating = value;
  savePattern.disabled = value;
  customTitle.disabled = value;
  customExpression.disabled = value;
  platform.disabled = value;
  byId('cancel-pattern').disabled = value;
  byId('import-backup').disabled = value;
  clearTest();
}

async function validateExpressions(expressions) {
  for (const [engine, label] of Object.entries(platforms)) {
    const expression = expressions[engine];
    if (!expression) continue;
    const result = await runners[engine](expression, '', 'validate');
    if (result.status === 'valid') continue;
    return {
      engine,
      invalid: result.status === 'invalid',
      message: label + ' · ' + (result.status === 'invalid' ? result.message : 'The runner couldn’t validate this expression. Try again.'),
    };
  }
  return null;
}

savePattern.addEventListener('click', async () => {
  if (!draft || validating) return;
  const current = draft;
  const title = current.title.trim();
  if (!title) {
    editorStatus.textContent = 'Enter a pattern title.';
    customTitle.focus();
    return;
  }
  if (!Object.values(current.expressions).some(Boolean)) {
    editorStatus.textContent = 'Enter a pattern for at least one platform.';
    customExpression.focus();
    return;
  }

  setValidating(true);
  editorStatus.textContent = 'Validating patterns…';
  const failure = await validateExpressions(current.expressions);
  setValidating(false);
  if (draft !== current) return;
  if (failure) {
    changePlatform(failure.engine);
    customExpression.setAttribute('aria-invalid', failure.invalid);
    editorStatus.textContent = failure.message;
    customExpression.focus();
    return;
  }
  const entry = { id: current.id, source: 'custom', title, expressions: current.expressions };
  const customPatterns = current.isNew
    ? [...personal.customPatterns, entry]
    : personal.customPatterns.map(item => item.id === entry.id ? entry : item);
  if (!save({ ...personal, customPatterns }, editorStatus)) return;
  draft = undefined;
  openPattern(entry, !current.isNew);
});

byId('delete-pattern').addEventListener('click', () => {
  if (validating) return;
  const { id } = selected;
  if (!window.confirm('Delete this custom pattern?')) return;
  const tags = { ...personal.tags };
  delete tags[id];
  if (!save({
    tags,
    favorites: personal.favorites.filter(item => item !== id),
    customPatterns: personal.customPatterns.filter(item => item.id !== id),
  }, detailStatus)) return;
  history.replaceState(null, '', patternUrl(null, platform.value));
  updateTagOptions();
  readLocation();
  byId('pattern-list-title').focus();
});

favorite.addEventListener('click', () => {
  const id = selected.id;
  const favorites = personal.favorites.includes(id) ? personal.favorites.filter(item => item !== id) : [...personal.favorites, id];
  if (save({ ...personal, favorites }, detailStatus)) {
    detailStatus.textContent = '';
    renderPersonal();
    renderResults();
  }
});
byId('toggle-tag-editor').addEventListener('click', () => {
  setTagEditor(tagEditor.hidden);
  if (!tagEditor.hidden) tagName.focus();
});
tagEditor.addEventListener('submit', event => {
  event.preventDefault();
  const name = cleanTag(tagName.value);
  const current = personal.tags[selected.id] ?? [];
  if (!name || current.some(tag => tagKey(tag) === tagKey(name))) {
    detailStatus.textContent = name ? 'That tag is already added.' : 'Enter a tag name.';
    return;
  }
  if (setTags([...current, name])) {
    detailStatus.textContent = '';
    setTagEditor(false);
    byId('toggle-tag-editor').focus();
  }
});

async function copy(value, label) {
  byId('copy-fallback').hidden = true;
  try {
    await navigator.clipboard.writeText(value);
    clearTimeout(toastTimer);
    toast.textContent = label + ' copied.';
    toastTimer = setTimeout(() => { toast.textContent = ''; }, 2200);
  } catch {
    const field = byId('copy-value');
    field.value = value;
    byId('copy-fallback').hidden = false;
    field.focus();
    field.select();
  }
}

byId('copy-pattern').addEventListener('click', () => copy(activeExpression(), 'Pattern'));
byId('copy-link').addEventListener('click', () => copy(patternUrl(selected.id, platform.value).href, 'Link'));
examplePicker.addEventListener('change', () => {
  const choice = examplePicker.value;
  if (!choice) return;
  input.value = selected.examples[choice];
  examplePicker.value = '';
  clearTest();
  input.focus();
});
input.addEventListener('input', clearTest);
byId('try-it').addEventListener('submit', async event => {
  event.preventDefault();
  clearTest();
  const expression = activeExpression();
  if (!expression || validating) return;
  const version = testVersion;
  const engine = platform.value;
  testButton.disabled = true;
  testStatus.textContent = 'Running ' + platforms[engine] + '…';
  const result = await runners[engine](expression, input.value);
  if (version !== testVersion) return;
  testButton.disabled = false;
  const labels = {
    match: 'Match.',
    invalid: result.message,
    'no-match': 'No match.',
    timeout: 'The match timed out. Try shorter text.',
    'load-error': 'The runner couldn’t load. Try again.',
  };
  testStatus.textContent = labels[result.status] ?? 'The runner couldn’t complete the test.';
  if (result.status === 'match') {
    matchResult.textContent = [
      'Matched ' + JSON.stringify(result.text) + ' at index ' + result.index,
      ...result.groups.map((value, index) => 'Group ' + (index + 1) + ' · ' + (value === null ? 'unmatched' : JSON.stringify(value))),
    ].join('\n');
    matchResult.hidden = false;
  }
});

const countLabel = (count, noun) => count + ' ' + (count === 1 ? noun : noun + 's');

const filename = 'codefolio-regex-backup.json';
function backup() {
  const { count, json } = exportRegexBackup(personal);
  backupStatus.textContent = count ? '' : 'Add a custom pattern, tag, or favorite to create a backup.';
  return count ? json : null;
}

byId('export-backup').addEventListener('click', () => {
  const json = backup();
  if (!json) return;
  const href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const download = document.createElement('a');
  download.href = href;
  download.download = filename;
  document.body.append(download);
  download.click();
  download.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
  backupStatus.textContent = 'Regex backup exported.';
});
byId('import-backup').addEventListener('click', () => backupFile.click());
backupFile.addEventListener('change', async () => {
  const file = backupFile.files[0];
  backupFile.value = '';
  if (!file || validating) return;
  try {
    setValidating(true);
    const imported = readRegexBackup(await file.text());
    backupStatus.textContent = 'Validating backup…';
    for (const entry of imported.customPatterns) {
      const failure = await validateExpressions(entry.expressions);
      if (failure) throw new Error(entry.title + ' · ' + failure.message);
    }
    const merged = mergeRegexBackup(personal, imported);
    if (!save(merged.data, backupStatus)) return;
    updateTagOptions();
    renderPersonal();
    renderResults();
    backupStatus.textContent = 'Imported ' + countLabel(merged.patternsAdded, 'pattern') + ', '
      + countLabel(merged.tagsAdded, 'tag') + ', and ' + countLabel(merged.favoritesAdded, 'favorite') + '.'
      + (merged.conflicts ? ' Kept ' + merged.conflicts + ' existing patterns with conflicting IDs.' : '')
      + (merged.unavailable ? ' Skipped ' + merged.unavailable + ' items for unavailable patterns.' : '');
  } catch (error) {
    backupStatus.textContent = error.message;
  } finally {
    setValidating(false);
  }
});
byId('share-backup').addEventListener('click', async () => {
  const json = backup();
  if (!json) return;
  const fallback = 'Use Export to download the JSON file and attach it in your app.';
  try {
    const data = { title: 'CodeFolio Regex backup', files: [new File([json], filename, { type: 'application/json' })] };
    if (!navigator.share || !navigator.canShare?.(data)) {
      backupStatus.textContent = fallback;
      return;
    }
    await navigator.share(data);
    backupStatus.textContent = 'Finish sharing in the app you chose.';
  } catch (error) {
    backupStatus.textContent = error.name === 'AbortError' ? 'Sharing canceled.' : fallback;
  }
});

updateTagOptions();
readLocation();
