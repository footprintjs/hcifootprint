/**
 * The whole demo, end to end, with no key and no network: a scripted model
 * driving a real session over a real store.
 *
 * These are the claims the app's panels make, made once here as assertions.
 */
import { describe, expect, it } from 'vitest';
import { NAMED_TICKET_ID } from '../app/tickets.js';
import { backlogOf } from '../panels/backlog.js';
import { bootDesk, flush } from '../desk/fixture.js';
import { createBridge } from './bridge.js';
import { buildProvider } from './providers.js';
import { runTurn } from './chat.js';

async function scriptedDesk() {
  const desk = await bootDesk();
  const bridge = createBridge(desk.session);
  const built = buildProvider('mock', '');
  return { desk, bridge, deps: { desk, bridge, provider: built.provider, model: built.modelLabel } };
}

describe('the agent works the desk', () => {
  it('replies to the ticket the desk never showed it, and quotes what came back', async () => {
    const { desk, deps } = await scriptedDesk();

    const turn = await runTurn(deps, 'Reply to Priya’s ticket about the refund.');
    await flush();

    // It looked, then asked which ticket that was, then acted — no guessing.
    expect(turn.calls.map((call) => call.name)).toEqual([
      'desk__whats_here',
      'desk__do_action',
      'desk__do_action',
    ]);
    expect(turn.calls[1]?.args).toMatchObject({ action: 'list-tickets' });
    expect(turn.calls[2]?.args).toMatchObject({ action: 'reply-to-ticket', instance: NAMED_TICKET_ID });

    // The desk really moved.
    expect(desk.store.state.tickets.find((row) => row.id === NAMED_TICKET_ID)?.replied).toBe(true);
    expect(desk.store.state.lastRepliedTo).toBe(NAMED_TICKET_ID);

    // And the answer is made of what the desk returned.
    expect(turn.reply).toContain(NAMED_TICKET_ID);
    expect(turn.reply).toContain('Priya Raman');
    expect(turn.reply).toContain('Refund for the duplicate annual plan');
    expect(turn.reply).toContain('NOT among the 50 rows');

    // One fired transition, settled and verified, with the row's data attached.
    const fired = desk.session.transitions().filter((row) => row.cause.kind === 'fired');
    const reply = fired.find((row) => row.cause.affordanceId === 'desk.inbox.tickets.reply-to-ticket');
    expect(reply?.outcome).toBe('committed');
    expect(reply?.effectVerified).toBe(true);
    expect(reply?.cause.principal).toBe('agent');
  });

  it('reports a refusal as a refusal — and the backlog says which wiring is missing', async () => {
    const { desk, deps } = await scriptedDesk();

    const turn = await runTurn(deps, 'Switch to the archive tab.');
    await flush();

    expect(turn.reply).toContain('NOT_MATERIALIZED');
    expect(turn.reply).not.toMatch(/\bDone\b/);
    expect(desk.store.state.tab).toBe('inbox'); // nothing happened, and it said so

    const backlog = backlogOf(desk.session.gaps());
    expect(backlog.clusters[0]).toMatchObject({
      gesture: 'tab',
      reason: 'NOT_MATERIALIZED',
      count: 1,
      actions: ['desk.switch-to-archive'],
    });
  });

  it('once the app wires that gesture, the same ask performs — and the cursor stays put', async () => {
    const { desk, deps } = await scriptedDesk();
    await runTurn(deps, 'Switch to the archive tab.');
    await flush();

    // The app wires it — the demand backlog is what told the team to.
    desk.store.mountControl('archive-panel');
    desk.store.commands.setTabSwitcherWired(true);
    await flush();

    const nodeBefore = desk.session.node;
    const turn = await runTurn(
      { ...deps, sinceVersion: desk.session.version },
      'Switch to the archive tab.',
    );
    await flush();

    expect(desk.store.state.tab).toBe('archive');
    expect(desk.session.node).toBe(nodeBefore);
    // The tab really flipped — and the agent still reports the word the result
    // carried: a tool result is built before the handler has run, so
    // effectStatus is 'pending' at return time. It says that instead of "done".
    expect(turn.reply).toContain('effectStatus=pending');
    expect(turn.reply).toContain("It still puts you on 'desk'");
    expect(desk.session.available().edges.map((edge) => edge.affordanceId)).toContain(
      'desk.archive.clear-archive',
    );
  });

  it('will not clear the archive on its own: it shows the receipts and waits', async () => {
    const { desk, deps } = await scriptedDesk();
    desk.store.mountControl('archive-panel');
    desk.store.commands.setTabSwitcherWired(true);
    desk.store.commands.switchTab('archive');
    await flush();

    const turn = await runTurn(deps, 'Clear the archive.');
    await flush();

    expect(turn.reply).toContain('without you saying yes');
    expect(turn.reply).toContain('archivedCount');
    // The ask is journalled; nothing fired.
    expect(desk.session.confirms().map((row) => row.kind)).toEqual(['ask']);
    expect(
      desk.session.transitions().some((row) => row.cause.affordanceId === 'desk.archive.clear-archive'),
    ).toBe(false);
  });

  it('answers "why" out of the session’s own causal account', async () => {
    const { desk, deps } = await scriptedDesk();
    await runTurn(deps, 'Reply to Priya’s ticket about the refund.');
    await flush();

    const turn = await runTurn({ ...deps, sinceVersion: desk.session.version }, 'Why is repliedCount 1?');
    expect(turn.calls.map((call) => call.name)).toEqual(['desk__why']);
    expect(turn.reply).toContain(desk.session.why('repliedCount'));
  });
});
