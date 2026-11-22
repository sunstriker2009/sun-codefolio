import { parseValues, restoreValues } from './parameters.mjs';

import { compactMetadata, isRecord, mergeMetadata, validateMetadata } from '../shared/personal-metadata.mjs';

export { isRecord };

const backupFormat = 'codefolio.personal-backup';
const legacyBackupFormat = 'codefolio.saved-variants';
const backupVersion = 1;
const maxNameLength = 80;

function isVariant(variant) {
  return isRecord(variant)
    && typeof variant.name === 'string' && variant.name.trim() === variant.name
    && variant.name.length > 0 && variant.name.length <= maxNameLength
    && isRecord(variant.values) && Object.values(variant.values).every((value) =>
      typeof value === 'string' || typeof value === 'boolean' || Number.isFinite(value));
}

function validateVariants(variants) {
  if (!isRecord(variants) || Object.values(variants).some((entries) =>
    !Array.isArray(entries) || entries.some((entry) => !isVariant(entry)))) {
    throw new Error('The backup contains invalid saved variants.');
  }
  return variants;
}

function validatePersonalData({ variants, tags, favorites }) {
  validateVariants(variants);
  return { variants, ...validateMetadata({ tags, favorites }) };
}

function scopeEntries(entries, snippetIds) {
  if (!snippetIds) return entries;
  return Object.fromEntries(Object.entries(entries).filter(([id]) => snippetIds.has(id)));
}

function nonemptyEntries(entries) {
  return Object.fromEntries(Object.entries(entries).filter(([, values]) => values.length > 0));
}

export function exportPersonalBackup(data, snippetIds) {
  const variants = nonemptyEntries(validateVariants(scopeEntries(data.variants, snippetIds)));
  const { tags, favorites, count } = compactMetadata({
    tags: scopeEntries(data.tags, snippetIds),
    favorites: data.favorites.filter((id) => !snippetIds || snippetIds.has(id)),
  });
  const scoped = { variants, tags, favorites };
  return {
    count: Object.values(variants).reduce((total, entries) => total + entries.length, count),
    json: JSON.stringify({ format: backupFormat, version: backupVersion, ...scoped }, null, 2) + '\n',
  };
}

export function readPersonalBackup(text) {
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error('Choose a valid JSON backup exported by CodeFolio.');
  }
  if (!isRecord(backup) || ![backupFormat, legacyBackupFormat].includes(backup.format)) {
    throw new Error('Choose a backup exported by CodeFolio.');
  }
  if (backup.version !== backupVersion) {
    throw new Error('This version of CodeFolio cannot read the backup format.');
  }
  if (backup.format === legacyBackupFormat) {
    return { variants: validateVariants(backup.variants), tags: {}, favorites: [] };
  }
  return validatePersonalData(backup);
}

function comparableValues(snippet, values) {
  if (!isRecord(values)) return null;
  const restored = restoreValues(snippet, values);
  return JSON.stringify(parseValues(snippet, restored).parameters ?? restored);
}

function conflictName(name, attempt) {
  const suffix = attempt === 1 ? ' (imported)' : ' (imported ' + attempt + ')';
  return name.slice(0, maxNameLength - suffix.length).replace(/[\uD800-\uDBFF]$/, '') + suffix;
}

function categoryKey({ language, topic }) {
  return JSON.stringify([language, topic]);
}

function rememberName(names, name, snippetId, values) {
  const entries = names.get(name) ?? new Map();
  entries.set(snippetId, values);
  names.set(name, entries);
}

function categoryNames(stored, snippets, category) {
  const names = new Map();
  for (const snippet of snippets) {
    if (categoryKey(snippet) !== category) continue;
    const entries = stored[snippet.id] ?? [];
    if (!Array.isArray(entries) || entries.some((item) => typeof item?.name !== 'string')) {
      throw new Error('Your existing saved variants could not be read.');
    }
    for (const entry of entries) {
      rememberName(names, entry.name, snippet.id, comparableValues(snippet, entry.values));
    }
  }
  return names;
}

export function mergeVariantBackup(stored, imported, snippets, snippetIds) {
  const variants = { ...stored };
  const counts = { added: 0, renamed: 0, duplicates: 0, unavailable: 0, outsideScope: 0 };
  const catalogById = new Map(snippets.map((snippet) => [snippet.id, snippet]));
  const namesByCategory = new Map();

  for (const [id, entries] of Object.entries(imported)) {
    if (!entries.length) continue;
    const snippet = catalogById.get(id);
    if (!snippet) {
      counts.unavailable += entries.length;
      continue;
    }

    if (snippetIds && !snippetIds.has(id)) {
      counts.outsideScope += entries.length;
      continue;
    }
    const category = categoryKey(snippet);
    if (!namesByCategory.has(category)) {
      namesByCategory.set(category, categoryNames(stored, snippets, category));
    }
    const names = namesByCategory.get(category);
    const combined = [...(stored[id] ?? [])];

    for (const variant of entries) {
      const values = comparableValues(snippet, variant.values);
      let name = variant.name;
      let attempt = 0;
      while (names.has(name) && names.get(name).get(id) !== values) {
        name = conflictName(variant.name, ++attempt);
      }
      if (names.has(name)) {
        counts.duplicates++;
        continue;
      }
      if (attempt) counts.renamed++;
      counts.added++;
      combined.push({ name, values: variant.values });
      rememberName(names, name, id, values);
    }
    variants[id] = combined;
  }

  return { variants, ...counts };
}

export function mergePersonalBackup(stored, imported, snippets, snippetIds) {
  const { variants, ...counts } = mergeVariantBackup(stored.variants, imported.variants, snippets, snippetIds);
  const catalogIds = new Set(snippets.map(({ id }) => id));
  const { tags, favorites, tagsAdded, favoritesAdded, duplicates, unavailable, outsideScope } =
    mergeMetadata(stored, imported, catalogIds, snippetIds);
  return {
    variants, tags, favorites, ...counts, tagsAdded, favoritesAdded,
    duplicates: counts.duplicates + duplicates,
    unavailable: counts.unavailable + unavailable,
    outsideScope: counts.outsideScope + outsideScope,
  };
}
