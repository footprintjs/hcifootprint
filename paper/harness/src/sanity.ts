/**
 * One-episode sanity run before committing to the full matrix:
 *
 *   set -a; . ./.env; set +a; npx tsx src/sanity.ts
 *   SANITY_TASK=T4-who-did-what SANITY_SUBSTRATE=perception npx tsx src/sanity.ts
 *
 * Prints a cost/behavior summary — never the key, never raw prompts.
 */
import { anthropicDriver } from './driver.js';
import { runEpisode } from './runner.js';
import type { SubstrateKind } from './runner.js';
import { TASKS } from './tasks.js';

const taskId = process.env['SANITY_TASK'] ?? 'T1-find-buy-control';
const substrate = (process.env['SANITY_SUBSTRATE'] ?? 'map') as SubstrateKind;
const model = process.env['PILOT_MODEL'] ?? 'claude-opus-4-8';

const task = TASKS.find((candidate) => candidate.id === taskId);
if (!task) {
  console.error(`unknown task ${taskId}; known: ${TASKS.map((t) => t.id).join(', ')}`);
  process.exit(1);
}

const episode = await runEpisode({ task, substrate, driver: anthropicDriver(model), seed: 0, model });
const input = episode.turns.reduce((sum, turn) => sum + turn.usage.input, 0);
const output = episode.turns.reduce((sum, turn) => sum + turn.usage.output, 0);
console.log(
  JSON.stringify(
    {
      task: episode.task,
      substrate,
      model,
      success: episode.success,
      aborted: episode.aborted,
      requests: episode.turns.length,
      tokens: { input, output },
      finalNode: episode.finalNode,
      probeAnswers: episode.probeAnswers,
      finalText: episode.finalText.slice(0, 300),
    },
    null,
    1,
  ),
)