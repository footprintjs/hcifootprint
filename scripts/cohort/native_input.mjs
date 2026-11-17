import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = fileURLToPath(new URL('../..', import.meta.url));

async function main() {
  assert.ok(process.argv.length <= 3, 'Native entry accepts no roots, commands or callbacks');
  if (process.argv[2] === 'pins') {
    // Only after the real strict install; the bootstrap imports no third-party code.
    const { checkNativePins } = await import('./native_input/pins.mjs');
    const input = JSON.parse(readFileSync(join(here, 'native-input.json'), 'utf8'));
    assert.equal(basename(input.archive.filename), input.archive.filename, 'Archive basename required');
    const audit = dirname(root);
    const originals = JSON.parse(readFileSync(join(audit, 'proof/source-originals.json'), 'utf8'));
    console.log(JSON.stringify(checkNativePins(root, originals, join(audit, 'inputs', input.archive.filename), input)));
    return 0;
  }
  assert.equal(process.argv[2], undefined, 'Unknown native operation');
  const result = spawnSync('python3', [join(here, 'native_input/driver.py')], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  assert.equal(result.signal, null, 'Native child outcome is interrupted/unknown');
  return result.status;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  process.exitCode = await main();
}
