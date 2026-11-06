import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COHORT } from './identity.mjs';

/** Prepare only; CI owns the visible normal npm install and each proof command. */
export function prepareConsumer(consumer, tarball) {
  consumer = resolve(consumer);
  tarball = realpathSync(tarball);
  assert.ok(tarball.endsWith('.tgz'), 'Expected the actual npm-packed HCI tarball');
  assert.ok(!existsSync(consumer), 'Consumer directory must be fresh');
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, '../..');
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
  const lockedVersion = (name) => {
    const version = lock.packages[`node_modules/${name}`]?.version;
    assert.equal(typeof version, 'string', `${name} must be pinned in the normal root lock`);
    return version;
  };
  mkdirSync(consumer);
  writeFileSync(join(consumer, 'package.json'), `${JSON.stringify({
    name: 'hcifootprint-packed-cohort-proof', private: true, type: 'module',
    scripts: { 'check:types': 'tsc --noEmit', 'check:identity': 'node identity.mjs', 'check:runtime': 'node runtime.mjs' },
    dependencies: { hcifootprint: `file:${tarball}`, ...COHORT,
      react: lockedVersion('react'), '@modelcontextprotocol/sdk': lockedVersion('@modelcontextprotocol/sdk') },
    devDependencies: { typescript: lockedVersion('typescript'), '@types/node': lockedVersion('@types/node'), '@types/react': lockedVersion('@types/react') },
  }, null, 2)}\n`);
  writeFileSync(join(consumer, 'public-imports.json'), `${JSON.stringify(Object.keys(pkg.exports).map((key) => key === '.' ? pkg.name : `${pkg.name}/${key.slice(2)}`).sort(), null, 2)}\n`);
  writeFileSync(join(consumer, 'tsconfig.json'), `${JSON.stringify({
    compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true,
      skipLibCheck: false, noEmit: true, lib: ['ES2022', 'DOM'], types: ['node'], verbatimModuleSyntax: true },
    files: ['types.mts'],
  }, null, 2)}\n`);
  for (const name of ['identity.mjs', 'runtime.mjs', 'types.mts']) copyFileSync(join(here, name), join(consumer, name));
  return { consumer, tarball, runtimeVersions: COHORT, installed: false };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  assert.equal(process.argv.length, 4, 'Usage: node prepare-consumer.mjs FRESH_DIRECTORY PACKED_TARBALL');
  console.log(JSON.stringify(prepareConsumer(process.argv[2], process.argv[3]), null, 2));
}
