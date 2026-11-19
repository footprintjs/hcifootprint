import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import * as identity from './identity.mjs';

// Metadata/path fixtures only; no normal install or runtime compatibility is claimed.
const FP = '13.2.0';
const FP_MOVED = '13.1.0';
const FT = '2.1.0';
const AF = '15.0.0-rc.0';
const AF_OTHER = '15.0.0-rc.1';
const HCI = '4.1.0';
const UNVERSIONED = '0.0.0';

function packageAt(path, name, version = UNVERSIONED, extra = {}) {
  mkdirSync(path, { recursive: true });
  writeFileSync(join(path, 'package.json'), JSON.stringify({ name, version, type: 'module', exports: './index.mjs', ...extra }));
  writeFileSync(join(path, 'index.mjs'), 'export {};\n');
  return path;
}

function writeLock(root, versions) {
  writeFileSync(join(root, 'package-lock.json'), JSON.stringify({ lockfileVersion: 3, packages: Object.fromEntries(
    Object.entries(versions).map(([name, version]) => [`node_modules/${name}`, { version }])) }));
}

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hci-docs-identity-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  packageAt(root, 'hcifootprint', HCI);
  writeLock(root, { footprintjs: FP, foottrace: FT, agentfootprint: AF });
  const modules = join(root, 'node_modules');
  const fp = packageAt(join(modules, 'footprintjs'), 'footprintjs', FP);
  const ft = packageAt(join(modules, 'foottrace'), 'foottrace', FT);
  const af = packageAt(join(modules, 'agentfootprint'), 'agentfootprint', AF);
  symlinkSync(root, join(modules, 'hcifootprint'), 'dir');
  const desk = packageAt(join(root, 'demos/live-desk'), 'live-desk');
  const wizard = packageAt(join(root, 'demos/onboarding-wizard'), 'onboarding-wizard-demo');
  symlinkSync(desk, join(modules, 'live-desk'), 'dir');
  symlinkSync(wizard, join(modules, 'onboarding-wizard-demo'), 'dir');
  const docs = packageAt(join(root, 'docs-next'), 'hcifootprint-docs', UNVERSIONED,
    { dependencies: { hcifootprint: 'file:..' } });
  const docsModules = join(docs, 'node_modules');
  mkdirSync(docsModules);
  const docsHci = join(docsModules, 'hcifootprint');
  symlinkSync(root, docsHci, 'dir');
  return { root, modules, fp, ft, af, desk, wizard, docs, docsModules, docsHci };
}

test('joins docs, linked parent, HCI and engine to the root-lock cohort and rechecks both demos', (t) => {
  const { root, docs, fp, ft } = fixture(t);
  // The docs lock is not the authority for this expected root cohort.
  writeLock(docs, { footprintjs: FP_MOVED, foottrace: UNVERSIONED });
  const proof = identity.verifyDocsIdentity(root);
  assert.equal(proof.kind, 'actual-docs-cohort-identity');
  assert.equal(proof.root, root);
  assert.equal(proof.docs, docs);
  assert.equal(proof.hci, root);
  assert.deepEqual(proof.versions, { footprintjs: FP, foottrace: FT });
  assert.deepEqual(proof.copies, { footprintjs: [fp], foottrace: [ft] });
  for (const name of ['footprintjs', 'foottrace']) {
    assert.deepEqual(Object.keys(proof.resolutions[name]).sort(), ['consumer', 'footprintjs', 'hcifootprint', 'root']);
    assert.ok(Object.values(proof.resolutions[name]).every(path => path === (name === 'footprintjs' ? fp : ft)));
  }
  assert.equal(proof.workspace.kind, 'actual-workspace-cohort-identity');
  assert.equal(proof.workspace.resolutions.footprintjs['live-desk:agentfootprint'], fp);
  assert.equal(proof.workspace.resolutions.foottrace['onboarding-wizard-demo:agentfootprint'], ft);
});

test('a different exact root lock and installed version pass without a checker change', (t) => {
  const { root, fp } = fixture(t);
  writeLock(root, { footprintjs: FP_MOVED, foottrace: FT, agentfootprint: AF });
  packageAt(fp, 'footprintjs', FP_MOVED);
  assert.equal(identity.verifyDocsIdentity(root).versions.footprintjs, FP_MOVED);
});

test('rejects a docs HCI image instead of the linked current root', (t) => {
  const { root, docsHci } = fixture(t);
  unlinkSync(docsHci);
  packageAt(docsHci, 'hcifootprint', HCI);
  assert.throws(() => identity.verifyDocsIdentity(root), /Docs HCI must resolve to the current root source/);
});

