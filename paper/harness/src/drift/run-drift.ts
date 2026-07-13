/**
 * Drift axis entry — no API key needed, fully deterministic:
 *
 *   npm run drift
 *
 * Writes the raw kill matrix + markdown summary to ../results/drift/.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { scoreDrift, driftTable } from './score.js';

async function main(): Promise<void> {
  const score = await scoreDrift();
  const outDir = join(import.meta.dirname, '..', '..', '..', 'results', 'drift');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'kill-matrix.json'), JSON.stringify(score, null, 1));
  const summary = `# Drift axis — mutation kill matrix\n\n${driftTable(score)}\n`;
  writeFileSync(join(outDir, 'SUMMARY.md'), summary);
  console.log(summary);
  if (!score.baselineClean) {
    console.error('BASELINE NOT CLEAN — precision is broken; fix before trusting recall.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
