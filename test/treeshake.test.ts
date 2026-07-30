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
import { beforeAll, describe, expect, it } from 'vitest';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
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

  it('the sensor subpath is a ZERO-value-import leaf: its closure is its own folder', async () => {
    // The same question test/treeshake.test.ts already asks of fromLiveStore,
    // asked of a subpath with several modules: bundling its ENTRY may load its
    // own files and nothing else. `metafile.inputs` lists every file LOADED, so
    // one engine value-import anywhere in the folder would show up here as
    // src/traverse/** or node_modules/footprintjs.
    const result = await build({
      entryPoints: [path.join(repoRoot, 'src/sensor/index.ts')],
      bundle: true,
      write: false,
      metafile: true,
      format: 'esm',
      platform: 'node',
      logLevel: 'silent',
    });
    const loaded = Object.keys(result.metafile!.inputs).sort();
    const strays = loaded.filter((file) => !file.startsWith('src/sensor/'));
    expect(strays, 'the sensor must load nothing outside its own folder').toEqual([]);
    expect(loaded).toContain('src/sensor/watch-page.ts');
  });

  it('the whole sensor subpath is a ZERO-engine leaf: bundled directly, it is only its own files', async () => {
    // The sensor is nine small modules rather than one, so the leaf proof is
    // "nothing from OUTSIDE the folder" rather than "exactly one file". Same
    // claim, stated at the folder's grain: importing a DOM listener must not
    // load session machinery, the appmap, or footprintjs.
    const result = await build({
      entryPoints: [path.join(repoRoot, 'src/sensor/index.ts')],
      bundle: true,
      write: false,
      metafile: true,
      format: 'esm',
      platform: 'node',
      logLevel: 'silent',
    });
    const loaded = Object.keys(result.metafile!.inputs);
    expect(loaded.length).toBeGreaterThan(1); // it really is several modules
    const outsiders = loaded.filter((file) => !file.startsWith('src/sensor/'));
    expect(outsiders, 'the sensor must load nothing outside src/sensor').toEqual([]);
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

/**
 * THE SHIPPED-BYTES PROOF — same question, asked of dist instead of src.
 *
 * The src probes above prove the import GRAPH points the right way. They
 * cannot prove what a consumer ships, because a consumer bundles dist/ under
 * this package's package.json — and there `sideEffects: false` (package.json)
 * is load-bearing, not decorative: the packaging recon measured the matchRoute
 * probe at 510 B with the flag honored vs 11,337 B with annotations ignored.
 * Only a dist-level bundle exercises that flag the way a real bundler does.
 *
 * Assertion surface (probe-verified): `metafile.inputs` lists every module
 * merely PARSED (142 here) — the truth is `metafile.outputs[...].inputs`
 * filtered to bytesInOutput > 0, the modules that CONTRIBUTED bytes.
 *
 * Ceilings are regression pins on measured reality, with headroom, so honest
 * growth passes and a machinery leak fails: the trio bundled to 2,342 B and
 * matchRoute alone to 510 B on the day these numbers were pinned.
 *
 * Mutation proof (run, then reverted): giving fromRoutes a USED value import
 * — `import { InteractionSession } from '../../traverse/nav-session.js';`
 * referenced inside the function body — and rebuilding flips the allowlist
 * assertion with 31 leaked modules (session machinery + footprintjs). Note a
 * BARE side-effect import does NOT flip it: it binds no exports, so the very
 * `sideEffects: false` flag under test licenses bundlers to drop it — the
 * regression this block guards is a leaf gaining a real value dependency.
 */
const distIndex = path.join(repoRoot, 'dist/index.js');
// dist/graph/sources/*.js must ALSO exist — an older dist would still have
// dist/index.js, and a probe against it would "pass" by testing stale bytes.
const distSources = ['from-routes.js', 'from-journeys.js', 'from-live-store.js'].map((f) =>
  path.join(repoRoot, 'dist/graph/sources', f),
);
/** The sensor's built entry — same stale-dist gate, extended to the new subpath. */
const distSensor = path.join(repoRoot, 'dist/sensor/index.js');

/** Bundle symbols from the BUILT barrel; return contributors + total bytes. */
async function bundleFromDist(symbols: string): Promise<{ files: string[]; bytes: number }> {
  const result = await build({
    stdin: {
      // Absolute dist path: esbuild then resolves this package's own
      // package.json for the sideEffects flag — the consumer's view.
      contents: `export { ${symbols} } from '${distIndex}';`,
      resolveDir: repoRoot,
    },
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
    metafile: true,
    outdir: 'out',
    logLevel: 'silent',
  });
  const [output] = Object.values(result.metafile!.outputs);
  return {
    files: Object.entries(output.inputs)
      .filter(([, meta]) => meta.bytesInOutput > 0)
      .map(([file]) => file),
    bytes: output.bytes,
  };
}

describe('the built package (dist) stays shakeable for a real consumer', () => {
  beforeAll(() => {
    // A gate, never a skip: without dist these tests would prove nothing,
    // and silently skipping would report green on an unproven package.
    for (const file of [distIndex, ...distSources, distSensor]) {
      if (!fs.existsSync(file)) {
        throw new Error(`treeshake dist proof needs ${path.relative(repoRoot, file)} — run npm run build first`);
      }
    }
  });

  it('the source trio ships only dist/index.js + dist/graph/** — and stays under 15 KB', async () => {
    const { files, bytes } = await bundleFromDist('fromRoutes, fromJourneys, fromLiveStore');
    // Allowlist beats a blocklist: a NEW machinery directory would slip past
    // a list of known-bad prefixes, but cannot slip past known-good ones.
    const leaked = files.filter((f) => f !== 'dist/index.js' && !f.startsWith('dist/graph/'));
    expect(leaked, 'modules outside dist/index.js + dist/graph/** leaked into the trio bundle').toEqual([]);
    // Belt to the allowlist's braces: name the classic offenders so a failure
    // in a future refactor reads as the sentence it is.
    for (const forbidden of ['dist/traverse/', 'dist/tree/', 'dist/serve/', 'dist/presence/', 'dist/registry/', 'node_modules/footprintjs']) {
      expect(files.filter((f) => f.includes(forbidden)), `bundle must not contain ${forbidden}`).toEqual([]);
    }
    expect(files.some((f) => f === 'dist/graph/sources/from-routes.js'), 'probe must actually pull the trio').toBe(true);
    expect(bytes).toBeLessThanOrEqual(15 * 1024);
  });

  it('the shipped sensor subpath carries no engine bytes at all', async () => {
    // Bundled from dist by absolute path, so esbuild resolves THIS package.json
    // and honours `sideEffects: false` — the consumer's view, not ours.
    const result = await build({
      stdin: { contents: `export { watchPage } from '${distSensor}';`, resolveDir: repoRoot },
      bundle: true,
      minify: true,
      format: 'esm',
      write: false,
      metafile: true,
      outdir: 'out',
      logLevel: 'silent',
    });
    const [output] = Object.values(result.metafile!.outputs);
    const files = Object.entries(output.inputs)
      .filter(([, meta]) => meta.bytesInOutput > 0)
      .map(([file]) => file);
    // Allowlist, not blocklist: a NEW machinery directory cannot slip past
    // known-good prefixes the way it would past a list of known-bad ones.
    const leaked = files.filter((file) => !file.startsWith('dist/sensor/'));
    expect(leaked, 'the sensor bundle must contain only dist/sensor/**').toEqual([]);
    expect(files).toContain('dist/sensor/watch-page.js');
    // A regression pin on measured reality, with headroom (see the header): the
    // sensor bundled to 7,770 B on the day this number was pinned, and most of
    // that is the honest-refusal sentences it hands back to a consumer.
    expect(output.bytes).toBeLessThanOrEqual(12 * 1024);
  });

  it('the sensor ships only dist/sensor/** — no session machinery reaches a page listener', async () => {
    const result = await build({
      stdin: {
        contents: `export { watchPage } from '${path.join(repoRoot, 'dist/sensor/index.js')}';`,
        resolveDir: repoRoot,
      },
      bundle: true,
      minify: true,
      format: 'esm',
      write: false,
      metafile: true,
      outdir: 'out',
      logLevel: 'silent',
    });
    const [output] = Object.values(result.metafile!.outputs);
    const files = Object.entries(output.inputs)
      .filter(([, meta]) => meta.bytesInOutput > 0)
      .map(([file]) => file);
    // Allowlist, as everywhere else here: a NEW machinery directory cannot slip
    // past known-good prefixes the way it slips past a list of known-bad ones.
    const leaked = files.filter((file) => !file.startsWith('dist/sensor/'));
    expect(leaked, 'modules outside dist/sensor/** leaked into the sensor bundle').toEqual([]);
    expect(files.some((f) => f === 'dist/sensor/watch-page.js'), 'probe must actually pull the sensor').toBe(true);
    // A regression pin with headroom, on the day it was measured, so honest
    // growth passes and a machinery leak fails.
    expect(output.bytes).toBeLessThanOrEqual(12 * 1024);
  });

  it('matchRoute alone stays a sub-kilobyte leaf (regression pin on 510 B)', async () => {
    const { files, bytes } = await bundleFromDist('matchRoute');
    const leaked = files.filter((f) => f !== 'dist/index.js' && !f.startsWith('dist/graph/'));
    expect(leaked, 'modules outside dist/index.js + dist/graph/** leaked into the matchRoute bundle').toEqual([]);
    expect(bytes).toBeLessThanOrEqual(1024);
  });
});
