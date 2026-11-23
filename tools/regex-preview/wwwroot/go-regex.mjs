export async function startGoRegex() {
  await import('./_go/wasm_exec.js?v=regex-go-1');
  const go = new globalThis.Go();
  const response = await fetch(new URL('./_go/regex.wasm?v=match-results-1', import.meta.url));
  if (!response.ok) throw new Error('Could not load the Go WebAssembly module.');
  const { instance } = await WebAssembly.instantiate(await response.arrayBuffer(), go.importObject);
  const run = await new Promise((resolve, reject) => {
    globalThis.codefolioGoRegexReady = resolve;
    go.run(instance).then(() => reject(new Error('The Go runtime exited.')), reject);
  }).finally(() => {
    delete globalThis.codefolioGoRegexReady;
  });

  return {
    match: (pattern, input, limit) => run(pattern, input, limit),
    validate: pattern => run(pattern, '', 0).message ?? null,
  };
}
