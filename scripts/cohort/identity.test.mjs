import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { verifyIdentity, verifyWorkspaceIdentity } from './identity.mjs';

// Metadata-only fixtures exercise the checker. They are not HCI runtime proof.
function packageAt(path, name, version = '0.0.0') {
  mkdirSync(path, { recursive: true });
  writeFileSync(join(path, 'package.json'), JSON.stringify({ name, version, type: 'module', exports: './index.mjs' }));
  writeFileSync(join(path, 'index.mjs'), 'export {};\n');
  return path;
}
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hci-cohort-identity-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  packageAt(root, 'identity-fixture');
  const modules = join(root, 'node_modules');
  const fp = packageAt(join(modules, 'footprintjs'), 'footprintjs', '11.0.0');
  const ft = packageAt(join(modules, 'foottrace'), 'foottrace', '1.11.1');
  const hci = packageAt(join(modules, 'hcifootprint'), 'hcifootprint', '3.3.1');
  return { root, modules, fp, ft, hci };
}

test('accepts one installed physical cohort, without tying HCI to an unreleased version', (t) => {
  const { root, fp, ft } = fixture(t);
  const proof = verifyIdentity(root);
  assert.deepEqual(proof.copies, { footprintjs: [fp], foottrace: [ft] });
  assert.equal(proof.hci.version, '3.3.1');
});

test('rejects nested FP with the same version even when top-level version is correct', (t) => {
  const { root, hci } = fixture(t);
  packageAt(join(hci, 'node_modules', 'footprintjs'), 'footprintjs', '11.0.0');
  assert.throws(() => verifyIdentity(root), /second physical footprintjs/);
});

test('rejects a hidden same-version record copy under an otherwise unused dependency', (t) => {
  const { root, modules } = fixture(t);
  const unused = packageAt(join(modules, '@fixture', 'unused'), '@fixture/unused');
  packageAt(join(unused, 'node_modules', 'foottrace'), 'foottrace', '1.11.1');
  assert.throws(() => verifyIdentity(root), /extra physical foottrace copies/);
});

test('finds package aliases but counts a symlink to the canonical package only once', (t) => {
  const { root, modules, ft } = fixture(t);
  symlinkSync(ft, join(modules, 'linked-record'), 'dir');
  assert.deepEqual(verifyIdentity(root).copies.foottrace, [ft]);
  packageAt(join(modules, 'unreferenced-engine'), 'footprintjs', '11.0.0');
  assert.throws(() => verifyIdentity(root), /extra physical footprintjs copies/);
});

test('rejects a coherent but stale cohort', (t) => {
  const { root, fp } = fixture(t);
  packageAt(fp, 'footprintjs', '10.0.0');
  assert.throws(() => verifyIdentity(root), /Expected actual footprintjs@11.0.0/);
});

function workspaceFixture(t) {
  const paths = fixture(t);
  packageAt(paths.root, 'hcifootprint', '3.3.1');
  rmSync(paths.hci, { recursive: true });
  symlinkSync(paths.root, paths.hci, 'dir');
  packageAt(join(paths.modules, 'agentfootprint'), 'agentfootprint', '14.0.0');
  const desk = packageAt(join(paths.root, 'demos/live-desk'), 'live-desk');
  const wizard = packageAt(join(paths.root, 'demos/onboarding-wizard'), 'onboarding-wizard-demo');
  symlinkSync(desk, join(paths.modules, 'live-desk'), 'dir');
  symlinkSync(wizard, join(paths.modules, 'onboarding-wizard-demo'), 'dir');
  return { ...paths, desk, wizard };
}

test('joins actual workspace and AF package resolution to the root cohort', (t) => {
  const { root, fp, ft } = workspaceFixture(t);
  const proof = verifyWorkspaceIdentity(root);
  assert.equal(proof.resolutions.footprintjs['live-desk:agentfootprint'], fp);
  assert.equal(proof.resolutions.foottrace['onboarding-wizard-demo:agentfootprint'], ft);
});

test('rejects a standalone nested demo install even with the same FP version', (t) => {
  const { root, desk } = workspaceFixture(t);
  packageAt(join(desk, 'node_modules/footprintjs'), 'footprintjs', '11.0.0');
  assert.throws(() => verifyWorkspaceIdentity(root), /live-desk resolves a second physical footprintjs/);
});

test('rejects record duplication inside the demo agent dependency', (t) => {
  const { root, modules } = workspaceFixture(t);
  packageAt(join(modules, 'agentfootprint/node_modules/foottrace'), 'foottrace', '1.11.1');
  assert.throws(() => verifyWorkspaceIdentity(root), /live-desk:agentfootprint resolves a second physical foottrace/);
});
