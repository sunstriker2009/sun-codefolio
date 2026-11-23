import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { platforms, recipes } from '../../../tools/date-time/wwwroot/recipes.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const executablePath = process.env.CODEFOLIO_CHROMIUM_EXECUTABLE;
const browser = await chromium.launch(executablePath ? {
  executablePath, args: ['--single-process', '--no-zygote', '--no-sandbox'],
} : {});

try {
  const root = new URL(process.argv[2]);
  const page = await browser.newPage({ viewport: { width: 390, height: 850 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(root.href);
  await page.getByRole('heading', { name: 'Topics', exact: true }).waitFor();
  await page.getByRole('link', { name: /^Date & Time/ }).click();
  await page.waitForURL(new URL('date-time/', root).href);
  await page.getByRole('heading', { name: 'Date & Time', exact: true }).waitFor();

  const recipePicker = page.getByLabel('Recipe', { exact: true });
  const platformPicker = page.getByLabel('Platform', { exact: true });
  const input = page.getByLabel('Input', { exact: true });
  const examplePicker = page.getByLabel('Load example', { exact: true });
  const run = page.getByRole('button', { name: 'Run', exact: true });
  const status = page.locator('#topic-status');
  const output = page.locator('#topic-output');

  for (const platform of Object.keys(platforms)) {
    await platformPicker.selectOption(platform);
    for (const recipe of recipes) {
      await recipePicker.selectOption(recipe.id);
      for (const [index, sample] of recipe.examples.entries()) {
        await examplePicker.selectOption(String(index));
        assert.equal(await input.inputValue(), sample.input);
        await run.click();
        const expected = sample.output === null ? 'Enter a valid value in the format shown.' : 'Result ready.';
        try {
          await status.getByText(expected, { exact: true }).waitFor({ timeout: 35_000 });
        } catch (error) {
          throw new Error(platform + ' / ' + recipe.id + ' returned ' + await status.textContent(), { cause: error });
        }
        if (sample.output === null) assert.equal(await output.isVisible(), false);
        else assert.equal(await output.textContent(), sample.output);
      }
    }
  }

  const link = new URL('date-time/?recipe=utc-to-toronto&platform=python', root);
  await page.goto(link.href);
  assert.equal(await recipePicker.inputValue(), 'utc-to-toronto');
  assert.equal(await platformPicker.inputValue(), 'python');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  await page.getByRole('link', { name: 'Topics', exact: true }).click();
  await page.getByRole('heading', { name: 'Topics', exact: true }).waitFor();
  await page.getByRole('link', { name: /^Regex/ }).click();
  await page.waitForURL(new URL('regex/', root).href);
  await page.goto(new URL('?pattern=signed-integer&platform=go', root).href);
  await page.waitForURL(new URL('regex/?pattern=signed-integer&platform=go', root).href);
  await page.getByRole('heading', { name: 'Signed integer', exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('Verified Topics navigation, legacy Regex links, Date & Time deep links, and all four date platforms.');
} finally {
  await browser.close();
}
