import { dateJavaScript, recipes, validInputShape } from './recipes.mjs?v=date-topics-1';

const platform = new URL(self.location.href).searchParams.get('platform');

async function readZone() {
  const response = await fetch(new URL('./toronto.tzif', import.meta.url));
  if (!response.ok) throw new Error('Could not load Toronto time zone data.');
  return new Uint8Array(await response.arrayBuffer());
}

async function loadRunner() {
  switch (platform) {
    case 'csharp': {
      const { dotnet } = await import('../regex/_framework/dotnet.js?v=date-topics-1');
      const { getAssemblyExports, getConfig } = await dotnet.create();
      const { DateTimeRunner } = await getAssemblyExports(getConfig().mainAssemblyName);
      return DateTimeRunner.Run;
    }
    case 'go': {
      const { startGoRuntime } = await import('../regex/go-regex.mjs?v=date-topics-1');
      const { date } = await startGoRuntime();
      let zone;
      return async (recipe, input) => {
        if (recipe === 'utc-to-toronto') zone ??= await readZone();
        const result = date(recipe, input, zone);
        if (result?.error) throw new Error(result.error);
        return result;
      };
    }
    case 'python': {
      const { startDatePython } = await import('./python-date.mjs?v=date-topics-1');
      return startDatePython(readZone);
    }
    default:
      return dateJavaScript;
  }
}

const run = await loadRunner();
self.addEventListener('message', async ({ data: { pattern: recipe, input } }) => {
  if (!recipes.some(entry => entry.id === recipe) || !validInputShape(recipe, input)) {
    self.postMessage({ status: 'invalid' });
    return;
  }
  try {
    const output = await run(recipe, input);
    self.postMessage(typeof output === 'string' ? { status: 'ok', output } : { status: 'invalid' });
  } catch {
    self.postMessage({ status: 'error' });
  }
});
self.postMessage({ status: 'ready' });
