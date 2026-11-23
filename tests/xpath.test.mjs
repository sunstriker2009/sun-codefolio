import assert from 'node:assert/strict';
import test from 'node:test';
import { maxQueryLength, maxXmlLength, prepareXPath, recipes } from '../tools/xpath/wwwroot/recipes.mjs';
import { xpathUsage } from '../tools/xpath/wwwroot/usage.mjs';

test('XPath prepares an explicit namespace binding for every supplied prefix', () => {
  const xml = '<catalog xmlns="urn:books"><title>Kindred</title></catalog>';
  const input = prepareXPath(xml, ' /b:catalog/b:title/text() ', 'b=urn:books\n a = https://example.com/ns?x=y\n');
  assert.equal(input.xml, xml);
  assert.equal(input.query, '/b:catalog/b:title/text()');
  assert.deepEqual({ ...input.namespaces }, { b: 'urn:books', a: 'https://example.com/ns?x=y' });
  assert.throws(() => prepareXPath(xml, '/b:catalog', 'b=urn:books\nb=urn:other'), /once/);
  assert.throws(() => prepareXPath(xml, '/b:catalog', '=urn:books'), /prefix=URI/);
  assert.throws(() => prepareXPath(xml, '/', 'xml=urn:books'), /already defined/);
});

test('XPath bounds input and blocks declarations while allowing literal XML text', () => {
  assert.throws(() => prepareXPath('<!DOCTYPE catalog><catalog/>', '/', ''), /DOCTYPE/);
  assert.doesNotThrow(() => prepareXPath('<catalog><!-- <!DOCTYPE demo> --><![CDATA[<!DOCTYPE demo>]]></catalog>', '/', ''));
  assert.throws(() => prepareXPath('x'.repeat(maxXmlLength + 1), '/', ''), /up to/);
  assert.throws(() => prepareXPath('<catalog/>', 'x'.repeat(maxQueryLength + 1), ''), /up to/);
  assert.throws(() => prepareXPath('<catalog/>', ' ', ''), /XPath expression/);
});

test('each XPath recipe provides a native usage example for each platform', () => {
  for (const recipe of recipes) {
    assert.match(xpathUsage(recipe, 'csharp'), /navigator\.Evaluate/);
    assert.match(xpathUsage(recipe, 'javascript'), /doc\.evaluate/);
    assert.match(xpathUsage(recipe, 'python'), /root\.xpath/);
  }
  const namespaced = recipes.find(recipe => recipe.id === 'namespaced-text');
  assert.match(xpathUsage(namespaced, 'csharp'), /AddNamespace\("b", "urn:books"\)/);
  assert.match(xpathUsage(namespaced, 'python'), /namespaces=\{"b":"urn:books"\}/);
  assert.match(xpathUsage(namespaced, 'javascript'), /"b":"urn:books"/);
});
