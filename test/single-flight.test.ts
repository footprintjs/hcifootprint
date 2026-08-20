/**
 * ONE OCCURRENCE AT A TIME — and it clears on SETTLEMENT, on nothing else.
 *
 * The measured failure this exists for: a high-effect fire went out, its
 * settlement had not come back, and the next turn served the control looking
 * exactly like a fresh one. `priorFireUnsettled` already puts that fact on the
 * row and refuses nothing — correctly, because there are legitimate retries and
 * the caller is the only one who can tell. The stamp was on the row, and the
 * second payment happened anyway. So the app gets to say, per action, that this
 * particular repeat is not a turn-by-turn judgement call.
 *
 * WHAT THIS FILE PINS:
 *
 * 1. OFF BY DEFAULT. No declaration, no refusal — two fires, two occurrences,
 *    exactly as before.
 * 2. IT CLEARS ONLY ON REAL SETTLEMENT, through any of FOUR doors. Not a timeout
 *    (nothing here reads a clock), not another look, not the caller saying the
 *    first one is done. The handler resolving, the app's state report landing,
 *    `reject()`, or `observeEffect()` for an effect this client cannot see —
 *    and `howToSettle` has to name all four, or it is advice that does not work.
 * 3. THE PAYLOAD SCOPE DECLINES TOWARD REFUSE. A second fire is let through only
 *    when the two inputs are PROVABLY different — an unprovable difference is
 *    not a difference on a repeat-suppression boundary.
 * 4. IT NEVER REFUSES REALITY. The app self-reporting motion it already
 *    performed (`invoke: false`) is not this session firing twice.
 *
 * MUTATION PROOFS — each one was applied to the source and this file re-run
 * (29 tests); the number is how many died.
 * - Make an undeclared action single-flight (default the wrong way) → 1 red.
 * - Clear the flight on the next look instead of on settlement → 4 red.
 * - Clear it when the caller merely ASKS about it (settlementIfKnown) → 1 red.
 * - Treat an unrenderable payload as provably different → 1 red.
 * - Ignore `scope`, so every single-flight action blocks per action → 2 red.
 * - Gate `invoke: false` too, so the app cannot report its own motion → 1 red.
 * - Put the gate AFTER the approval gate (drop the row's verdict) → 1 red.
 * - Keep the flight after the latch closes (a second ledger that drifts) → 5 red.
 * - Drop observeEffect from HOW_TO_SETTLE (name three doors, not four) → 1 red.
 */
