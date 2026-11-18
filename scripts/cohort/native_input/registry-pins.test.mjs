import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { lockedInRange } from '../pin-assertions.mjs';
import { checkRegistryPins } from './registry-pins.mjs';

// Actual published target data in an inert lock fixture. No AF input, installation
// or native compatibility result is created by these metadata checks.
const raw = readFileSync(new URL('../registry-target.json', import.meta.url));
const digest = createHash('sha256').update(raw).digest('hex');
const published = JSON.parse(raw);
const fixture = () => {
  const target = structuredClone(published);
  const input = { registryTargetSha256: digest,
    coreVersions: structuredClone(target.coreVersions), coreArtifacts: structuredClone(target.coreArtifacts) };
  const ranges = Object.fromEntries(Object.entries(target.coreVersions).map(([name, version]) => [name, '^' + version]));
  const lock = { packages: Object.fromEntries(Object.entries(target.coreArtifacts).map(([name, item]) =>
    ['node_modules/' + name, { version: item.version, resolved: item.resolved, integrity: item.integrity }])) };
  return { target, input, ranges, lock,
    check() { return checkRegistryPins(lock, ranges, input, target, digest); } };
};

test('actual qualified published engine RC and stable record target pass inert metadata', () => {
  const f = fixture(), before = structuredClone({ target: f.target, input: f.input,
    ranges: f.ranges, lock: f.lock });
  assert.deepEqual(f.check(), f.target.coreVersions);
  assert.deepEqual({ target: f.target, input: f.input, ranges: f.ranges, lock: f.lock }, before);
});

test('the same explicitly declared RC still fails ordinary stable policy', () => {
  const f = fixture();
  assert.throws(() => lockedInRange('synthetic-lock', 'footprintjs',
    f.target.coreVersions.footprintjs, f.ranges.footprintjs), /not a plain release version/);
});

test('input target hash and full core/artifact identities are mandatory', () => {
  for (const mutate of [f => delete f.input.registryTargetSha256,
    f => { f.input.registryTargetSha256 = '0'.repeat(64); },
    f => { f.input.coreVersions.footprintjs = '13.0.0'; },
    f => { f.input.coreArtifacts.foottrace.integrity = 'changed'; },
    f => { f.input.coreArtifacts.footprintjs.sourceCommit = '0'.repeat(40); },
    f => { f.input.coreVersions.extra = '1.0.0'; }]) {
    const f = fixture(); mutate(f); assert.throws(f.check);
  }
  const f = fixture();
  assert.throws(() => checkRegistryPins(f.lock, f.ranges, f.input, f.target, 'not-a-digest'));
});

test('wrong RC, stable historical engine, malformed version, locator or SRI refuses', () => {
  for (const [key, value] of [['version', '14.0.0-rc.1'], ['version', '13.0.0'],
    ['version', '^14.0.0-rc.0'], ['resolved', 'file:/unqualified.tgz'], ['integrity', 'sha512-wrong']]) {
    const f = fixture(); f.lock.packages['node_modules/footprintjs'][key] = value; assert.throws(f.check);
  }
});

test('authored declarations must explicitly admit the RC under default semver rules', () => {
  // This broad stable comparator distinguishes default prerelease exclusion
  // from a global includePrerelease waiver, unlike an RC below a stable floor.
  for (const range of ['^14.0.0', '^13.0.0', '>=13.0.0', '*', 'file:../engine', undefined]) {
    const f = fixture(); f.ranges.footprintjs = range; assert.throws(f.check);
  }
  const f = fixture(); f.ranges.footprintjs = f.target.coreVersions.footprintjs;
  assert.deepEqual(f.check(), f.target.coreVersions);
});

test('duplicate or aliased core entries and unhoisted copies refuse', () => {
  for (const name of ['footprintjs', 'foottrace']) {
    for (const key of ['node_modules/hidden/node_modules/' + name, 'node_modules/alias']) {
      const f = fixture();
      f.lock.packages[key] = { ...f.lock.packages['node_modules/' + name], name };
      assert.throws(f.check, /one locked/);
    }
    const f = fixture(); f.lock.packages['node_modules/hidden/node_modules/' + name] = f.lock.packages['node_modules/' + name];
    delete f.lock.packages['node_modules/' + name]; assert.throws(f.check, /hoisted/);
  }
});

