/**
 * THE NEGATIVE SCANS FOR THE SKIN — five properties src/react keeps by NOT
 * containing something.
 *
 * 1. ONE FOLDER RESOLVES REACT. The optional peer is only genuinely optional if a
 *    consumer who never writes `from 'hcifootprint/react'` never resolves it. That
 *    is a property of the whole `src/` tree, not of one file, so it is asserted as
 *    an inventory: the set of modules naming react must BE this folder.
 * 2. A LEAF OVER THE CORE. Everything src/react needs from the sensor is a TYPE,
 *    so the skin drags no watcher into a bundle and the two subpaths stay
 *    separable — the same construction the sensor uses over the engine.
 * 3. NO GLOBALS. `lib: ["ES2022"]` already makes `document` a compile error; this
 *    catches the Node globals `@types/node` would happily let through.
 * 4. IT CANNOT REPORT. The skin never names `fire` and never names `invoke`: the
 *    one canonical door is the core's, and a binding that could write a row would
 *    be the second door that double-executes a human's click. It is an absent
 *    surface rather than a rule anyone has to remember.
 * 5. ITS PEER REFUSES NOBODY. Property 1 one layer down, in package.json instead
 *    of in the module graph: a consumer who never imports the skin must not even
 *    have their INSTALL refused over it.
 *
 * The scan is a FULL-SOURCE substring check, not a from-line regex — the same
 * reasoning test/sensor-boundary.test.ts:16-19 gives: it catches side-effect,
 * dynamic and multi-line imports the naive form would miss.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REACT_DIR = 'src/react';

/** Every .ts file under src/, so the inventory scan speaks for the whole tree. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return name.endsWith('.ts') ? [full] : [];
  });
}

/** Comments stripped: a module header may legitimately NAME the thing code must not do. */
function codeOf(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const reactFiles = sourceFiles(REACT_DIR);
const allSourceFiles = sourceFiles('src');

describe('src/react is the ONLY place in the package that resolves react', () => {
  it('has source files to check', () => {
    expect(reactFiles.length).toBeGreaterThan(0);
  });

  it('no module outside this folder resolves it', () => {
    // The quoted specifier in any form — static, dynamic or require — because that
    // is the property. Comments are stripped first: every subpath's header shows
    // its own import in a JSDoc example, and a page that DOCUMENTS the specifier
    // is not a page that resolves it.
    const naming = allSourceFiles.filter((file) => /['"]react(\/[^'"]*)?['"]/.test(codeOf(file)));
    expect(naming.filter((file) => !file.startsWith(REACT_DIR))).toEqual([]);
    expect(naming.length, 'a scan that finds nothing at all would pass vacuously').toBeGreaterThan(0);
  });

  it('and it names no OTHER third party — not the sdk, not footprintjs', () => {
    for (const file of reactFiles) {
      const code = codeOf(file);
      for (const match of code.matchAll(/from '([^.][^']*)'/g)) {
        expect(match[1], `${file} resolves a third party that is not react`).toBe('react');
      }
      expect(code).not.toContain('footprintjs');
      expect(code).not.toContain('@modelcontextprotocol/sdk');
    }
  });
});

describe('the skin reaches the core through TYPES ONLY', () => {
  for (const file of reactFiles) {
    it(`${file} value-imports nothing but react`, () => {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        if (!/^\s*import\s+(?!type\b)/.test(line)) continue;
        expect(line, `value import of a library module in ${file}`).toMatch(/from 'react'|\.\/[a-z-]+\.js'/);
        expect(line, `value import across the subpath boundary in ${file}`).not.toMatch(/\.\.\//);
      }
      // A dynamic import would slip past the line scan entirely.
      expect(codeOf(file)).not.toMatch(/\bimport\s*\(/);
    });
  }

  it('the only library modules it names at all are the sensor types', () => {
    const named = new Set<string>();
    for (const file of reactFiles) {
      for (const match of readFileSync(file, 'utf8').matchAll(/from '(\.\.\/[^']+)'/g)) named.add(match[1]!);
    }
    expect([...named].sort()).toEqual([
      '../sensor/control-index.js',
      '../sensor/dom-port.js',
      '../sensor/types.js',
    ]);
  });
});

describe('no globals — the half the compiler would let through', () => {
  for (const file of reactFiles) {
    it(`${file} reaches for no Node global`, () => {
      const code = codeOf(file);
      for (const global of ['globalThis', 'process.', 'Buffer', '__dirname', 'require(', 'console.']) {
        expect(code, `${file} names the ${global} global`).not.toContain(global);
      }
      const bareCall = /(?<![.\w'"])(setTimeout|setInterval|queueMicrotask)\s*\(/;
      expect(bareCall.test(code), `${file} reaches for a timer instead of the app's`).toBe(false);
    });
  }
});

describe('THE RECORD-ONLY PIN — the skin has no way to write a row', () => {
  for (const file of reactFiles) {
    it(`${file} never fires and never names invoke`, () => {
      const code = codeOf(file);
      // Reporting belongs to the core, through the one port whose type makes an
      // executing fire inexpressible. A skin that could fire would be a second
      // door — and two doors is how one human click becomes two ledger rows.
      expect(code, `${file} calls fire()`).not.toMatch(/\.fire\s*\(/);
      expect(code, `${file} names invoke`).not.toContain('invoke');
    });
  }

  it('the subpath serves three runtime exports and not one more', async () => {
    const module = await import('../src/react/index.js');
    expect(Object.keys(module).sort()).toEqual(['ControlSurfaceProvider', 'useControl', 'useControlSurface']);
  });
});

describe('THE OPTIONAL PEER — a floor here is a claim about the consumer, not about us', () => {
  it('names a range no install can conflict with', () => {
    const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
      peerDependencies: Record<string, string>;
      peerDependenciesMeta: Record<string, { optional?: boolean }>;
    };
    expect(manifest.peerDependenciesMeta['react']?.optional).toBe(true);
    // `optional` means "need not be INSTALLED". It has never meant "version
    // ignored when present": npm checks the range against whatever react is
    // already in the tree and FAILS the install on a conflict. So a floor written
    // here is a rule about the consumer's whole tree, and hcifootprint does not
    // need react at all — measured, in a clean room: `react: ">=18"` turned
    // `npm install hcifootprint` into an ERESOLVE failure for a React 17 app that
    // never imports `hcifootprint/react`.
    //
    // The subpath's floor is real and is React 18 — `useInsertionEffect` does not
    // exist below it — and it is enforced where it can only reach someone who
    // actually imports the subpath: by the import itself.
    expect(manifest.peerDependencies['react']).toBe('*');
  });
});
