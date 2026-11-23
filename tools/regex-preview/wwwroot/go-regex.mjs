export async function startGoRuntime() {
  await import('./_go/wasm_exec.js?v=regex-go-1');
  const go = new globalThis.Go();
  const response = await fetch(new URL('./_go/regex.wasm?v=csv-1', import.meta.url));
  if (!response.ok) throw new Error('Could not load the Go WebAssembly module.');
  const { instance } = await WebAssembly.instantiate(await response.arrayBuffer(), go.importObject);
  return new Promise((resolve, reject) => {
    globalThis.codefolioGoReady = (regex, date, encoding, csv) => resolve({ regex, date, encoding, csv });
    go.run(instance).then(() => reject(new Error('The Go runtime exited.')), reject);
  }).finally(() => {
    delete globalThis.codefolioGoReady;
  });
}

export async function startGoRegex() {
  const { regex: run } = await startGoRuntime();
  return {
    match: (pattern, input, limit) => run(pattern, input, limit),
    validate: pattern => run(pattern, '', 0).message ?? null,
  };
}