test('changing input and target core metadata together cannot evade publication joins', () => {
  for (const [name, key, value] of [['footprintjs', 'resolved', 'https://registry.invalid/x.tgz'],
    ['footprintjs', 'integrity', 'sha512-unqualified'], ['footprintjs', 'sourceCommit', '0'.repeat(40)],
    ['foottrace', 'integrity', 'sha512-unqualified'], ['foottrace', 'sourceCommit', 'invented']]) {
    const f = fixture();
    f.input.coreArtifacts[name][key] = f.target.coreArtifacts[name][key] = value;
    Object.assign(f.lock.packages['node_modules/' + name], f.target.coreArtifacts[name]);
    assert.throws(f.check);
  }
});

test('stable record role never receives an engine-style prerelease exemption', () => {
  const f = fixture(), version = '2.1.0-rc.0';
  f.ranges.foottrace = '^' + version;
  f.input.coreVersions.foottrace = f.target.coreVersions.foottrace = version;
  for (const item of [f.input.coreArtifacts.foottrace, f.target.coreArtifacts.foottrace]) {
    item.version = version; item.resolved = 'https://registry.npmjs.org/foottrace/-/foottrace-' + version + '.tgz';
  }
  Object.assign(f.lock.packages['node_modules/foottrace'], f.target.coreArtifacts.foottrace);
  f.target.foottraceRegistry.version = version;
  f.target.foottraceRegistry.tarball = f.target.coreArtifacts.foottrace.resolved;
  f.target.publishedEngine.registry.peer = '^' + version;
  assert.throws(f.check, /plain release/);
});

test('missing publication, wrong phase and unsupported role cannot qualify a registry target', () => {
  for (const mutate of [f => delete f.target.publishedEngine,
    f => { f.target.protocol = 'other'; }, f => { f.target.status = 'DATA_ONLY'; },
    f => { f.target.qualificationSha256 = 'unqualified'; },
    f => { f.target.publishedEngine.repository = 'other/engine'; },
    f => { f.target.publishedEngine.registry.package = 'other'; }]) {
    const f = fixture(); mutate(f); assert.throws(f.check);
  }
});

test('source, tag, release and successful producer-run bindings cannot drift', () => {
  const changes = [
    ['source', 'sha', '0'.repeat(40)], ['source', 'tree', 'bad'],
    ['tag', 'sha', '0'.repeat(40)], ['tag', 'ref', 'refs/tags/other'], ['tag', 'type', 'tag'],
    ['release', 'draft', true], ['release', 'prerelease', false], ['release', 'id', 0],
    ['release', 'tag_name', 'other'], ['release', 'target_commitish', '0'.repeat(40)],
    ['run', 'head_sha', '0'.repeat(40)], ['run', 'conclusion', 'failure'],
    ['run', 'status', 'in_progress'], ['run', 'event', 'pull_request'], ['run', 'id', 0],
    ['producer', 'metadataSourceRunRepoMatched', false], ['producer', 'artifactId', 0],
    ['producer', 'bytes', 0], ['producer', 'sha256', 'bad'], ['producer', 'singleMember', 'other.tgz'],
  ];
  for (const [section, key, value] of changes) {
    const f = fixture(); f.target.publishedEngine[section][key] = value; assert.throws(f.check, undefined, section + '.' + key);
  }
});

test('registry and original producer archive facts must describe identical published bytes', () => {
  const changes = [
    ['registry', 'version', '13.0.0'], ['registry', 'url', 'https://registry.invalid/engine.tgz'],
    ['registry', 'sri', 'changed'], ['registry', 'sha256', '0'.repeat(64)],
    ['registry', 'sha1', '0'.repeat(40)], ['registry', 'length', 1],
    ['registry', 'registryIntegrityVerified', false], ['registry', 'attestationVerified', true],
    ['registry', 'peer', '^1.0.0'], ['archive', 'sha256', '0'.repeat(64)],
    ['archive', 'shasum', '0'.repeat(40)], ['archive', 'integrity', 'changed'],
    ['archive', 'bytes', 1], ['archive', 'singleBoundedGzip', false],
  ];
  for (const [section, key, value] of changes) {
    const f = fixture(); f.target.publishedEngine[section][key] = value; assert.throws(f.check, undefined, section + '.' + key);
  }
  const f = fixture(); f.target.publishedEngine.registry.distTags.next = 'other'; assert.throws(f.check);
});

test('stable record registry metadata and unknown gitHead claim remain exact', () => {
  for (const [key, value] of [['package', 'other'], ['version', '2.0.0'],
    ['tarball', 'https://registry.invalid/record.tgz'], ['integrity', 'changed'],
    ['metadataSha256', 'bad'], ['gitHead', '0'.repeat(40)]]) {
    const f = fixture(); f.target.foottraceRegistry[key] = value; assert.throws(f.check, undefined, key);
  }
});
