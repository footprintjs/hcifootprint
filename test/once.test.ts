/**
 * ONCE — a performed action stays performed, and only a person reopens it.
 *
 * The measured failure this exists for (the duplicate-execution row of the
 * context-error corpus): an agent fired a high-effect action, the fire SETTLED,
 * and a later turn — planning from a context that still showed the button —
 * fired it again. `single-flight` cannot catch that: its whole law is "one
 * occurrence at a time", and by the second press the first occurrence had come
 * to rest. The consumer's hand-rolled fix taught the two rules this file pins:
 * the window must survive settlement, and a person acting on the screen between
 * the two presses makes the second one legitimate — REPORT it, don't refuse it.
 *
 * WHAT THIS FILE PINS:
 *
 * 1. OFF BY DEFAULT, and `once` is a third mode at the SAME declaration door as
 *    single-flight — one owner of "what counts as the same fire again".
 * 2. THE RECEIPT SURVIVES SETTLEMENT. A settled occurrence refuses the repeat
 *    with `DUPLICATE_EXECUTION`, naming the receipt and the one door that
 *    clears it. While the first is UNSETTLED, `once` says what single-flight
 *    says (`PRIOR_FIRE_PENDING`) — a pending occurrence is the stronger fact.
 * 3. ONLY AN EXECUTED OCCURRENCE COUNTS. A refused first fire minted nothing;
 *    an UNOBSERVABLE one counts — on a repeat-suppression boundary an
 *    unprovable non-execution is not a non-execution.
 * 4. A PERSON ACTING REOPENS IT — and the repeat then FIRES, carrying
 *    `repeated` so the record says out loud it was a knowing second occurrence.
 *    The person's own press of the control is the occurrence itself, never the
 *    reopening evidence (strictly-after, not at).
 * 5. THE SCOPES ARE single-flight's SCOPES, same words, same decline-toward-
 *    refuse rule on an unrenderable payload.
 * 6. THE ROW SAYS SO BEFORE THE FIRE (`alreadyPerformed`, action scope only) —
 *    never send a human to approve a fire that is about to be turned away.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import type { ConcurrencyPolicy, FireResult } from '../src/index.js';
import { validateConcurrency } from '../src/traverse/single-flight.js';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const ok = (fired: FireResult): Extract<FireResult, { ok: true }> => {
  expect(fired.ok).toBe(true);
  return fired as Extract<FireResult, { ok: true }>;
};
const refused = (fired: FireResult): Extract<FireResult, { ok: false }> => {
  expect(fired.ok).toBe(false);
  return fired as Extract<FireResult, { ok: false }>;
};

function till(opts: { concurrency?: ConcurrencyPolicy } = {}) {
  const map = buildNavigationGraph('till', {
    pages: {
      counter: {
        actions: {
          pay: {
            does: 'Pay the invoice',
            writes: ['invoice.paid'],
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
      pay: () => undefined,
      look: () => undefined,
    },
  });
  return { map, session };
}

/** Fire pay and carry it all the way to a settled, performed occurrence. */
async function performedOnce(
  session: ReturnType<typeof till>['session'],
  fireOpts: Record<string, unknown> = {},
): Promise<string> {
  const first = ok(session.fire('counter.pay', { source: 'agent', ...fireOpts }));
  session.updateState({ 'invoice.paid': true }, { transitionId: first.transition.id });
  await tick();
  return first.transition.id;
}

// ---------------------------------------------------------------------------
// The declaration door
// ---------------------------------------------------------------------------

