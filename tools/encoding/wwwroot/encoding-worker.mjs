import { loadDotnet, loadPython } from '../shared/runtime-loaders.mjs?v=xpath-1';
import { encodeJavaScript, recipes } from './recipes.mjs?v=topics-2';

const platform = new URL(self.location.href).searchParams.get('platform');

async function loadRunner() {
  switch (platform) {
    case 'csharp': {
      const { EncodingRunner } = await loadDotnet();
      return EncodingRunner.Run;
    }
    case 'go': {
      const { startGoRuntime } = await import('../regex/go-regex.mjs?v=csv-1');
      const { encoding } = await startGoRuntime();
      return encoding;
    }
    case 'python': {
      const python = await loadPython();
      return python.runPython([
        'from base64 import b64encode, b64decode',
        'from json import dumps',
        'from urllib.parse import quote',
        '',
        'def codefolio_encode(recipe, text):',
        '    if recipe == "url-component":',
        '        return quote(text, safe="")',
        '    if recipe == "base64-utf8":',
        '        encoded = b64encode(text.encode("utf-8")).decode("ascii")',
        '        decoded = b64decode(encoded).decode("utf-8")',
        '        return "Base64: " + encoded + chr(10) + "Decoded: " + decoded',
        '    if recipe == "json-string":',
        '        return dumps(text)',
        '',
        'codefolio_encode',
      ].join('\n'));
    }
    default:
      return encodeJavaScript;
  }
}

const run = await loadRunner();
self.addEventListener('message', ({ data: { pattern: recipe, input } }) => {
  if (!recipes.some(entry => entry.id === recipe)) {
    self.postMessage({ status: 'invalid' });
    return;
  }
  try {
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(new TextEncoder().encode(input));
    const output = run(recipe, text);
    self.postMessage(typeof output === 'string' ? { status: 'ok', output } : { status: 'invalid' });
  } catch {
    self.postMessage({ status: 'error' });
  }
});
self.postMessage({ status: 'ready' });
