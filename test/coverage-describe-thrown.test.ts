import { describe, expect, it } from 'vitest';
import {
  beginWalk,
  connectAction,
  createActionRuntime,
  defineAction,
} from '../src/index.js';

/**
 * `describe-thrown.ts · thrownMessage` reads an Error's `message` once and
 * trusts it only when it is a string; anything else is printed through
 * `describeThrown` instead, so the refusal is still words.
 */
describe('walk refusal — an Error whose message is not a string is described, not trusted', () => {
  it('falls back to the printed Error when `message` is not a string (describe-thrown.ts · thrownMessage)', async () => {
    const action = defineAction('walk.non-string-message', {
      does: 'Its enabled reader throws an Error with a numeric message',
      invocation: 'inputless',
      mutate: () => 'done',
    });
    const runtime = createActionRuntime();
    const odd = new Error('placeholder');
    Object.defineProperty(odd, 'message', { value: 42 });
    let reads = 0;
    connectAction(runtime, action, {
      node: 'walk',
      enabled: () => {
        reads += 1;
        if (reads > 1) throw odd;
        return true;
      },
    });
    const manifest = await beginWalk(runtime, 'agent').run([{ action }]);
    expect(manifest.rows[0]!.status).toBe('refused');
    expect(manifest.rows[0]!.refusal).toBe('Error: 42');
    expect(manifest.completed).toBe(false);
  });
});
