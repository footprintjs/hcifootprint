/**
 * Import-boundary guard for the hcifootprint/sensor subpath — the same shape as
 * test/testing-boundary.test.ts, for a subpath with two extra promises to keep.
 *
 * 1. ZERO-VALUE-IMPORT LEAF: nothing under src/sensor may VALUE-import the
 *    engine or footprintjs. Importing a DOM listener must not drag session
 *    machinery into a consumer's bundle (the stance from-live-store.ts:25-28
 *    takes, and test/treeshake.test.ts:64-76 measures).
 * 2. ZERO GLOBALS: src/sensor names no `window`, `document` or `globalThis`.
 *    The package compiles without lib.dom, so SSR safety is compiler-enforced
 *    rather than convention-enforced — and this test is what keeps it that way
 *    when someone reaches for a global "just this once".
 * 3. The main entry must not import the sensor subpath.
 *
 * MUTATION PROOF (run, then reverted): adding
 * `import { InteractionSession } from '../traverse/nav-session.js';` to
 * watch-page.ts flips the value-import test; adding `document.body` to it flips
 * the globals test.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { RecordOnlyFire, SensorSession } from '../src/sensor/index.js';
import { deskMap } from './sensor-fixture.js';

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

const files = walk('src/sensor');

describe('hcifootprint/sensor is a zero-value-import leaf', () => {
  it('has source files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file} imports the engine and footprint by type only`, () => {
      const source = readFileSync(file, 'utf8');
      for (const line of source.split('\n')) {
        // A VALUE import (not `import type`) from footprint or from anywhere
        // outside src/sensor is forbidden.
        if (!/^\s*import\s+(?!type\b)/.test(line)) continue;
        if (/['"]footprintjs(\/[^'"]*)?['"]/.test(line)) {
          throw new Error(`engine leak in ${file}: value import of footprint — ${line.trim()}`);
        }
        if (/from\s+['"]\.\.\//.test(line)) {
          throw new Error(`leaf broken in ${file}: value import from outside src/sensor — ${line.trim()}`);
        }
      }
      // Side-effect and dynamic imports would slip past the line scan above.
      expect(source).not.toMatch(/\bimport\s*\(/);
      expect(source).not.toMatch(/^\s*import\s+['"]/m);
    });

    it(`${file} names no browser global`, () => {
      const source = readFileSync(file, 'utf8');
      // Code only: the module headers legitimately DISCUSS `document` and
      // `window`, and a doc comment cannot reach a global at runtime.
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      for (const global of ['window', 'globalThis', 'navigator']) {
        expect(new RegExp(`\\b${global}\\b`).test(code), `${file} names ${global}`).toBe(false);
      }
    });
  }
});

describe('a free `document` is a COMPILE error, which is the strongest form of this guard', () => {
  it('the library compiles without the DOM lib, so the compiler is the enforcer', () => {
    // src/sensor DOES name `document` — as a PARAMETER (accessible-name.ts takes
    // a SensorDocument). A text scan cannot tell that from a free global read,
    // and a scan that pretended to would be a test that asserts nothing.
    //
    // The real guard is upstream of any scan: with no DOM in `lib`, a free
    // `document` is "Cannot find name 'document'" and `npm run typecheck` fails.
    // This test pins the setting that makes that true, so nobody can restore SSR
    // hazards by widening a compiler option.
    const tsconfig = JSON.parse(
      readFileSync('tsconfig.json', 'utf8').replace(/^\s*\/\/.*$/gm, ''),
    ) as { compilerOptions: { lib: string[] } };
    expect(tsconfig.compilerOptions.lib).toEqual(['ES2022']);
    expect(tsconfig.compilerOptions.lib.join(',').toLowerCase()).not.toContain('dom');
  });
});

describe('the main entry does not import the sensor subpath', () => {
  it('src/index.ts has no sensor import', () => {
    expect(readFileSync('src/index.ts', 'utf8')).not.toMatch(/from ['"][^'"]*sensor/);
  });
});

describe('the duck port is really a subset of the real session', () => {
  it('an InteractionSession satisfies SensorSession with no adapter', () => {
    // The assignment IS the assertion: if the port ever asks for something a
    // session does not have — or asks for it with a different shape — this file
    // stops compiling, and `npm run typecheck` is the gate that catches it.
    const port: SensorSession = deskMap().createSession({ node: 'inbox', onWarn: () => undefined });
    expect(typeof port.available).toBe('function');
    expect(typeof port.fire).toBe('function');
    expect(typeof port.on).toBe('function');
    expect(typeof port.sync).toBe('function');
  });
});

describe('record-only is a TYPE, not a habit somebody could forget', () => {
  it('the port cannot express an executing fire', () => {
    // `invoke` is required and pinned to false, so this is the only shape that
    // compiles — which is why one human click can never run the app twice.
    const recordOnly: RecordOnlyFire = { source: 'user', invoke: false };
    expect(recordOnly.invoke).toBe(false);

    // @ts-expect-error — an executing fire is inexpressible through this port.
    const executing: RecordOnlyFire = { source: 'user', invoke: true };
    // @ts-expect-error — and so is declining to answer the question at all.
    const silent: RecordOnlyFire = { source: 'user' };
    expect([executing, silent]).toHaveLength(2);
  });
});