import { describe, expect, it } from 'vitest';
import { GraphValidationError, buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { ConcurrencyPolicy, FireResult, ServeResult } from '../src/index.js';
import { priorFlight, scopeOf } from '../src/traverse/single-flight.js';
import type { Flight } from '../src/traverse/single-flight.js';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

// ---------------------------------------------------------------------------
// The scan, on its own
// ---------------------------------------------------------------------------

describe('what counts as the same fire again', () => {
  const open = (rows: Array<[string, Flight]>) => rows;
  const flight = (over: Partial<Flight> = {}): Flight => ({
    actionId: 'pay.invoice',
    instance: undefined,
    render: undefined,
    ...over,
  });

  it("'action' is the default, and it is the answer that can never be too weak", () => {
    expect(scopeOf(undefined)).toBe('action');
    expect(scopeOf({ mode: 'single-flight' })).toBe('action');
    expect(scopeOf({ mode: 'single-flight', scope: 'payload' })).toBe('payload');
  });

  it('another action’s open fire is not this action’s repeat', () => {
    const found = priorFlight(open([['other#0', flight({ actionId: 'pay.other' })]]), {
      actionId: 'pay.invoice',
      scope: 'action',
      instance: undefined,
      render: undefined,
    });
    expect(found).toBeUndefined();
  });

  it('under instance scope, another card is another fire', () => {
    const rows = open([['pay.invoice#0', flight({ instance: 'inv-1' })]]);
    const q = { actionId: 'pay.invoice', scope: 'instance' as const, render: undefined };
    expect(priorFlight(rows, { ...q, instance: 'inv-2' })).toBeUndefined();
    expect(priorFlight(rows, { ...q, instance: 'inv-1' })).toBe('pay.invoice#0');
  });

  it('under payload scope, only a PROVEN difference lets the second one through', () => {
    const rows = open([['pay.invoice#0', flight({ render: 'A' })]]);
    const q = { actionId: 'pay.invoice', scope: 'payload' as const, instance: undefined };
    expect(priorFlight(rows, { ...q, render: 'B' })).toBeUndefined();
    expect(priorFlight(rows, { ...q, render: 'A' })).toBe('pay.invoice#0');
    // Either side unrenderable: this library cannot prove a difference, so it
    // does not claim one — the same stance same-input.ts takes at the gate.
    expect(priorFlight(rows, { ...q, render: undefined })).toBe('pay.invoice#0');
    expect(
      priorFlight(open([['pay.invoice#0', flight({ render: undefined })]]), { ...q, render: 'B' }),
    ).toBe('pay.invoice#0');
  });

  it('nothing in flight is nothing to report', () => {
    expect(
      priorFlight(open([]), {
        actionId: 'pay.invoice',
        scope: 'action',
        instance: undefined,
        render: undefined,
      }),
    ).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Through a real session
// ---------------------------------------------------------------------------

function till(opts: { concurrency?: ConcurrencyPolicy; confirm?: boolean } = {}) {
  let settle: (() => void) | undefined;
  const map = buildNavigationGraph('till', {
    pages: {
      counter: {
        actions: {
          pay: {
            does: 'Pay the invoice',
            writes: ['invoice.paid'],
            ...(opts.confirm ? { confirm: true } : {}),
            ...(opts.concurrency ? { concurrency: opts.concurrency } : {}),
          },
          look: { does: 'Look at the invoice' },
        },
      },
    },
  });
  const session = map.createSession({
    node: 'counter',
    state: { 'invoice.paid': false },
    onWarn: () => undefined,
  });
  session.registerActions('counter', {
    handlers: {
      pay: () => new Promise<void>((resolve) => (settle = resolve)),
      look: () => undefined,
    },
  });
  return { map, session, finish: () => settle?.() };
}

const refused = (fired: FireResult): Extract<FireResult, { ok: false }> => {
  expect(fired.ok).toBe(false);
  return fired as Extract<FireResult, { ok: false }>;
};

describe('off by default', () => {
  it('two fires are two occurrences, exactly as before', () => {
    const { session } = till();
    expect(session.fire('counter.pay', { source: 'agent' }).ok).toBe(true);
    expect(session.fire('counter.pay', { source: 'agent' }).ok).toBe(true);
    expect(session.awaitingSettlement()).toHaveLength(2);
  });

  it('and an explicit `parallel` says the same thing out loud', () => {
    const { session } = till({ concurrency: { mode: 'parallel' } });
    expect(session.fire('counter.pay', { source: 'agent' }).ok).toBe(true);
    expect(session.fire('counter.pay', { source: 'agent' }).ok).toBe(true);
  });
});

describe('single-flight — the second one is refused, with the first one’s id', () => {
  it('the refusal names the fire that is still out there and how to settle it', () => {
    const { session } = till({ concurrency: { mode: 'single-flight' } });
    const first = session.fire('counter.pay', { source: 'agent' });
    expect(first.ok).toBe(true);
    const second = refused(session.fire('counter.pay', { source: 'agent' }));
    expect(second).toEqual({
      ok: false,
      reason: 'PRIOR_FIRE_PENDING',
      affordanceId: 'counter.pay',
      pendingTransitionId: (first as Extract<FireResult, { ok: true }>).transition.id,
      scope: 'action',
      howToSettle: expect.stringContaining('settles') as unknown as string,
    });
    // And it says out loud that no clock will do it for you.
    expect(second).toMatchObject({ howToSettle: expect.stringContaining('No timeout') as unknown as string });
  });

  it('NOTHING BUT A SETTLEMENT CLEARS IT — not a look, not a question, not another fire', async () => {
    const { session } = till({ concurrency: { mode: 'single-flight' } });
    const first = session.fire('counter.pay', { source: 'agent' });
    const id = (first as Extract<FireResult, { ok: true }>).transition.id;
    // Looking does not clear it. Asking about it does not clear it. Firing
    // something else does not clear it. And no amount of elapsed turns does.
    session.available();
    session.settlementIfKnown(id);
    session.fire('counter.look', { source: 'agent' });
    await tick();
    expect(refused(session.fire('counter.pay', { source: 'agent' })).reason).toBe('PRIOR_FIRE_PENDING');

    // The app reporting the delta IS the settlement for a declared-writes fire.
    session.updateState({ 'invoice.paid': true }, { transitionId: id });
    expect(session.awaitingSettlement()).toHaveLength(0);
    expect(session.fire('counter.pay', { source: 'agent' }).ok).toBe(true);
  });

  it('and the handler running to completion settles a fire nothing else will report', async () => {
    const map = buildNavigationGraph('till', {
      pages: { counter: { actions: { ping: { does: 'Ping', concurrency: { mode: 'single-flight' } } } } },
    });
    const session = map.createSession({ node: 'counter', state: {}, onWarn: () => undefined });
    let finish: (() => void) | undefined;
    session.registerActions('counter', {
      handlers: { ping: () => new Promise<void>((resolve) => (finish = resolve)) },
    });
    expect(session.fire('counter.ping', { source: 'agent' }).ok).toBe(true);
    await tick(); // the handler is always deferred — it starts on the next turn
    expect(refused(session.fire('counter.ping', { source: 'agent' })).reason).toBe('PRIOR_FIRE_PENDING');
    finish!();
    await tick();
    expect(session.fire('counter.ping', { source: 'agent' }).ok).toBe(true);
  });

  it('the row says so BEFORE the fire — a verdict, beside the fact', () => {
    const { session } = till({ concurrency: { mode: 'single-flight' } });
    expect(session.available().edges.find((e) => e.affordanceId === 'counter.pay')).not.toHaveProperty(
      'heldByPriorFire',
    );
    session.fire('counter.pay', { source: 'agent' });
    expect(
      session.available().edges.find((e) => e.affordanceId === 'counter.pay')!.heldByPriorFire,
    ).toBe(true);
    // A control that declared nothing never carries the verdict, held or not.
    expect(session.available().edges.find((e) => e.affordanceId === 'counter.look')).not.toHaveProperty(
      'heldByPriorFire',
    );
  });

  it('and a NARROWER scope says nothing there, because a row cannot answer for one card', () => {
    const map = buildNavigationGraph('till', {
      pages: {
        counter: {
          actions: {
            pay: { does: 'Pay', concurrency: { mode: 'single-flight', scope: 'payload' } },
          },
        },
      },
    });
    const session = map.createSession({ node: 'counter', state: {}, onWarn: () => undefined });
    session.registerActions('counter', { handlers: { pay: () => new Promise<void>(() => undefined) } });
    session.fire('counter.pay', { source: 'agent', payload: { a: 1 } });
    expect(session.available().edges[0]).not.toHaveProperty('heldByPriorFire');
  });

  it('a fire that FAILED has still come to rest, so the next one may go', async () => {
    const map = buildNavigationGraph('till', {
      pages: {
        counter: {
          actions: {
            pay: {
              does: 'Pay the invoice',
              writes: ['invoice.paid'],
              concurrency: { mode: 'single-flight' },
            },
          },
        },
      },
    });
    const session = map.createSession({
      node: 'counter',
      state: { 'invoice.paid': false },
      onWarn: () => undefined,
    });
    session.registerActions('counter', {
      handlers: {
        pay: () => {
          throw new Error('the card was declined');
        },
      },
    });
    expect(session.fire('counter.pay', { source: 'agent' }).ok).toBe(true);
    await tick();
    expect(session.fire('counter.pay', { source: 'agent' }).ok).toBe(true);
  });

  it('the app’s own state report settles it too — the door a tapped session uses', async () => {
    const { session } = till({ concurrency: { mode: 'single-flight' } });
    const first = session.fire('counter.pay', { source: 'agent' });
    const id = (first as Extract<FireResult, { ok: true }>).transition.id;
    session.updateState({ 'invoice.paid': true }, { transitionId: id });
    await tick();
    expect(session.fire('counter.pay', { source: 'agent' }).ok).toBe(true);
  });

  it('and so does reject() — the app saying it did not happen', async () => {
    const { session } = till({ concurrency: { mode: 'single-flight' } });
    const first = session.fire('counter.pay', { source: 'agent' });
    session.reject((first as Extract<FireResult, { ok: true }>).transition.id);
    await tick();
    expect(session.fire('counter.pay', { source: 'agent' }).ok).toBe(true);
  });

  // THE FOURTH DOOR, and the shape this release was built for: an effect the
  // browser cannot see, held open until something outside reports. The sentence
  // and the code are pinned together here — a howToSettle naming three doors
  // would send an integrator holding a webhook looking for a handler that was
  // never going to resolve.
  it('AND SO DOES AN EXTERNAL REPORT — the door observability:external opens', async () => {
    const map = buildNavigationGraph('till', {
      pages: {
        counter: {
          actions: {
            pay: {
              does: 'Pay the invoice',
              highEffect: true,
              writes: ['invoice.paid'],
              observability: 'external',
              concurrency: { mode: 'single-flight' },
            },
          },
        },
      },
    });
    const session = map.createSession({
      node: 'counter',
      state: { 'invoice.paid': false },
      onWarn: () => undefined,
    });
    session.registerActions('counter', { handlers: { pay: () => new Promise<void>(() => undefined) } });
    const first = session.fire('counter.pay', { source: 'agent' });
    const id = (first as Extract<FireResult, { ok: true }>).transition.id;
    const second = refused(session.fire('counter.pay', { source: 'agent' }));
    expect(second.reason).toBe('PRIOR_FIRE_PENDING');
    // The sentence must NAME this door, or it is advice that does not work.
    expect(second).toMatchObject({
      howToSettle: expect.stringContaining('observeEffect') as unknown as string,
    });
    session.observeEffect(id, { source: 'stripe-webhook', status: 'performed' });
    await tick();
    expect(session.awaitingSettlement()).toHaveLength(0);
    expect(session.fire('counter.pay', { source: 'agent' }).ok).toBe(true);
  });

  it('the refusal is a gap-ledger row like every other', () => {
    const { session } = till({ concurrency: { mode: 'single-flight' } });
    session.fire('counter.pay', { source: 'agent' });
    session.fire('counter.pay', { source: 'agent' });
    expect(session.gaps().at(-1)).toMatchObject({
      kind: 'fire-rejected',
      rejectionReason: 'PRIOR_FIRE_PENDING',
    });
  });

  it('IT NEVER REFUSES REALITY: the app reporting its own motion is not a repeat', () => {
    const { session } = till({ concurrency: { mode: 'single-flight' } });
    session.fire('counter.pay', { source: 'agent' });
    expect(session.fire('counter.pay', { source: 'user', invoke: false }).ok).toBe(true);
  });
});

describe('the scopes', () => {
  function cards(scope: ConcurrencyPolicy['scope']) {
    const map = buildNavigationGraph('till', {
      pages: {
        counter: {
          areas: {
            invoices: {
              repeats: true,
              instances: () => ['inv-1', 'inv-2'],
              actions: {
                pay: {
                  does: 'Pay this invoice',
                  writes: ['invoice.paid'],
                  concurrency: { mode: 'single-flight', ...(scope ? { scope } : {}) },
                },
              },
            },
          },
        },
      },
    });
    const session = map.createSession({
      node: 'counter',
      state: { 'invoice.paid': false },
      onWarn: () => undefined,
    });
    session.registerActions('counter.invoices', { handlers: { pay: () => new Promise<void>(() => undefined) } });
    return session;
  }

  it('ACTION scope holds the whole control, whichever card asked', () => {
    const session = cards('action');
    expect(session.fire('counter.invoices.pay', { source: 'agent', instance: 'inv-1' }).ok).toBe(true);
    expect(
      refused(session.fire('counter.invoices.pay', { source: 'agent', instance: 'inv-2' })).reason,
    ).toBe('PRIOR_FIRE_PENDING');
  });

  it('INSTANCE scope holds one card, so its neighbour still works', () => {
    const session = cards('instance');
    expect(session.fire('counter.invoices.pay', { source: 'agent', instance: 'inv-1' }).ok).toBe(true);
    expect(session.fire('counter.invoices.pay', { source: 'agent', instance: 'inv-2' }).ok).toBe(true);
    const again = refused(session.fire('counter.invoices.pay', { source: 'agent', instance: 'inv-1' }));
    expect(again).toMatchObject({ reason: 'PRIOR_FIRE_PENDING', scope: 'instance' });
  });

  it('PAYLOAD scope holds one exact input, and lets a different one through', () => {
    const map = buildNavigationGraph('till', {
      pages: {
        counter: {
          actions: {
            pay: {
              does: 'Pay the invoice',
              writes: ['invoice.paid'],
              concurrency: { mode: 'single-flight', scope: 'payload' },
            },
          },
        },
      },
    });
    const session = map.createSession({
      node: 'counter',
      state: { 'invoice.paid': false },
      onWarn: () => undefined,
    });
    session.registerActions('counter', { handlers: { pay: () => new Promise<void>(() => undefined) } });
    expect(session.fire('counter.pay', { source: 'agent', payload: { invoice: 'A' } }).ok).toBe(true);
    expect(session.fire('counter.pay', { source: 'agent', payload: { invoice: 'B' } }).ok).toBe(true);
    // Key ORDER is not a difference — the same canonical rendering the approval
    // gate compares over.
    const repeat = refused(session.fire('counter.pay', { source: 'agent', payload: { invoice: 'A' } }));
    expect(repeat).toMatchObject({ reason: 'PRIOR_FIRE_PENDING', scope: 'payload' });
  });

  it('and an input this library cannot render faithfully is treated as the same one', () => {
    const map = buildNavigationGraph('till', {
      pages: {
        counter: {
          actions: {
            pay: {
              does: 'Pay the invoice',
              writes: ['invoice.paid'],
              concurrency: { mode: 'single-flight', scope: 'payload' },
            },
          },
        },
      },
    });
    const session = map.createSession({
      node: 'counter',
      state: { 'invoice.paid': false },
      onWarn: () => undefined,
    });
    session.registerActions('counter', { handlers: { pay: () => new Promise<void>(() => undefined) } });
    // A Map renders as {} through JSON, so two different Maps would compare
    // equal — the library refuses to judge it, and therefore refuses to call it
    // a different payment.
    expect(session.fire('counter.pay', { source: 'agent', payload: new Map([['a', 1]]) }).ok).toBe(true);
    expect(
      refused(session.fire('counter.pay', { source: 'agent', payload: new Map([['b', 2]]) })).reason,
    ).toBe('PRIOR_FIRE_PENDING');
  });
});

describe('where the gate sits', () => {
  it('NOBODY IS ASKED TO APPROVE A FIRE THAT IS ALREADY BEING TURNED AWAY', () => {
    // A person asked to authorize a payment that is then refused as a repeat has
    // been asked for nothing — so the repeat check runs BEFORE the approval gate.
    const { session } = till({ concurrency: { mode: 'single-flight' }, confirm: true });
    const port = serveToAgent(session);
    expect(port.call('till.do_action', { action: 'counter.pay', confirm: true })['ok']).toBe(true);
    const second = port.call('till.do_action', { action: 'counter.pay' });
    expect(second).toMatchObject({ judgment: 'rejected', reason: 'PRIOR_FIRE_PENDING' });
    expect(second).not.toMatchObject({ judgment: 'needs-confirm' });
  });

  it('a control that is switched off still says so first', () => {
    const map = buildNavigationGraph('till', {
      pages: {
        counter: {
          actions: {
            pay: {
              does: 'Pay the invoice',
              writes: ['invoice.paid'],
              enabledWhen: { 'counter.open': { eq: true } },
              concurrency: { mode: 'single-flight' },
            },
          },
        },
      },
    });
    const session = map.createSession({
      node: 'counter',
      state: { 'counter.open': true, 'invoice.paid': false },
      onWarn: () => undefined,
    });
    session.registerActions('counter', { handlers: { pay: () => new Promise<void>(() => undefined) } });
    session.fire('counter.pay', { source: 'agent' });
    session.updateState({ 'counter.open': false }, { stimulus: 'push' });
    expect(refused(session.fire('counter.pay', { source: 'agent' })).reason).toBe('TOOL_DISABLED');
  });

  it('the model is told the fact, the id, and that nothing expires', () => {
    const { session } = till({ concurrency: { mode: 'single-flight' } });
    const port = serveToAgent(session);
    port.call('till.do_action', { action: 'counter.pay' });
    const second = port.call('till.do_action', { action: 'counter.pay' }) as ServeResult;
    expect(second['pendingTransitionId']).toBe(session.awaitingSettlement()[0]);
    expect(String(second['why'])).toContain('nothing here expires');
  });
});

describe('the authoring door refuses a declaration nobody could have meant', () => {
  const build = (concurrency: unknown) =>
    buildNavigationGraph('till', {
      pages: {
        counter: { actions: { pay: { does: 'Pay', concurrency: concurrency as ConcurrencyPolicy } } },
      },
    });

  it('an unknown mode dies here rather than leaving suppression switched off', () => {
    // 'twice' stays unclaimed on purpose; 'once' graduated to a real mode
    // (once.test.ts owns it), which is exactly why the trap word must not be
    // one a future release might mean.
    expect(() => build({ mode: 'twice' })).toThrow(GraphValidationError);
    expect(() => build({ mode: 'twice' })).toThrow(/Known modes/);
  });

  it('and an unknown scope', () => {
    expect(() => build({ mode: 'single-flight', scope: 'user' })).toThrow(/Known scopes/);
  });

  it('A SCOPE UNDER `parallel` SCOPES NOTHING — the shape of the mistake this pair invites', () => {
    expect(() => build({ mode: 'parallel', scope: 'payload' })).toThrow(/scopes nothing/);
  });

  it('the mount-declared door throws the same refusal, in its own words', () => {
    const map = buildNavigationGraph('till', { pages: { counter: {} } });
    const session = map.createSession({ node: 'counter', onWarn: () => undefined });
    expect(() =>
      session.registerActions('counter', {
        actions: { pay: { does: 'Pay', concurrency: { mode: 'twice' } as unknown as ConcurrencyPolicy } },
      }),
    ).toThrow(/mount-declared action 'counter.pay' declares concurrency mode 'twice'/);
  });
});
