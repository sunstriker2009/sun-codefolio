import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { platforms, recipes as dates } from '../../../tools/date-time/wwwroot/recipes.mjs';
import { recipes as encodings } from '../../../tools/encoding/wwwroot/recipes.mjs';

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
  const recipePicker = page.getByLabel('Recipe', { exact: true });
  const platformPicker = page.getByLabel('Platform', { exact: true });
  const input = page.getByLabel('Input', { exact: true });
  const examplePicker = page.getByLabel('Load example', { exact: true });
  const run = page.getByRole('button', { name: 'Run', exact: true });
  const status = page.locator('#topic-status');
  const output = page.locator('#topic-output');

  async function exerciseTopic({ name, path, recipes }) {
    await page.getByRole('heading', { name: 'Topics', exact: true }).waitFor();
    await page.getByRole('link', { name: new RegExp('^' + name) }).click();
    await page.waitForURL(new URL(path, root).href);
    await page.getByRole('heading', { name, exact: true }).waitFor();
    const [text, picker, button] = await Promise.all([input.boundingBox(), examplePicker.boundingBox(), run.boundingBox()]);
    assert.ok(text && picker && button);
    assert.ok(picker.y >= text.y + text.height && button.y >= text.y + text.height);
    assert.ok(Math.abs(picker.y + picker.height / 2 - button.y - button.height / 2) < 2);
    assert.ok(Math.abs(picker.x - text.x) < 2 && Math.abs(button.x + button.width - text.x - text.width) < 2);

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
          else if (recipe.id === 'json-string') assert.equal(JSON.parse(await output.textContent()), sample.input);
          else assert.equal(await output.textContent(), sample.output);
        }
      }
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
    await page.getByRole('link', { name: 'Topics', exact: true }).click();
    await page.waitForURL(root.href);
  }

  await page.goto(root.href);
  await exerciseTopic({ name: 'Date & Time', path: 'date-time/', recipes: dates });
  await exerciseTopic({ name: 'Encoding & Escaping', path: 'encoding/', recipes: encodings });

  for (const [path, recipe] of [['date-time', 'utc-to-toronto'], ['encoding', 'json-string']]) {
    await page.goto(new URL(path + '/?recipe=' + recipe + '&platform=python', root).href);
    assert.equal(await recipePicker.inputValue(), recipe);
    assert.equal(await platformPicker.inputValue(), 'python');
    await page.getByRole('link', { name: 'Topics', exact: true }).click();
    await page.waitForURL(root.href);
  }
  await page.getByRole('link', { name: /^Regex/ }).click();
  await page.waitForURL(new URL('regex/', root).href);
  await page.goto(new URL('?pattern=signed-integer&platform=go', root).href);
  await page.waitForURL(new URL('regex/?pattern=signed-integer&platform=go', root).href);
  await page.getByRole('heading', { name: 'Signed integer', exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('Verified Topics, both topic deep links, legacy Regex links, and Date & Time and Encoding & Escaping across all four platforms.');
} finally {
  await browser.close();
}
