/**
 * dom-port.ts — the two claims only a COMPILER can make, plus the resolution rules
 * the port carries in code.
 *
 * WHY A COMPILER AND NOT jsdom. The port's central promise is that a real
 * `HTMLElement`, `Document`, `ShadowRoot` and `Window` satisfy it STRUCTURALLY, so
 * the library can compile with no DOM lib at all and a Node importer cannot reach a
 * browser global. That is a type claim; a runtime object cannot answer it, and
 * jsdom is not a declared dependency of this package (test/treeshake.test.ts:6-8 —
 * "never hoist-trusted"). So the probes shell out to the DECLARED typescript
 * devDependency instead, and get a build-time proof with no runtime dependency at
 * all.
 *
 * MUTATION PROOF, and it is the second probe: `reaches-for-a-global.ts` compiles
 * under the library's own `lib: ["ES2022"]` and MUST FAIL. Widen that lib and this
 * test goes red, which is the SSR guarantee having teeth rather than a comment.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { FakeView, Surface, el } from './sensor-fixture.js';
import { documentOf, timersOf, viewOf } from '../src/sensor/dom-port.js';
import type { SensorDocument, SensorRoot } from '../src/sensor/dom-port.js';

/** Run the declared tsc against a probe project; return its output (empty = clean). */
function compile(project: string): string {
  try {
    execFileSync('node_modules/.bin/tsc', ['-p', project], { encoding: 'utf8', stdio: 'pipe' });
    return '';
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string };
    return `${failure.stdout ?? ''}${failure.stderr ?? ''}`;
  }
}

describe('the real DOM satisfies the port — proved by compiling against it', () => {
  it('HTMLElement, Document, ShadowRoot and Window all assign cleanly under lib DOM', () => {
    const output = compile('test/sensor-probe/tsconfig.with-dom.json');
    expect(output, 'the port has drifted from the real DOM').toBe('');
  });

  it("the probe really does assign the real types — it is not an empty file passing", () => {
    const probe = readFileSync('test/sensor-probe/real-dom.ts', 'utf8');
    for (const real of ['HTMLElement', 'HTMLInputElement', 'HTMLSelectElement', 'Document', 'ShadowRoot', 'Window']) {
      expect(probe).toContain(real);
    }
  });
});

describe("SSR safety is the COMPILER's, not a convention", () => {
  it("a module reaching for a browser global does not compile under the library's own lib", () => {
    const output = compile('test/sensor-probe/tsconfig.no-dom.json');
    expect(output).toContain("Cannot find name 'window'");
    expect(output).toContain("Cannot find name 'localStorage'");
    expect(output).toContain("Cannot find name 'navigator'");
    // `document` earns TS2584, the same refusal with a friendlier sentence.
    expect(output).toMatch(/Cannot find name 'document'/);
  });

  it('and the library itself compiles under exactly that lib', () => {
    expect(readFileSync('tsconfig.json', 'utf8')).toContain('"lib": ["ES2022"]');
  });
});

describe('documentOf — ask the tree the element actually lives in', () => {
  it("a root with its own id lookup IS the document", () => {
    const surface = new Surface(new FakeView('/inbox'));
    expect(documentOf(surface)).toBe(surface);
  });

  it('an element root defers to its ownerDocument', () => {
    const surface = new Surface(new FakeView('/inbox'));
    const owned: SensorRoot = { ...el('div'), ownerDocument: surface.asDocument() } as unknown as SensorRoot;
    expect(documentOf(owned)).toBe(surface.asDocument());
  });

  it('a shadow root wins over the OUTER document, which is the whole point', () => {
    // A shadow root has BOTH an ownerDocument (the outer page) and its own
    // getElementById. Resolving an aria-labelledby inside a shadow tree against the
    // OUTER document would either miss or — worse — find a same-id element that has
    // nothing to do with the control. So the root's own lookup wins.
    const outer = new Surface(new FakeView('/inbox'));
    const decoy = el('span', { attrs: { id: 'label' }, text: 'the outer page' });
    outer.mount(decoy);
    const inside = el('span', { attrs: { id: 'label' }, text: 'inside the shadow' });
    const shadow: SensorRoot = {
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      ownerDocument: outer.asDocument(),
      getElementById: (id) => (id === 'label' ? inside : null),
    };

    expect(documentOf(shadow)?.getElementById('label')).toBe(inside);
    expect(outer.getElementById('label')).toBe(decoy);
  });

  it('a detached root answers undefined, and callers degrade to silence', () => {
    const detached = { addEventListener: () => undefined, removeEventListener: () => undefined };
    expect(documentOf(detached as SensorRoot)).toBeUndefined();
  });
});

describe('viewOf and timersOf — absence is a real answer', () => {
  it('the view comes off the document', () => {
    const view = new FakeView('/inbox');
    const surface = new Surface(view);
    expect(viewOf(documentOf(surface))).toBe(view);
  });

  it('no document means no view, and no view means no clock', () => {
    expect(viewOf(undefined)).toBeUndefined();
    expect(timersOf(undefined)).toBeUndefined();
  });

  it('a view with no timers yields no clock rather than a broken one', () => {
    expect(timersOf(new FakeView('/inbox'))).toBeUndefined();
  });

  it('a view WITH timers yields a usable pair', () => {
    let armed = 0;
    const withClock = new FakeView('/inbox', {
      setTimeout: () => (armed += 1),
      clearTimeout: () => undefined,
    });
    const timers = timersOf(withClock);
    expect(timers).toBeDefined();
    timers?.setTimeout(() => undefined, 10);
    expect(armed).toBe(1);
  });

  it('the pair is BOUND to the view — an unbound window.setTimeout throws in browsers', () => {
    const calls: unknown[] = [];
    const view = new FakeView('/inbox');
    view.setTimeout = function setTimeoutOnView(this: unknown): unknown {
      calls.push(this);
      return 1;
    };
    view.clearTimeout = () => undefined;
    timersOf(view)?.setTimeout(() => undefined, 0);
    expect(calls).toEqual([view]);
  });
});

describe('the port asks for the SMALLEST surface that does the job', () => {
  it('SensorDocument needs an id lookup and nothing more to be useful', () => {
    // A two-method object is a legal document, which is what makes a shadow root, a
    // detached tree and a non-browser host all expressible.
    const minimal: SensorDocument = {
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      getElementById: () => null,
    };
    expect(minimal.getElementById('x')).toBeNull();
  });
});
