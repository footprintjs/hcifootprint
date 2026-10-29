/** Package facts have one owner: package.json. Keep prose outside this block authored. */
import assert from 'node:assert/strict';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const START = '<!-- hcifootprint:metadata:start -->';
const END = '<!-- hcifootprint:metadata:end -->';
const IMPORT_START = '<!-- hcifootprint:imports:start -->';
const IMPORT_END = '<!-- hcifootprint:imports:end -->';

function markedRange(guide, startMarker, endMarker) {
  const start = guide.indexOf(startMarker), end = guide.indexOf(endMarker);
  assert.ok(start >= 0 && end > start, 'Agent guide metadata/inventory markers are missing or reversed');
  assert.equal(guide.indexOf(startMarker, start + startMarker.length), -1, 'Duplicate metadata/inventory start marker');
  assert.equal(guide.indexOf(endMarker, end + endMarker.length), -1, 'Duplicate metadata/inventory end marker');
  return { start, end };
}

export function publicImports(pkg) {
  assert.ok(pkg.exports && typeof pkg.exports === 'object' && !Array.isArray(pkg.exports),
    'Expected a package.json export map');
  return Object.entries(pkg.exports).filter(([, target]) => target !== null).map(([key]) => {
    assert.ok(key === '.' || key.startsWith('./'), `Unexpected export key: ${key}`);
    assert.ok(!key.includes('*'), 'Pattern exports need an explicit agent-guide inventory design');
    return key === '.' ? pkg.name : `${pkg.name}/${key.slice(2)}`;
  });
}

export function withPackageMetadata(guide, pkg) {
  const { start, end } = markedRange(guide, START, END);
  const imports = publicImports(pkg);
  const block = `${START}\n` +
    '<!-- Generated from package.json by npm run docs:agents:sync. -->\n' +
    `> Package: \`${pkg.name}\` ${pkg.version}.\n` +
    `> Node.js: \`${pkg.engines.node}\`.\n` +
    `> Public imports (${imports.length}): ${imports.map(name => `\`${name}\``).join(', ')}.\n` +
    END;
  return guide.slice(0, start) + block + guide.slice(end + END.length);
}

/** The authored descriptions must cover actual exports, beyond the generated inventory. */
export function checkDocumentedImports(guide, pkg) {
  const { start, end } = markedRange(guide, IMPORT_START, IMPORT_END);
  const names = [];
  let fence;
  for (const line of guide.slice(start + IMPORT_START.length, end).split('\n')) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
      continue;
    }
    const bullet = !fence && /^- `([^`]+)` — /.exec(line);
    if (bullet) names.push(bullet[1]);
  }
  assert.deepEqual([...new Set(names)].sort(), [...publicImports(pkg)].sort(),
    'Agent guide import descriptions differ from package.json exports');
}

function main() {
  const args = process.argv.slice(2);
  assert.ok(args.length === 1 && ['--check', '--write'].includes(args[0]),
    'Usage: node scripts/sync-agent-guide.mjs --check | --write');
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const path = resolve(root, 'llms.txt'), guide = readFileSync(path, 'utf8');
  const expected = withPackageMetadata(guide, pkg);
  checkDocumentedImports(expected, pkg);
  if (args[0] === '--check') {
    assert.ok(guide === expected, 'Agent guide metadata is stale. Run npm run docs:agents:sync.');
    console.log('[agents] Package version and import descriptions match package.json.');
  } else if (guide !== expected) {
    writeFileSync(path, expected);
    console.log('[agents] Updated package metadata; authored guidance preserved.');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) main();
