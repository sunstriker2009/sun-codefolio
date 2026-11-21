export const cleanTag = (tag) => tag.trim().replace(/\s+/g, ' ');
export const tagKey = (tag) => cleanTag(tag).toLowerCase();

export function findTaggedSnippets(entries, tags, query, level, { language, topic }) {
  const term = tagKey(query);
  if (!term) return entries;
  return entries.filter((snippet) => {
    if (level !== 'global' && snippet.language !== language) return false;
    if (level === 'topic' && snippet.topic !== topic) return false;
    return (tags[snippet.id] ?? []).some((tag) => tagKey(tag).includes(term));
  });
}
