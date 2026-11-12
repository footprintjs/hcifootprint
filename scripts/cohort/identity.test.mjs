import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { verifyIdentity, verifyWorkspaceIdentity } from './identity.mjs';

// Fixture numbers, each stated once. identity.mjs holds none: a consumer fixture states the expected
// versions in its own package.json, a workspace fixture in its root package-lock.json.
const FP = '11.2.0';
const FP_OTHER_IN_RANGE = '11.1.0';
const FP_STALE = '10.0.0';
const FT = '1.11.1';
const AF = '14.4.0';
const AF_OTHER = '14.0.0';
const HCI = '3.3.1';
const UNVERSIONED = '0.0.0';
const RANGE = '^11.0.0';

// Metadata-only fixtures exercise the checker. They are not HCI runtime proof.
function packageAt(path, name, version = UNVERSIONED, extra = {}) {
  mkdirSync(path, { recursive: true });
  writeFileSync(join(path, 'package.json'), JSON.stringify({ name, version, type: 'module', exports: './index.mjs', ...extra }));
  writeFileSync(join(path, 'index.mjs'), 'export {};\n');
  return path;
}
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hci-cohort-identity-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  // A prepared consumer pins the cohort exactly in its own package.json (prepare-consumer.mjs).
  packageAt(root, 'identity-fixture', UNVERSIONED, { dependencies: { footprintjs: FP, foottrace: FT } });
  const modules = join(root, 'node_modules');
  const fp = packageAt(join(modules, 'footprintjs'), 'footprintjs', FP);
  const ft = packageAt(join(modules, 'foottrace'), 'foottrace', FT);
  const hci = packageAt(join(modules, 'hcifootprint'), 'hcifootprint', HCI);
  return { root, modules, fp, ft, hci };
}

test('accepts one installed physical cohort, without tying HCI to an unreleased version', (t) => {
  const { root, fp, ft } = fixture(t);
  const proof = verifyIdentity(root);
  assert.deepEqual(proof.copies, { footprintjs: [fp], foottrace: [ft] });
  assert.equal(proof.hci.version, HCI);
  assert.deepEqual(proof.versions, { footprintjs: FP, foottrace: FT });
});

test('rejects nested FP with the same version even when top-level version is correct', (t) => {
  const { root, hci } = fixture(t);
  packageAt(join(hci, 'node_modules', 'footprintjs'), 'footprintjs', FP);
  assert.throws(() => verifyIdentity(root), /second physical footprintjs/);
});

test('rejects a hidden same-version record copy under an otherwise unused dependency', (t) => {
  const { root, modules } = fixture(t);
  const unused = packageAt(join(modules, '@fixture', 'unused'), '@fixture/unused');
  packageAt(join(unused, 'node_modules', 'foottrace'), 'foottrace', FT);
  assert.throws(() => verifyIdentity(root), /extra physical foottrace copies/);
});

for (const container of [
  '.bin/hidden',
  '.cache/nested/.hidden/ordinary',
  'unused/internal/deep',
  '@fixture/unused/.cache/deep',
]) {
  for (const [name, version] of [['footprintjs', FP], ['foottrace', FT]]) {
    test(`rejects a Node-resolvable ${name} inside ${container}`, (t) => {
      const { root, modules } = fixture(t);
      const parent = packageAt(join(modules, container), 'unrelated-container');
      const extra = packageAt(join(parent, 'node_modules', name), name, version);
      const require = createRequire(join(parent, 'probe.cjs'));
      assert.equal(require.resolve(name), join(extra, 'index.mjs'));
      assert.throws(() => verifyIdentity(root), new RegExp(`extra physical ${name} copies`));
    });
  }
}

test('finds copies below a manifest-bearing hidden container and deeper ordinary folders', (t) => {
  const { root, modules } = fixture(t);
  const hidden = packageAt(join(modules, '.bin/hidden'), 'unrelated-container');
  const parent = join(hidden, 'deeper/ordinary');
  const extra = packageAt(join(parent, 'node_modules/foottrace'), 'foottrace', FT);
  assert.equal(createRequire(join(parent, 'probe.cjs')).resolve('foottrace'), join(extra, 'index.mjs'));
  assert.throws(() => verifyIdentity(root), /extra physical foottrace copies/);
});

test('finds scoped aliases in nested hidden module containers', (t) => {
  const { root, modules } = fixture(t);
  const parent = join(modules, '.cache/hidden');
  const alias = packageAt(join(parent, 'node_modules/@fixture/record-alias'), 'foottrace', FT);
  assert.equal(createRequire(join(parent, 'probe.cjs')).resolve('@fixture/record-alias'), join(alias, 'index.mjs'));
  assert.throws(() => verifyIdentity(root), /extra physical foottrace copies/);
});

