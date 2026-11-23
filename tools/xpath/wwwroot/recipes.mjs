export const platforms = { csharp: 'C# / .NET 10', javascript: 'Browser JavaScript', python: 'Python / lxml' };

const books = [
  '<catalog>',
  '  <book id="b1"><title>The Hobbit</title><price>12</price></book>',
  '  <book id="b2"><title>Kindred</title><price>18</price></book>',
  '</catalog>',
].join('\n');

export const recipes = [
  {
    id: 'filter-elements', title: 'Filter elements',
    description: 'Select a book element using a predicate on its price.',
    xml: books, query: '/catalog/book[price > 15]', namespaces: '',
  },
  {
    id: 'read-attributes', title: 'Read attribute values',
    description: 'Select each book’s id attribute.',
    xml: books, query: '//book/@id', namespaces: '',
  },
  {
    id: 'namespaced-text', title: 'Select text in a namespace',
    description: 'Bind a prefix to the default namespace, then select the title’s text.',
    xml: '<catalog xmlns="urn:books"><book><title>Kindred</title></book></catalog>',
    query: '/b:catalog/b:book/b:title/text()', namespaces: 'b=urn:books',
  },
  {
    id: 'count-matches', title: 'Count selected nodes',
    description: 'Wrap a selection in count() to return a number.',
    xml: books, query: 'count(/catalog/book)', namespaces: '',
  },
];

export const maxXmlLength = 20_000;
export const maxQueryLength = 1_000;
export const maxResults = 100;
export const maxNodePreview = 1_200;

export function namespaceBindings(text) {
  const bindings = Object.create(null);
  for (const input of text.split(/\r?\n/)) {
    const line = input.trim();
    if (!line) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(\S+)$/.exec(line);
    if (!match) throw new Error('Use one namespace binding per line in prefix=URI form.');
    const [, prefix, uri] = match;
    if (prefix === 'xmlns' || prefix === 'xml') {
      throw new Error('Use a custom prefix. The xml prefix is already defined.');
    }
    if (Object.hasOwn(bindings, prefix)) throw new Error('Use each namespace prefix once.');
    bindings[prefix] = uri;
  }
  return bindings;
}

export function prepareXPath(xml, query, bindings) {
  if (!xml.trim() || xml.length > maxXmlLength) {
    throw new Error('Enter XML up to ' + maxXmlLength.toLocaleString('en-US') + ' characters.');
  }
  if (!query.trim() || query.length > maxQueryLength) {
    throw new Error('Enter an XPath expression up to ' + maxQueryLength.toLocaleString('en-US') + ' characters.');
  }
  // Ignore declaration-like text in comments, CDATA and processing instructions.
  const markup = xml.replace(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>/g, '');
  if (/<!DOCTYPE\b/.test(markup)) throw new Error('DOCTYPE declarations are disabled.');
  return { xml, query: query.trim(), namespaces: namespaceBindings(bindings) };
}
