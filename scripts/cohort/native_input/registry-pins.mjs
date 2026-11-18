import assert from 'node:assert/strict';
import semver from 'semver';
import { lockedInRange, oneHoistedEntry } from '../pin-assertions.mjs';

const CORE = ['footprintjs', 'foottrace'];
const STATUS = 'PUBLISHED_NEXT_AND_ORIGINAL_PRODUCER_REGISTRY_BYTES_VERIFIED';
const hex = (value, length) => assert.ok(typeof value === 'string'
  && new RegExp(`^[0-9a-f]{${length}}$`).test(value), 'Exact publication digest/source identity required');
const positive = value => assert.ok(Number.isSafeInteger(value) && value > 0, 'Positive publication identity required');
const equal = (actual, expected, label) => assert.equal(actual, expected, 'Qualified publication differs: ' + label);
const keys = value => assert.deepEqual(Object.keys(value ?? {}).sort(), [...CORE].sort(), 'Closed core roles required');
const registryUrl = (name, version) => `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`;

function publishedEngine(target) {
  const publication = target.publishedEngine;
  assert.ok(publication && typeof publication === 'object', 'Qualified engine publication required');
  const { source, tag, release, run, registry, producer, archive } = publication;
  const expected = target.coreArtifacts.footprintjs, version = target.coreVersions.footprintjs;
  equal(publication.repository, 'footprintjs/footPrint', 'engine source role');
  hex(source?.sha, 40); hex(source?.tree, 40);
  equal(expected.sourceCommit, source.sha, 'engine source commit');
  equal(tag?.sha, source.sha, 'tag source');
  equal(tag?.type, 'commit', 'tag type');
  equal(tag?.ref, 'refs/tags/v' + version, 'tag version');
  positive(release?.id);
  equal(release.draft, false, 'published release');
  equal(release.prerelease, semver.prerelease(version) !== null, 'release prerelease fact');
  equal(release.tag_name, 'v' + version, 'release tag');
  equal(release.target_commitish, source.sha, 'release source');
  equal(release.html_url, `https://github.com/${publication.repository}/releases/tag/v${version}`, 'release URL');
  assert.ok(typeof release.published_at === 'string' && Number.isFinite(Date.parse(release.published_at)), 'Published release time required');
  positive(run?.id); positive(run?.run_attempt);
  equal(run.head_sha, source.sha, 'release run source');
  equal(run.status, 'completed', 'release run status');
  equal(run.conclusion, 'success', 'release run conclusion');
  equal(run.event, 'release', 'release run event');
  equal(run.html_url, `https://github.com/${publication.repository}/actions/runs/${run.id}`, 'release run URL');
  equal(registry?.package, 'footprintjs', 'registry engine role');
  equal(registry.version, version, 'registry engine version');
  equal(registry.distTags?.next, version, 'published next tag');
  equal(registry.url, registryUrl('footprintjs', version), 'canonical engine registry URL');
  equal(expected.resolved, registry.url, 'engine core registry URL');
  equal(expected.integrity, registry.sri, 'engine core SRI');
  equal(registry.registryIntegrityVerified, true, 'verified registry integrity');
  equal(registry.attestationVerified, false, 'no cryptographic attestation claim');
  assert.ok(typeof registry.peer === 'string' && semver.satisfies(target.coreVersions.foottrace, registry.peer), 'Published engine peer excludes qualified record version');
  positive(registry.length); hex(registry.sha256, 64); hex(registry.sha1, 40);
  assert.match(registry.sri, /^sha512-[A-Za-z0-9+/]{86}==$/, 'Canonical registry SHA512 SRI required');
  positive(producer?.artifactId); positive(producer?.bytes); hex(producer?.sha256, 64);
  equal(producer.singleMember, 'package.tgz', 'original producer member');
  equal(producer.metadataSourceRunRepoMatched, true, 'qualified producer/source/run binding');
  equal(archive?.bytes, registry.length, 'original/registry byte count');
  equal(archive.sha256, registry.sha256, 'original/registry SHA256');
  equal(archive.shasum, registry.sha1, 'original/registry SHA1');
  equal(archive.integrity, registry.sri, 'original/registry SRI');
  equal(archive.singleBoundedGzip, true, 'qualified original gzip');
}

function publishedRecord(target) {
  const registry = target.foottraceRegistry, expected = target.coreArtifacts.foottrace;
  equal(registry?.package, 'foottrace', 'registry record role');
  equal(registry.version, target.coreVersions.foottrace, 'record registry version');
  equal(registry.tarball, registryUrl('foottrace', registry.version), 'canonical record registry URL');
  equal(expected.resolved, registry.tarball, 'record core registry URL');
  equal(expected.integrity, registry.integrity, 'record core SRI');
  assert.match(registry.integrity, /^sha512-[A-Za-z0-9+/]{86}==$/, 'Canonical record SHA512 SRI required');
  hex(registry.metadataSha256, 64); hex(registry.shasum, 40);
  equal(registry.gitHead, null, 'unknown registry gitHead');
  equal(expected.sourceCommit, 'unknown: registry metadata omits gitHead', 'record source identity qualification');
}

/** Migration: qualified published-engine RC metadata has its own private gate.
 * The owner reads one fixed target JSON and hashes those exact raw bytes; the
 * supplied digest is that byte binding, not a hash of reserialized JSON here.
 * This never activates AF, changes ordinary stable policy or proves installation.
 */
export function checkRegistryPins(lock, ranges, input, target, targetDigest) {
  hex(targetDigest, 64);
  equal(input?.registryTargetSha256, targetDigest, 'input target byte hash');
  equal(target?.protocol, 'hcifootprint.registry-target.v1', 'target protocol');
  equal(target.status, STATUS, 'qualified publication phase');
  hex(target.qualificationSha256, 64);
  keys(target.coreVersions); keys(target.coreArtifacts); keys(ranges);
  assert.deepEqual(input.coreVersions, target.coreVersions, 'Input core versions differ from fixed target');
  assert.deepEqual(input.coreArtifacts, target.coreArtifacts, 'Input core artifacts differ from fixed target');
  // The record role keeps the existing ordinary plain-release law, even if an
  // internally consistent altered target attempts to qualify another prerelease.
  lockedInRange('qualified registry target', 'foottrace', target.coreVersions.foottrace, ranges.foottrace);
  for (const name of CORE) {
    equal(target.coreArtifacts[name].version, target.coreVersions[name], 'core version ' + name);
    assert.ok(typeof ranges[name] === 'string' && semver.validRange(ranges[name]) !== null
      && semver.validRange(ranges[name]) !== '*', 'Explicit authored registry range required');
    assert.ok(semver.valid(target.coreVersions[name]) !== null, 'Exact valid qualified SemVer required');
  }
  publishedEngine(target); publishedRecord(target);
  return Object.fromEntries(CORE.map(name => {
    const actual = oneHoistedEntry(lock, 'package-lock.json', name), expected = target.coreArtifacts[name];
    assert.ok(typeof actual.version === 'string' && semver.valid(actual.version) !== null, 'Exact valid locked SemVer required');
    equal(actual.version, target.coreVersions[name], 'locked core version ' + name);
    assert.ok(semver.satisfies(actual.version, ranges[name]), 'Qualified registry version excludes authored range');
    equal(actual.resolved, expected.resolved, 'locked registry URL ' + name);
    equal(actual.integrity, expected.integrity, 'locked registry SRI ' + name);
    return [name, actual.version];
  }));
}
