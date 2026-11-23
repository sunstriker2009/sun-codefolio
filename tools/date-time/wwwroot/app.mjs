import { mountTopic } from '../shared/topic-page.mjs?v=topics-2';
import { createRunner } from '../regex/runner.mjs?v=date-topics-1';
import { platforms, recipes } from './recipes.mjs?v=date-topics-1';
import { dateUsage } from './usage.mjs?v=date-topics-1';

const worker = new URL('./date-worker.mjs?v=xpath-1', import.meta.url);
const runners = Object.fromEntries(Object.keys(platforms).map(platform => [platform, createRunner(platform, worker)]));
mountTopic({
  recipes, platforms, usage: dateUsage,
  normalizeInput: value => value.trim(),
  run: (platform, recipe, input) => runners[platform](recipe, input),
});
