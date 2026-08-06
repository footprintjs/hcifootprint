/**
 * `observability` + `effectPolicy` — HOW WOULD ANYONE SEE THAT THIS HAPPENED,
 * and the opt-in that requires an answer before a high-effect action runs.
 *
 * THE BLIND SPOT THIS IS BUILT AROUND, and the one thing nothing here may
 * quietly close: `effectVerified` checks that the declared write KEYS appeared.
 * Key presence is not value correctness — a handler that writes `orderId: null`
 * satisfies it exactly as a real order does. So the policy's strongest
 * requirement is a POSTCONDITION (the app's own check), and `'state-delta'`
 * deliberately does not satisfy it. This suite pins that refusal, because the
 * comfortable version of this feature is the one that accepts key presence and
 * calls it verification.
 *
 * THE SECOND HALF is the external door: an effect this client cannot see, an app
 * that CAN see it, and a library that records the REPORT and never the fact.
 *
 * MUTATION PROOFS (each one run; the count is what it actually did):
 * - Add 'state-delta' to VERIFIABLE_OBSERVABILITY → 3 red, led by 'key presence
 *   is not value correctness, and never was'.
 * - Drop the `highEffect` term (gate every action) → 2 red.
 * - Drop the `requiresVerify` term (gate always) → 5 red, the whole default half.
 * - Let observeEffect answer for a stimulus row → 1 red (NOT_A_FIRE).
 * - Rewrite the trail instead of appending → 2 red (append-only).
 * - Let a later observation re-settle → 2 red (`settled: false` after rest).
 * - Write the declared keys from an observation → 2 red (the library would be
 *   inventing the app's own state, and the app's verify would then pass).
 * - Drop `externalReportData` from `settledFacts` → 2 red (a served 'performed'
 *   that cannot be told from a handler this library watched run).
 * - Serve the `evidenceRef`'s own text → 1 red (a pointer dressed as a check).
 */
import { describe, expect, it } from 'vitest';
import { GraphValidationError, buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { InteractionSession, NavigationGraph } from '../src/index.js';
import {
  OBSERVATION_TEXT_MAX,
  VERIFIABLE_OBSERVABILITY,
  checkEffectPolicy,
  observationFault,
} from '../src/traverse/effect-policy.js';

const PAY = 'shop.pay';

/**
 * One high-effect control per observability word, so the policy's whole table is
 * exercised against real graphs rather than against the predicate alone.
 */
function shop(word: 'state-delta' | 'postcondition' | 'navigation' | 'external' | 'unobservable' | 'none'): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: {
      shop: {
        actions: {
          pay: {
            does: 'Pay for the order',
            confirm: true,
            writes: ['paid'],
            ...(word === 'postcondition' ? { verify: { paid: { eq: true } } } : {}),
            ...(word === 'navigation' ? { goTo: 'receipt' } : {}),
            ...(word === 'none' ? {} : { observability: word }),
          },
          // The low-effect twin: the policy never asks it anything.
          browse: { does: 'Browse the catalogue' },
        },
      },
      receipt: {},
    },
  });
}

function session(
  word: Parameters<typeof shop>[0],
  opts?: { enforce?: boolean },
): InteractionSession {
  const live = shop(word).createSession({
    node: 'shop',
    state: { paid: false },
    ...(opts?.enforce ? { effectPolicy: { highEffectRequiresVerify: true } } : {}),
    onWarn: () => undefined,
  });
  live.registerHandlers({
    group: 'app',
    handlers: { [PAY]: () => undefined, 'shop.browse': () => undefined },
  });
  return live;
}

// ---------------------------------------------------------------------------
// The declaration
// ---------------------------------------------------------------------------

