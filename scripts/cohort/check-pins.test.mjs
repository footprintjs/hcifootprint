import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { checkPins } from './check-pins.mjs';

// Fixture numbers, each stated once. The checker holds none: it reads the fixture's package.json and
// lock, so these are only the "repository" the tests build.
const FP_RANGE = '^11.0.0 || ^12.0.0';
const FT_RANGE = '^1.11.1';
const AF_RANGE = '^14.0.0';
const FP = '11.2.0';
const FP_OTHER_IN_RANGE = '11.1.0';
const FP_NEXT_MAJOR = '12.0.0';
const FP_BELOW = '10.7.1';
const FP_ABOVE = '13.0.0';
const FP_PRERELEASE = '12.0.0-rc.0';
const FP_ONE_MAJOR = '^11.0.0';
const FP_OLD_RANGE = '^10.0.0';
const FT = '1.11.1';
const FT_OLD_RANGE = '^1.0.0';
const AF = '14.4.0';
const AF_OLD_RANGE = '^10.1.0';
const AF_OTHER_RANGE = '^15.0.0';
const HCI = '3.3.1';
const VITE = '8.3.5';
const VITE_DEMO = '6.4.5';

// These JSON fixtures test declaration validation, not installed compatibility.
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'hci-cohort-pins-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const demos = ['demos/live-desk', 'demos/onboarding-wizard'];
  const pkg = { name: 'hcifootprint', version: HCI, dependencies: { footprintjs: FP_RANGE, foottrace: FT_RANGE },
    devDependencies: { vite: VITE }, workspaces: demos };
  const demo = { dependencies: { agentfootprint: AF_RANGE } };
  const lock = { packages: { '': structuredClone(pkg),
    ...Object.fromEntries(demos.map((path) => [path, structuredClone(demo)])),
    'node_modules/footprintjs': { version: FP },
    'node_modules/foottrace': { version: FT },
    'node_modules/agentfootprint': { version: AF },
    'node_modules/vite': { version: VITE },
  } };
  const docs = { packages: { '..': structuredClone(pkg) } };
  const write = (path, value) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), typeof value === 'string' ? value : JSON.stringify(value));
  };
  write('package.json', pkg);
  write('package-lock.json', lock);
  write('docs-next/package-lock.json', docs);
  for (const path of demos) write(`${path}/package.json`, demo);
  /** Change a declaration everywhere npm would: package.json and both locks' linked HCI entries. */
  const declare = (name, range) => {
    pkg.dependencies[name] = range;
    lock.packages[''].dependencies[name] = range;
    docs.packages['..'].dependencies[name] = range;
    write('package.json', pkg);
    write('package-lock.json', lock);
    write('docs-next/package-lock.json', docs);
  };
  const lockAt = (name, version) => {
    lock.packages[`node_modules/${name}`].version = version;
    write('package-lock.json', lock);
  };
  return { root, pkg, lock, docs, demo, demos, write, declare, lockAt };
}

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('reports metadata scope explicitly for a coherent workspace declaration', (t) => {
  const { root } = fixture(t);
  assert.deepEqual(checkPins(root), { kind: 'declaration-and-lock-check', runtimeCompatibility: 'not-tested', locks: 2,
    declared: { footprintjs: FP_RANGE, foottrace: FT_RANGE, agentfootprint: AF_RANGE },
    locked: { footprintjs: FP, foottrace: FT, agentfootprint: AF } });
});

test('a lock on another version inside the declared range passes with no script change', (t) => {
  const { root, lockAt } = fixture(t);
  lockAt('footprintjs', FP_OTHER_IN_RANGE);
  assert.equal(checkPins(root).locked.footprintjs, FP_OTHER_IN_RANGE);
});

test('detects restoration of the FP10 range when the locks were not regenerated', (t) => {
  const { root, pkg, write } = fixture(t);
  pkg.dependencies.footprintjs = FP_OLD_RANGE;
  write('package.json', pkg);
  assert.throws(() => checkPins(root), /footprintjs must declare/);
});

test('a declared range the lock does not satisfy fails and names both', (t) => {
  const { root, declare } = fixture(t);
  declare('footprintjs', FP_OLD_RANGE);
  assert.throws(() => checkPins(root),
    new RegExp(`locked footprintjs@${escape(FP)} is outside the declared range ${escape(FP_OLD_RANGE)}`));
});

test('accepts a lock on either engine major the range names', (t) => {
  for (const version of [FP, FP_NEXT_MAJOR]) {
    const { root, lockAt } = fixture(t);
    lockAt('footprintjs', version);
    assert.equal(checkPins(root).locks, 2, `footprintjs@${version}`);
  }
});

test('refuses a lock on an engine major the range does not name, naming the range and the version', (t) => {
  for (const version of [FP_BELOW, FP_ABOVE]) {
    const { root, lockAt } = fixture(t);
    lockAt('footprintjs', version);
    assert.throws(() => checkPins(root),
      new RegExp(`locked footprintjs@${escape(version)} is outside the declared range ${escape(FP_RANGE)}`), `footprintjs@${version}`);
  }
});

test('refuses a prerelease in the lock even where a range could admit one', (t) => {
  const { root, lockAt } = fixture(t);
  lockAt('footprintjs', FP_PRERELEASE);
  assert.throws(() => checkPins(root), new RegExp(`locked footprintjs@${escape(FP_PRERELEASE)} is not a plain release`));
});