test('finds a module container directly inside a scope directory', (t) => {
  const { root, modules } = fixture(t);
  const parent = join(modules, '@fixture');
  const extra = packageAt(join(parent, 'node_modules/foottrace'), 'foottrace', FT);
  assert.equal(createRequire(join(parent, 'probe.cjs')).resolve('foottrace'), join(extra, 'index.mjs'));
  assert.throws(() => verifyIdentity(root), /extra physical foottrace copies/);
});

test('ignores ordinary fixture manifests and executable links while following canonical directory links once', (t) => {
  const { root, modules, ft } = fixture(t);
  const bin = join(modules, '.bin');
  mkdirSync(bin);
  writeFileSync(join(modules, '.package-lock.json'), '{}');
  symlinkSync(join(ft, 'index.mjs'), join(bin, 'record-command'));
  const uninstalled = packageAt(join(bin, 'fixture'), 'foottrace', FT);
  writeFileSync(join(uninstalled, 'package.json'), JSON.stringify({
    name: 'foottrace', version: FT, type: 'module', main: './index.mjs',
  }));
  const nested = join(bin, 'hidden/node_modules');
  mkdirSync(nested, { recursive: true });
  symlinkSync(ft, join(nested, 'foottrace'), 'dir');
  symlinkSync(bin, join(bin, 'cycle'), 'dir');
  assert.equal(createRequire(join(bin, 'fixture/probe.cjs')).resolve('foottrace'), join(ft, 'index.mjs'));
  let proof;
  assert.doesNotThrow(() => { proof = verifyIdentity(root); });
  assert.deepEqual(proof.copies.foottrace, [ft]);
});

test('rejects a linked second physical copy reached through hidden folders', (t) => {
  const { root, modules } = fixture(t);
  const extra = packageAt(join(root, 'linked-target'), 'foottrace', FT);
  const parent = join(modules, '.cache/hidden');
  mkdirSync(join(parent, 'node_modules'), { recursive: true });
  symlinkSync(extra, join(parent, 'node_modules/foottrace'), 'dir');
  assert.equal(createRequire(join(parent, 'probe.cjs')).resolve('foottrace'), join(extra, 'index.mjs'));
  assert.throws(() => verifyIdentity(root), /extra physical foottrace copies/);
});

test('matches Node resolution when a nested module container differs in case', (t) => {
  const { root, modules, ft } = fixture(t);
  const parent = join(modules, '.cache/hidden');
  const extra = packageAt(join(parent, 'NODE_MODULES/foottrace'), 'foottrace', FT);
  const resolved = createRequire(join(parent, 'probe.cjs')).resolve('foottrace');
  const actual = statSync(resolved), nested = statSync(join(extra, 'index.mjs'));
  const selectedNested = actual.dev === nested.dev && actual.ino === nested.ino;
  t.diagnostic(`Node selected ${selectedNested ? 'the nested' : 'the root'} physical copy`);
  if (selectedNested) {
    assert.throws(() => verifyIdentity(root), /extra physical foottrace copies/);
  } else {
    assert.equal(resolved, join(ft, 'index.mjs'));
    assert.deepEqual(verifyIdentity(root).copies.foottrace, [ft]);
  }
});

for (const kind of ['file', 'file-link', 'dangling-link']) {
  test(`accepts a non-directory module-container candidate: ${kind}`, (t) => {
    const { root, modules, ft } = fixture(t);
    const parent = join(packageAt(join(modules, 'unused'), 'unused'), 'deep');
    mkdirSync(parent);
    const candidate = join(parent, 'node_modules');
    if (kind === 'file') writeFileSync(candidate, 'ordinary fixture data');
    else if (kind === 'file-link') {
      writeFileSync(join(parent, 'data'), 'ordinary fixture data');
      symlinkSync(join(parent, 'data'), candidate);
    } else symlinkSync(join(parent, 'missing'), candidate);
    assert.equal(createRequire(join(parent, 'probe.cjs')).resolve('foottrace'), join(ft, 'index.mjs'));
    assert.doesNotThrow(() => verifyIdentity(root));
  });
}

test('finds package aliases but counts a symlink to the canonical package only once', (t) => {
  const { root, modules, ft } = fixture(t);
  symlinkSync(ft, join(modules, 'linked-record'), 'dir');
  assert.deepEqual(verifyIdentity(root).copies.foottrace, [ft]);
  packageAt(join(modules, 'unreferenced-engine'), 'footprintjs', FP);
  assert.throws(() => verifyIdentity(root), /extra physical footprintjs copies/);
});

test('rejects a coherent but stale cohort', (t) => {
  const { root, fp } = fixture(t);
  packageAt(fp, 'footprintjs', FP_STALE);
  assert.throws(() => verifyIdentity(root), new RegExp(`Expected actual footprintjs@${FP.replaceAll('.', '\\.')}, found ${FP_STALE.replaceAll('.', '\\.')}`));
});