describe('the declaration: one word, judged for coherence at the keyboard', () => {
  it('compiles onto the affordance at both doors', () => {
    expect(shop('external').spec.affordances[PAY].observability).toBe('external');

    const live = session('none');
    live.registerActions('shop', {
      actions: { refund: { does: 'Refund', observability: 'external', handler: () => undefined } },
    });
    expect(live.available().edges.some((row) => row.affordanceId === 'shop.refund')).toBe(true);
  });

  it('refuses a word nobody implements', () => {
    expect(() =>
      buildNavigationGraph('shop', {
        pages: { shop: { actions: { pay: { does: 'Pay', observability: 'vibes' as never } } } },
      }),
    ).toThrow(/observability must be one of/);
  });

  it('refuses a postcondition that names a check the action does not declare', () => {
    expect(() =>
      buildNavigationGraph('shop', {
        pages: { shop: { actions: { pay: { does: 'Pay', observability: 'postcondition' } } } },
      }),
    ).toThrow(/names a check this action does not declare/);
  });

  it('refuses a navigation that names page motion the action does not declare', () => {
    expect(() =>
      buildNavigationGraph('shop', {
        pages: { shop: { actions: { pay: { does: 'Pay', observability: 'navigation' } } } },
      }),
    ).toThrow(/names page motion this action does not declare/);
  });

  it('refuses the same two at the mount door, in the same words', () => {
    const live = session('none');
    expect(() =>
      live.registerActions('shop', {
        actions: { refund: { does: 'Refund', observability: 'postcondition' } },
      }),
    ).toThrow(GraphValidationError);
  });
});

// ---------------------------------------------------------------------------
// The default: nothing is refused
// ---------------------------------------------------------------------------

