const form = document.getElementById('try-it');
const pattern = document.getElementById('pattern').textContent;
const input = document.getElementById('test-input');
const button = document.getElementById('test-button');
const status = document.getElementById('test-status');

let worker;
let timer;

function finish(message) {
  clearTimeout(timer);
  status.textContent = message;
  input.readOnly = false;
  button.disabled = false;
}

function reset(message) {
  worker?.terminate();
  worker = undefined;
  finish(message);
}

function testPattern() {
  clearTimeout(timer);
  status.textContent = 'Testing…';
  timer = setTimeout(() => reset('The match timed out. Try again with shorter text.'), 2000);
  worker.postMessage({ pattern, input: input.value });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  input.readOnly = true;
  button.disabled = true;

  if (worker) {
    testPattern();
    return;
  }

  status.textContent = 'Loading the C# runner…';
  const loadError = 'The C# runner couldn’t load. Try again.';
  try {
    worker = new Worker(new URL('./regex-worker.mjs', import.meta.url), { type: 'module' });
  } catch {
    reset(loadError);
    return;
  }

  timer = setTimeout(() => reset(loadError), 30_000);
  worker.addEventListener('error', (error) => {
    error.preventDefault();
    reset(loadError);
  });
  worker.addEventListener('message', ({ data }) => {
    switch (data) {
      case 'ready': testPattern(); break;
      case 'match': finish('Match.'); break;
      case 'no-match': finish('No match.'); break;
      case 'timeout': finish('The match timed out. Try again with shorter text.'); break;
      default: reset('The C# runner couldn’t complete the test. Try again.');
    }
  });
});
