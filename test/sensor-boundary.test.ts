/**
 * THE NEGATIVE SCANS — the properties src/sensor keeps by NOT containing something.
 *
 * Four promises, each enforced by absence rather than by care:
 * 1. ZERO-VALUE-IMPORT LEAF. Importing the sensor drags no session machinery and no
 *    footprintjs, so a page that only wanted a DOM listener does not ship an
 *    engine. The port is `import type` only, the same construction as the
 *    LiveBindingPort leaf at graph/sources/from-live-store.ts:25-28.
 * 2. NO GLOBALS. `lib: ["ES2022"]` already makes a free `document` a compile error;
 *    this catches the shapes a compiler would accept but SSR would not.
 * 3. NO VALUE SCRAPING. `element.value` is read in exactly ONE place, for an
 *    `<input type=submit>`'s LABEL. This is the pin that keeps that hole from being
 *    widened back into the bug class requirement one exists to prevent.
 * 4. NO FRAMEWORK. `hcifootprint/react` is a separate subpath precisely so a
 *    consumer who never names it never resolves react; the core must never name it.
 *
 * The scan is a FULL-SOURCE substring check, not a from-line regex — the same
 * reasoning test/testing-boundary.test.ts:36-38 gives: it catches side-effect,
 * dynamic and multi-line imports the naive form would miss.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { InteractionSession } from '../src/index.js';
import type { SensorSession } from '../src/sensor/index.js';
import { buildNavigationGraph } from '../src/index.js';

const SENSOR_DIR = 'src/sensor';
const files = readdirSync(SENSOR_DIR)
  .filter((name) => name.endsWith('.ts'))
  .map((name) => join(SENSOR_DIR, name));

describe('src/sensor is a ZERO-VALUE-IMPORT leaf over the engine', () => {
  it('has source files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file} never value-imports footprintjs or the session`, () => {
      const source = readFileSync(file, 'utf8');
      for (const line of source.split('\n')) {
        if (!/^\s*import\s+(?!type\b)/.test(line)) continue;
        expect(line, `value import of an engine module in ${file}`).not.toMatch(/['"]footprintjs/);
        expect(line, `value import of the session in ${file}`).not.toMatch(/traverse\//);
        expect(line, `value import of the tree in ${file}`).not.toMatch(/(tree|registry|serve|presence|graph)\//);
      }
      // A dynamic import would slip past the line scan entirely.
      expect(source).not.toMatch(/\bimport\s*\(/);
      expect(source).not.toContain('@modelcontextprotocol/sdk');
    });
  }

  it('the ONLY engine module it names at all is the shared type file', () => {
    const named = new Set<string>();
    for (const file of files) {
      for (const match of readFileSync(file, 'utf8').matchAll(/from '(\.\.\/[^']+)'/g)) {
        named.add(match[1]!);
      }
    }
    expect([...named]).toEqual(['../atom/types.js']);
  });
});

/**
 * WHO OWNS WHICH HALF OF SSR SAFETY.
 *
 * The BROWSER globals are the compiler's: `lib: ["ES2022"]` declares no
 * `document`, `window`, `localStorage` or `navigator`, so naming one is
 * `error TS2304` and `npm run typecheck` says so. test/sensor-dom-port.test.ts
 * proves that lib really refuses them, so this file does not re-assert it — and
 * must not, because `document` is also the name of a legitimate PARAMETER here
 * (the port's `SensorDocument`), which a text scan cannot tell apart.
 *
 * The NODE globals are this scan's: `@types/node` is in scope, so `setTimeout`,
 * `queueMicrotask`, `process` and `Buffer` would compile happily and then be the
 * exact reach the house law forbids.
 */
