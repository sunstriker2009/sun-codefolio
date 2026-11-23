export function mountTopic({ recipes, platforms, usage, run, normalizeInput = value => value }) {
  const byId = id => document.getElementById(id);
  const recipeSelect = byId('topic-recipe');
  const platformSelect = byId('topic-platform');
  const examples = byId('topic-examples');
  const input = byId('topic-input');
  const output = byId('topic-output');
  const status = byId('topic-status');
  const runButton = byId('topic-run');
  const code = byId('topic-code');
  let recipe;
  let version = 0;

  function option(label, value) {
    const element = document.createElement('option');
    element.textContent = label;
    element.value = value;
    return element;
  }

  for (const entry of recipes) recipeSelect.append(option(entry.title, entry.id));
  for (const [key, title] of Object.entries(platforms)) platformSelect.append(option(title, key));

  function clear() {
    version++;
    status.textContent = '';
    output.hidden = true;
    runButton.disabled = false;
  }

  function render(nextRecipe, engine, saveLocation) {
    if (recipe !== nextRecipe) {
      recipe = nextRecipe;
      recipeSelect.value = recipe.id;
      examples.replaceChildren(option('Examples', ''), ...recipe.examples.map((sample, index) =>
        option(sample.label ?? sample.input, String(index))));
      examples.value = '';
      input.value = recipe.examples[0].input;
      byId('topic-description').textContent = recipe.description;
      byId('topic-format').textContent = recipe.inputFormat;
    }
    platformSelect.value = engine;
    code.textContent = usage(recipe, engine);
    byId('topic-copy-status').textContent = '';
    clear();
    if (saveLocation) {
      const url = new URL(location.href);
      url.searchParams.set('recipe', recipe.id);
      url.searchParams.set('platform', engine);
      history.replaceState(null, '', url);
    }
  }

  function readLocation() {
    const { searchParams } = new URL(location.href);
    const recipe = recipes.find(entry => entry.id === searchParams.get('recipe')) ?? recipes[0];
    const engine = searchParams.get('platform');
    render(recipe, Object.hasOwn(platforms, engine) ? engine : Object.keys(platforms)[0], false);
  }

  recipeSelect.addEventListener('change', () => {
    render(recipes.find(entry => entry.id === recipeSelect.value), platformSelect.value, true);
  });
  platformSelect.addEventListener('change', () => render(recipe, platformSelect.value, true));
  examples.addEventListener('change', () => {
    if (!examples.value) return;
    input.value = recipe.examples[Number(examples.value)].input;
    examples.value = '';
    clear();
    input.focus();
  });
  input.addEventListener('input', clear);
  window.addEventListener('popstate', readLocation);

  byId('topic-try-it').addEventListener('submit', async event => {
    event.preventDefault();
    clear();
    const current = version;
    runButton.disabled = true;
    status.textContent = 'Running ' + platforms[platformSelect.value] + '…';
    const result = await run(platformSelect.value, recipe.id, normalizeInput(input.value));
    if (current !== version) return;
    runButton.disabled = false;
    const labels = {
      ok: 'Result ready.',
      invalid: 'Enter a valid value in the format shown.',
      timeout: 'The runner timed out. Try again.',
      'load-error': 'The runner could not load. Try again.',
    };
    status.textContent = labels[result.status] ?? 'The runner could not complete the recipe.';
    if (result.status === 'ok') {
      output.textContent = result.output;
      output.hidden = false;
    }
  });

  byId('topic-copy').addEventListener('click', async () => {
    const message = byId('topic-copy-status');
    try {
      await navigator.clipboard.writeText(code.textContent);
      message.textContent = 'Usage example copied.';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(code);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      message.textContent = 'Usage example selected. Copy the selection.';
    }
  });

  readLocation();
}
