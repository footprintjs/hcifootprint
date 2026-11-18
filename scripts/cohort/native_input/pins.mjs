import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import semver from 'semver';
import { declaredRange, linkedMetadata, oneHoistedEntry, readJson } from '../pin-assertions.mjs';
import { checkRegistryPins } from './registry-pins.mjs';

const DEMOS = ['demos/live-desk', 'demos/onboarding-wizard'];
const RUNTIME = ['footprintjs', 'foottrace'];
const originalJson = (originals, name) => JSON.parse(Buffer.from(originals[name].base64, 'base64').toString('utf8'));

/** Original authored facts and actual setup/lock facts stay separate throughout. */
export function checkNativePins(root, originals, archive, input) {
  const pkg = originalJson(originals, 'package.json');
  assert.deepEqual(readJson(root, 'package.json'), pkg, 'Native setup changed the authored root manifest');
  assert.deepEqual(pkg.workspaces, DEMOS, 'Maintained demos must use the root install/lock authority');
  assert.match(pkg.devDependencies?.vite ?? '', /^8\./, 'Root must explicitly declare its Vite8 transformer');
  assert.equal(input.status, 'NATIVE_SOURCE_READY', 'Provisional data is not native readiness');
  assert.equal(input.protocol, 'hcifootprint.native-input.v2', 'Current target-bound native input required');
  assert.equal(createHash('sha256').update(readFileSync(archive)).digest('hex'), input.archive.sha256,
    'Original admitted AF archive changed');
  const ranges = Object.fromEntries(RUNTIME.map(name => [name, declaredRange(pkg.dependencies, name, 'package.json')]));
  const agentRanges = [];
  const spec = `file:${realpathSync(archive)}`;
  for (const demo of DEMOS) {
    const authored = originalJson(originals, `${demo}/package.json`);
    agentRanges.push(declaredRange(authored.dependencies, 'agentfootprint', `${demo}/package.json`));
    assert.equal(authored.dependencies.hcifootprint, 'file:../..', 'Wrong authored workspace HCI link');
    const projected = structuredClone(authored);
    projected.dependencies.agentfootprint = spec;
    assert.deepEqual(readJson(root, `${demo}/package.json`), projected, 'Unexpected native demo projection');
    assert.equal(existsSync(resolve(root, demo, 'package-lock.json')), false, 'Nested demo lock splits install authority');
  }
  assert.ok(agentRanges.every(range => range === agentRanges[0]), 'Demos must declare one AF range');
  const docs = originalJson(originals, 'docs-next/package.json');
  assert.deepEqual(readJson(root, 'docs-next/package.json'), docs, 'Unexpected docs manifest projection');
  assert.equal(docs.dependencies.hcifootprint, 'file:..', 'Wrong authored docs HCI link');
  const lock = readJson(root, 'package-lock.json');
  linkedMetadata(lock, 'package-lock.json', '', pkg, ranges);
  linkedMetadata(readJson(root, 'docs-next/package-lock.json'), 'docs-next/package-lock.json', '..', pkg, ranges);
  assert.match(lock.packages['node_modules/vite']?.version ?? '', /^8\./, 'Root coverage transformer was replaced');
  for (const demo of DEMOS) {
    assert.equal(lock.packages[demo]?.dependencies?.agentfootprint, spec, 'Native workspace lock request is stale');
  }
  const targetRaw = readFileSync(resolve(root, 'scripts/cohort/registry-target.json'));
  const locked = checkRegistryPins(lock, ranges, input, JSON.parse(targetRaw),
    createHash('sha256').update(targetRaw).digest('hex'));
  const agent = oneHoistedEntry(lock, 'package-lock.json', 'agentfootprint');
  assert.equal(agent.version, input.archive.version, 'Locked AF differs from original admitted archive');
  assert.ok(semver.valid(agent.version) && semver.satisfies(agent.version, agentRanges[0]), 'Actual AF is outside authored range');
  assert.equal(agent.integrity, input.archive.integrity, 'Native lock AF SRI mismatch');
  assert.ok(typeof agent.resolved === 'string' && agent.resolved.startsWith('file:'), 'Native AF lock must name the actual local archive');
  assert.equal(realpathSync(resolve(root, agent.resolved.slice(5))), realpathSync(archive), 'Native lock names another archive');
  return { kind: 'native-declaration-and-lock-check', runtimeCompatibility: 'not-tested',
    locked: { ...locked, agentfootprint: agent.version }, authored: { ...ranges, agentfootprint: agentRanges[0] },
    sourceArchiveSha256: input.archive.sha256 };
}
