/**
 * The pilot matrix: TASKS × substrates × seeds against the real API.
 * Raw EpisodeLogs land in ../results/<run-id>/ — committed as-is; every
 * paper number recomputes from them (measures.ts).
 *
 *   ANTHROPIC_API_KEY=… npm run pilot
 *   PILOT_MODEL=claude-opus-4-8 PILOT_SEEDS=3 npm run pilot
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { anthropicDriver } from './driver.js';
import { runEpisode, type EpisodeLog, type SubstrateKind } from './runner.js';
import { TASKS } from './tasks.js';
import { aggregate, table } from './measures.js';

const MODEL = process.env['PILOT_MODEL'] ?? 'claude-opus-4-8';
const SEEDS = Number(process.env['PILOT_SEEDS'] ?? 3);
const SUBSTRATES: SubstrateKind[] = ['map', 'flat', 'perception'];

async function main(): Promise<void> {
  if (!process.env['ANTHROPIC_API_KEY']) {
    console.error('ANTHROPIC_API_KEY is required for the pilot (use `npm test` for the mock smoke run).');
    process.exit(1);
  }
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = join(import.meta.dirname, '..', '..', 'results', runId);
  mkdirSync(outDir, { recursive: true });

  const episodes: EpisodeLog[] = [];
  for (const task of TASKS) {
    for (const substrate of SUBSTRATES) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const label = `${task.id} × ${substrate} × seed${seed}`;
        console.log(`▶ ${label}`);
        try {
          const episode = await runEpisode({
            task,
            substrate,
            driver: anthropicDriver(MODEL),
            seed,
            model: MODEL,
          });
          episodes.push(episode);
          writeFileSync(
            join(outDir, `${task.id}_${substrate}_s${seed}.json`),
            JSON.stringify(episode, null, 1),
          );
          console.log(
            `  ${episode.success ? '✓ success' : '✗ failed'}${episode.aborted ? ' (aborted)' : ''} — ` +
            `${episode.turns.length} turns`,
          );
        } catch (error) {
          console.error(`  ✗ infra error (kept, cell rerunnable): ${String(error)}`);
          writeFileSync(
            join(outDir, `${task.id}_${substrate}_s${seed}.ERROR.json`),
            JSON.stringify({ task: task.id, substrate, seed, error: String(error) }, null, 1),
          );
        }
      }
    }
  }

  const summary = table(aggregate(episodes));
  writeFileSync(join(outDir, 'SUMMARY.md'), `# Pilot ${runId}\n\nmodel: ${MODEL}, seeds: ${SEEDS}\n\n${summary}\n`);
  console.log(`\n${summary}\n\nraw episodes + summary → ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
