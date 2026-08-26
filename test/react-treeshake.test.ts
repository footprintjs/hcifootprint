import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

describe('useActionBinding bundle boundary', () => {
  it('ships only the React skin and framework-neutral action leaves', async () => {
    const result = await build({
      external: ['react'],
      stdin: {
        contents:
          "export { useActionBinding } from './src/react/index.ts';",
        resolveDir: repoRoot,
        loader: 'ts',
      },
      bundle: true,
      minify: true,
      format: 'esm',
      write: false,
      metafile: true,
      logLevel: 'silent',
    });
    const [output] = Object.values(result.metafile!.outputs);
    const contributors = Object.entries(output!.inputs)
      .filter(([, metadata]) => metadata.bytesInOutput > 0)
      .map(([file]) => file)
      .sort();

    expect(contributors).toEqual([
      'src/action/connection.ts',
      'src/action/coverage.ts',
      'src/action/host-adapter.ts',
      // The 2.4 split moved withObserverCapture into its own leaf — a new
      // NAME in this list, not new weight: the same bytes that lived inside
      // connection.ts before, now attributed to their own concern. The laws
      // stand unchanged below: no traverse/, no sensor/, and the byte cap.
      'src/action/observer-capture.ts',
      'src/react/use-action-binding.ts',
    ]);
    for (const forbidden of [
      'src/sensor/',
      'src/traverse/',
      'src/tree/',
      'src/registry/',
      'node_modules/footprintjs',
    ]) {
      expect(
        contributors.filter((file) => file.includes(forbidden)),
        `useActionBinding must not ship ${forbidden}`,
      ).toEqual([]);
    }
    expect(output!.bytes).toBeLessThanOrEqual(8 * 1024);
  });
});
