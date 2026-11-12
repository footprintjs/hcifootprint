import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

// WHY THIS TEST. On 12 Nov 2026 one upstream release needed hand edits in two of these scripts, and CI
// was red twice before they were found: the scripts held family versions and ranges typed in by hand.
// The rule now is that package.json declares the ranges and the root lock chooses the versions; the
// scripts only read them. This test keeps a typed-in number from coming back.
//
// It reads every line of the three scripts, comments included. Lines that name Vite are skipped: the
// Vite pin is a toolchain choice the root makes on purpose, not a version of the family.
const SCRIPTS = ['check-pins.mjs', 'identity.mjs', 'prepare-consumer.mjs'];
const RULES = [
  ['a version', /\d+\.\d+\.\d+/],
  ['a caret or tilde range, or a regex pinning a major', /[\^~]\s*\d/],
  ['a family name followed by a number', /\b(?:footprintjs|foottrace|agentfootprint|AF|FP|FT)\s*@?\s*v?\d/i],
  ['a list of majors', /\[\s*\d+\s*,\s*\d+/],
];

export function literalFindings(file, text) {
  return text.split('\n').flatMap((line, index) => /vite/i.test(line) ? [] : RULES
    .filter(([, pattern]) => pattern.test(line))
    .map(([what]) => `${file}:${index + 1}: ${what}: ${line.trim()}`));
}

test('the cohort scripts hold no version or range of a family package', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const findings = SCRIPTS.flatMap((file) => literalFindings(file, readFileSync(join(here, file), 'utf8')));
  assert.deepEqual(findings, [], 'Read the version from package.json or the root lock instead');
});

test('the guard catches each literal the scripts used to hold', () => {
  // The shapes, not the numbers: each line below is built so this file states no family version either.
  const n = (...parts) => parts.join('.');
  const old = [
    `export const COHORT = Object.freeze({ footprintjs: '${n(1, 2, 0)}' });`,
    `assert.equal(range, '^${n(1, 0, 0)}', 'demo');`,
    "assert.match(version, /^9\\.\\d+\\.\\d+$/, 'demo');",
    'const ENGINE_MAJORS = Object.freeze([1, 2]);',
    "'demo: AF9 is required'",
  ];
  for (const line of old) assert.notDeepEqual(literalFindings('sample', line), [], line);
  assert.deepEqual(literalFindings('sample', "assert.match(pkg.devDependencies?.vite ?? '', /^8\\./);"), []);
});
