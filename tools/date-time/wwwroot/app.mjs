import { mountTopic } from '../shared/topic-page.mjs?v=topics-1';
import { createRunner } from '../regex/runner.mjs?v=date-topics-1';
import { platforms, recipes } from './recipes.mjs?v=date-topics-1';
import { dateUsage } from './usage.mjs?v=date-topics-1';

const worker = new URL('./date-worker.mjs?v=date-topics-1', import.meta.url);
const runners = Object.fromEntries(Object.keys(platforms).map(platform => [platform, createRunner(platform, worker)]));
mountTopic({ recipes, platforms, usage: dateUsage, run: (platform, recipe, input) => runners[platform](recipe, input) });
