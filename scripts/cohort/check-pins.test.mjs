import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { checkPins, RUNTIME_RANGES } from './check-pins.mjs';

// These JSON fixtures test declaration validation, not installed compatibility.
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'hci-cohort-pins-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const demos = ['demos/live-desk', 'demos/onboarding-wizard'];
  const pkg = { name: 'hcifootprint', version: '3.3.1', dependencies: { ...RUNTIME_RANGES },
    devDependencies: { vite: '8.3.5' }, workspaces: demos };
  const demo = { dependencies: { agentfootprint: '^14.0.0' } };
  const lock = { packages: { '': structuredClone(pkg),
    ...Object.fromEntries(demos.map((path) => [path, structuredClone(demo)])),
    'node_modules/footprintjs': { version: '11.0.0' },
    'node_modules/foottrace': { version: '1.11.1' },
    'node_modules/agentfootprint': { version: '14.0.0' },
    'node_modules/vite': { version: '8.3.5' },
  } };
  const docs = { packages: { '..': structuredClone(pkg) } };
  const write = (path, value) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), JSON.stringify(value));
  };
  write('package.json', pkg);
  write('package-lock.json', lock);
  write('docs-next/package-lock.json', docs);
  for (const path of demos) write(`${path}/package.json`, demo);
  return { root, pkg, lock, docs, write };
}

test('reports metadata scope explicitly for a coherent workspace declaration', (t) => {
  const { root } = fixture(t);
  assert.deepEqual(checkPins(root), { kind: 'declaration-and-lock-check', runtimeCompatibility: 'not-tested', locks: 2 });
});

test('detects restoration of the FP10 range', (t) => {
  const { root, pkg, write } = fixture(t);
  pkg.dependencies.footprintjs = '^10.0.0';
  write('package.json', pkg);
  assert.throws(() => checkPins(root), /footprintjs must declare/);
});

test('detects stale linked docs metadata', (t) => {
  const { root, docs, write } = fixture(t);
  docs.packages['..'].dependencies.foottrace = '^1.0.0';
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
  lock.packages['node_modules/unrelated/node_modules/footprintjs'] = { version: '11.0.0' };
  write('package-lock.json', lock);
  assert.throws(() => checkPins(root), /one locked footprintjs, found 2/);
});

test('detects an old workspace agent in the normal root lock', (t) => {
  const { root, lock, write } = fixture(t);
  lock.packages['demos/onboarding-wizard'].dependencies.agentfootprint = '^10.1.0';
  write('package-lock.json', lock);
  assert.throws(() => checkPins(root), /workspace AF14 metadata is stale/);
});

test('refuses an undeclared root transformer that demo hoisting can replace', (t) => {
  const { root, pkg, write } = fixture(t);
  delete pkg.devDependencies.vite;
  write('package.json', pkg);
  assert.throws(() => checkPins(root), /explicitly declare its Vite8 transformer/);
});

test('detects the demo Vite6 transformer replacing root coverage tooling', (t) => {
  const { root, lock, write } = fixture(t);
  lock.packages['node_modules/vite'].version = '6.4.5';
  write('package-lock.json', lock);
  assert.throws(() => checkPins(root), /root coverage transformer was replaced/);
});
