import { exportPersonalBackup, isRecord, mergePersonalBackup, readPersonalBackup } from '../app/variant-backup.mjs?v=regex-reference-1';
import { patterns, platforms } from './patterns.mjs?v=regex-python-1';

const format = 'codefolio.regex-backup';
const storageKey = 'codefolio.regex-personal.v1';
export const maxPatternLength = 10_000;
const customId = /^custom-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

export function exportRegexBackup(data) {
  const { json, count } = exportPersonalBackup({ ...data, variants: {} });
  const { tags, favorites } = JSON.parse(json);
  const { customPatterns } = data;
  return {
    count: count + customPatterns.length,
    json: JSON.stringify({ format, version: 2, customPatterns, tags, favorites }, null, 2) + '\n',
  };
}

function readCustomPatterns(entries) {
  if (!Array.isArray(entries)) throw new Error('The custom pattern list is invalid.');
  const ids = new Set();
  return entries.map(entry => {
    if (!isRecord(entry) || entry.source !== 'custom' || typeof entry.id !== 'string' || !customId.test(entry.id) || ids.has(entry.id)
      || typeof entry.title !== 'string' || !entry.title.trim() || entry.title.length > 100
      || !isRecord(entry.expressions) || Object.entries(entry.expressions).some(([engine, expression]) =>
        !Object.hasOwn(platforms, engine) || typeof expression !== 'string' || expression.length > maxPatternLength)
      || !Object.values(entry.expressions).some(Boolean)) {
      throw new Error('The backup contains an invalid or duplicate custom pattern.');
    }
    ids.add(entry.id);
    return { id: entry.id, source: 'custom', title: entry.title.trim(), expressions: entry.expressions };
  });
}

export function readRegexBackup(text) {
  let file;
  try {
    file = JSON.parse(text);
  } catch {
    throw new Error('Choose a valid CodeFolio Regex JSON backup.');
  }
  if (file?.format !== format) throw new Error('Choose a CodeFolio Regex backup.');
  if (![1, 2].includes(file.version)) throw new Error('This version of CodeFolio can’t read the Regex backup format.');
  const { tags, favorites } = readPersonalBackup(JSON.stringify({
    format: 'codefolio.personal-backup', version: 1, tags: file.tags, favorites: file.favorites, variants: {},
  }));
  const customPatterns = file.version === 2 ? readCustomPatterns(file.customPatterns) : [];
  return { tags, favorites, customPatterns };
}

export function mergeRegexBackup(current, imported) {
  const byId = new Map(current.customPatterns.map(entry => [entry.id, entry]));
  const conflicts = new Set();
  let patternsAdded = 0;
  for (const entry of imported.customPatterns) {
    const local = byId.get(entry.id);
    if (!local) {
      byId.set(entry.id, entry);
      patternsAdded++;
    } else if (local.title !== entry.title || Object.keys(platforms).some(key =>
      (local.expressions[key] ?? '') !== (entry.expressions[key] ?? ''))) {
      conflicts.add(entry.id);
    }
  }

  const customPatterns = [...byId.values()];
  const fromFile = {
    variants: {},
    tags: Object.fromEntries(Object.entries(imported.tags).filter(([id]) => !conflicts.has(id))),
    favorites: imported.favorites.filter(id => !conflicts.has(id)),
  };
  const { tags, favorites, tagsAdded, favoritesAdded, unavailable } =
    mergePersonalBackup({ ...current, variants: {} }, fromFile, [...patterns, ...customPatterns]);
  return { data: { tags, favorites, customPatterns }, patternsAdded, tagsAdded, favoritesAdded, conflicts: conflicts.size, unavailable };
}

export function loadPersonalData() {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) return readRegexBackup(stored);
  } catch {
    // Browsing remains available when browser storage cannot be read.
  }
  return { tags: {}, favorites: [], customPatterns: [] };
}

export function savePersonalData(data) {
  localStorage.setItem(storageKey, exportRegexBackup(data).json);
}
