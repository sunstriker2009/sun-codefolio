import { matchJavaScript } from './patterns.mjs?v=match-results-1';

const platform = new URL(self.location.href).searchParams.get('platform');
const maxMatches = 100;
let match = matchJavaScript;
let validate = (pattern) => {
  new RegExp(pattern);
  return null;
};
if (platform === 'csharp') {
  const { dotnet } = await import('./_framework/dotnet.js?v=xpath-1');
  const { getAssemblyExports, getConfig } = await dotnet.create();
  const { RegexRunner } = await getAssemblyExports(getConfig().mainAssemblyName);
  match = (pattern, input, limit) => JSON.parse(RegexRunner.Test(pattern, input, limit));
  validate = RegexRunner.Validate;
} else if (platform === 'python') {
  const { startPythonRegex } = await import('./python-regex.mjs?v=match-results-1');
  ({ match, validate } = await startPythonRegex());
} else if (platform === 'pcre2') {
  const { startPcre2Regex } = await import('./pcre2-regex.mjs?v=match-results-1');
  ({ match, validate } = await startPcre2Regex());
} else if (platform === 'go') {
  const { startGoRegex } = await import('./go-regex.mjs?v=csv-1');
  ({ match, validate } = await startGoRegex());
}

self.addEventListener('message', ({ data }) => {
  try {
    if (data.operation === 'validate') {
      const message = validate(data.pattern);
      self.postMessage(message ? { status: 'invalid', message } : { status: 'valid' });
    } else {
      const limit = data.operation === 'match-all' ? maxMatches + 1 : 1;
      const result = match(data.pattern, data.input, limit);
      if (result.matches?.length > maxMatches) {
        result.matches.pop();
        result.truncated = true;
      }
      self.postMessage(result);
    }
  } catch (error) {
    self.postMessage(error instanceof SyntaxError
      ? { status: 'invalid', message: error.message }
      : { status: 'error' });
  }
});
self.postMessage({ status: 'ready' });
