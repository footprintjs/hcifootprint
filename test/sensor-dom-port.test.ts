/**
 * The duck-typed DOM port, proved by the compiler in both directions.
 *
 * The port makes two claims that no runtime test can check, because both are
 * about what TYPE-CHECKS rather than what runs:
 *
 *  1. A consumer WITH the real DOM can hand in their actual elements — no
 *     adapters, no casts. Proved by compiling test/sensor-probe/real-dom.ts
 *     under `lib: ["ES2022", "DOM"]`, where every assignment is an assertion.
 *  2. A consumer WITHOUT the DOM (SSR, a Node importer) is protected by the
 *     COMPILER, not by convention. Proved by compiling
 *     test/sensor-probe/reaches-for-a-global.ts under the library's own lib
 *     setting and requiring it to FAIL: with no lib.dom, `document` is not a
 *     name that exists.
 *
 * The second one is the load-bearing test in this file. src/sensor's headers
 * claim SSR safety is compiler-enforced; this is the test that keeps that claim
 * from quietly becoming decorative if someone ever adds "DOM" to the lib array.
 *
 * MUTATION PROOFS (each run, then reverted):
 * - Add "DOM" to tsconfig.json's `lib` → "reaching for a browser global does not
 *   compile" fails, and the SSR guarantee is exposed as no longer enforced.
 * - Remove `labels` from SensorElement → "the real DOM satisfies the port" fails
 *   on the HTMLInputElement assignment.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const TSC = path.join('node_modules', 'typescript', 'bin', 'tsc');

/** Compile one probe project; return null on success, or tsc's own output. */
function compile(project: string): string | null {
  try {
    execFileSync(process.execPath, [TSC, '-p', path.join('test', 'sensor-probe', project)], {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return null;
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string };
    return `${failure.stdout ?? ''}${failure.stderr ?? ''}`;
  }
}

describe('the port is satisfied by the real DOM', () => {
  it('HTMLElement, Document, ShadowRoot, inputs, selects and Window all assign with no adapter', () => {
    expect(compile('tsconfig.with-dom.json')).toBeNull();
  }, 60_000);
});

describe('SSR safety is compiler-enforced, not convention-enforced', () => {
  it('the library compiles with no DOM lib at all', () => {
    const lib = JSON.parse(readFileSync('tsconfig.json', 'utf8')).compilerOptions.lib;
    // If this ever includes 'DOM', the test below stops meaning anything — so
    // the setting itself is pinned here, where the reason is written down.
    expect(lib).toEqual(['ES2022']);
  });

  it('reaching for a browser global does not compile', () => {
    const output = compile('tsconfig.no-dom.json');
    expect(output, 'a free `document` must not compile without lib.dom').not.toBeNull();
    expect(output).toContain("Cannot find name 'document'");
  }, 60_000);
});
