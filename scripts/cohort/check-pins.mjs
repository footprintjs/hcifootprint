import assert from 'node:assert/strict';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RUNTIME_RANGES = Object.freeze({ footprintjs: '^11.0.0', foottrace: '^1.11.1' });
const LOCKS = [
  ['package-lock.json', '', true],
  ['docs-next/package-lock.json', '..', false],
];
const DEMOS = ['demos/live-desk', 'demos/onboarding-wizard'];

function runtimeDependencies(dependencies, label) {
  for (const [name, range] of Object.entries(RUNTIME_RANGES)) {
    assert.equal(dependencies?.[name], range, `${label}: ${name} must declare ${range}`);
  }
}

function supportedVersion(name, version) {
  const parts = /^(\d+)\.(\d+)\.(\d+)$/.exec(version ?? '');
  if (!parts) return false;
  const [, major, minor, patch] = parts.map(Number);
  return name === 'footprintjs'
    ? major === 11
    : major === 1 && (minor > 11 || (minor === 11 && patch >= 1));
}

/** Metadata gate only. Installed identity and behavior have separate checks. */
export function checkPins(root) {
  const read = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
  const pkg = read('package.json');
  runtimeDependencies(pkg.dependencies, 'package.json');
  assert.deepEqual(pkg.workspaces, DEMOS, 'Maintained demos must use the root install/lock authority');
  for (const demo of DEMOS) {
    assert.equal(read(`${demo}/package.json`).dependencies.agentfootprint, '^14.0.0', `${demo}: AF14 is required`);
    assert.equal(existsSync(resolve(root, `${demo}/package-lock.json`)), false, `${demo}: nested lock splits the install authority`);
  }
  for (const [path, linkedRoot, ownsRuntime] of LOCKS) {
    const lock = read(path);
    const metadata = lock.packages?.[linkedRoot];
    runtimeDependencies(metadata?.dependencies, `${path}:${linkedRoot}`);
    assert.equal(metadata.version, pkg.version, `${path}: linked HCI version is stale`);
    if (!ownsRuntime) continue;
    for (const demo of DEMOS) {
      assert.equal(lock.packages[demo]?.dependencies?.agentfootprint, '^14.0.0', `${path}:${demo}: workspace AF14 metadata is stale`);
    }
    assert.match(lock.packages['node_modules/agentfootprint']?.version ?? '', /^14\.\d+\.\d+$/, `${path}: expected locked AF14`);
    for (const name of Object.keys(RUNTIME_RANGES)) {
      const entries = Object.entries(lock.packages).filter(([key, value]) =>
        key.endsWith(`/node_modules/${name}`) || key === `node_modules/${name}` || value.name === name);
      assert.equal(entries.length, 1, `${path}: expected one locked ${name}, found ${entries.length}`);
      assert.ok(supportedVersion(name, entries[0][1].version), `${path}: unsupported locked ${name}@${entries[0][1].version}`);
    }
  }
  return { kind: 'declaration-and-lock-check', runtimeCompatibility: 'not-tested', locks: LOCKS.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  const root = resolve(process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), '../..'));
  console.log(JSON.stringify(checkPins(root)));
}
