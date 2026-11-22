import { cleanTag, tagKey } from './snippet-tags.mjs';

export function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateMetadata({ tags, favorites }) {
  if (!isRecord(tags) || Object.values(tags).some((names) =>
    !Array.isArray(names) || names.some((name) => typeof name !== 'string' || !cleanTag(name)))) {
    throw new Error('The backup contains invalid tags.');
  }
  if (!Array.isArray(favorites) || favorites.some((id) => typeof id !== 'string' || !id.trim())) {
    throw new Error('The backup contains invalid favorites.');
  }
  return { tags, favorites };
}

export function compactMetadata(data) {
  const { tags, favorites } = validateMetadata(data);
  const compactTags = Object.fromEntries(Object.entries(tags).filter(([, names]) => names.length > 0));
  const uniqueFavorites = [...new Set(favorites)];
  return {
    tags: compactTags,
    favorites: uniqueFavorites,
    count: Object.values(compactTags).reduce((count, names) => count + names.length, 0) + uniqueFavorites.length,
  };
}

export function mergeMetadata(stored, imported, catalogIds, scope) {
  const tags = { ...stored.tags };
  const favorites = new Set(stored.favorites);
  const counts = { tagsAdded: 0, favoritesAdded: 0, duplicates: 0, unavailable: 0, outsideScope: 0 };

  function inScope(id, count) {
    if (!catalogIds.has(id)) {
      counts.unavailable += count;
      return false;
    }
    if (scope && !scope.has(id)) {
      counts.outsideScope += count;
      return false;
    }
    return true;
  }

  for (const [id, incoming] of Object.entries(imported.tags)) {
    if (!incoming.length || !inScope(id, incoming.length)) continue;

    const current = tags[id] ?? [];
    const known = new Set(current.map(tagKey));
    const additions = [];
    for (const tag of incoming) {
      const key = tagKey(tag);
      if (known.has(key)) {
        counts.duplicates++;
      } else {
        known.add(key);
        additions.push(cleanTag(tag));
      }
    }
    if (additions.length) tags[id] = [...current, ...additions];
    counts.tagsAdded += additions.length;
  }

  for (const id of imported.favorites) {
    if (!inScope(id, 1)) continue;
    if (favorites.has(id)) {
      counts.duplicates++;
    } else {
      favorites.add(id);
      counts.favoritesAdded++;
    }
  }

  return { tags, favorites: [...favorites], ...counts };
}
