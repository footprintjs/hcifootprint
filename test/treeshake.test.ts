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

  /**
   * The sensor subpath is the same shape as that leaf, one folder wider: it drives
   * the session INSTANCE it is handed through a type-only port (SensorSession), so a
   * page that only wanted a DOM listener ships no engine. `metafile.inputs` is the
   * right surface here — every file LOADED, not merely the ones that contributed
   * bytes — because a type-only import that resolved to a real module would show up
   * as loaded even after being shaken out.
   */
  it('the sensor subpath is a ZERO-engine leaf: only src/sensor/** is even loaded', async () => {
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
    expect(loaded.filter((file) => !file.startsWith('src/sensor/'))).toEqual([]);
    expect(loaded).toContain('src/sensor/watch-page.ts');
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
/** Same reason: an old dist would still have dist/index.js and "pass" without this. */
const distSensor = path.join(repoRoot, 'dist/sensor/index.js');
const distReact = path.join(repoRoot, 'dist/react/index.js');

/**
 * Bundle symbols from a BUILT entry; return contributors + total bytes.
 *
 * `external` exists for the one subpath that has a peer: a consumer's bundler
 * never inlines react, it dedupes to the app's own copy. Inlining it here would
 * measure React's size instead of the skin's, which is the one number this proof
 * is about.
 */
async function bundleFromDist(
  symbols: string,
  from: string = distIndex,
  external: string[] = [],
): Promise<{ files: string[]; bytes: number }> {
  const result = await build({
    external,
    stdin: {
      // Absolute dist path: esbuild then resolves this package's own
      // package.json for the sideEffects flag — the consumer's view.
      contents: `export { ${symbols} } from '${from}';`,
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
    for (const file of [distIndex, ...distSources, distSensor, distReact]) {
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

  it('matchRoute alone stays a sub-kilobyte leaf (regression pin on 510 B)', async () => {
    const { files, bytes } = await bundleFromDist('matchRoute');
    const leaked = files.filter((f) => f !== 'dist/index.js' && !f.startsWith('dist/graph/'));
    expect(leaked, 'modules outside dist/index.js + dist/graph/** leaked into the matchRoute bundle').toEqual([]);
    expect(bytes).toBeLessThanOrEqual(2 * 1024);
  });

  /**
   * What a page that imported ONLY `hcifootprint/sensor` really ships. This is the
   * consumer-facing form of the promise "a DOM listener costs a DOM listener": the
   * subpath drives the session through a type-only port, so no session machinery and
   * no footprintjs can reach a page listener. Pinned at 16 KB against a measured
   * 11,907 B, so honest growth passes and an engine leak fails.
   */
  it('the shipped sensor subpath carries no engine bytes at all — and stays under 16 KB', async () => {
    const { files, bytes } = await bundleFromDist('watchPage', distSensor);
    const leaked = files.filter((f) => !f.startsWith('dist/sensor/'));
    expect(leaked, 'modules outside dist/sensor/** leaked into the sensor bundle').toEqual([]);
    for (const forbidden of ['dist/traverse/', 'dist/tree/', 'dist/serve/', 'dist/registry/', 'dist/presence/', 'dist/graph/', 'node_modules/footprintjs']) {
      expect(files.filter((f) => f.includes(forbidden)), `bundle must not contain ${forbidden}`).toEqual([]);
    }
    expect(files, 'probe must actually pull the watcher').toContain('dist/sensor/watch-page.js');
    expect(bytes).toBeLessThanOrEqual(16 * 1024);
  });

  /**
   * The skin's own bytes, with react where a consumer's bundler keeps it —
   * outside. Two separable promises, and this measures both at once: the hook
   * drags no WATCHER (everything it needs from the sensor is a type, so a page
   * that imported only the hook would ship no listener), and it drags no ENGINE
   * behind that. Pinned at 2 KB against a measured 597 B, so honest growth passes
   * and a value import of the core fails.
   */
  it('the shipped react subpath is the hook alone — no sensor, no engine, under 2 KB', async () => {
    const { files, bytes } = await bundleFromDist('ControlSurfaceProvider, useControl', distReact, ['react']);
    const leaked = files.filter((f) => !f.startsWith('dist/react/'));
    expect(leaked, 'modules outside dist/react/** leaked into the react bundle').toEqual([]);
    for (const forbidden of ['dist/sensor/', 'dist/traverse/', 'dist/tree/', 'node_modules/footprintjs']) {
      expect(files.filter((f) => f.includes(forbidden)), `bundle must not contain ${forbidden}`).toEqual([]);
    }
    expect(files, 'probe must actually pull the hook').toContain('dist/react/use-control.js');
    expect(bytes).toBeLessThanOrEqual(2 * 1024);
  });

  /**
   * THE SAME PROOF FOR THE WORKING HOOK, AND IT GUARDS A SHARPER EDGE. Everything
   * `useWorking` needs from the core is a TYPE — `ActionHandle` and two methods
   * picked off `Session` — and a type is erased. Turn one of those into a value
   * import and the whole session machinery (plus footprintjs behind it) lands in
   * the bundle of any page that renders a spinner. That is not a size regression,
   * it is a different package arriving; this is the test that says so. Pinned at
   * 3 KB against a measured 2,399 B — most of which is the two authored warnings
   * (torn down mid-work, and an id that arrived after the rise), kept whole
   * because a warning shortened into an alert is a warning somebody has to
   * already understand. The ceiling exists to catch a VALUE import of the core,
   * which arrives in tens of kilobytes; it was raised from 2 KB when the second
   * warning shipped, and raising it for honest prose is the point of having
   * headroom rather than a tripwire.
   */
  it('the working hook drags no session and no engine — under 3 KB', async () => {
    const { files, bytes } = await bundleFromDist('useWorking', distReact, ['react']);
    const leaked = files.filter((f) => !f.startsWith('dist/react/'));
    expect(leaked, 'modules outside dist/react/** leaked into the working bundle').toEqual([]);
    for (const forbidden of ['dist/traverse/', 'dist/atom/', 'dist/registry/', 'dist/sensor/', 'node_modules/footprintjs']) {
      expect(files.filter((f) => f.includes(forbidden)), `bundle must not contain ${forbidden}`).toEqual([]);
    }
    expect(files, 'probe must actually pull the hook').toContain('dist/react/use-working.js');
    expect(bytes).toBeLessThanOrEqual(3 * 1024);
  });
});
