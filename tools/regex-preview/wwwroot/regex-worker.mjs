import { matchJavaScript } from './patterns.mjs';

const platform = new URL(self.location.href).searchParams.get('platform');
let match = matchJavaScript;
if (platform === 'csharp') {
  const { dotnet } = await import('./_framework/dotnet.js');
  const { getAssemblyExports, getConfig } = await dotnet.create();
  const { RegexRunner } = await getAssemblyExports(getConfig().mainAssemblyName);
  match = (pattern, input) => JSON.parse(RegexRunner.Test(pattern, input));
}

self.addEventListener('message', ({ data }) => {
  try {
    self.postMessage(match(data.pattern, data.input));
  } catch {
    self.postMessage({ status: 'error' });
  }
});
self.postMessage({ status: 'ready' });
