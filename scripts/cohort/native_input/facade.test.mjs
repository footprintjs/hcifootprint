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
  for (const args of [['unknown'], ['pins', '/caller-root'], ['preflight', '/caller-root']]) {
    const result = spawnSync(process.execPath, [facade, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unknown native operation|accepts no roots/);
    assert.doesNotMatch(result.stderr, /driver\.py|Traceback/);
  }
});

test('preflight forwards only its fixed standard-library operation', () => {
  const code = `import cp from 'node:child_process';import{syncBuiltinESMExports}from'node:module';
    cp.spawnSync=(program,args,options)=>{
      if(program!=='python3'||args.length!==2||!args[0].endsWith('/native_input/driver.py')||args[1]!=='preflight'||options.stdio!=='inherit')throw Error('wrong fixed operation');
      console.log('fixed preflight forwarded');return {status:0,signal:null};};
    globalThis.fetch=()=>{throw Error('unexpected network')};syncBuiltinESMExports();
    process.argv=[process.execPath,${JSON.stringify(facade)},'preflight'];
    await import(${JSON.stringify(new URL('../native_input.mjs', import.meta.url).href)});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'fixed preflight forwarded');
});

test('proof views forward closed operations without third-party loading', () => {
  for (const view of ['test', 'docs', 'docs-links', 'installed-cohort']) {
    const mode = 'view-' + view;
    const code = `import cp from 'node:child_process';import{syncBuiltinESMExports}from'node:module';
      cp.spawnSync=(program,args)=>{
        if(program!=='python3'||args.length!==2||!args[0].endsWith('/native_input/driver.py')||args[1]!==${JSON.stringify(mode)})throw Error('wrong fixed view');
        return {status:0,signal:null};};
      globalThis.fetch=()=>{throw Error('unexpected network')};syncBuiltinESMExports();
      process.argv=[process.execPath,${JSON.stringify(facade)},${JSON.stringify(mode)}];
      await import(${JSON.stringify(new URL('../native_input.mjs', import.meta.url).href)});`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  for (const args of [['view-caller-command'], ['view-docs', '/caller-root']]) {
    const result = spawnSync(process.execPath, [facade, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stderr, /driver\.py|Traceback/);
  }
});

test('pending pin mode refuses before third-party loading or child effects', () => {
  const input = fileURLToPath(new URL('../native-input.json', import.meta.url));
  const code = `import cp from 'node:child_process';import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';import{fileURLToPath}from'node:url';
    const refuse=()=>{throw Error('unexpected pending effect')};
    const read=fs.readFileSync;fs.readFileSync=(path,...args)=>{
      const name=path instanceof URL?fileURLToPath(path):String(path);
      if(name===${JSON.stringify(input)})return JSON.stringify({protocol:'hcifootprint.native-input.v2',status:'AWAITING_QUALIFIED_AF'});
      if(name!==${JSON.stringify(facade)})refuse();return read(path,...args);};
    cp.spawnSync=refuse;cp.spawn=refuse;globalThis.fetch=refuse;syncBuiltinESMExports();
    process.argv=[process.execPath,${JSON.stringify(facade)},'pins'];
    await import(${JSON.stringify(new URL('../native_input.mjs', import.meta.url).href)});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Awaiting qualified AF input/);
  assert.doesNotMatch(result.stderr, /unexpected pending effect|driver\.py|Traceback/);
});
