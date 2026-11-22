import { matchJavaScript } from './patterns.mjs?v=regex-custom-1';

const platform = new URL(self.location.href).searchParams.get('platform');
let match = matchJavaScript;
let validate = (pattern) => {
  new RegExp(pattern);
  return null;
};
if (platform === 'csharp') {
  const { dotnet } = await import('./_framework/dotnet.js?v=regex-custom-1');
  const { getAssemblyExports, getConfig } = await dotnet.create();
  const { RegexRunner } = await getAssemblyExports(getConfig().mainAssemblyName);
  match = (pattern, input) => JSON.parse(RegexRunner.Test(pattern, input));
  validate = RegexRunner.Validate;
}

self.addEventListener('message', ({ data }) => {
  try {
    if (data.operation === 'validate') {
      const message = validate(data.pattern);
      self.postMessage(message ? { status: 'invalid', message } : { status: 'valid' });
    } else {
      self.postMessage(match(data.pattern, data.input));
    }
  } catch (error) {
    self.postMessage(error instanceof SyntaxError
      ? { status: 'invalid', message: error.message }
      : { status: 'error' });
  }
});
self.postMessage({ status: 'ready' });
