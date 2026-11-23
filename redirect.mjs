const playground = 'https://sunstriker2009.github.io/sun-playground/';

export function destinationFor(href) {
  const current = new URL(href);
  const snippet = current.searchParams.get('snippet');
  if (!snippet && !current.searchParams.has('pattern') && !current.searchParams.has('platform')) return null;
  const target = new URL(snippet ? playground : './regex/', current);
  if (snippet) {
    target.searchParams.set('snippet', snippet);
  } else {
    target.search = current.search;
  }
  target.hash = current.hash;
  return target.href;
}
