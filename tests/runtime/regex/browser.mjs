import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { patterns, platforms } from '../../../tools/regex-preview/wwwroot/patterns.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const executablePath = process.env.CODEFOLIO_CHROMIUM_EXECUTABLE;
const browser = await chromium.launch(executablePath ? {
  executablePath, args: ['--single-process', '--no-zygote', '--no-sandbox'],
} : {});

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 850 }, acceptDownloads: true });
  page.setDefaultTimeout(15_000);
  const errors = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  await page.addInitScript(() => {
    Object.defineProperties(navigator, {
      canShare: { value: () => true },
      share: { value: async ({ files: [file] }) => { window.sharedBackup = await file.text(); } },
      clipboard: { value: { writeText: async (value) => { window.copiedText = value; } } },
    });
  });
  const root = new URL(process.argv[2]);
  const regex = new URL('regex/', root);
  const input = page.getByLabel('Test text');
  const test = page.getByRole('button', { name: 'Run', exact: true });
  const examples = page.getByRole('combobox', { name: 'Load example' });
  const matchMode = page.getByLabel('Match mode');

  async function assertTryItLayout() {
    const [text, label, picker, mode, run] = await Promise.all([
      input.boundingBox(), page.locator('label[for="test-input"]').boundingBox(),
      examples.boundingBox(), matchMode.boundingBox(), test.boundingBox(),
    ]);
    assert.ok(text && label && picker && mode && run);
    const center = box => box.y + box.height / 2;
    const right = box => box.x + box.width;
    assert.ok(picker.y + picker.height <= text.y && Math.abs(center(label) - center(picker)) < 2);
    assert.ok(Math.abs(right(picker) - right(text)) < 2 && right(label) < picker.x);
    assert.ok(mode.y >= text.y + text.height && Math.abs(center(mode) - center(run)) < 2);
    assert.ok(Math.abs(mode.x - text.x) < 2 && Math.abs(right(run) - right(text)) < 2);
  }

  async function run(text, expected) {
    await input.fill(text);
    const start = performance.now();
    await test.click();
    const status = page.locator('#test-status');
    try {
      await status.getByText(expected, { exact: true }).waitFor();
    } catch (error) {
      throw new Error('Expected ' + expected + ' but saw ' + await status.textContent(), { cause: error });
    }
    return Math.round(performance.now() - start);
  }

  await page.goto(root.href);
  await page.waitForURL(regex.href);
  assert.equal(await page.getByRole('banner').getByRole('link', { name: 'Playground', exact: true }).count(), 0);
  await page.getByRole('heading', { name: 'Patterns (' + patterns.length + ')', exact: true }).waitFor();
  assert.equal(await page.getByLabel('Platform', { exact: true }).count(), 0);
  assert.equal(requests.some(url => url.includes('/_framework/')), false);

  const search = page.getByPlaceholder('Search patterns');
  const previous = page.getByRole('button', { name: 'Previous', exact: true });
  const next = page.getByRole('button', { name: 'Next', exact: true });
  await search.fill('ascii');
  await page.getByRole('heading', { name: 'Patterns (2)', exact: true }).waitFor();
  await page.getByRole('link', { name: 'ASCII alphanumeric', exact: true }).click();
  assert.equal(await previous.isDisabled(), true);
  assert.equal(await next.isEnabled(), true);
  await next.click();
  await page.getByRole('heading', { name: 'Signed integer', exact: true }).waitFor();
  assert.equal(new URL(page.url()).searchParams.get('pattern'), 'signed-integer');
  assert.equal(await next.isDisabled(), true);
  await input.fill('+78');
  await page.getByLabel('Detail platform').selectOption('javascript');
  assert.equal(await input.inputValue(), '+78');
  assert.equal(new URL(page.url()).searchParams.get('platform'), 'javascript');
  await page.locator('.pattern-field').getByRole('button', { name: 'Copy pattern' }).click();
  assert.equal(await page.evaluate(() => window.copiedText), patterns.find(entry => entry.id === 'signed-integer').expressions.javascript);
  const toast = page.locator('#regex-toast');
  await toast.getByText('Pattern copied.', { exact: true }).waitFor();
  assert.equal(await page.locator('#detail-status').textContent(), '');
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  await toast.getByText('Link copied.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.copiedText), page.url());
  await toast.getByText('Link copied.', { exact: true }).waitFor({ state: 'hidden', timeout: 5000 });

  const patternField = await page.locator('.pattern-field').boundingBox();
  const testInput = await input.boundingBox();
  assert.ok(patternField && testInput && testInput.y - (patternField.y + patternField.height) < 55);
  const addTag = await page.getByRole('button', { name: 'Add a tag', exact: true }).boundingBox();
  assert.ok(addTag && addTag.height <= 26);
  await assertTryItLayout();
  await examples.selectOption('noMatch');
  assert.equal(await input.inputValue(), '3.5');
  await test.click();
  await page.locator('#test-status').getByText('No match.', { exact: true }).waitFor();
  await examples.selectOption('match');
  assert.equal(await input.inputValue(), '-42');
  assert.equal(await examples.inputValue(), '');
  await previous.click();
  await page.getByRole('heading', { name: 'ASCII alphanumeric', exact: true }).waitFor();
  assert.equal(new URL(page.url()).searchParams.get('platform'), 'javascript');
  await page.getByRole('button', { name: 'Back to results' }).click();
  await page.getByRole('heading', { name: 'Patterns (2)', exact: true }).waitFor();
  assert.equal(await search.inputValue(), 'ascii');
  assert.equal(new URL(page.url()).searchParams.get('platform'), 'javascript');

  const pythonRequests = () => requests.filter(url => url.includes('/_python/'));
  const detailPlatform = page.getByLabel('Detail platform');
  await page.goto(new URL('?pattern=signed-integer', regex).href);
  await detailPlatform.selectOption('python');
  assert.equal(pythonRequests().length, 0);
  const firstPython = await run('-42', 'Match.');
  const countAfterStart = pythonRequests().length;
  assert.ok(pythonRequests().some(url => url.endsWith('/pyodide.asm.wasm')));
  const repeatPython = await run('42', 'Match.');
  assert.equal(pythonRequests().length, countAfterStart);
  console.log(`Python at 390 px in Chromium: ${firstPython} ms first test, ${repeatPython} ms repeat test.`);

  const pcre2Requests = () => requests.filter(url => url.includes('/_pcre2/'));
  await detailPlatform.selectOption('pcre2');
  await page.locator('#pcre2-note').getByText('preg_match', { exact: true }).waitFor();
  assert.equal(pcre2Requests().length, 0);
  const firstPcre2 = await run('-42', 'Match.');
  const pcre2RequestsAfterStart = pcre2Requests().length;
  assert.ok(pcre2Requests().some(url => url.endsWith('/dist/pcre2.js')));
  const repeatPcre2 = await run('42', 'Match.');
  assert.equal(pcre2Requests().length, pcre2RequestsAfterStart);
  console.log(`PCRE2 at 390 px in Chromium: ${firstPcre2} ms first test, ${repeatPcre2} ms repeat test.`);

  const goRequests = () => requests.filter(url => url.includes('/_go/'));
  await detailPlatform.selectOption('go');
  await page.locator('#go-note').getByRole('link', { name: 'regexp syntax' }).waitFor();
  assert.equal(pcre2Requests().length, pcre2RequestsAfterStart);
  assert.equal(goRequests().length, 0);
  const firstGo = await run('-42', 'Match.');
  const goRequestsAfterStart = goRequests().length;
  assert.ok(goRequests().some(url => new URL(url).pathname.endsWith('/regex.wasm')));
  const repeatGo = await run('42', 'Match.');
  assert.equal(goRequests().length, goRequestsAfterStart);
  console.log(`Go at 390 px in Chromium: ${firstGo} ms first test, ${repeatGo} ms repeat test.`);

  const quoted = patterns.find(entry => entry.id === 'double-quoted-string');
  await page.goto(new URL('?pattern=double-quoted-string&platform=go', regex).href);
  await page.getByText('Expected captures and usage', { exact: true }).click();
  await page.locator('#recipe-captures').getByText(/Quoted contents/).waitFor();
  assert.match(await page.locator('#recipe-code').textContent(), /regexp\.MustCompile/);
  await detailPlatform.selectOption('python');
  assert.match(await page.locator('#recipe-code').textContent(), /re\.search/);
  await page.getByRole('button', { name: 'Copy usage example' }).click();
  assert.equal(await page.evaluate(() => window.copiedText), await page.locator('#recipe-code').textContent());
  await examples.selectOption('edge');
  assert.equal(await input.inputValue(), quoted.examples.edge);

  function assertCaptures(groups, rendered) {
    groups.forEach((capture, index) => {
      assert.ok(rendered.includes('Group ' + (index + 1) + ' · ' + JSON.stringify(capture)));
    });
  }

  for (const engine of Object.keys(platforms)) {
    for (const entry of patterns) {
      const url = new URL(regex);
      url.searchParams.set('platform', engine);
      url.searchParams.set('pattern', entry.id);
      await page.goto(url.href);
      await run(entry.examples.match, 'Match.');
      const result = page.locator('#match-result');
      const matched = await result.textContent();
      assert.match(matched, /Matched /);
      if (entry.recipe) {
        assertCaptures(entry.recipe.matchGroups, matched);
        const { edgeGroups } = entry.recipe;
        await run(entry.examples.edge, edgeGroups ? 'Match.' : 'No match.');
        if (edgeGroups) assertCaptures(edgeGroups, await result.textContent());
      }
      await run(entry.examples.noMatch, 'No match.');
    }
    const decimal = new URL('?platform=' + engine + '&pattern=decimal-number', regex);
    await page.goto(decimal.href);
    await run('-12.50', 'Match.');
    assert.match(await page.locator('#match-result').textContent(), /Group 3 · "50"/);
    await run('12', 'Match.');
    assert.match(await page.locator('#match-result').textContent(), /Group 3 · unmatched/);
  }

  async function setPersonal(id, engine, tag) {
    await page.goto(new URL('?platform=' + engine + '&pattern=' + id, regex).href);
    await page.getByRole('button', { name: 'Favorite', exact: true }).click();
    await page.getByRole('button', { name: 'Add a tag', exact: true }).click();
    await page.getByLabel('Tag name').fill(tag);
    await page.locator('#tag-editor').getByRole('button', { name: 'Add tag', exact: true }).click();
    await page.getByRole('button', { name: 'Remove tag ' + tag }).waitFor();
  }
  await page.goto(regex.href);
  const matchPicker = page.getByLabel('Inspect match');
  const marks = page.locator('#highlighted-input mark');
  const matchResult = page.locator('#match-result');
  await page.getByRole('button', { name: 'New pattern' }).click();
  const matchExpression = page.getByLabel('Pattern expression');
  assert.equal(await matchMode.inputValue(), 'match');

  for (const engine of Object.keys(platforms)) {
    await detailPlatform.selectOption(engine);
    await matchExpression.fill(engine === 'python'
      ? '(?P<word>[a-z]+)(?P<suffix>[0-9]+)?'
      : '(?<word>[a-z]+)(?<suffix>[0-9]+)?');
    await matchMode.selectOption('match');
    await run('😀 cat1 🥑 dog', 'Match.');
    assert.deepEqual(await marks.allTextContents(), ['cat1']);
    assert.equal(await matchPicker.isVisible(), false);
    assert.match(await matchResult.textContent(), /Name word · "cat"/);

    await matchMode.selectOption('match-all');
    await run('😀 cat1 🥑 dog', '2 matches.');
    assert.deepEqual(await marks.allTextContents(), ['cat1', 'dog']);
    assert.equal(await page.locator('#highlighted-input').textContent(), '😀 cat1 🥑 dog');
    await matchPicker.selectOption('1');
    const second = await matchResult.textContent();
    assert.match(second, /Matched "dog" at index 11/);
    assert.match(second, /Group 2 · unmatched/);
    assert.match(second, /Name word · "dog"/);
    assert.match(second, /Name suffix · unmatched/);

    await matchExpression.fill('()');
    await run('ab', '3 matches.');
    assert.deepEqual(await marks.allTextContents(), ['∅', '∅', '∅']);
    await matchPicker.selectOption('2');
    assert.match(await matchResult.textContent(), /Matched "" at index 2/);
    assert.match(await matchResult.textContent(), /Group 1 · ""/);
  }
  await detailPlatform.selectOption('javascript');
  await matchExpression.fill('a');
  await run('a'.repeat(101), 'Showing the first 100 matches.');
  assert.equal(await marks.count(), 100);
  await input.fill('b');
  assert.equal(await matchResult.isVisible(), false);
  await run('b', 'No match.');
  await detailPlatform.selectOption('csharp');
  await matchExpression.fill('(?<7>z)');
  await run('z', '1 match.');
  assert.match(await matchResult.textContent(), /Group 7 · "z"/);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await setPersonal('signed-integer', 'csharp', 'Numbers');
  await setPersonal('spaces-tabs', 'javascript', 'Layout');
  await page.getByRole('button', { name: 'Back to results' }).click();
  await page.locator('.search-filters > summary').click();
  await page.locator('.tag-filter > summary').click();
  await page.getByRole('checkbox', { name: 'Numbers' }).check();
  assert.equal(await page.locator('#patterns a').count(), 1);
  await page.getByRole('checkbox', { name: 'Layout' }).check();
  assert.equal(await page.locator('#patterns a').count(), 2);
  await page.getByRole('checkbox', { name: 'Favorites' }).check();
  assert.equal(await page.locator('#patterns a').count(), 2);
  await page.getByLabel('Search patterns').fill('signed');
  assert.equal(await page.locator('#patterns a').count(), 1);
  await page.getByLabel('Search patterns').fill('');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = await downloadPromise;
  const json = await readFile(await download.path(), 'utf8');
  assert.deepEqual(JSON.parse(json), {
    format: 'codefolio.regex-backup',
    version: 3,
    customPatterns: [],
    tags: { 'signed-integer': ['Numbers'], 'spaces-tabs': ['Layout'] },
    favorites: ['signed-integer', 'spaces-tabs'],
  });
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await page.getByText('Finish sharing in the app you chose.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.sharedBackup), json);
  await page.evaluate(() => localStorage.removeItem('codefolio.regex-personal.v1'));
  await page.reload();
  await page.locator('#backup-file').setInputFiles({
    name: download.suggestedFilename(), mimeType: 'application/json', buffer: Buffer.from(json),
  });
  await page.getByText('Imported 0 patterns, 2 tags, and 2 favorites.', { exact: true }).waitFor();
  await page.locator('#backup-file').setInputFiles({
    name: download.suggestedFilename(), mimeType: 'application/json', buffer: Buffer.from(json),
  });
  await page.getByText('Imported 0 patterns, 0 tags, and 0 favorites.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.getByRole('heading', { name: 'Patterns (' + patterns.length + ')', exact: true }).waitFor();
  await page.getByLabel('Detail platform').waitFor();
  await assertTryItLayout();
  const patternBox = await page.locator('.pattern-field pre').boundingBox();
  const copyBox = await page.locator('.pattern-field').getByRole('button', { name: 'Copy pattern' }).boundingBox();
  assert.ok(patternBox && copyBox && copyBox.x > patternBox.x);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 1280);
  await page.setViewportSize({ width: 390, height: 850 });
  await page.goto(regex.href);
  const customCsharp = patterns.find(entry => entry.id === 'signed-integer').expressions.csharp;
  const customPython = String.raw`(?P<word>café)\b`;
  const customPcre2 = String.raw`prefix:\K(\p{L}++)`;
  const customGo = String.raw`(?P<word>\p{L}+)([0-9]+)?`;
  await page.getByRole('button', { name: 'New pattern' }).click();
  const title = page.getByLabel('Pattern title');
  const expression = page.getByLabel('Pattern expression');
  const engine = page.getByLabel('Detail platform');
  const save = page.getByRole('button', { name: 'Save pattern' });
  const editorStatus = page.locator('#editor-status');
  assert.equal(await expression.getAttribute('placeholder'), 'Not provided');
  assert.equal(await test.isDisabled(), true);
  await save.click();
  await editorStatus.getByText('Enter a pattern title.').waitFor();
  await title.fill('Portable example');
  await save.click();
  await editorStatus.getByText('Enter a pattern for at least one platform.').waitFor();
  await expression.fill('(');
  await save.click();
  await editorStatus.getByText(/C# \/ \.NET 10/).waitFor();
  assert.equal(await expression.getAttribute('aria-invalid'), 'true');

  await expression.fill(customCsharp);
  await engine.selectOption('javascript');
  assert.equal(await expression.inputValue(), '');
  assert.equal(await test.isDisabled(), true);
  await expression.fill('(');
  await engine.selectOption('csharp');
  assert.equal(await expression.inputValue(), customCsharp);
  await save.click();
  await editorStatus.getByText(/JavaScript/).waitFor();
  assert.equal(await engine.inputValue(), 'javascript');
  assert.equal(await expression.inputValue(), '(');
  await expression.fill('^[a-z]+$');
  await run('private-input', 'No match.');
  await run('sample', 'Match.');
  await engine.selectOption('python');
  await expression.fill('(?P<word>');
  await engine.selectOption('javascript');
  await save.click();
  await editorStatus.getByText(/Python · .*unterminated/).waitFor();
  assert.equal(await engine.inputValue(), 'python');
  assert.equal(await expression.getAttribute('aria-invalid'), 'true');
  await expression.fill('^(a+)+$');
  await run('a'.repeat(100) + '!', 'The match timed out. Try shorter text.');
  await expression.fill(customPython);
  await run('😀 café', 'Match.');
  assert.match(await page.locator('#match-result').textContent(), /Matched "café" at index 3/);
  assert.match(await page.locator('#match-result').textContent(), /Group 1 · "café"/);
  await engine.selectOption('pcre2');
  await expression.fill('(');
  await save.click();
  await editorStatus.getByText(/PCRE2 · .*closing parenthesis/).waitFor();
  assert.equal(await expression.getAttribute('aria-invalid'), 'true');
  await expression.fill('(*LIMIT_MATCH=20)(*NO_AUTO_POSSESS)^(a+)+$');
  await run('a'.repeat(100) + '!', 'The match reached a PCRE2 engine limit. Try a simpler pattern or shorter text.');
  await expression.fill(customPcre2);
  await run('😀 prefix:café', 'Match.');
  assert.match(await page.locator('#match-result').textContent(), /Matched "café" at index 10/);
  assert.match(await page.locator('#match-result').textContent(), /Group 1 · "café"/);
  await engine.selectOption('go');
  await expression.fill('(?=café)');
  await save.click();
  await editorStatus.getByText(/Go · .*invalid or unsupported/).waitFor();
  assert.equal(await expression.getAttribute('aria-invalid'), 'true');
  await expression.fill(customGo);
  await run('😀 café', 'Match.');
  assert.match(await page.locator('#match-result').textContent(), /Matched "café" at index 3/);
  assert.match(await page.locator('#match-result').textContent(), /Group 1 · "café"/);
  assert.match(await page.locator('#match-result').textContent(), /Group 2 · unmatched/);
  await engine.selectOption('javascript');
  const casePanel = page.locator('#test-cases');
  const runCases = casePanel.getByRole('button', { name: 'Run cases' });
  await casePanel.locator('summary').first().click();
  const savedCases = [
    { name: 'Letters', input: 'catalog', expected: 'match' },
    { name: 'Digits', input: '42', expected: 'no-match' },
  ];
  for (const [index, entry] of savedCases.entries()) {
    await casePanel.getByRole('button', { name: 'Add case' }).click();
    const row = casePanel.locator('li').nth(index);
    await row.getByLabel('Case name').fill(entry.name);
    await row.getByLabel('Case input').fill(entry.input);
    await row.getByLabel('Expected result').selectOption(entry.expected);
  }
  await runCases.click();
  await casePanel.getByRole('status').getByText('2 passed, 0 failed, 0 errors.').waitFor();
  await expression.fill('^[a-z0-9]+$');
  await runCases.click();
  await casePanel.getByRole('status').getByText('1 passed, 1 failed, 0 errors.').waitFor();
  await expression.fill('^[a-z]+$');
  await save.click();
  await page.getByRole('heading', { name: 'Portable example', exact: true }).waitFor();
  const customUrl = page.url();
  assert.match(new URL(customUrl).searchParams.get('pattern'), /^custom-/);
  await page.getByRole('button', { name: 'Favorite', exact: true }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expression.fill('');
  assert.equal(await test.isDisabled(), true);
  await save.click();
  await page.getByText('Not provided', { exact: true }).waitFor();
  assert.equal(await test.isDisabled(), true);
  await engine.selectOption('csharp');
  assert.equal(await page.locator('#pattern-source').textContent(), customCsharp);
  assert.equal(await engine.inputValue(), 'csharp');
  await run('42', 'Match.');

  await page.getByRole('button', { name: 'Back to results' }).click();
  const customDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const customDownload = await customDownloadPromise;
  const customJson = await readFile(await customDownload.path(), 'utf8');
  const exported = JSON.parse(customJson);
  assert.equal(exported.customPatterns.length, 1);
  assert.equal(exported.customPatterns[0].source, 'custom');
  assert.equal(exported.customPatterns[0].expressions.csharp, customCsharp);
  assert.equal(exported.customPatterns[0].expressions.python, customPython);
  assert.equal(exported.customPatterns[0].expressions.pcre2, customPcre2);
  assert.equal(exported.customPatterns[0].expressions.go, customGo);
  assert.deepEqual(exported.customPatterns[0].testCases, savedCases);
  assert.doesNotMatch(customJson, /private-input|sample/);

  await page.evaluate(() => localStorage.removeItem('codefolio.regex-personal.v1'));
  await page.reload();
  const file = page.locator('#backup-file');
  const upload = value => file.setInputFiles({
    name: 'regex.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)),
  });
  const invalid = structuredClone(exported);
  invalid.customPatterns[0].expressions.javascript = '(';
  await upload(invalid);
  await page.locator('#backup-status').getByText(/Portable example · JavaScript/).waitFor();
  await page.getByRole('heading', { name: 'Patterns (' + patterns.length + ')', exact: true }).waitFor();
  invalid.customPatterns[0].expressions.javascript = '';
  invalid.customPatterns[0].expressions.python = '(?P<word>';
  await upload(invalid);
  await page.locator('#backup-status').getByText(/Portable example · Python/).waitFor();
  await page.getByRole('heading', { name: 'Patterns (' + patterns.length + ')', exact: true }).waitFor();
  invalid.customPatterns[0].expressions.python = customPython;
  invalid.customPatterns[0].expressions.pcre2 = '(';
  await upload(invalid);
  await page.locator('#backup-status').getByText(/Portable example · PCRE2/).waitFor();
  await page.getByRole('heading', { name: 'Patterns (' + patterns.length + ')', exact: true }).waitFor();
  invalid.customPatterns[0].expressions.pcre2 = customPcre2;
  invalid.customPatterns[0].expressions.go = String.raw`(\w+)\1`;
  await upload(invalid);
  await page.locator('#backup-status').getByText(/Portable example · Go/).waitFor();
  await page.getByRole('heading', { name: 'Patterns (' + patterns.length + ')', exact: true }).waitFor();
  await upload(exported);
  await page.getByRole('heading', { name: 'Patterns (' + (patterns.length + 1) + ')', exact: true }).waitFor();
  await upload(exported);
  await page.locator('#backup-status').getByText('Imported 0 patterns, 0 tags, and 0 favorites.', { exact: true }).waitFor();
  await upload({ format: exported.format, version: 1, tags: { 'signed-integer': ['Legacy'] }, favorites: [] });
  await page.locator('#backup-status').getByText('Imported 0 patterns, 1 tag, and 0 favorites.', { exact: true }).waitFor();

  await page.goto(customUrl);
  await page.getByRole('heading', { name: 'Portable example', exact: true }).waitFor();
  await casePanel.locator('summary').first().click();
  await casePanel.getByText('Letters', { exact: true }).waitFor();
  await casePanel.getByText('Digits', { exact: true }).waitFor();
  await engine.selectOption('python');
  assert.equal(await page.locator('#pattern-source').textContent(), customPython);
  await engine.selectOption('pcre2');
  assert.equal(await page.locator('#pattern-source').textContent(), customPcre2);
  await engine.selectOption('go');
  assert.equal(await page.locator('#pattern-source').textContent(), customGo);
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  assert.equal(await title.inputValue(), 'Portable example copy');
  await engine.selectOption('csharp');
  assert.equal(await expression.inputValue(), customCsharp);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete pattern', exact: true }).click();
  await page.getByRole('heading', { name: 'Patterns (' + patterns.length + ')', exact: true }).waitFor();
  assert.equal(requests.some(url => new URL(url).pathname.startsWith(new URL('app/', root).pathname)), false);
  assert.deepEqual(errors, []);
  console.log('Verified native patterns, engine-specific validation, saved custom variants, editing, duplication, deletion, and backup round trips.');
} finally {
  await browser.close();
}
