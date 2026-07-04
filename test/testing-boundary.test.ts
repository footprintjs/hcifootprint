/**
 * Import-boundary guard: the hcifootprint/testing subpath must stay engine-
 * light and MCP-free.
 *
 * 1. NOTHING under src/testing may reach the optional @modelcontextprotocol/sdk
 *    peer nor the mcp-server module — else a consumer's test bundle drags the
 *    SDK in and the "zero new deps" promise breaks.
 * 2. The LINT module graph (the hcifootprint/testing/lint entry) must import
 *    footprint only as `import type` — no value import — so a plain node/tsx CI
 *    lint loads zero engine code.
 * 3. The main entry must not import the testing subpath.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('hcifootprint/testing import boundary — no MCP SDK', () => {
  const files = walk('src/testing');

  it('has source files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file} never mentions the MCP SDK or mcp-server`, () => {
      const source = readFileSync(file, 'utf8');
      // Full-source substring scan (catches side-effect, dynamic, and multi-line
      // imports the naive from-line regex would miss). These strings appear
      // nowhere legitimate in the testing layer — code OR comment.
      expect(source).not.toContain('@modelcontextprotocol/sdk');
      expect(source).not.toContain('serve/mcp-server');
      expect(source).not.toMatch(/\bfrom\s+['"][.][.]?\/mcp(\.js)?['"]/);
      expect(source).not.toMatch(/\bimport\s*\(\s*['"][^'"]*mcp/); // dynamic import()
    });
  }
});

describe('hcifootprint/testing/lint is engine-free (footprint imported as type only)', () => {
  // The exact module graph reachable from the /testing/lint entry.
  const lintGraphFiles = [
    'src/testing/lint.ts',
    'src/testing/model/lint.ts',
    'src/testing/model/check.ts',
    'src/testing/model/satisfiable.ts',
    'src/graph/skill-deps.ts',
  ];

  for (const file of lintGraphFiles) {
    it(`${file} imports footprint only via 'import type'`, () => {
      const source = readFileSync(file, 'utf8');
      const lines = source.split('\n');
      for (const line of lines) {
        // A VALUE import (not `import type`) from any footprintjs entry is forbidden.
        if (/^\s*import\s+(?!type\b)/.test(line) && /['"]footprintjs(\/[^'"]*)?['"]/.test(line)) {
          throw new Error(`engine leak in ${file}: value import of footprint — ${line.trim()}`);
        }
      }
      expect(true).toBe(true);
    });
  }
});

describe('main entry does not import the testing subpath', () => {
  it('src/index.ts has no testing import', () => {
    const index = readFileSync('src/index.ts', 'utf8');
    expect(index).not.toMatch(/from ['"][^'"]*testing/);
  });
});
