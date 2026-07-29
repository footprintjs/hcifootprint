/**
 * The bundle proof: graph sources are LEAF modules by construction, and the
 * barrel is shakeable — importing one source factory must not drag the other
 * factories, the session machinery, or footprintjs into a consumer's bundle.
 *
 * Method (the packaging recon's, in-repo): esbuild bundles a probe that
 * imports ONE symbol from src/index.ts, and the metafile's per-output inputs
 * (bytesInOutput > 0 — files merely PARSED contribute nothing) are the ground
 * truth of what a real bundler ships. esbuild is a DECLARED devDependency —
 * never hoist-trusted.
 *
 * Mutation proof: fromLiveStore did not exist before this change, so the
 * probe importing it fails to build against pre-change src.
 */
import { describe, expect, it } from 'vitest';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Bundle `export { <symbol> } from './src/index.ts'` and list the files that contributed bytes. */
async function contributedFiles(symbol: string): Promise<string[]> {
  const result = await build({
    stdin: {
      contents: `export { ${symbol} } from './src/index.ts';`,
      resolveDir: repoRoot,
      loader: 'ts',
    },
    bundle: true,
    write: false,
    metafile: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const [output] = Object.values(result.metafile!.outputs);
  return Object.entries(output.inputs)
    .filter(([, meta]) => meta.bytesInOutput > 0)
    .map(([file]) => file);
}

describe('importing one source factory ships only its leaf closure', () => {
  it('fromRoutes drags no session machinery, no live store, no footprintjs', async () => {
    const files = contributedFilesAssertable(await contributedFiles('fromRoutes'));
    expect(files.some((f) => f.endsWith('graph/sources/from-routes.ts'))).toBe(true);
    files.forbid('traverse/session.ts');
    files.forbid('traverse/nav-session.ts');
    files.forbid('tree/appmap.ts');
    files.forbid('graph/sources/from-live-store.ts');
    files.forbid('node_modules/footprintjs');
  });

  it('fromLiveStore drags no session machinery and no footprintjs either', async () => {
    const files = contributedFilesAssertable(await contributedFiles('fromLiveStore'));
    expect(files.some((f) => f.endsWith('graph/sources/from-live-store.ts'))).toBe(true);
    files.forbid('traverse/session.ts');
    files.forbid('traverse/nav-session.ts');
    files.forbid('tree/appmap.ts');
    files.forbid('node_modules/footprintjs');
  });

  it('fromLiveStore is a ZERO-value-import leaf: bundled directly, it is the only module', async () => {
    const result = await build({
      entryPoints: [path.join(repoRoot, 'src/graph/sources/from-live-store.ts')],
      bundle: true,
      write: false,
      metafile: true,
      format: 'esm',
      platform: 'node',
      logLevel: 'silent',
    });
    // metafile.inputs = every file LOADED — for a true leaf that is exactly one.
    expect(Object.keys(result.metafile!.inputs)).toEqual(['src/graph/sources/from-live-store.ts']);
  });
});

/** Tiny assertion helper so a failure names the file that leaked into the bundle. */
function contributedFilesAssertable(files: string[]) {
  return Object.assign(files, {
    forbid(fragment: string): void {
      const leaked = files.filter((f) => f.includes(fragment));
      expect(leaked, `bundle must not contain ${fragment}`).toEqual([]);
    },
  });
}
