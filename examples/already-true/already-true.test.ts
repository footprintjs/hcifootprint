/**
 * The example is a TEST, so the transcript in the docs cannot rot: it drives
 * the same wiring through the same port and asserts what came back.
 */
import { describe, expect, it, vi } from 'vitest';
import { serveToAgent } from '../../src/index.js';
import { wireDesk } from './app.js';
import { main } from './run.js';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('the already-true example', () => {
  it('answers on the FIRST result, and the poll after it ends', async () => {
    const port = serveToAgent(wireDesk('billing'), { source: 'agent' });
    const pressed = port.call('desk.do_action', { action: 'open-billing' });
    expect(pressed['alreadyTrue']).toHaveLength(1);
    expect(pressed['why']).toContain('That was already the case');
    await flush();
    const polled = port.call('desk.did_it_work', { transitionId: pressed['transitionId'] as string });
    expect(polled).toMatchObject({ settled: true, effectStatus: 'performed', verifyHeld: true });
    expect(polled['alreadyTrue']).toHaveLength(1);
  });

  it('leaves the ordinary press exactly as it was', async () => {
    const port = serveToAgent(wireDesk('claims'), { source: 'agent' });
    const real = port.call('desk.do_action', { action: 'open-billing' });
    expect(real['alreadyTrue']).toBeUndefined();
    await flush();
    expect(port.call('desk.did_it_work', { transitionId: real['transitionId'] as string })).toMatchObject({
      settled: true,
      effectVerified: true,
    });
  });

  it('and says nothing at all about an action that declares no verify — the honest limit', async () => {
    const port = serveToAgent(wireDesk('claims'), { source: 'agent' });
    const bare = port.call('desk.do_action', { action: 'open-claims' });
    expect(bare['alreadyTrue']).toBeUndefined();
    await flush();
    // Still pending, because the app's store published nothing and this action
    // gave the library no value to compare. Printed in the transcript on
    // purpose: it is what the one line of `verify` buys.
    expect(port.call('desk.did_it_work', { transitionId: bare['transitionId'] as string })).toMatchObject({
      settled: false,
      judgment: 'still-pending',
    });
  });

  it('the transcript runs clean', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await main();
    const printed = log.mock.calls.map((call) => String(call[0])).join('\n');
    log.mockRestore();
    expect(printed).toContain('ALREADY TRUE');
    expect(printed).toContain('That was already the case');
    expect(printed).toContain('THE HONEST LIMIT');
  });
});
