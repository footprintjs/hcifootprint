import assert from 'node:assert/strict';
import { existsSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { declaredRange, linkedMetadata, lockedInRange, oneHoistedEntry, readJson } from './pin-assertions.mjs';

// WHY NOTHING HERE NAMES A VERSION. `package.json` is the one place a range is declared and the root
// lock is the one place an installed version is chosen. This gate only checks that they agree: each
// lock repeats the declarations, and each locked version satisfies its declared range. When it held
// its own copy of the ranges and of the agentfootprint major, one upstream change on 12 Nov 2026 needed
// hand edits here and in identity.mjs, and CI was red twice before anyone found them. Now a lock change
// inside the declared range needs no edit, and a range change is one edit in package.json (plus the
// lock npm regenerates). Ranges are read with `semver`, npm's own range rules, not a hand-written one.
//
// Example: package.json accepts two footprintjs majors and the lock holds the older one, so the gate
// passes; move the lock to the newer major with npm and it still passes, with no edit to this file.
// (This file states no version even in a comment: cohort-literals.test.mjs refuses one.)

/** The packages HCI declares in `dependencies` and the root lock must hold exactly once. */
export const RUNTIME_PACKAGES = Object.freeze(['footprintjs', 'foottrace']);
const LOCKS = [
  ['package-lock.json', '', true],
  ['docs-next/package-lock.json', '..', false],
];
const DEMOS = ['demos/live-desk', 'demos/onboarding-wizard'];

/** Metadata gate only. Installed identity and behavior have separate checks. */
export function checkPins(root) {
  const read = (path) => readJson(root, path);
  const pkg = read('package.json');
  const ranges = Object.fromEntries(RUNTIME_PACKAGES.map((name) =>
    [name, declaredRange(pkg.dependencies, name, 'package.json')]));
  assert.match(pkg.devDependencies?.vite ?? '', /^8\./,
    'The root coverage toolchain must explicitly declare its Vite8 transformer');
  assert.deepEqual(pkg.workspaces, DEMOS, 'Maintained demos must use the root install/lock authority');
  const agentRanges = DEMOS.map((demo) =>
    declaredRange(read(`${demo}/package.json`).dependencies, 'agentfootprint', `${demo}/package.json`));
  const agentRange = agentRanges[0];
  assert.ok(agentRanges.every((range) => range === agentRange),
    `The demos must declare one agentfootprint range, found ${DEMOS.map((demo, i) => `${demo}: ${agentRanges[i]}`).join(', ')}`);
  for (const demo of DEMOS) {
    assert.equal(existsSync(resolve(root, `${demo}/package-lock.json`)), false, `${demo}: nested lock splits the install authority`);
  }
  const locked = {};
  for (const [path, linkedRoot, ownsRuntime] of LOCKS) {
    const lock = read(path);
    linkedMetadata(lock, path, linkedRoot, pkg, ranges);
    if (!ownsRuntime) continue;
    assert.match(lock.packages['node_modules/vite']?.version ?? '', /^8\./,
      `${path}: the root coverage transformer was replaced by demo tooling`);
    for (const demo of DEMOS) {
      assert.equal(lock.packages[demo]?.dependencies?.agentfootprint, agentRange,
        `${path}:${demo}: workspace agentfootprint metadata is stale (the demo declares ${agentRange})`);
    }
    locked.agentfootprint = lockedInRange(path, 'agentfootprint',
      lock.packages['node_modules/agentfootprint']?.version, agentRange);
    for (const [name, range] of Object.entries(ranges)) {
      locked[name] = lockedInRange(path, name, oneHoistedEntry(lock, path, name).version, range);
    }
  }
  return { kind: 'declaration-and-lock-check', runtimeCompatibility: 'not-tested', locks: LOCKS.length,
    declared: { ...ranges, agentfootprint: agentRange }, locked };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  const root = resolve(process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), '../..'));
  try {
    console.log(JSON.stringify(checkPins(root)));
  } catch (error) {
    // One sentence, not a stack or an assertion diff: every failure above names the file and the value.
    console.error(`check-pins: ${error.message.split('\n')[0]}`);
    process.exitCode = 1;
  }
}