test('refuses a package.json range that no longer matches the regenerated lock', (t) => {
  const { root, pkg, write } = fixture(t);
  pkg.dependencies.footprintjs = FP_ONE_MAJOR;
  write('package.json', pkg);
  assert.throws(() => checkPins(root), new RegExp(`footprintjs must declare ${escape(FP_ONE_MAJOR)}`));
});

test('refuses a missing, wildcard, empty or non-registry declaration', (t) => {
  for (const range of [undefined, '*', '', 'x', 'file:../footprintjs', 'latest', 12]) {
    const { root, pkg, write } = fixture(t);
    if (range === undefined) delete pkg.dependencies.footprintjs;
    else pkg.dependencies.footprintjs = range;
    write('package.json', pkg);
    assert.throws(() => checkPins(root), /package\.json: footprintjs must declare a semver range/, `range ${JSON.stringify(range)}`);
  }
});

test('detects stale linked docs metadata', (t) => {
  const { root, docs, write } = fixture(t);
  docs.packages['..'].dependencies.foottrace = FT_OLD_RANGE;
  write('docs-next/package-lock.json', docs);
  assert.throws(() => checkPins(root), /foottrace must declare/);
});

test('refuses a second demo lock authority', (t) => {
  const { root, write } = fixture(t);
  write('demos/live-desk/package-lock.json', {});
  assert.throws(() => checkPins(root), /nested lock splits/);
});

test('detects same-version nested runtime lock entries', (t) => {
  const { root, lock, write } = fixture(t);
  lock.packages['node_modules/unrelated/node_modules/footprintjs'] = { version: FP };
  write('package-lock.json', lock);
  assert.throws(() => checkPins(root), /one locked footprintjs, found 2/);
});

test('refuses a single runtime lock entry that is not hoisted where the identity check reads it', (t) => {
  const { root, lock, write } = fixture(t);
  lock.packages['node_modules/unrelated/node_modules/foottrace'] = lock.packages['node_modules/foottrace'];
  delete lock.packages['node_modules/foottrace'];
  write('package-lock.json', lock);
  assert.throws(() => checkPins(root), /must be hoisted at node_modules\/foottrace/);
});

test('detects an old workspace agent in the normal root lock', (t) => {
  const { root, lock, write } = fixture(t);
  lock.packages['demos/onboarding-wizard'].dependencies.agentfootprint = AF_OLD_RANGE;
  write('package-lock.json', lock);
  assert.throws(() => checkPins(root), /workspace agentfootprint metadata is stale/);
});

test('refuses two demos that declare different agentfootprint ranges', (t) => {
  const { root, demos, write } = fixture(t);
  write(`${demos[1]}/package.json`, { dependencies: { agentfootprint: AF_OTHER_RANGE } });
  assert.throws(() => checkPins(root), new RegExp(`one agentfootprint range.*${escape(AF_RANGE)}.*${escape(AF_OTHER_RANGE)}`));
});

test('refuses a locked agentfootprint outside the demos’ declared range', (t) => {
  const { root, demos, lock, write } = fixture(t);
  for (const demo of demos) {
    write(`${demo}/package.json`, { dependencies: { agentfootprint: AF_OTHER_RANGE } });
    lock.packages[demo].dependencies.agentfootprint = AF_OTHER_RANGE;
  }
  write('package-lock.json', lock);
  assert.throws(() => checkPins(root),
    new RegExp(`locked agentfootprint@${escape(AF)} is outside the declared range ${escape(AF_OTHER_RANGE)}`));
});

test('refuses an undeclared root transformer that demo hoisting can replace', (t) => {
  const { root, pkg, write } = fixture(t);
  delete pkg.devDependencies.vite;
  write('package.json', pkg);
  assert.throws(() => checkPins(root), /explicitly declare its Vite8 transformer/);
});

test('detects the demo Vite6 transformer replacing root coverage tooling', (t) => {
  const { root, lockAt } = fixture(t);
  lockAt('vite', VITE_DEMO);
  assert.throws(() => checkPins(root), /root coverage transformer was replaced/);
});

test('a malformed lock or manifest fails with one sentence naming the file', (t) => {
  for (const [path, value, message] of [
    ['package-lock.json', '{ not json', /^package-lock\.json: is not valid JSON/],
    ['package.json', '', /^package\.json: is not valid JSON/],
    ['demos/live-desk/package.json', '[', /^demos\/live-desk\/package\.json: is not valid JSON/],
    ['package-lock.json', { lockfileVersion: 3 }, /^package-lock\.json: has no "packages" object/],
  ]) {
    const { root, write } = fixture(t);
    write(path, value);
    assert.throws(() => checkPins(root), (error) => message.test(error.message), path);
  }
});

test('the command prints that sentence without a stack and exits non-zero', (t) => {
  const { root, write } = fixture(t);
  write('package-lock.json', '{ not json');
  const script = join(dirname(fileURLToPath(import.meta.url)), 'check-pins.mjs');
  const run = spawnSync(process.execPath, [script, root], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /^check-pins: package-lock\.json: is not valid JSON/);
  assert.doesNotMatch(run.stderr, /\n\s+at /, 'no stack trace');
});
