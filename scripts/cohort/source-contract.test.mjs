import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import semver from 'semver';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

test('the host supplies one required stable engine and HCI develops against that same contract', () => {
  assert.equal(pkg.dependencies.footprintjs, undefined, 'HCI must not install a private engine');
  assert.equal(pkg.peerDependencies.footprintjs, '^14.0.0');
  assert.notEqual(pkg.peerDependenciesMeta?.footprintjs?.optional, true);
  assert.equal(pkg.devDependencies.footprintjs, pkg.peerDependencies.footprintjs);
  for (const version of ['11.0.0', '12.0.0', '13.0.0', '14.0.0-rc.0', '15.0.0']) {
    assert.equal(semver.satisfies(version, pkg.peerDependencies.footprintjs), false, version);
  }
  for (const version of ['14.0.0', '14.1.0']) {
    assert.equal(semver.satisfies(version, pkg.peerDependencies.footprintjs), true, version);
  }
});

test('the owned record writer accepts only its current stable line', () => {
  assert.equal(pkg.dependencies.foottrace, '^2.1.0');
  assert.equal(semver.satisfies('1.11.1', pkg.dependencies.foottrace), false);
  assert.equal(semver.satisfies('2.1.0-rc.0', pkg.dependencies.foottrace), false);
  assert.equal(semver.satisfies('2.1.0', pkg.dependencies.foottrace), true);
});
