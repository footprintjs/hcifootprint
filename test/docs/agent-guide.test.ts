import { afterEach, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { checkDocumentedImports, publicImports, withPackageMetadata } from '../../scripts/sync-agent-guide.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (path: string): string => readFileSync(join(root, path), 'utf8');
const pkg = { name: 'hcifootprint', version: '3.2.0-next.1', engines: { node: '>=24' }, exports: { '.': {}, './browser': {} } };
const guide = '# Keep this introduction\n<!-- hcifootprint:metadata:start -->\nstale\n' +
  '<!-- hcifootprint:metadata:end -->\n\n<!-- hcifootprint:imports:start -->\n- `hcifootprint` — root guidance\n' +
  '- `hcifootprint/browser` — browser guidance\n<!-- hcifootprint:imports:end -->\n\nKeep this example unchanged.\n';
const scratch: string[] = [];
afterEach(() => { for (const path of scratch.splice(0)) rmSync(path, { recursive: true, force: true }); });

describe('agent documentation derives package facts without replacing authored guidance', () => {
  it('the actual guide is current and describes every shipped import', () => {
    const actual = read('llms.txt'), actualPackage = JSON.parse(read('package.json'));
    expect(withPackageMetadata(actual, actualPackage)).toBe(actual);
    expect(() => checkDocumentedImports(actual, actualPackage)).not.toThrow();
  });

  it('future versions and exports render from metadata and preserve all surrounding prose', () => {
    const next = withPackageMetadata(guide, pkg);
    expect(next).toContain('`hcifootprint` 3.2.0-next.1');
    expect(next).toContain('Node.js: `>=24`');
    expect(next).toContain('Public imports (2): `hcifootprint`, `hcifootprint/browser`');
    expect(next.slice(0, next.indexOf('<!-- hcifootprint:metadata:start -->'))).toBe('# Keep this introduction\n');
    expect(next.slice(next.indexOf('<!-- hcifootprint:metadata:end -->')))
      .toBe(guide.slice(guide.indexOf('<!-- hcifootprint:metadata:end -->')));
    expect(withPackageMetadata(next, pkg)).toBe(next);
  });

  it('a new import needs an authored description, not just an automatically listed name', () => {
    const next = { ...pkg, exports: { ...pkg.exports, './new-door': {} } };
    const rendered = withPackageMetadata(guide, next);
    expect(() => checkDocumentedImports(rendered, next)).toThrow(/descriptions differ/);
    const documented = rendered.replace('<!-- hcifootprint:imports:end -->',
      '- `hcifootprint/new-door` — new guidance\n<!-- hcifootprint:imports:end -->');
    expect(() => checkDocumentedImports(documented, next)).not.toThrow();
  });

  it('removing an export cannot leave its old import recommendation unnoticed', () => {
    expect(() => checkDocumentedImports(guide, { ...pkg, exports: { '.': {} } })).toThrow(/descriptions differ/);
  });

  it('examples elsewhere or inside fences cannot stand in for a missing import description', () => {
    const missing = guide.replace('- `hcifootprint/browser` — browser guidance\n', '');
    for (const example of [
      missing + '- `hcifootprint/browser` — an unrelated later bullet\n',
      missing + '```markdown\n- `hcifootprint/browser` — an example\n```\n',
      missing.replace('<!-- hcifootprint:imports:end -->',
        '~~~markdown\n- `hcifootprint/browser` — an example\n~~~\n<!-- hcifootprint:imports:end -->'),
    ]) expect(() => checkDocumentedImports(example, pkg)).toThrow(/descriptions differ/);
  });

  it('scoped packages and nested imports work, null targets are not imports, and patterns refuse clearly', () => {
    expect(publicImports({ name: '@team/hci', exports: { '.': {}, './testing/lint': {}, './removed': null } }))
      .toEqual(['@team/hci', '@team/hci/testing/lint']);
    expect(() => publicImports({ ...pkg, exports: { './*': {} } })).toThrow(/Pattern exports/);
  });

  it.each([
    guide.replace('<!-- hcifootprint:metadata:start -->', ''),
    guide.replace('<!-- hcifootprint:metadata:end -->', ''),
    '<!-- hcifootprint:metadata:end -->\n<!-- hcifootprint:metadata:start -->',
    guide + '<!-- hcifootprint:metadata:start -->',
    guide + '<!-- hcifootprint:metadata:end -->',
  ])('refuses damaged boundaries rather than overwriting unrelated content (%#)', damaged => {
    expect(() => withPackageMetadata(damaged, pkg)).toThrow(/metadata/);
  });

  it('check mode fails on stale metadata without writing, while explicit sync updates only the block', () => {
    const directory = mkdtempSync(join(tmpdir(), 'hci-agent-guide-'));
    scratch.push(directory);
    mkdirSync(join(directory, 'scripts'));
    const script = join(directory, 'scripts/sync-agent-guide.mjs');
    copyFileSync(join(root, 'scripts/sync-agent-guide.mjs'), script);
    writeFileSync(join(directory, 'package.json'), JSON.stringify(pkg));
    writeFileSync(join(directory, 'llms.txt'), guide);
    const run = (...args: string[]) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
    expect(run('--check').status).toBe(1);
    expect(readFileSync(join(directory, 'llms.txt'), 'utf8')).toBe(guide);
    expect(run('--unexpected').status).toBe(1);
    expect(readFileSync(join(directory, 'llms.txt'), 'utf8')).toBe(guide);
    expect(run().status).toBe(1);
    expect(run('--write').status).toBe(0);
    const updated = readFileSync(join(directory, 'llms.txt'), 'utf8');
    expect(updated).toBe(withPackageMetadata(guide, pkg));
    expect(run('--check').status).toBe(0);
    expect(readFileSync(join(directory, 'llms.txt'), 'utf8')).toBe(updated);
  });
});
