import assert from 'node:assert/strict';
import test from 'node:test';
import { destinationFor } from '../redirect.mjs';

const home = 'https://sunstriker2009.github.io/sun-codefolio/';

test('the CodeFolio home page opens Regex and preserves Regex deep links', () => {
  assert.equal(destinationFor(home), home + 'regex/');
  assert.equal(
    destinationFor(home + 'index.html?pattern=decimal-number&platform=go#try-it'),
    home + 'regex/?pattern=decimal-number&platform=go#try-it',
  );
});

test('an old snippet URL forwards its ID to Playground', () => {
  const playground = 'https://sunstriker2009.github.io/sun-playground/';
  assert.equal(destinationFor(home + '?snippet=git-file-history'), playground + '?snippet=git-file-history');
  assert.equal(
    destinationFor(home + 'index.html?snippet=c%23%26example&platform=go'),
    playground + '?snippet=c%23%26example',
  );
});
