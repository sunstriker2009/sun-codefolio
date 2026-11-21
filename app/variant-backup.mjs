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

export function mergeVariantBackup(stored, imported, snippets) {
  const variants = { ...stored };
  const counts = { added: 0, renamed: 0, duplicates: 0, unavailable: 0 };
  const catalogById = new Map(snippets.map((snippet) => [snippet.id, snippet]));

  for (const [id, entries] of Object.entries(imported)) {
    if (!entries.length) continue;
    const snippet = catalogById.get(id);
    if (!snippet) {
      counts.unavailable += entries.length;
      continue;
    }

    const current = stored[id] ?? [];
    if (!Array.isArray(current) || current.some((item) => typeof item?.name !== 'string')) {
      throw new Error('Your existing saved variants could not be read.');
    }
    const byName = new Map(current.map((entry) => [entry.name, comparableValues(snippet, entry.values)]));
    const combined = [...current];

    for (const variant of entries) {
      const values = comparableValues(snippet, variant.values);
      let name = variant.name;
      let attempt = 0;
      while (byName.has(name) && byName.get(name) !== values) {
        name = conflictName(variant.name, ++attempt);
      }
      if (byName.has(name)) {
        counts.duplicates++;
        continue;
      }
      if (attempt) counts.renamed++;
      counts.added++;
      combined.push({ name, values: variant.values });
      byName.set(name, values);
    }
    variants[id] = combined;
  }

  return { variants, ...counts };
}
