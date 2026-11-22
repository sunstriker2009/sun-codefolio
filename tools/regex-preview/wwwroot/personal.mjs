import { exportPersonalBackup, mergePersonalBackup, readPersonalBackup } from '../app/variant-backup.mjs?v=regex-reference-1';
import { patterns } from './patterns.mjs';

const format = 'codefolio.regex-backup';
const storageKey = 'codefolio.regex-personal.v1';

export function exportRegexBackup(data) {
  const { json, count } = exportPersonalBackup({ ...data, variants: {} });
  const { version, tags, favorites } = JSON.parse(json);
  return { count, json: JSON.stringify({ format, version, tags, favorites }, null, 2) + '\n' };
}

export function readRegexBackup(text) {
  let file;
  try {
    file = JSON.parse(text);
  } catch {
    throw new Error('Choose a valid CodeFolio Regex JSON backup.');
  }
  if (file?.format !== format) throw new Error('Choose a CodeFolio Regex backup.');
  const { tags, favorites } = readPersonalBackup(JSON.stringify({
    format: 'codefolio.personal-backup', version: file.version, tags: file.tags, favorites: file.favorites, variants: {},
  }));
  return { tags, favorites };
}

export function mergeRegexBackup(current, imported) {
  const { tags, favorites, tagsAdded, favoritesAdded, duplicates, unavailable } =
    mergePersonalBackup({ ...current, variants: {} }, { ...imported, variants: {} }, patterns);
  return { data: { tags, favorites }, tagsAdded, favoritesAdded, duplicates, unavailable };
}

export function loadPersonalData() {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) return readRegexBackup(stored);
  } catch {
    // Browsing remains available when browser storage cannot be read.
  }
  return { tags: {}, favorites: [] };
}

export function savePersonalData(data) {
  localStorage.setItem(storageKey, exportRegexBackup(data).json);
}
