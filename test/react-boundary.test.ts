/**
 * THE NEGATIVE SCANS FOR THE SKIN — properties src/react keeps by NOT
 * containing something, plus one deliberately narrow execution exception.
 *
 * 1. ONE FOLDER RESOLVES REACT. The optional peer is only genuinely optional if a
 *    consumer who never writes `from 'hcifootprint/react'` never resolves it. That
 *    is a property of the whole `src/` tree, not of one file, so it is asserted as
 *    an inventory: the set of modules naming react must BE this folder.
 * 2. A LEAF OVER THE CORE. Everything src/react needs from the sensor is a TYPE.
 *    The high-level action hook reaches only the framework-neutral connection
 *    and host-adapter leaves; no engine or sensor value crosses the boundary.
 * 3. NO GLOBALS. `lib: ["ES2022"]` already makes `document` a compile error; this
 *    catches the Node globals `@types/node` would happily let through.
 * 4. LEGACY HOOKS CANNOT REPORT. The control and working skins retain their old
 *    record-only/no-verdict promises. `useActionBinding` is the deliberate new
 *    exception and may name exactly the core's continuation door — never fire or
 *    a second direct invocation door.
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
const ACTION_BINDING_FILE = `${REACT_DIR}/use-action-binding.ts`;

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

describe('the skin has one deliberate, narrow value path to the action core', () => {
  for (const file of reactFiles) {
    it(`${file} value-imports only react, local skin modules, or the two action leaves`, () => {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        if (!/^\s*import\s+(?!type\b)/.test(line)) continue;
        expect(line, `value import of an unapproved library module in ${file}`).toMatch(
          /from 'react'|\.\/[a-z-]+\.js'|\.\.\/action\/(connection|host-adapter)\.js'/,
        );
        if (/\.\.\//.test(line)) {
          expect(file).toBe(ACTION_BINDING_FILE);
        }
      }
      // A dynamic import would slip past the line scan entirely.
      expect(codeOf(file)).not.toMatch(/\bimport\s*\(/);
    });
  }

  it('the only library modules it names at all are the ones its types are spelled in', () => {
    const named = new Set<string>();
    for (const file of reactFiles) {
      for (const match of readFileSync(file, 'utf8').matchAll(/from '(\.\.\/[^']+)'/g)) named.add(match[1]!);
    }
    // Three sensor modules for the control skin, and two for the working skin —
    // every one of them reached through `import type`, which the scan above
    // pins. The list is written out rather than pattern-matched so that ADDING
    // one is a decision somebody makes in this file, not a diff nobody reads.
    expect([...named].sort()).toEqual([
      '../action/connection.js',
      '../action/host-adapter.js',
      '../action/types.js',
      '../atom/types.js',
      '../sensor/control-index.js',
      '../sensor/dom-port.js',
      '../sensor/types.js',
      '../traverse/session.js',
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

describe('THE RECORD-ONLY PIN — legacy hooks still have no way to write a row', () => {
  const recordOnlyFiles = reactFiles.filter(
    (file) => file !== ACTION_BINDING_FILE,
  );

  for (const file of recordOnlyFiles) {
    it(`${file} never fires and never names invoke`, () => {
      const code = codeOf(file);
      // Reporting belongs to the core, through the one port whose type makes an
      // executing fire inexpressible. A skin that could fire would be a second
      // door — and two doors is how one human click becomes two ledger rows.
      expect(code, `${file} calls fire()`).not.toMatch(/\.fire\s*\(/);
      expect(code, `${file} names invoke`).not.toContain('invoke');
    });
  }

  it('the action hook uses one continuation door, never fire or direct invoke', () => {
    const code = codeOf(ACTION_BINDING_FILE);
    expect(code).not.toMatch(/\.fire\s*\(/);
    expect(code).not.toMatch(/\.invoke\s*\(/);
    expect(code.match(/\.invokeContinuation\s*\(/g)).toHaveLength(1);
  });

  it('the subpath serves five runtime exports and not one more', async () => {
    const module = await import('../src/react/index.js');
    expect(Object.keys(module).sort()).toEqual([
      'ControlSurfaceProvider',
      'useActionBinding',
      'useControl',
      'useControlSurface',
      'useWorking',
    ]);
  });
});

/**
 * THE OTHER HALF OF THE SAME PIN, for the hook that reports about ASYNC WORK
 * rather than about a click.
 *
 * `useWorking` drives two doors — the work ledger and the busy label — and
 * neither of them settles anything. That is the core's own load-bearing refusal
 * (`done()` records an error on the work row and resolves no latch), and a skin
 * is exactly where somebody would later be tempted to "close the loop" by
 * reaching past it. The temptation has to name one of these words, so the scan
 * is what makes "it can never report that something worked" a property of the
 * folder rather than a promise in a paragraph.
 */
describe('THE NO-VERDICT PIN — the skin has no way to settle a fire either', () => {
  for (const file of reactFiles) {
    it(`${file} names no door that could mint an outcome`, () => {
      const code = codeOf(file);
      for (const door of ['updateState', 'reject', 'settlementOf', 'whenSettled', 'settlementIfKnown']) {
        expect(code, `${file} names ${door}`).not.toContain(door);
      }
    });
  }
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
