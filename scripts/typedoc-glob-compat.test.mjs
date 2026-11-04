import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { after, test } from 'node:test';
import { Minimatch } from 'minimatch';
import { glob } from '../node_modules/typedoc/dist/node-utils.js';

// Exercise TypeDoc's real directory traversal. Its literal-entry documentation
// build alone would not catch minimatch 11's removed matchOne() API.
const root = mkdtempSync(join(tmpdir(), 'hcifootprint-typedoc-glob-')).replaceAll('\\', '/');
const files = [
  'src/a.ts', 'src/b.js', 'src/nested/c.ts', 'src/nested/c.test.ts',
  'src/.hidden.ts', 'src/.dot/visible.ts', 'test/a.test.ts', 'other/d.ts',
  'other/file.txt', 'space dir/k.ts', 'node_modules/vendor/package.ts',
];
for (const file of files) {
  const path = join(root, file);
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, '// fixture\n');
}
after(() => rmSync(root, { recursive: true, force: true }));

const sorted = (xs) => xs.toSorted();
const find = (pattern, options) => sorted(
  glob(pattern, root, options).map((path) => relative(root, path).replaceAll('\\', '/')),
);
const cases = [
  ['globstar traverses matching directories', `${root}/src/**/*.ts`, ['src/a.ts', 'src/nested/c.ts', 'src/nested/c.test.ts']],
  ['brace expansion preserves both extensions', `${root}/src/**/*.{ts,js}`, ['src/a.ts', 'src/b.js', 'src/nested/c.ts', 'src/nested/c.test.ts']],
  ['brace expansion preserves directory alternatives', `${root}/{src,other}/**/*.ts`, ['src/a.ts', 'src/nested/c.ts', 'src/nested/c.test.ts', 'other/d.ts']],
  ['extglob excludes test files', `${root}/src/**/!(*.test).ts`, ['src/a.ts', 'src/nested/c.ts']],
  ['literal entry survives partial traversal', `${root}/src/nested/c.ts`, ['src/nested/c.ts']],
  ['ordinary glob ignores dot files and directories', `${root}/src/**`, ['src/a.ts', 'src/b.js', 'src/nested/c.ts', 'src/nested/c.test.ts']],
  ['implicit node_modules is excluded', `${root}/**/*.ts`, ['src/a.ts', 'src/nested/c.ts', 'src/nested/c.test.ts', 'test/a.test.ts', 'other/d.ts', 'space dir/k.ts']],
  ['explicit node_modules remains traversable', `${root}/node_modules/**/*.ts`, ['node_modules/vendor/package.ts']],
  ['negated result still traverses the positive pattern prefix', `!${root}/src/**/*.ts`, ['src/.hidden.ts', 'src/b.js']],
  ['comment pattern returns no files', `#${root}/**/*.ts`, []],
  ['paths containing spaces remain literal', `${root}/space dir/*.ts`, ['space dir/k.ts']],
];
for (const [name, pattern, expected] of cases) {
  test(name, () => assert.deepEqual(find(pattern), sorted(expected)));
}

test('directory inclusion preserves partial-path traversal', () => {
  assert.deepEqual(find(`${root}/src/**`, { includeDirectories: true }), sorted([
    'src/nested', 'src/a.ts', 'src/b.js', 'src/nested/c.ts', 'src/nested/c.test.ts',
  ]));
});

test('patched optimization expansion enforces its configured bound without timing', () => {
  const matcher = new Minimatch('**/../a/b/'.repeat(6) + 'x', {
    optimizationLevel: 2,
    braceExpandMax: 4,
  });
  assert.ok(matcher.globParts.length > 0 && matcher.globParts.length <= 4);
});
