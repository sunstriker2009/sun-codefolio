import { dotnet } from './_framework/dotnet.js';

const { getAssemblyExports, getConfig } = await dotnet.create();
const { RegexRunner } = await getAssemblyExports(getConfig().mainAssemblyName);

self.addEventListener('message', ({ data }) => {
  try {
    self.postMessage(RegexRunner.Test(data.pattern, data.input));
  } catch {
    self.postMessage('error');
  }
});

self.postMessage('ready');
