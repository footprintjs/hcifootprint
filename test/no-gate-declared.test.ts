/**
 * NOBODY APPROVED THAT — the once-per-session complaint on the first high-effect
 * agent fire that nothing held.
 *
 * The field report behind it: an expert integrator put the human in the loop
 * where it was easiest to see — `confirmHighEffect` on one serving port, and an
 * approvals Set inside one chatbot — and a second consumer holding the SAME
 * session placed a real order with no card raised and no record that an approval
 * had been skipped. Both gates were properties of a DOOR. The library's own
 * session-level gate (`requireHumanApproval`) was never declared, and nothing
 * told anyone they were in that state.
 *
 * This is DISCOVERABILITY, not enforcement: no refusal, no new result field, no
 * changed default. Every assertion below is about who hears it and how often.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import type { NavigationGraph } from '../src/index.js';

function shopMap(): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: {
      checkout: {
        actions: {
          'place-order': { does: 'Place the order', confirm: true, writes: ['orders'] },
          'apply-code': { does: 'Apply a discount code', confirm: true, writes: ['discount'] },
          'edit-address': { does: 'Edit the delivery address', writes: ['address'] },
        },
      },
    },
  });
}

function shopSession(opts: { requireHumanApproval?: boolean } = {}) {
  const warnings: string[] = [];
  const session = shopMap().createSession({
    node: 'checkout',
    state: { orders: [] },
    onWarn: (message) => warnings.push(message),
    ...opts,
  });
  session.registerActions('checkout', {
    handlers: {
      'place-order': () => undefined,
      'apply-code': () => undefined,
      'edit-address': () => undefined,
    },
  });
  return { session, warnings };
}

const ungated = (warnings: string[]): string[] =>
  warnings.filter((line) => line.includes('NO human approval on record'));

describe('the first ungated high-effect agent fire says so', () => {
  it('names the action, the option, and what actually happened', () => {
    const { session, warnings } = shopSession();
    session.fire('checkout.place-order', { source: 'agent' });

    expect(ungated(warnings)).toHaveLength(1);
    const said = ungated(warnings)[0];
    expect(said).toContain("'checkout.place-order'");
    expect(said).toContain('requireHumanApproval');
    expect(said).toContain('Said once per session.');
  });

  it('is a warning and nothing else — the fire still happened', () => {
    const { session } = shopSession();
    const fired = session.fire('checkout.place-order', { source: 'agent' });
    expect(fired.ok).toBe(true);
    expect(session.transitions()).toHaveLength(1);
  });

  it('is said ONCE per session, however many more there are', () => {
    const { session, warnings } = shopSession();
    session.fire('checkout.place-order', { source: 'agent' });
    session.fire('checkout.apply-code', { source: 'agent' });
    session.fire('checkout.place-order', { source: 'agent' });
    expect(ungated(warnings)).toHaveLength(1);
  });
});

describe('who never hears it', () => {
  it('an app declaring the policy — requireHumanApproval: true', () => {
    const { session, warnings } = shopSession({ requireHumanApproval: true });
    session.fire('checkout.place-order', { source: 'agent' }); // refused by the gate
    expect(ungated(warnings)).toEqual([]);
  });

  it('an app declaring it MEANS the default — requireHumanApproval: false is a statement, absence is not', () => {
    const { session, warnings } = shopSession({ requireHumanApproval: false });
    session.fire('checkout.place-order', { source: 'agent' });
    expect(ungated(warnings)).toEqual([]);
  });

  it('the app reporting its own motion — a user or system fire really happened', () => {
    const { session, warnings } = shopSession();
    session.fire('checkout.place-order', { source: 'user' });
    session.fire('checkout.place-order', { source: 'system' });
    expect(ungated(warnings)).toEqual([]);
  });

  it('a record-only fire (invoke: false) — nothing executed here, so nothing went unheld', () => {
    const { session, warnings } = shopSession();
    session.fire('checkout.place-order', { source: 'agent', invoke: false });
    expect(ungated(warnings)).toEqual([]);
  });

  it('an action that is not high-effect — the app never called it one', () => {
    const { session, warnings } = shopSession();
    session.fire('checkout.edit-address', { source: 'agent' });
    expect(ungated(warnings)).toEqual([]);
  });

  it('a fire a human ANSWERED — an ask landed on the record, which is the configuration this asks for', () => {
    const { session, warnings } = shopSession();
    session.confirmAsk('checkout.place-order'); // the port's needs-confirm turn
    session.fire('checkout.place-order', { source: 'agent' });

    expect(session.transitions()[0].askId).toBeDefined();
    expect(ungated(warnings)).toEqual([]);
  });
});