describe('with the policy off, a declaration refuses nothing', () => {
  it('fires a high-effect action that declared no observability at all', () => {
    expect(session('none').fire(PAY, { source: 'agent' }).ok).toBe(true);
  });

  it('fires one whose only answer is key presence', () => {
    expect(session('state-delta').fire(PAY, { source: 'agent' }).ok).toBe(true);
  });

  it('fires one the app itself calls unobservable', () => {
    expect(session('unobservable').fire(PAY, { source: 'agent' }).ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The policy
// ---------------------------------------------------------------------------

describe('with the policy on, a high-effect action must be checkable', () => {
  it('refuses one that says nothing, and asks for the declaration', () => {
    const fired = session('none', { enforce: true }).fire(PAY, { source: 'agent' });

    expect(fired).toEqual({
      ok: false,
      reason: 'EFFECT_NOT_VERIFIABLE',
      affordanceId: PAY,
      needs: 'observability',
    });
  });

  it('refuses KEY PRESENCE — it is not value correctness, and never was', () => {
    const fired = session('state-delta', { enforce: true }).fire(PAY, { source: 'agent' });

    // MUTATION PROOF: add 'state-delta' to VERIFIABLE_OBSERVABILITY and this
    // goes green — the policy would then accept `orderId: null` as proof that an
    // order was placed.
    expect(fired).toEqual({
      ok: false,
      reason: 'EFFECT_NOT_VERIFIABLE',
      affordanceId: PAY,
      needs: 'postcondition',
      observability: 'state-delta',
    });
  });

  it('refuses the app’s own honest "nobody can tell"', () => {
    const fired = session('unobservable', { enforce: true }).fire(PAY, { source: 'agent' });

    expect(!fired.ok && fired.reason).toBe('EFFECT_NOT_VERIFIABLE');
  });

  it('allows a declared postcondition, a declared navigation, and an external report', () => {
    expect(session('postcondition', { enforce: true }).fire(PAY, { source: 'agent' }).ok).toBe(true);
    expect(session('navigation', { enforce: true }).fire(PAY, { source: 'agent' }).ok).toBe(true);
    expect(session('external', { enforce: true }).fire(PAY, { source: 'agent' }).ok).toBe(true);
  });

  it('asks nothing of a low-effect action', () => {
    expect(session('none', { enforce: true }).fire('shop.browse', { source: 'agent' }).ok).toBe(true);
  });

  it('records what already happened — a report is not a request to act', () => {
    expect(session('none', { enforce: true }).fire(PAY, { source: 'user', invoke: false }).ok).toBe(true);
  });

  it('writes the refusal to the ledger, and tells the model whose problem it is', () => {
    const live = session('state-delta', { enforce: true });
    const port = serveToAgent(live, { source: 'agent' });

    const result = port.call('shop.do_action', { action: PAY, confirm: true });

    expect(live.gaps()).toMatchObject([
      { kind: 'fire-rejected', affordanceId: PAY, rejectionReason: 'EFFECT_NOT_VERIFIABLE' },
    ]);
    expect(result['needs']).toBe('postcondition');
    expect(result['observability']).toBe('state-delta');
    expect(String(result['why'])).toMatch(/missing declaration in the app itself/);
  });

  it('is a pure question, asked the same way with no session in the room', () => {
    expect(checkEffectPolicy({ highEffect: true, observability: 'external', requiresVerify: true })).toEqual({ ok: true });
    expect(checkEffectPolicy({ highEffect: false, observability: undefined, requiresVerify: true })).toEqual({ ok: true });
    expect(checkEffectPolicy({ highEffect: true, observability: undefined, requiresVerify: false })).toEqual({ ok: true });
    expect([...VERIFIABLE_OBSERVABILITY].sort()).toEqual(['external', 'navigation', 'postcondition']);
  });
});

// ---------------------------------------------------------------------------
// The external door
// ---------------------------------------------------------------------------

describe('observeEffect — the app hands in what only it can see', () => {
  it('settles a fire nothing here could have observed, and records the report', async () => {
    const live = session('external');
    const fired = live.fire(PAY, { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');

    const observed = live.observeEffect(fired.transition.id, {
      source: 'stripe-webhook',
      status: 'performed',
      evidenceRef: 'evt_1P2x',
    });
    const settlement = await fired.whenSettled;

    expect(observed.ok && observed.settled).toBe(true);
    expect(settlement.effectStatus).toBe('performed');
    expect(fired.transition.observations).toMatchObject([
      { source: 'stripe-webhook', status: 'performed', evidenceRef: 'evt_1P2x' },
    ]);
    expect(typeof fired.transition.observations?.[0].recordedAt).toBe('number');
  });

  // THE SURFACE A MODEL ACTUALLY READS. `effectStatus: 'performed'` is the same
  // word for a handler this library watched run and for a sentence somebody
  // handed in about a processor it cannot see, and `effectVerified:
  // 'unobservable'` only says nobody checked the WRITES. The library holds the
  // distinguishing fact; withholding it flattens report and fact into one word.
  it('SAYS WHO ANSWERED — a served settlement tells an external report from a watched one', async () => {
    const live = session('external');
    const port = serveToAgent(live, { source: 'agent' });
    const fired = live.fire(PAY, { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');
    live.observeEffect(fired.transition.id, {
      source: 'ops-desk',
      status: 'performed',
      evidenceRef: 'evt_1P2x',
    });
    await fired.whenSettled;

    const answer = port.call('shop.did_it_work', { transitionId: fired.transition.id });

    expect(answer).toMatchObject({
      effectStatus: 'performed',
      settledBy: 'external-report',
      reportedBy: 'ops-desk',
      evidenceOnRecord: true,
    });
    expect(String(answer['settledByMeans'])).toMatch(/a report is not proof/);
    // THE POINTER ITSELF NEVER CROSSES: this library does not follow it, so
    // quoting it would dress a reference up as a check.
    expect(JSON.stringify(answer)).not.toContain('evt_1P2x');
  });

  it('a report with NO reference says so by silence — absence, never a cheerful false', async () => {
    const live = session('external');
    const port = serveToAgent(live, { source: 'agent' });
    const fired = live.fire(PAY, { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');
    live.observeEffect(fired.transition.id, { source: 'ops-desk', status: 'performed' });
    await fired.whenSettled;

    const answer = port.call('shop.did_it_work', { transitionId: fired.transition.id });

    expect(answer).toMatchObject({ settledBy: 'external-report', reportedBy: 'ops-desk' });
    expect(answer).not.toHaveProperty('evidenceOnRecord');
  });

  it('and an ordinary settlement says none of it — silence, not a second word for "we watched it"', async () => {
    const live = session('none');
    const port = serveToAgent(live, { source: 'agent' });
    const fired = port.call('shop.do_action', { action: PAY, confirm: true });
    const id = fired['transitionId'] as string;
    live.updateState({ paid: true }, { transitionId: id });
    await live.settlementOf(id);

    const answer = port.call('shop.did_it_work', { transitionId: id });

    expect(answer['effectStatus']).toBe('performed');
    for (const key of ['settledBy', 'reportedBy', 'evidenceOnRecord', 'settledByMeans']) {
      expect(answer).not.toHaveProperty(key);
    }
  });

  it('invents NO state — a report is not a delta', async () => {
    const live = session('external');
    const fired = live.fire(PAY, { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');

    live.observeEffect(fired.transition.id, { source: 'stripe-webhook', status: 'performed' });
    await fired.whenSettled;

    // MUTATION PROOF: write the declared writes from an observation and both of
    // these flip — the library would be inventing the app's own state.
    expect(live.state()['paid']).toBe(false);
    expect(fired.transition.effectVerified).toBe('unobservable');
  });

  it('carries a refusal into the ordinary failure spine', async () => {
    const live = session('external');
    const fired = live.fire(PAY, { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');

    live.observeEffect(fired.transition.id, { source: 'bank', status: 'refused' });
    const settlement = await fired.whenSettled;

    expect(settlement.effectStatus).toBe('refused');
    expect(fired.transition.outcome).toBe('rejected');
    expect(String((settlement.error as { explanation?: string }).explanation)).toMatch(
      /did NOT happen/,
    );
  });

  it('APPENDS a later report and leaves the receipt alone', async () => {
    const live = session('external');
    const fired = live.fire(PAY, { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');
    live.observeEffect(fired.transition.id, { source: 'stripe-webhook', status: 'performed' });
    const receipt = await fired.whenSettled;

    const second = live.observeEffect(fired.transition.id, { source: 'ledger', status: 'refused' });

    // MUTATION PROOF: let a second report re-settle and `settled` reads true —
    // a receipt somebody has already read would have been rewritten.
    expect(second.ok && second.settled).toBe(false);
    expect(receipt.effectStatus).toBe('performed');
    expect(live.observationsOf(fired.transition.id).map((row) => row.source)).toEqual([
      'stripe-webhook',
      'ledger',
    ]);
    // The live record still says both things happened, in order.
    expect(fired.transition.observations).toHaveLength(2);
  });

  it('settles a fire that pends on nothing — no declared writes, still an open question', async () => {
    const live = session('external');
    // `browse` declares no writes, so it never joins the pending queue: its
    // question is open because a handler is running, not because a report is
    // owed. The door answers that one too.
    const fired = live.fire('shop.browse', { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');

    const observed = live.observeEffect(fired.transition.id, { source: 'kiosk', status: 'performed' });
    const settlement = await fired.whenSettled;

    expect(observed.ok && observed.settled).toBe(true);
    expect(settlement.effectStatus).toBe('performed');
    expect(live.pending()).toEqual([]);
  });

  it('hands out copies — a reader cannot rewrite the trail', () => {
    const live = session('external');
    const fired = live.fire(PAY, { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');
    live.observeEffect(fired.transition.id, { source: 'stripe-webhook', status: 'performed' });

    live.observationsOf(fired.transition.id)[0].source = 'somebody-else';

    expect(live.observationsOf(fired.transition.id)[0].source).toBe('stripe-webhook');
  });

  it('emits the row so a listener sees the corroboration land', () => {
    const live = session('external');
    const fired = live.fire(PAY, { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');
    live.observeEffect(fired.transition.id, { source: 'first', status: 'performed' });
    const seen: unknown[] = [];
    live.on('transition', (row) => seen.push(row.observations));

    live.observeEffect(fired.transition.id, { source: 'second', status: 'performed' });

    expect(seen).toHaveLength(1);
    expect(seen[0]).toHaveLength(2);
  });

  it('caps the app’s own strings, with a marker rather than a silent drop', () => {
    const live = session('external');
    const fired = live.fire(PAY, { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');

    live.observeEffect(fired.transition.id, {
      source: 'x'.repeat(OBSERVATION_TEXT_MAX + 50),
      status: 'performed',
      evidenceRef: 'y'.repeat(OBSERVATION_TEXT_MAX + 50),
    });

    const [row] = live.observationsOf(fired.transition.id);
    expect(row.source).toHaveLength(OBSERVATION_TEXT_MAX + 1); // the cap plus the marker
    expect(row.source.endsWith('…')).toBe(true);
    expect(row.evidenceRef?.endsWith('…')).toBe(true);
  });

  it('still asks the app’s own verify contract — an outside report is not a licence', async () => {
    const graph = buildNavigationGraph('shop', {
      pages: {
        shop: {
          actions: {
            pay: {
              does: 'Pay',
              confirm: true,
              writes: ['paid'],
              verify: { paid: { eq: true } },
              observability: 'postcondition',
            },
          },
        },
      },
    });
    const live = graph.createSession({ node: 'shop', state: { paid: false }, onWarn: () => undefined });
    live.registerHandlers({ group: 'app', handlers: { 'shop.pay': () => undefined } });
    const fired = live.fire('shop.pay', { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');

    live.observeEffect(fired.transition.id, { source: 'stripe-webhook', status: 'performed' });
    const settlement = await fired.whenSettled;

    // The app said its own condition must hold, and it does not.
    expect(settlement.effectStatus).toBe('refused');
    expect(settlement.verifyHeld).toBe(false);
  });

  it('refuses an id it does not know, and names what it can still answer for', () => {
    const live = session('external');
    const fired = live.fire(PAY, { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');

    const answer = live.observeEffect('shop.pay#404', { source: 'x', status: 'performed' });

    expect(answer).toEqual({
      ok: false,
      reason: 'UNKNOWN_TRANSITION',
      awaiting: [fired.transition.id],
    });
  });

  it('refuses a row nobody fired — the world moving has no effect to observe', () => {
    const live = session('external');
    const hop = live.sync('receipt');
    if (!hop.changed) throw new Error('the cursor did not move');

    const answer = live.observeEffect(hop.transition.id, { source: 'x', status: 'performed' });

    expect(answer).toEqual({ ok: false, reason: 'NOT_A_FIRE', transitionId: hop.transition.id });
  });

  it('refuses a report it cannot read, and says which half is wrong', () => {
    const live = session('external');
    const fired = live.fire(PAY, { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');
    const id = fired.transition.id;

    expect(live.observeEffect(id, { source: '  ', status: 'performed' })).toMatchObject({
      ok: false,
      reason: 'INVALID_OBSERVATION',
    });
    expect(
      live.observeEffect(id, { source: 'x', status: 'maybe' as never }),
    ).toMatchObject({ ok: false, reason: 'INVALID_OBSERVATION' });
    expect(
      live.observeEffect(id, { source: 'x', status: 'performed', evidenceRef: 7 as never }),
    ).toMatchObject({ ok: false, reason: 'INVALID_OBSERVATION' });
    // Nothing was recorded by any of the three.
    expect(live.observationsOf(id)).toEqual([]);
  });

  it('answers an id it never heard of with an empty trail, and refuses nothing', () => {
    expect(session('external').observationsOf('nope#0')).toEqual([]);
  });

  it('is a pure reading, with no session in the room', () => {
    expect(observationFault({ source: 'x', status: 'performed' })).toBeUndefined();
    expect(observationFault({ source: 7, status: 'performed' })).toMatch(/needs a 'source'/);
    expect(observationFault({ source: 'x', status: undefined })).toMatch(/'performed' or 'refused'/);
    expect(observationFault({ source: 'x', status: 'refused', evidenceRef: {} })).toMatch(
      /must be a string/,
    );
  });
});
