import { parseValues, restoreValues } from './parameters.mjs';

const backupFormat = 'codefolio.saved-variants';
const backupVersion = 1;
const maxNameLength = 80;

export function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

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

export function exportVariantBackup(stored) {
  const variants = Object.fromEntries(Object.entries(validateVariants(stored))
    .filter(([, entries]) => entries.length > 0));
  return {
    count: Object.values(variants).reduce((count, entries) => count + entries.length, 0),
    json: JSON.stringify({ format: backupFormat, version: backupVersion, variants }, null, 2) + '\n',
  };
}

export function readVariantBackup(text) {
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error('Choose a valid JSON backup exported by CodeFolio.');
  }
  if (!isRecord(backup) || backup.format !== backupFormat) {
    throw new Error('Choose a saved-variants backup exported by CodeFolio.');
  }
  if (backup.version !== backupVersion) {
    throw new Error('This version of CodeFolio cannot read the backup format.');
  }
  return validateVariants(backup.variants);
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

export function mergeVariantBackup(stored, imported, snippets) {
  const variants = { ...stored };
  const counts = { added: 0, renamed: 0, duplicates: 0, unavailable: 0 };
  const catalogById = new Map(snippets.map((snippet) => [snippet.id, snippet]));
  const namesByCategory = new Map();

  for (const [id, entries] of Object.entries(imported)) {
    if (!entries.length) continue;
    const snippet = catalogById.get(id);
    if (!snippet) {
      counts.unavailable += entries.length;
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
