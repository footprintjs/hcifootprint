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
    const input = JSON.parse(readFileSync(join(here, 'native-input.json'), 'utf8'));
    assert.equal(input.status, 'NATIVE_SOURCE_READY', 'Awaiting qualified AF input; native pins are not activated');
    assert.equal(input.protocol, 'hcifootprint.native-input.v2', 'Current target-bound native input required');
    // Only after admission and the real strict install; pending input loads no third-party code.
    const { checkNativePins } = await import('./native_input/pins.mjs');
    assert.equal(basename(input.archive.filename), input.archive.filename, 'Archive basename required');
    const audit = dirname(root);
    const originals = JSON.parse(readFileSync(join(audit, 'proof/source-originals.json'), 'utf8'));
    console.log(JSON.stringify(checkNativePins(root, originals, join(audit, 'inputs', input.archive.filename), input)));
    return 0;
  }
  const operation = process.argv[2];
  assert.ok([undefined, 'preflight', 'view-test', 'view-docs', 'view-docs-links',
    'view-installed-cohort'].includes(operation), 'Unknown native operation');
  const args = [join(here, 'native_input/driver.py')];
  if (operation !== undefined) args.push(operation);
  const result = spawnSync('python3', args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  assert.equal(result.signal, null, 'Native child outcome is interrupted/unknown');
  return result.status;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  process.exitCode = await main();
}
