import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const executablePath = process.env.CODEFOLIO_CHROMIUM_EXECUTABLE;
const browser = await chromium.launch(executablePath ? {
  executablePath, args: ['--single-process', '--no-zygote', '--no-sandbox'],
} : {});

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 850 } });
  page.setDefaultTimeout(35_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const regex = new URL('regex/', process.argv[2]);
  await page.goto(new URL('?pattern=signed-integer&trypane=1', regex).href);
  const pane = page.locator('#trypane-preview-root .try-pane');
  await pane.waitFor();
  assert.equal(await page.locator('#test-button').isVisible(), false);
  assert.equal(await page.locator('#test-outcome').isVisible(), false);

  const input = page.getByLabel('Test text');
  const run = pane.getByRole('button', { name: 'Run' });
  await input.fill('-42');
  await run.click();
  await pane.getByRole('status').getByText('Match.', { exact: true }).waitFor();
  assert.equal(await pane.locator('mark').textContent(), '-42');
  assert.match(await pane.locator('.try-pane__result').textContent(), /Matched "-42" at index 0/);

  await page.getByLabel('Load example').selectOption('noMatch');
  assert.equal(await input.inputValue(), '3.5');
  await pane.getByRole('status').getByText('Ready', { exact: true }).waitFor();
  await run.click();
  await pane.getByRole('status').getByText('No match.', { exact: true }).waitFor();
  assert.equal(await pane.locator('mark').count(), 0);

  await page.getByRole('tab', { name: /Saved test cases/ }).click();
  await page.getByRole('tabpanel', { name: /Saved test cases/ }).waitFor();
  await page.getByRole('tab', { name: 'Try It' }).click();
  assert.equal(await input.inputValue(), '3.5');

  await page.getByLabel('Detail platform').selectOption('javascript');
  assert.equal(await pane.count(), 0);
  assert.equal(await page.locator('#test-button').isVisible(), true);
  assert.equal(new URL(page.url()).searchParams.get('trypane'), '1');
  await page.getByLabel('Detail platform').selectOption('csharp');
  await pane.waitFor();
  assert.equal(await input.inputValue(), '3.5');

  await page.goto(new URL('?pattern=signed-integer', regex).href);
  assert.equal(await pane.count(), 0);
  assert.equal(await page.locator('#test-button').isVisible(), true);
  assert.deepEqual(errors, []);
  console.log('TryPane opt-in CodeFolio integration passed in Chromium.');
} finally {
  await browser.close();
}
