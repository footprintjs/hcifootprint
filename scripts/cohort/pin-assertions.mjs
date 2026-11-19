import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import semver from 'semver';

/** Shared plain assertions; neither caller can supply an acceptance callback. */
export function readJson(root, path) {
  let text;
  try { text = readFileSync(resolve(root, path), 'utf8'); }
  catch (error) { throw new Error(`${path}: cannot be read (${error.code ?? error.message})`); }
  try { return JSON.parse(text); }
  catch (error) { throw new Error(`${path}: is not valid JSON (${error.message})`); }
}

export function declaredRange(dependencies, name, label) {
  const range = dependencies?.[name];
  const valid = typeof range === 'string' ? semver.validRange(range) : null;
  assert.ok(valid !== null && valid !== '*', `${label}: ${name} must declare a semver range, found ${JSON.stringify(range)}`);
  return range;
}

/** A runtime package is either owned here or supplied by the host as a required peer. */
export function runtimeDeclaration(pkg, name, label) {
  const sections = ['dependencies', 'peerDependencies'].filter((section) =>
    Object.hasOwn(pkg[section] ?? {}, name));
  assert.ok(sections.length <= 1, `${label}: ${name} must have exactly one runtime declaration`);
  const section = sections[0] ?? 'dependencies';
  const range = declaredRange(pkg[section], name, label);
  if (section === 'peerDependencies') assert.notEqual(pkg.peerDependenciesMeta?.[name]?.optional, true,
    `${label}: ${name} must be a required peer`);
  return { section, range };
}

export function lockedInRange(path, name, version, range) {
  assert.ok(typeof version === 'string' && semver.valid(version) !== null && semver.prerelease(version) === null,
    `${path}: locked ${name}@${version} is not a plain release version`);
  assert.ok(semver.satisfies(version, range), `${path}: locked ${name}@${version} is outside the declared range ${range}`);
  return version;
}

export function linkedMetadata(lock, path, linkedRoot, pkg, ranges) {
  assert.ok(lock && typeof lock.packages === 'object' && lock.packages !== null,
    `${path}: has no "packages" object (expected an npm lockfileVersion 2 or 3 lock)`);
  const metadata = lock.packages[linkedRoot];
  for (const [name, range] of Object.entries(ranges)) {
    const { section } = runtimeDeclaration(pkg, name, 'package.json');
    assert.equal(metadata?.[section]?.[name], range, `${path}:${linkedRoot}: ${name} must declare ${range}`);
  }
  assert.equal(metadata.version, pkg.version, `${path}: linked HCI version is stale`);
}

export function oneHoistedEntry(lock, path, name) {
  const entries = Object.entries(lock.packages).filter(([key, value]) =>
    key.endsWith(`/node_modules/${name}`) || key === `node_modules/${name}` || value?.name === name);
  assert.equal(entries.length, 1, `${path}: expected one locked ${name}, found ${entries.length}`);
  assert.equal(entries[0][0], `node_modules/${name}`, `${path}: the one locked ${name} must be hoisted at node_modules/${name}`);
  return entries[0][1];
}