describe('no Node globals — the half the compiler would let through', () => {
  /** Comments stripped: a JSDoc example may legitimately SHOW the thing code must not do. */
  function codeOf(file: string): string {
    return readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
  }

  for (const file of files) {
    it(`${file} reaches for no Node global`, () => {
      const code = codeOf(file);
      for (const global of ['globalThis', 'process.', 'Buffer', '__dirname', 'require(']) {
        expect(code, `${file} names the ${global} global`).not.toContain(global);
      }
      // `console.warn` IS used, once, as the DEFAULT warn sink — the same house
      // pattern as `warn ?? ((m) => console.warn(m))` at from-live-store.ts:97 and
      // session.ts:395. Nothing else may reach a host API.
      expect(code.match(/console\./g) ?? []).toHaveLength(file.endsWith('watch-page.ts') ? 1 : 0);
    });
  }

  it('nothing outside the port ever CALLS a timer unqualified', () => {
    // A qualified `timers.setTimeout(...)` is the port being used; the name inside a
    // sentence is a sentence. An UNQUALIFIED call is the reach the house law
    // forbids, and it is the only shape this looks for.
    const bareCall = /(?<![.\w'"])(setTimeout|setInterval|queueMicrotask)\s*\(/;
    const offenders = files
      .filter((file) => file !== join(SENSOR_DIR, 'dom-port.ts'))
      .filter((file) => bareCall.test(codeOf(file)));
    expect(offenders).toEqual([]);
  });

  it('and the port itself takes its clock FROM THE VIEW the app handed in', () => {
    // dom-port.ts is the one file that may write the name at all, because it
    // DECLARES the surface. What it must never do is reach for a global instead of
    // the view — and it must bind, or a real window.setTimeout throws
    // `Illegal invocation`.
    const port = codeOf(join(SENSOR_DIR, 'dom-port.ts'));
    expect(port).toContain('set.call(view');
    expect(port).toContain('clear.call(view');
    expect(port).not.toMatch(/(?<![.\w'"])setTimeout\s*\(\s*(\(\)|handler\s*,)/);
  });
});

describe('THE VALUE PIN — element.value is read once, and it reads a LABEL', () => {
  it('only accessible-name.ts reads it, and only once', () => {
    const readers: string[] = [];
    let reads = 0;
    for (const file of files) {
      const code = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '');
      const found = [...code.matchAll(/\b(element|node|target|el)\.value\b/g)];
      if (found.length > 0) readers.push(file);
      reads += found.length;
    }
    expect(readers).toEqual([join(SENSOR_DIR, 'accessible-name.ts')]);
    expect(reads).toBe(1);
  });

  it('the members a value-scraper needs are ABSENT from the port, so there is nothing to read', () => {
    const port = readFileSync(join(SENSOR_DIR, 'dom-port.ts'), 'utf8');
    for (const member of ['checked', 'selectedIndex', 'valueAsNumber', 'files', 'innerText', 'form']) {
      expect(port, `SensorElement must not offer ${member}`).not.toMatch(
        new RegExp(`readonly ${member}\\??:`),
      );
    }
  });

  it('nothing in the subpath reads those members either, port or no port', () => {
    for (const file of files) {
      const code = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '');
      expect(code, file).not.toMatch(/\.(checked|selectedIndex|valueAsNumber|files|innerText)\b/);
    }
  });
});

describe('no framework in the core', () => {
  for (const file of files) {
    it(`${file} never RESOLVES react`, () => {
      const source = readFileSync(file, 'utf8');
      // The specifier, in any form — static, dynamic or require — because that is
      // the property: a consumer who never writes `from 'hcifootprint/react'` must
      // never resolve react. The WORD is fine and appears in prose ("React
      // StrictMode"), which is why this checks the quoted module name.
      expect(source, `${file} names the react module`).not.toMatch(/['"]react(\/[^'"]*)?['"]/);
    });
  }

  it('the main entry does not import the sensor subpath either', () => {
    expect(readFileSync('src/index.ts', 'utf8')).not.toMatch(/from ['"][^'"]*sensor/);
  });
});

describe('the port is satisfied by the real thing — structurally, not by assertion', () => {
  it('an InteractionSession IS a SensorSession', () => {
    const session = buildNavigationGraph('desk', { pages: { inbox: {} } }).createSession({ node: 'inbox' });
    // The assignment is the test: if the port drifted from the session, this line
    // stops compiling and `npm run typecheck` says so.
    const port: SensorSession = session;
    expect(port.available().node).toBe('inbox');
    // And the narrowing binds the CALLER, not the session: a real session's
    // `invoke?: boolean` accepts the pinned `false`.
    const typed: InteractionSession = session;
    expect(typed.fire('nope', { source: 'user', invoke: false })).toMatchObject({ ok: false });
  });

  it('an executing fire is INEXPRESSIBLE through the port', () => {
    const session = buildNavigationGraph('desk', { pages: { inbox: {} } }).createSession({ node: 'inbox' });
    const port: SensorSession = session;
    // @ts-expect-error invoke: true would let the sensor run the app's code twice.
    port.fire('nope', { source: 'user', invoke: true });
    // @ts-expect-error omitting invoke defaults to running the handler.
    port.fire('nope', { source: 'user' });
    expect(true).toBe(true);
  });
});
