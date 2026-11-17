import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { checkPins } from '../check-pins.mjs';
import { checkNativePins } from './pins.mjs';

// Metadata/real-path fixtures, never an installed or producer compatibility claim.
function fixture(t) {
  const audit = realpathSync(mkdtempSync(join(tmpdir(), 'hci-native-pins-')));
  t.after(() => rmSync(audit, { recursive: true, force: true }));
  const root = join(audit, 'source'); mkdirSync(root);
  const demos = ['demos/live-desk', 'demos/onboarding-wizard'];
  const pkg = { name: 'hcifootprint', version: '4.1.0', dependencies: { footprintjs: '^13.0.0', foottrace: '^2.0.0' },
    devDependencies: { vite: '8.3.5' }, workspaces: demos };
  const demo = { dependencies: { hcifootprint: 'file:../..', agentfootprint: '^15.0.0-rc.0' } };
  const docs = { dependencies: { hcifootprint: 'file:..' } };
  const archive = join(audit, 'original.tgz'); writeFileSync(archive, 'original-data-only');
  const input = { status: 'NATIVE_SOURCE_READY', coreVersions: { footprintjs: '13.0.0', foottrace: '2.0.0' },
    archive: { version: '15.0.0-rc.0', integrity: 'sha512-fixture',
    sha256: createHash('sha256').update(readFileSync(archive)).digest('hex') } };
  const spec = `file:${archive}`;
  const projected = structuredClone(demo); projected.dependencies.agentfootprint = spec;
  const lock = { packages: { '': structuredClone(pkg), ...Object.fromEntries(demos.map(d => [d, structuredClone(projected)])),
    'node_modules/footprintjs': { version: '13.0.0' }, 'node_modules/foottrace': { version: '2.0.0' },
    'node_modules/agentfootprint': { version: input.archive.version, resolved: spec, integrity: input.archive.integrity },
    'node_modules/vite': { version: '8.3.5' } } };
  input.coreArtifacts = {};
  for (const name of ['footprintjs', 'foottrace']) {
    const facts = { resolved: `https://registry.npmjs.org/${name}/-/${name}-${input.coreVersions[name]}.tgz`, integrity: `sha512-${name}-fixture` };
    Object.assign(lock.packages[`node_modules/${name}`], facts); input.coreArtifacts[name] = facts;
  }
  const docsLock = { packages: { '..': structuredClone(pkg) } };
  const originals = {};
  const write = (name, value) => { mkdirSync(dirname(join(root, name)), { recursive: true });
    writeFileSync(join(root, name), JSON.stringify(value)); };
  for (const [name, value] of [['package.json', pkg], ['docs-next/package.json', docs],
    ...demos.map(d => [`${d}/package.json`, demo])]) {
    originals[name] = { base64: Buffer.from(JSON.stringify(value)).toString('base64'), mode: 0o644 };
    write(name, value);
  }
  for (const d of demos) write(`${d}/package.json`, projected);
  write('package-lock.json', lock); write('docs-next/package-lock.json', docsLock);
  const check = () => checkNativePins(root, originals, archive, input);
  return { root, originals, pkg, demo, docs, demos, lock, docsLock, archive, input, write, check };
}

test('actual AF source archive metadata has a separate data-only verdict', t => {
  const f = fixture(t); const result = f.check();
  assert.equal(result.runtimeCompatibility, 'not-tested');
  assert.equal(result.locked.agentfootprint, f.input.archive.version);
});

test('ordinary policy still refuses the actual prerelease after coherent authored metadata is restored', t => {
  const f = fixture(t);
  for (const demo of f.demos) { f.write(`${demo}/package.json`, f.demo); f.lock.packages[demo] = f.demo; }
  f.write('package-lock.json', f.lock);
  assert.throws(() => checkPins(f.root), /not a plain release version/);
});

test('provisional data and a changed original archive refuse', t => {
  const f = fixture(t); f.input.status = 'DATA_ONLY'; assert.throws(f.check, /not native readiness/);
  f.input.status = 'NATIVE_SOURCE_READY'; writeFileSync(f.archive, 'changed'); assert.throws(f.check, /archive changed/);
});

test('unrelated authored edits or an extra projected slot refuse', t => {
  const f = fixture(t); f.pkg.unexpected = true; f.write('package.json', f.pkg);
  assert.throws(f.check, /authored root manifest/);
  delete f.pkg.unexpected; f.write('package.json', f.pkg);
  const projected = { dependencies: { ...f.demo.dependencies, agentfootprint: `file:${f.archive}`, extra: 'file:/elsewhere' } };
  f.write(`${f.demos[0]}/package.json`, projected); assert.throws(f.check, /Unexpected native demo projection/);
});

test('stale docs metadata and a nested demo lock refuse', t => {
  const f = fixture(t); f.docsLock.packages['..'].dependencies.foottrace = '^1.0.0';
  f.write('docs-next/package-lock.json', f.docsLock); assert.throws(f.check, /foottrace must declare/);
  f.docsLock.packages['..'] = f.pkg; f.write('docs-next/package-lock.json', f.docsLock);
  f.write(`${f.demos[0]}/package-lock.json`, {}); assert.throws(f.check, /Nested demo lock/);
});

test('wrong AF version, integrity or original archive locator refuses', t => {
  for (const [key, value] of [['version', '14.0.0'], ['integrity', 'sha512-wrong'], ['resolved', 'https://registry.invalid/x.tgz']]) {
    const f = fixture(t); f.lock.packages['node_modules/agentfootprint'][key] = value;
    f.write('package-lock.json', f.lock); assert.throws(f.check);
  }
});

test('extra locked AF or core copy refuses even at the same version', t => {
  for (const name of ['agentfootprint', 'footprintjs', 'foottrace']) {
    const f = fixture(t); f.lock.packages[`node_modules/unrelated/node_modules/${name}`] = f.lock.packages[`node_modules/${name}`];
    f.write('package-lock.json', f.lock); assert.throws(f.check, /expected one locked/);
  }
});

test('AF source mode does not permit core prereleases or replace the coverage transformer', t => {
  for (const [name, version] of [['footprintjs', '13.0.0-rc.0'], ['foottrace', '2.0.0-rc.0'], ['vite', '6.4.5']]) {
    const f = fixture(t); f.lock.packages[`node_modules/${name}`].version = version;
    f.write('package-lock.json', f.lock); assert.throws(f.check);
  }
});
