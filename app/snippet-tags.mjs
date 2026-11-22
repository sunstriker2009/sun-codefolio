export const cleanTag = (tag) => tag.trim().replace(/\s+/g, ' ');
export const tagKey = (tag) => cleanTag(tag).toLowerCase();

export function findTaggedSnippets(entries, tags, query) {
  const term = tagKey(query);
  if (!term) return entries;
  return entries.filter(({ id }) =>
    (tags[id] ?? []).some((tag) => tagKey(tag).includes(term)));
}
