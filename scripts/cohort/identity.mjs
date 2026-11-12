import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// WHY NOTHING HERE NAMES A VERSION. The expected versions are READ, never typed in: the root lock is
// the one place an installed version is chosen. When this file held them by hand, a lock move on
// 12 Nov 2026 failed CI ("Expected actual footprintjs@..." an older version than the lock held) until
// someone found the literal. Now:
//   - workspace mode (`--workspaces ROOT`) reads `packages['node_modules/<name>'].version` from ROOT's
//     package-lock.json, for the cohort and for the demos' agentfootprint;
//   - consumer mode reads the consumer's own package.json `dependencies`, which prepare-consumer.mjs
//     writes as the exact versions of that same root lock.
// This file is copied into a fresh consumer and run there, so it imports only `node:` builtins; it
// therefore checks "exact version" with the pattern below rather than with the `semver` package.

/** The packages that must exist as ONE physical copy, at the expected version. */
export const COHORT_PACKAGES = Object.freeze(['footprintjs', 'foottrace']);
// An exact semver version (prerelease and build allowed: this check is equality; check-pins.mjs
// refuses a prerelease in the lock). A range such as `^x.y.z` is not exact.
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/** Read a JSON file, or fail with one sentence naming the file (no parser stack). */
function readJson(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    throw new Error(`${path}: cannot be read (${error.code ?? error.message})`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${path}: is not valid JSON (${error.message})`);
  }
}

function exactVersion(version, where) {
  if (typeof version !== 'string' || !EXACT_VERSION.test(version)) {
    throw new Error(`${where}: expected an exact version, found ${JSON.stringify(version)}`);
  }
  return version;
}

/** The versions ROOT's lock installs, read from its hoisted `node_modules/<name>` entries. */
export function lockedVersions(root, names = COHORT_PACKAGES) {
  const path = join(root, 'package-lock.json');
  const lock = readJson(path);
  if (!lock || typeof lock.packages !== 'object' || lock.packages === null) {
    throw new Error(`${path}: has no "packages" object (expected an npm lockfileVersion 2 or 3 lock)`);
  }
  return Object.fromEntries(names.map((name) => [name,
    exactVersion(lock.packages[`node_modules/${name}`]?.version, `${path} packages["node_modules/${name}"].version`)]));
}

/** The versions a prepared consumer pins in its own package.json (written there from the root lock). */
export function consumerVersions(consumer) {
  const path = join(consumer, 'package.json');
  const pkg = readJson(path);
  return Object.fromEntries(COHORT_PACKAGES.map((name) =>
    [name, exactVersion(pkg?.dependencies?.[name], `${path} dependencies.${name}`)]));
}

const readPackage = (root) => JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const directories = (path) => readdirSync(path, { withFileTypes: true }).filter((entry) =>
  entry.isDirectory() || entry.isSymbolicLink() && statSync(join(path, entry.name), { throwIfNoEntry: false })?.isDirectory());

function packageRoot(from, name) {
  const require = createRequire(join(from, 'package.json'));
  let root = dirname(require.resolve(name));
  while (dirname(root) !== root) {
    if (existsSync(join(root, 'package.json')) && readPackage(root).name === name) return realpathSync(root);
    root = dirname(root);
  }
  throw new Error(`No package root for ${name} from ${from}`);
}

function verifyResolutions(consumer, contexts, expected) {
  const copies = installedCopies(consumer);
  const resolutions = {};
  for (const name of COHORT_PACKAGES) {
    const version = expected[name];
    resolutions[name] = Object.fromEntries(Object.entries(contexts).map(([label, root]) => [label, packageRoot(root, name)]));
    const physical = resolutions[name].consumer;
    const actual = readPackage(physical).version;
    assert.equal(actual, version, `Expected actual ${name}@${version}, found ${actual}`);
    for (const [label, path] of Object.entries(resolutions[name])) {
      assert.equal(path, physical, `${label} resolves a second physical ${name}`);
    }
    assert.deepEqual(copies[name], [physical], `Installed tree contains extra physical ${name} copies`);
  }
  return { versions: expected, resolutions, copies };
}

/** Walk every installed npm package, including nested, aliased and linked packages. */
export function installedCopies(consumer) {
  const copies = Object.fromEntries(COHORT_PACKAGES.map((name) => [name, new Set()]));
  const visited = new Set();
  const walked = new Set();
  function visitPackage(path) {
    const physical = realpathSync(path);
    if (visited.has(physical)) return;
    visited.add(physical);
    if (existsSync(join(physical, 'package.json'))) {
      const pkg = readPackage(physical);
      copies[pkg.name]?.add(physical);
    }
    visitDirectory(physical);
  }
  function visitDirectory(path) {
    const physical = realpathSync(path);
    if (walked.has(physical)) return;
    walked.add(physical);
    visitModules(join(physical, 'node_modules'));
    for (const entry of directories(physical)) visitDirectory(join(physical, entry.name));
  }
  function visitModules(path) {
    if (!statSync(path, { throwIfNoEntry: false })?.isDirectory()) return;
    for (const entry of directories(path)) {
      const child = join(path, entry.name);
      if (entry.name.startsWith('@')) {
        visitDirectory(child);
        for (const scoped of directories(child)) visitPackage(join(child, scoped.name));
      } else visitPackage(child);
    }
  }
  visitModules(join(consumer, 'node_modules'));
  return Object.fromEntries(Object.entries(copies).map(([name, paths]) => [name, [...paths].sort()]));
}

/** This checks actual installed resolution, not a lockfile's hoisted display. */
export function verifyIdentity(consumer) {
  consumer = realpathSync(consumer);
  const expected = consumerVersions(consumer);
  const hci = packageRoot(consumer, 'hcifootprint');
  assert.ok(relative(join(consumer, 'node_modules'), hci).split(/[\\/]/)[0] !== '..',
    'Expected an installed packed HCI, not a linked source checkout');
  const fp = packageRoot(consumer, 'footprintjs');
  return { kind: 'actual-installed-cohort-identity', hci: { version: readPackage(hci).version, path: hci },
    ...verifyResolutions(consumer, { consumer, hcifootprint: hci, footprintjs: fp }, expected) };
}

/** The maintained demos share the root install; source links are intentional here. */
export function verifyWorkspaceIdentity(root) {
  root = realpathSync(root);
  const { agentfootprint: agentVersion, ...expected } = lockedVersions(root, [...COHORT_PACKAGES, 'agentfootprint']);
  const hci = packageRoot(root, 'hcifootprint');
  assert.equal(hci, root, 'Workspace HCI must resolve to the current root source');
  const contexts = { consumer: root, hcifootprint: hci, footprintjs: packageRoot(root, 'footprintjs') };
  const workspaces = {};
  for (const relativePath of ['demos/live-desk', 'demos/onboarding-wizard']) {
    const demo = realpathSync(join(root, relativePath));
    const name = readPackage(demo).name;
    assert.equal(packageRoot(demo, 'hcifootprint'), hci, `${name} resolves another HCI copy`);
    const af = packageRoot(demo, 'agentfootprint');
    const afVersion = readPackage(af).version;
    assert.equal(afVersion, agentVersion, `${name} must use the locked agentfootprint@${agentVersion}, found ${afVersion}`);
    contexts[name] = demo;
    contexts[`${name}:agentfootprint`] = af;
    workspaces[name] = { path: demo, hci, agentfootprint: af };
  }
  return { kind: 'actual-workspace-cohort-identity', workspaces, ...verifyResolutions(root, contexts, expected) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  const workspace = process.argv[2] === '--workspaces';
  const root = resolve(process.argv[workspace ? 3 : 2] ?? '.');
  try {
    console.log(JSON.stringify(workspace ? verifyWorkspaceIdentity(root) : verifyIdentity(root), null, 2));
  } catch (error) {
    // One sentence, not a stack: every failure above names the file or package it looked at.
    console.error(`identity: ${error.message}`);
    process.exitCode = 1;
  }
}
