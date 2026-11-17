import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const facade = fileURLToPath(new URL('../native_input.mjs', import.meta.url));

test('owning facade import has no setup, child or network effect', () => {
  const code = `import cp from 'node:child_process';import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';import{fileURLToPath}from'node:url';
    const refuse=()=>{throw Error('unexpected import effect')};
    const read=fs.readFileSync;fs.readFileSync=(path,...args)=>{
      if((path instanceof URL?fileURLToPath(path):String(path))!==${JSON.stringify(facade)})refuse();return read(path,...args);};
    cp.spawnSync=refuse;cp.spawn=refuse;fs.mkdirSync=refuse;fs.writeFileSync=refuse;
    globalThis.fetch=refuse;syncBuiltinESMExports();await import(${JSON.stringify(new URL('../native_input.mjs', import.meta.url).href)});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
});

test('unknown operations and caller selectors refuse before bootstrap', () => {
  for (const args of [['unknown'], ['pins', '/caller-root']]) {
    const result = spawnSync(process.execPath, [facade, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unknown native operation|accepts no roots/);
    assert.doesNotMatch(result.stderr, /driver\.py|Traceback/);
  }
});
