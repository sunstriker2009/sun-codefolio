import { namespaceBindings } from './recipes.mjs?v=xpath-1';

export function xpathUsage(recipe, platform) {
  const xml = JSON.stringify(recipe.xml);
  const query = JSON.stringify(recipe.query);
  const bindings = namespaceBindings(recipe.namespaces);
  const namespaces = JSON.stringify(bindings);

  switch (platform) {
    case 'csharp':
      return [
        'using System;',
        'using System.IO;',
        'using System.Xml;',
        'using System.Xml.XPath;',
        '',
        'using var reader = XmlReader.Create(new StringReader(' + xml + '),',
        '    new XmlReaderSettings { DtdProcessing = DtdProcessing.Prohibit, XmlResolver = null });',
        'var navigator = new XPathDocument(reader, XmlSpace.Preserve).CreateNavigator();',
        'var namespaces = new XmlNamespaceManager(navigator.NameTable);',
        ...Object.entries(bindings).map(([prefix, uri]) =>
          'namespaces.AddNamespace(' + JSON.stringify(prefix) + ', ' + JSON.stringify(uri) + ');'),
        'var result = navigator.Evaluate(' + query + ', namespaces);',
        'if (result is XPathNodeIterator nodes)',
        '{',
        '    while (nodes.MoveNext())',
        '    {',
        '        var node = nodes.Current!;',
        '        Console.WriteLine(node.NodeType == XPathNodeType.Element ? node.OuterXml : node.Value);',
        '    }',
        '}',
        'else Console.WriteLine(result);',
      ].join('\n');
    case 'javascript':
      return [
        'const xml = ' + xml + ';',
        'const doc = new DOMParser().parseFromString(xml, "application/xml");',
        'const namespaces = ' + namespaces + ';',
        'const result = doc.evaluate(' + query + ', doc,',
        '  prefix => namespaces[prefix] ?? null, XPathResult.ANY_TYPE, null);',
        'switch (result.resultType) {',
        '  case XPathResult.NUMBER_TYPE: console.log(result.numberValue); break;',
        '  case XPathResult.BOOLEAN_TYPE: console.log(result.booleanValue); break;',
        '  case XPathResult.STRING_TYPE: console.log(result.stringValue); break;',
        '  default:',
        '    for (let node; (node = result.iterateNext()); )',
        '      console.log(node.nodeType === Node.ELEMENT_NODE ? new XMLSerializer().serializeToString(node) : node.nodeValue);',
        '}',
      ].join('\n');
    case 'python':
      return [
        '# Install lxml with: pip install lxml',
        'from lxml import etree',
        '',
        'xml = ' + xml,
        'parser = etree.XMLParser(resolve_entities=False, load_dtd=False, no_network=True)',
        'root = etree.fromstring(xml.encode("utf-8"), parser)',
        'result = root.xpath(' + query + ', namespaces=' + namespaces + ', regexp=False)',
        'if isinstance(result, list):',
        '    for item in result:',
        '        print(etree.tostring(item, encoding="unicode", with_tail=False) if isinstance(item, etree._Element) else item)',
        'else:',
        '    print(result)',
      ].join('\n');
  }
}
