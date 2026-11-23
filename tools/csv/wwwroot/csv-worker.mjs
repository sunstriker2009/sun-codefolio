import { loadDotnet, loadPython } from '../shared/runtime-loaders.mjs?v=xpath-1';
import { parseCsv } from './parser.mjs?v=csv-1';

const platform = new URL(self.location.href).searchParams.get('platform');

async function loadRunner() {
  switch (platform) {
    case 'csharp': {
      const { CsvRunner } = await loadDotnet();
      return text => JSON.parse(CsvRunner.Run(text));
    }
    case 'go': {
      const { startGoRuntime } = await import('../regex/go-regex.mjs?v=csv-1');
      const { csv } = await startGoRuntime();
      return text => JSON.parse(csv(text));
    }
    case 'python': {
      const python = await loadPython();
      const run = python.runPython([
        'import csv',
        'from io import StringIO',
        'from json import dumps',
        '',
        'def codefolio_csv(text):',
        '    try:',
        '        return dumps([row for row in csv.reader(StringIO(text, newline=""), strict=True) if row])',
        '    except csv.Error:',
        '        return "null"',
        '',
        'codefolio_csv',
      ].join('\n'));
      return text => JSON.parse(run(text));
    }
    default:
      return text => {
        try {
          return parseCsv(text);
        } catch (error) {
          if (error instanceof SyntaxError) return null;
          throw error;
        }
      };
  }
}

const run = await loadRunner();
self.addEventListener('message', ({ data: { input } }) => {
  try {
    const rows = run(input);
    self.postMessage(rows === null ? { status: 'invalid' } : { status: 'ok', output: JSON.stringify(rows, null, 2) });
  } catch {
    self.postMessage({ status: 'error' });
  }
});
self.postMessage({ status: 'ready' });