test('a consumer manifest with a range where an exact version is expected fails and names the file', (t) => {
  const { root } = fixture(t);
  packageAt(root, 'identity-fixture', UNVERSIONED, { dependencies: { footprintjs: RANGE, foottrace: FT } });
  assert.throws(() => verifyIdentity(root),
    (error) => error.message.startsWith(`${join(root, 'package.json')} dependencies.footprintjs: expected an exact version`));
});

test('a malformed consumer manifest fails with one sentence naming the file', (t) => {
  const { root } = fixture(t);
  writeFileSync(join(root, 'package.json'), '{ not json');
  assert.throws(() => verifyIdentity(root), (error) => error.message.startsWith(`${join(root, 'package.json')}: is not valid JSON`));
});

/** The root lock chooses the versions; a fixture writes only the hoisted entries identity.mjs reads. */
function writeLock(root, versions) {
  writeFileSync(join(root, 'package-lock.json'), JSON.stringify({ lockfileVersion: 3, packages: Object.fromEntries(
    Object.entries(versions).map(([name, version]) => [`node_modules/${name}`, { version }])) }));
}

function workspaceFixture(t) {
  const paths = fixture(t);
  packageAt(paths.root, 'hcifootprint', HCI);
  writeLock(paths.root, { footprintjs: FP, foottrace: FT, agentfootprint: AF });
  rmSync(paths.hci, { recursive: true });
  symlinkSync(paths.root, paths.hci, 'dir');
  packageAt(join(paths.modules, 'agentfootprint'), 'agentfootprint', AF);
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
  packageAt(join(desk, 'node_modules/footprintjs'), 'footprintjs', FP);
  assert.throws(() => verifyWorkspaceIdentity(root), /live-desk resolves a second physical footprintjs/);
});

test('rejects record duplication inside the demo agent dependency', (t) => {
  const { root, modules } = workspaceFixture(t);
  packageAt(join(modules, 'agentfootprint/node_modules/foottrace'), 'foottrace', FT);
  assert.throws(() => verifyWorkspaceIdentity(root), /live-desk:agentfootprint resolves a second physical foottrace/);
});

test('a lock and install on another version inside the declared range pass with no script change', (t) => {
  const { root, fp } = workspaceFixture(t);
  packageAt(fp, 'footprintjs', FP_OTHER_IN_RANGE);
  writeLock(root, { footprintjs: FP_OTHER_IN_RANGE, foottrace: FT, agentfootprint: AF });
  assert.equal(verifyWorkspaceIdentity(root).versions.footprintjs, FP_OTHER_IN_RANGE);
});

test('rejects an install that differs from the version the root lock chose', (t) => {
  const { root } = workspaceFixture(t);
  writeLock(root, { footprintjs: FP_OTHER_IN_RANGE, foottrace: FT, agentfootprint: AF });
  assert.throws(() => verifyWorkspaceIdentity(root), new RegExp(`Expected actual footprintjs@${FP_OTHER_IN_RANGE.replaceAll('.', '\\.')}`));
});

test('the demos must resolve the agentfootprint the root lock holds', (t) => {
  const { root } = workspaceFixture(t);
  writeLock(root, { footprintjs: FP, foottrace: FT, agentfootprint: AF_OTHER });
  assert.throws(() => verifyWorkspaceIdentity(root),
    new RegExp(`live-desk must use the locked agentfootprint@${AF_OTHER.replaceAll('.', '\\.')}, found ${AF.replaceAll('.', '\\.')}`));
});

test('a lock without the expected entry or with a malformed body fails and names where it looked', (t) => {
  const { root } = workspaceFixture(t);
  writeLock(root, { footprintjs: FP, agentfootprint: AF });
  assert.throws(() => verifyWorkspaceIdentity(root),
    (error) => error.message === `${join(root, 'package-lock.json')} packages["node_modules/foottrace"].version: expected an exact version, found undefined`);
  writeFileSync(join(root, 'package-lock.json'), '{ "packages": ');
  assert.throws(() => verifyWorkspaceIdentity(root), (error) => error.message.startsWith(`${join(root, 'package-lock.json')}: is not valid JSON`));
  writeFileSync(join(root, 'package-lock.json'), '{}');
  assert.throws(() => verifyWorkspaceIdentity(root), /has no "packages" object/);
});

test('the command prints that sentence without a stack and exits non-zero', (t) => {
  const { root } = workspaceFixture(t);
  writeFileSync(join(root, 'package-lock.json'), '{}');
  const script = join(dirname(fileURLToPath(import.meta.url)), 'identity.mjs');
  const run = spawnSync(process.execPath, [script, '--workspaces', root], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /^identity: .*package-lock\.json: has no "packages" object/);
  assert.doesNotMatch(run.stderr, /\n\s+at /, 'no stack trace');
});
