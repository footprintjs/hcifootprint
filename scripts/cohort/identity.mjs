import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const COHORT = Object.freeze({ footprintjs: '11.0.0', foottrace: '1.11.1' });
const readPackage = (root) => JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function packageRoot(from, name) {
  const require = createRequire(join(from, 'package.json'));
  let root = dirname(require.resolve(name));
  while (dirname(root) !== root) {
    if (existsSync(join(root, 'package.json')) && readPackage(root).name === name) return realpathSync(root);
    root = dirname(root);
  }
  throw new Error(`No package root for ${name} from ${from}`);
}

function verifyResolutions(consumer, contexts) {
  const copies = installedCopies(consumer);
  const resolutions = {};
  for (const [name, version] of Object.entries(COHORT)) {
    resolutions[name] = Object.fromEntries(Object.entries(contexts).map(([label, root]) => [label, packageRoot(root, name)]));
    const physical = resolutions[name].consumer;
    assert.equal(readPackage(physical).version, version, `Expected actual ${name}@${version}`);
    for (const [label, path] of Object.entries(resolutions[name])) {
      assert.equal(path, physical, `${label} resolves a second physical ${name}`);
    }
    assert.deepEqual(copies[name], [physical], `Installed tree contains extra physical ${name} copies`);
  }
  return { versions: COHORT, resolutions, copies };
}

/** Walk every installed npm package, including nested, aliased and linked packages. */
export function installedCopies(consumer) {
  const copies = Object.fromEntries(Object.keys(COHORT).map((name) => [name, new Set()]));
  const visited = new Set();
  function visitPackage(path) {
    const physical = realpathSync(path);
    if (visited.has(physical)) return;
    visited.add(physical);
    if (existsSync(join(physical, 'package.json'))) {
      const pkg = readPackage(physical);
      copies[pkg.name]?.add(physical);
    }
    visitModules(join(physical, 'node_modules'));
  }
  function visitModules(path) {
    if (!existsSync(path)) return;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const child = join(path, entry.name);
      if (entry.name.startsWith('@')) {
        for (const scoped of readdirSync(child)) visitPackage(join(child, scoped));
      } else if (entry.isDirectory() || entry.isSymbolicLink()) visitPackage(child);
    }
  }
  visitModules(join(consumer, 'node_modules'));
  return Object.fromEntries(Object.entries(copies).map(([name, paths]) => [name, [...paths].sort()]));
}

/** This checks actual installed resolution, not a lockfile's hoisted display. */
export function verifyIdentity(consumer) {
  consumer = realpathSync(consumer);
  const hci = packageRoot(consumer, 'hcifootprint');
  assert.ok(relative(join(consumer, 'node_modules'), hci).split(/[\\/]/)[0] !== '..',
    'Expected an installed packed HCI, not a linked source checkout');
  const fp = packageRoot(consumer, 'footprintjs');
  return { kind: 'actual-installed-cohort-identity', hci: { version: readPackage(hci).version, path: hci },
    ...verifyResolutions(consumer, { consumer, hcifootprint: hci, footprintjs: fp }) };
}

/** The maintained demos share the root install; source links are intentional here. */
export function verifyWorkspaceIdentity(root) {
  root = realpathSync(root);
  const hci = packageRoot(root, 'hcifootprint');
  assert.equal(hci, root, 'Workspace HCI must resolve to the current root source');
  const contexts = { consumer: root, hcifootprint: hci, footprintjs: packageRoot(root, 'footprintjs') };
  const workspaces = {};
  for (const relativePath of ['demos/live-desk', 'demos/onboarding-wizard']) {
    const demo = realpathSync(join(root, relativePath));
    const name = readPackage(demo).name;
    assert.equal(packageRoot(demo, 'hcifootprint'), hci, `${name} resolves another HCI copy`);
    const af = packageRoot(demo, 'agentfootprint');
    assert.match(readPackage(af).version, /^14\.\d+\.\d+$/, `${name} must use actual AF14`);
    contexts[name] = demo;
    contexts[`${name}:agentfootprint`] = af;
    workspaces[name] = { path: demo, hci, agentfootprint: af };
  }
  return { kind: 'actual-workspace-cohort-identity', workspaces, ...verifyResolutions(root, contexts) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  const workspace = process.argv[2] === '--workspaces';
  const root = resolve(process.argv[workspace ? 3 : 2] ?? '.');
  console.log(JSON.stringify(workspace ? verifyWorkspaceIdentity(root) : verifyIdentity(root), null, 2));
}
