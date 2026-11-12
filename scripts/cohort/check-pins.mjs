import assert from 'node:assert/strict';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import semver from 'semver';

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

/** Read a JSON file, or fail with one sentence naming the file (no parser stack). */
function readJson(root, path) {
  let text;
  try {
    text = readFileSync(resolve(root, path), 'utf8');
  } catch (error) {
    throw new Error(`${path}: cannot be read (${error.code ?? error.message})`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${path}: is not valid JSON (${error.message})`);
  }
}

/** A real range: a string npm can read, and not one that accepts every version (`*`, `x`, empty). */
function declaredRange(dependencies, name, label) {
  const range = dependencies?.[name];
  const valid = typeof range === 'string' ? semver.validRange(range) : null;
  assert.ok(valid !== null && valid !== '*',
    `${label}: ${name} must declare a semver range, found ${JSON.stringify(range)}`);
  return range;
}

/** One locked version: a plain release (no prerelease) inside the declared range. */
function lockedInRange(path, name, version, range) {
  assert.ok(typeof version === 'string' && semver.valid(version) !== null && semver.prerelease(version) === null,
    `${path}: locked ${name}@${version} is not a plain release version`);
  assert.ok(semver.satisfies(version, range),
    `${path}: locked ${name}@${version} is outside the declared range ${range}`);
  return version;
}

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
    assert.ok(lock && typeof lock.packages === 'object' && lock.packages !== null,
      `${path}: has no "packages" object (expected an npm lockfileVersion 2 or 3 lock)`);
    const metadata = lock.packages[linkedRoot];
    for (const [name, range] of Object.entries(ranges)) {
      assert.equal(metadata?.dependencies?.[name], range, `${path}:${linkedRoot}: ${name} must declare ${range}`);
    }
    assert.equal(metadata.version, pkg.version, `${path}: linked HCI version is stale`);
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
      const entries = Object.entries(lock.packages).filter(([key, value]) =>
        key.endsWith(`/node_modules/${name}`) || key === `node_modules/${name}` || value?.name === name);
      assert.equal(entries.length, 1, `${path}: expected one locked ${name}, found ${entries.length}`);
      // identity.mjs and prepare-consumer.mjs read the version at this key, so the one entry must be it.
      assert.equal(entries[0][0], `node_modules/${name}`, `${path}: the one locked ${name} must be hoisted at node_modules/${name}`);
      locked[name] = lockedInRange(path, name, entries[0][1].version, range);
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
    // One sentence, not a stack: every failure above already names the file and the value.
    console.error(`check-pins: ${error.message}`);
    process.exitCode = 1;
  }
}
