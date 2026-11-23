import { loadDotnet, loadPython } from '../shared/runtime-loaders.mjs?v=xpath-1';

const platform = new URL(self.location.href).searchParams.get('platform');

async function loadRunner() {
  if (platform === 'csharp') {
    const { XPathRunner } = await loadDotnet();
    return XPathRunner.Run;
  }
  const python = await loadPython();
  const wheel = new URL('./_python/lxml-6.1.3-cp314-cp314-pyemscripten_2026_0_wasm32.whl', import.meta.url);
  const response = await fetch(new URL('./python-xpath.py', import.meta.url));
  if (!response.ok) throw new Error('Could not load the Python XPath adapter.');
  await python.loadPackage(wheel.href);
  await python.runPythonAsync(await response.text());
  return python.globals.get('codefolio_xpath');
}

const run = await loadRunner();
self.addEventListener('message', ({ data }) => {
  try {
    const { xml, query, namespaces } = JSON.parse(data.input);
    self.postMessage(JSON.parse(run(xml, query, JSON.stringify(namespaces))));
  } catch {
    self.postMessage({ status: 'error' });
  }
});
self.postMessage({ status: 'ready' });
