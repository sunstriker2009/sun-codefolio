import { mountTopic } from '../shared/topic-page.mjs?v=topics-2';
import { createRunner } from '../regex/runner.mjs?v=xpath-1';
import { normalizeCsvInput, platforms, recipes } from './recipes.mjs?v=csv-1';
import { csvUsage } from './usage.mjs?v=csv-1';

const worker = new URL('./csv-worker.mjs?v=csv-1', import.meta.url);
const runners = Object.fromEntries(Object.keys(platforms).map(platform => [platform, createRunner(platform, worker)]));
mountTopic({
  recipes,
  platforms,
  usage: csvUsage,
  normalizeInput: normalizeCsvInput,
  run: (platform, recipe, input) => runners[platform](recipe, input),
});
