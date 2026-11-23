import { maxNodePreview, maxResults } from './recipes.mjs?v=xpath-1';

const xmlNamespace = 'http://www.w3.org/XML/1998/namespace';
const parserErrorNamespace = 'http://www.mozilla.org/newlayout/xml/parsererror.xml';
const xhtmlNamespace = 'http://www.w3.org/1999/xhtml';

function describe(node, serializer) {
  const type = { 1: 'element', 2: 'attribute', 3: 'text', 4: 'text', 7: 'processing-instruction', 8: 'comment', 9: 'document', 13: 'namespace' };
  const kind = type[node.nodeType] ?? 'node';
  const name = ['element', 'attribute', 'processing-instruction', 'namespace'].includes(kind)
    ? node.localName ?? node.nodeName : '';
  const content = kind === 'element' || kind === 'document'
    ? serializer.serializeToString(node) : node.nodeValue ?? '';
  const value = content.length > maxNodePreview ? content.slice(0, maxNodePreview) + '…' : content;
  return { kind, name, value };
}

export function evaluateBrowserXPath({ xml, query, namespaces }) {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.doctype) return { status: 'invalid', message: 'DOCTYPE declarations are disabled.' };
  const parserErrors = document.getElementsByTagNameNS(parserErrorNamespace, 'parsererror');
  // Chromium and WebKit can insert an XHTML diagnostic into the partial document.
  const diagnostics = [...document.getElementsByTagNameNS(xhtmlNamespace, 'parsererror')];
  if (parserErrors.length || diagnostics.some(node => node.hasAttribute('style') && node.firstElementChild?.localName === 'h3')) {
    return { status: 'invalid', message: 'The XML is not well formed.' };
  }

  try {
    const result = document.evaluate(query, document,
      prefix => prefix === 'xml' ? xmlNamespace : namespaces[prefix] ?? null, XPathResult.ANY_TYPE, null);
    switch (result.resultType) {
      case XPathResult.NUMBER_TYPE: return { status: 'scalar', kind: 'number', value: String(result.numberValue) };
      case XPathResult.STRING_TYPE: return { status: 'scalar', kind: 'string', value: result.stringValue };
      case XPathResult.BOOLEAN_TYPE: return { status: 'scalar', kind: 'boolean', value: String(result.booleanValue) };
      default: {
        const serializer = new XMLSerializer();
        const nodes = [];
        let node = result.iterateNext();
        while (node && nodes.length < maxResults) {
          nodes.push(describe(node, serializer));
          node = result.iterateNext();
        }
        return { status: 'nodes', nodes, truncated: Boolean(node) };
      }
    }
  } catch (error) {
    return { status: 'invalid', message: 'XPath error. ' + error.message };
  }
}