test('rejects a docs link to another HCI checkout of the same version', (t) => {
  const { root, docsHci } = fixture(t);
  const other = packageAt(join(root, 'other-source'), 'hcifootprint', HCI);
  unlinkSync(docsHci);
  symlinkSync(other, docsHci, 'dir');
  assert.throws(() => identity.verifyDocsIdentity(root), /Docs HCI must resolve to the current root source/);
});

test('rejects a separate docs engine even at the exact root-lock version', (t) => {
  const { root, docsModules } = fixture(t);
  packageAt(join(docsModules, 'footprintjs'), 'footprintjs', FP);
  assert.throws(() => identity.verifyDocsIdentity(root), /root resolves a second physical footprintjs/);
});

for (const [name, version] of [['footprintjs', FP], ['foottrace', FT]]) {
  test(`censuses an unused hidden docs alias containing ${name}`, (t) => {
    const { root, docsModules } = fixture(t);
    const parent = join(docsModules, '.cache/unused/.hidden');
    const alias = packageAt(join(parent, 'node_modules/@fixture/core-alias'), name, version);
    assert.equal(createRequire(join(parent, 'probe.cjs')).resolve('@fixture/core-alias'), join(alias, 'index.mjs'));
    assert.throws(() => identity.verifyDocsIdentity(root), new RegExp(`extra physical ${name} copies`));
  });

  test(`censuses hidden ${name} copies through the linked docs parent`, (t) => {
    const { root, modules } = fixture(t);
    const parent = packageAt(join(modules, '.bin/unused'), 'unrelated-container');
    packageAt(join(parent, 'ordinary/deep/node_modules', name), name, version);
    assert.throws(() => identity.verifyDocsIdentity(root), new RegExp(`extra physical ${name} copies`));
  });
}

test('canonical core aliases and directory cycles count once while file links stay ignored', (t) => {
  const { root, docsModules, ft } = fixture(t);
  symlinkSync(ft, join(docsModules, 'record-alias'), 'dir');
  const hidden = join(docsModules, '.bin');
  mkdirSync(hidden);
  symlinkSync(join(ft, 'index.mjs'), join(hidden, 'record-command'));
  symlinkSync(hidden, join(hidden, 'cycle'), 'dir');
  assert.deepEqual(identity.verifyDocsIdentity(root).copies.foottrace, [ft]);
});

test('reruns workspace HCI resolution after the docs graph passes', (t) => {
  const { root, desk } = fixture(t);
  packageAt(join(desk, 'node_modules/hcifootprint'), 'hcifootprint', HCI);
  assert.throws(() => identity.verifyDocsIdentity(root), /live-desk resolves another HCI copy/);
});

test('reruns the existing locked agent version checks for both demos', (t) => {
  const { root } = fixture(t);
  writeLock(root, { footprintjs: FP, foottrace: FT, agentfootprint: AF_OTHER });
  assert.throws(() => identity.verifyDocsIdentity(root), /live-desk must use the locked agentfootprint/);
});

test('missing or nonexact root-lock core versions refuse and name the actual root lock', (t) => {
  const { root } = fixture(t);
  writeLock(root, { footprintjs: FP, agentfootprint: AF });
  assert.throws(() => identity.verifyDocsIdentity(root),
    error => error.message === `${join(root, 'package-lock.json')} packages["node_modules/foottrace"].version: expected an exact version, found undefined`);
  writeLock(root, { footprintjs: '^' + FP, foottrace: FT, agentfootprint: AF });
  assert.throws(() => identity.verifyDocsIdentity(root), /package-lock\.json.*expected an exact version/);
});

test('the fixed --docs CLI accepts ROOT and reports the docs result', (t) => {
  const { root, docs } = fixture(t);
  const script = join(dirname(fileURLToPath(import.meta.url)), 'identity.mjs');
  const run = spawnSync(process.execPath, [script, '--docs', root], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, '');
  const proof = JSON.parse(run.stdout);
  assert.equal(proof.kind, 'actual-docs-cohort-identity');
  assert.equal(proof.docs, docs);
});

test('the docs CLI refuses a wrong linked source in one sentence without a stack', (t) => {
  const { root, docsHci } = fixture(t);
  unlinkSync(docsHci);
  packageAt(docsHci, 'hcifootprint', HCI);
  const script = join(dirname(fileURLToPath(import.meta.url)), 'identity.mjs');
  const run = spawnSync(process.execPath, [script, '--docs', root], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.equal(run.stdout, '');
  assert.match(run.stderr, /^identity: Docs HCI must resolve to the current root source\n$/);
});
