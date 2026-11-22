export function createRunner(platform) {
  let worker;
  let ready = false;
  let pending;

  function finish(result) {
    if (!pending) return;
    const { resolve, timer } = pending;
    pending = undefined;
    clearTimeout(timer);
    resolve(result);
  }

  function stop(status) {
    worker?.terminate();
    worker = undefined;
    ready = false;
    finish({ status });
  }

  function send() {
    clearTimeout(pending.timer);
    pending.timer = setTimeout(() => stop('timeout'), 2000);
    worker.postMessage({ pattern: pending.pattern, input: pending.input });
  }

  return (pattern, input) => new Promise((resolve) => {
    if (pending) stop('canceled');
    pending = { pattern, input, resolve, timer: setTimeout(() => stop('load-error'), 30_000) };
    if (ready) {
      send();
      return;
    }

    try {
      const url = new URL('./regex-worker.mjs?v=regex-reference-1', import.meta.url);
      url.searchParams.set('platform', platform);
      const current = new Worker(url, { type: 'module' });
      worker = current;
      current.addEventListener('error', event => {
        event.preventDefault();
        if (worker === current) stop('load-error');
      });
      current.addEventListener('message', ({ data }) => {
        if (worker !== current) return;
        if (data.status === 'ready') {
          ready = true;
          send();
        } else {
          finish(data);
        }
      });
    } catch {
      stop('load-error');
    }
  });
}