describe("'once' is a mode at the same door as single-flight", () => {
  it('the declaration validates, with every single-flight scope word', () => {
    expect(() => validateConcurrency('pay', { mode: 'once' })).not.toThrow();
    expect(() => validateConcurrency('pay', { mode: 'once', scope: 'payload' })).not.toThrow();
    expect(() => validateConcurrency('pay', { mode: 'once', scope: 'instance' })).not.toThrow();
  });

  it('a graph carrying it builds, and an undeclared action still repeats freely', async () => {
    const { session } = till(); // no declaration at all
    await performedOnce(session);
    expect(session.fire('counter.pay', { source: 'agent' }).ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The receipt survives settlement
// ---------------------------------------------------------------------------

describe('once — the settled occurrence refuses the repeat', () => {
  it('the refusal names the receipt, the scope, and the one door that reopens it', async () => {
    const { session } = till({ concurrency: { mode: 'once' } });
    const firstId = await performedOnce(session);
    const second = refused(session.fire('counter.pay', { source: 'agent' }));
    expect(second).toEqual({
      ok: false,
      reason: 'DUPLICATE_EXECUTION',
      affordanceId: 'counter.pay',
      priorTransitionId: firstId,
      scope: 'action',
      howToRepeat: expect.stringContaining('person') as unknown as string,
    });
    // And it says out loud that no clock reopens it.
    expect(second).toMatchObject({
      howToRepeat: expect.stringContaining('No timeout') as unknown as string,
    });
  });

  it('while the first is UNSETTLED it is PRIOR_FIRE_PENDING — the stronger fact first', () => {
    const { session } = till({ concurrency: { mode: 'once' } });
    ok(session.fire('counter.pay', { source: 'agent' }));
    expect(refused(session.fire('counter.pay', { source: 'agent' })).reason).toBe(
      'PRIOR_FIRE_PENDING',
    );
  });

  it('looks, questions, other fires and elapsed turns reopen nothing', async () => {
    const { session } = till({ concurrency: { mode: 'once' } });
    const firstId = await performedOnce(session);
    session.available();
    session.settlementIfKnown(firstId);
    session.fire('counter.look', { source: 'agent' });
    await tick();
    expect(refused(session.fire('counter.pay', { source: 'agent' })).reason).toBe(
      'DUPLICATE_EXECUTION',
    );
  });

  it('a REFUSED first occurrence minted no receipt — the retry is clean', async () => {
    const { session } = till({ concurrency: { mode: 'once' } });
    const first = ok(session.fire('counter.pay', { source: 'agent' }));
    session.reject(first.transition.id);
    await tick();
    expect(session.fire('counter.pay', { source: 'agent' }).ok).toBe(true);
  });

  it('an UNOBSERVABLE occurrence counts — unprovable non-execution is not non-execution', async () => {
    const map = buildNavigationGraph('till', {
      pages: {
        counter: { actions: { ping: { does: 'Ping', concurrency: { mode: 'once' } } } },
      },
    });
    const session = map.createSession({
      node: 'counter',
      state: {},
      onWarn: () => undefined,
      // An allowed no-op: nothing is registered, the fire records and settles
      // 'unobservable' at once — the exact settlement this test is about.
      allowUnmaterializedFires: true,
    });
    expect(session.fire('counter.ping', { source: 'agent' }).ok).toBe(true);
    await tick();
    expect(refused(session.fire('counter.ping', { source: 'agent' })).reason).toBe(
      'DUPLICATE_EXECUTION',
    );
  });
});

// ---------------------------------------------------------------------------
// The person reopens it — report, don't refuse
// ---------------------------------------------------------------------------

describe('once — a person acting on the screen makes the repeat legitimate', () => {
  it('the repeat FIRES and carries `repeated`, naming receipt and evidence', async () => {
    const { session } = till({ concurrency: { mode: 'once' } });
    const firstId = await performedOnce(session);
    const moved = ok(session.fire('counter.look', { source: 'user' }));
    const second = ok(session.fire('counter.pay', { source: 'agent' }));
    expect(second.repeated).toEqual({
      priorTransitionId: firstId,
      personActedSince: {
        transitionId: moved.transition.id,
        basis: 'caller-asserted',
      },
    });
    // An ordinary first fire never carries the field.
    expect(ok(session.fire('counter.look', { source: 'agent' })).repeated).toBeUndefined();
  });

  it("the person's own press IS the occurrence, never its own reopening evidence", async () => {
    const { session } = till({ concurrency: { mode: 'once' } });
    await performedOnce(session, { source: 'user' });
    expect(refused(session.fire('counter.pay', { source: 'agent' })).reason).toBe(
      'DUPLICATE_EXECUTION',
    );
  });

  it('the reopened occurrence starts its own window — a third press is refused again', async () => {
    const { session } = till({ concurrency: { mode: 'once' } });
    await performedOnce(session);
    session.fire('counter.look', { source: 'user' });
    const second = ok(session.fire('counter.pay', { source: 'agent' }));
    session.updateState({ 'invoice.paid': true }, { transitionId: second.transition.id });
    await tick();
    expect(refused(session.fire('counter.pay', { source: 'agent' })).reason).toBe(
      'DUPLICATE_EXECUTION',
    );
  });
});

// ---------------------------------------------------------------------------
// Scopes — single-flight's words, single-flight's stance
// ---------------------------------------------------------------------------

describe('once — the scopes are the same words as single-flight', () => {
  it("under 'instance', another card is another occurrence — and the record now says which card", async () => {
    const { session } = till({ concurrency: { mode: 'once', scope: 'instance' } });
    const first = ok(session.fire('counter.pay', { source: 'agent', instance: 'inv-1' }));
    expect(first.transition.instance).toBe('inv-1');
    session.updateState({ 'invoice.paid': true }, { transitionId: first.transition.id });
    await tick();
    expect(session.fire('counter.pay', { source: 'agent', instance: 'inv-2' }).ok).toBe(true);
    expect(
      refused(session.fire('counter.pay', { source: 'agent', instance: 'inv-1' })).reason,
    ).toBe('DUPLICATE_EXECUTION');
  });

  it("under 'payload', only a PROVEN difference is a difference", async () => {
    const { session } = till({ concurrency: { mode: 'once', scope: 'payload' } });
    await performedOnce(session, { payload: { amount: 10 } });
    const different = ok(
      session.fire('counter.pay', { source: 'agent', payload: { amount: 20 } }),
    );
    // Settle it: an OPEN flight would (correctly) answer PRIOR_FIRE_PENDING
    // for the unrenderable probe below — pending is the stronger fact.
    session.updateState({ 'invoice.paid': true }, { transitionId: different.transition.id });
    await tick();
    expect(
      refused(session.fire('counter.pay', { source: 'agent', payload: { amount: 10 } })).reason,
    ).toBe('DUPLICATE_EXECUTION');
    // Unrenderable on either side: no provable difference, so no claimed one.
    expect(
      refused(
        session.fire('counter.pay', { source: 'agent', payload: new Map([['amount', 10]]) }),
      ).reason,
    ).toBe('DUPLICATE_EXECUTION');
  });
});

// ---------------------------------------------------------------------------
// The row says so before the fire
// ---------------------------------------------------------------------------

describe('once — the served row carries the verdict', () => {
  it('alreadyPerformed appears after settlement, and a person acting clears it', async () => {
    const { session } = till({ concurrency: { mode: 'once' } });
    const row = () => session.available().edges.find((e) => e.affordanceId === 'counter.pay')!;
    expect(row()).not.toHaveProperty('alreadyPerformed');
    await performedOnce(session);
    expect(row().alreadyPerformed).toBe(true);
    session.fire('counter.look', { source: 'user' });
    expect(row()).not.toHaveProperty('alreadyPerformed');
    // A control that declared nothing never carries the verdict.
    expect(
      session.available().edges.find((e) => e.affordanceId === 'counter.look'),
    ).not.toHaveProperty('alreadyPerformed');
  });
});
