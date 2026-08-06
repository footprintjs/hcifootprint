/**
 * ATTRIBUTION — every transition says WHICH RUNG filed it, and what that is
 * worth.
 *
 * The hole this closes: `updateState()` has always associated a state delta with
 * a fire through a ladder of seven rungs, and every one of them wrote the same
 * shape of row. Two of those rungs are guesses — FIFO settles by ARRIVAL ORDER,
 * a signature match proves a delta LOOKS LIKE what an action declared — and a
 * reader holding the log could not tell a guess from an observation. So a report
 * that closed the wrong fire and a report that closed the right one were, on the
 * wire, the same fact.
 *
 * WHAT THIS SUITE GUARDS is the certainty axis, and most of it is attempts to
 * launder a guess into an observation: a FIFO settlement that reads as observed,
 * an anchor's guessed action upgraded by a precise report afterwards, a floor
 * row inheriting `cause.principal`'s honest `'system'` default as if somebody
 * had claimed it.
 *
 * MUTATION PROOFS (each one run; the count is what it actually did):
 * - Grade 'queue-order' as 'observed' in CERTAINTY_OF → 2 red (the table, and
 *   the FIFO settlement that reads it).
 * - Flip #foldAttribution's comparison to `<`, letting a STRONGER rung win →
 *   4 red, including 'an anchor's guess is not laundered by a precise report'.
 * - Delete #foldAttribution's call on the FIFO arm → 1 red.
 * - Delete #foldAttribution's call in observeEffect → 1 red.
 * - Fold on the arm where the record is ALREADY at rest → 1 red.
 * - Default the floor's attribution principal to 'system' → 2 red.
 * - Share the stamp by reference in #copyRecord → 1 red (a listener rewrites
 *   the log's own honesty marker).
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, contextful } from '../src/index.js';
import type { AttributionBasis, TransitionRecord } from '../src/index.js';
import { CERTAINTY_OF, CERTAINTY_RANK, attributionOf } from '../src/traverse/attribution.js';
import { FakeAnchor, humanClick, settle, shop } from './contextful-fixture.js';
import { initialState, shop as storefront, wire } from './fixture.js';

/** The newest row one action wrote. */
function rowFor(rows: readonly TransitionRecord[], actionId: string): TransitionRecord | undefined {
  return [...rows].reverse().find((row) => row.cause.affordanceId === actionId);
}

/** A two-control graph whose actions write DIFFERENT keys — so a signature can be unique. */
function twoControls() {
  return buildNavigationGraph('desk', {
    pages: {
      desk: {
        actions: {
          save: { does: 'Save the draft', writes: ['draft.saved'] },
          send: { does: 'Send the draft', writes: ['draft.sent'] },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// The table — ten bases, one certainty each, closed and total
// ---------------------------------------------------------------------------

describe('the basis table is a law, not a judgement call', () => {
  it('grades every basis, and grades the three guesses as guesses', () => {
    expect(CERTAINTY_OF).toEqual({
      'caller-asserted': 'observed',
      'named-by-report': 'observed',
      'handler-window': 'observed',
      'direct-call': 'observed',
      'declared-stimulus': 'observed',
      // The association is observed (the app named the transitionId through this
      // library's own door); what the outside source SAID is not what this axis
      // grades, and TransitionRecord.observations is where that lives.
      'external-report': 'observed',
      'sensed-click': 'inferred',
      'signature-match': 'inferred',
      'queue-order': 'inferred',
      unknown: 'unknown',
    });
  });

  it('reads the certainty from the table, never from the caller', () => {
    // The point of the table: a rung cannot mint a grade for itself.
    for (const basis of Object.keys(CERTAINTY_OF) as AttributionBasis[]) {
      expect(attributionOf(basis, 'agent')).toEqual({
        principal: 'agent',
        basis,
        certainty: CERTAINTY_OF[basis],
      });
    }
  });

  it('orders the three answers so that "weaker" is a comparison', () => {
    expect(CERTAINTY_RANK.observed).toBeGreaterThan(CERTAINTY_RANK.inferred);
    expect(CERTAINTY_RANK.inferred).toBeGreaterThan(CERTAINTY_RANK.unknown);
  });
});

// ---------------------------------------------------------------------------
// The fire door
// ---------------------------------------------------------------------------

describe('a fire is stamped by the door it came through', () => {
  it('records a caller’s own claim as a claim — observed act, asserted actor', () => {
    const session = storefront().createSession({ node: 'catalog', state: initialState });
    wire(session, 'login');

    const fired = session.fire('login', { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');

    expect(fired.transition.attribution).toEqual({
      principal: 'agent',
      basis: 'caller-asserted',
      certainty: 'observed',
    });
  });

  it('records the app calling its own wrapped function as an observation', async () => {
    const { session } = shop();
    const note = contextful(() => 'noted');
    session.registerActions('catalog', { handlers: { note } });

    note();
    await settle();

    expect(rowFor(session.transitions(), 'note')?.attribution).toEqual({
      principal: 'user',
      basis: 'direct-call',
      certainty: 'observed',
    });
  });

  it('records an anchor’s trusted click as INFERRED — a person acted, which action is a guess', () => {
    const { session } = shop();
    const anchor = new FakeAnchor();
    session.registerActions('catalog', { handlers: { note: () => undefined } });
    const release = session.sense('note', contextful.sense(anchor));

    humanClick(anchor);

    const row = rowFor(session.transitions(), 'note');
    // The existing honesty marker and the new one say the same thing in two
    // fields, and neither softens the other.
    expect(row?.cause.inferred).toBe(true);
    expect(row?.attribution).toEqual({
      principal: 'user',
      basis: 'sensed-click',
      certainty: 'inferred',
    });
    release();
  });
});

// ---------------------------------------------------------------------------
// The updateState ladder — one rung at a time
// ---------------------------------------------------------------------------

describe('the ladder says which rung filed the motion', () => {
  it('a report that NAMES the fire is observed', () => {
    const session = storefront().createSession({ node: 'catalog', state: initialState });
    wire(session, 'login');
    const fired = session.fire('login', { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');

    session.updateState({ authenticated: true, user: 'ada' }, { transitionId: fired.transition.id });

    expect(fired.transition.attribution).toMatchObject({
      basis: 'named-by-report',
      certainty: 'observed',
      principal: 'agent',
    });
  });

  it('a report from inside the handler’s own call is observed', async () => {
    const session = storefront().createSession({ node: 'catalog', state: initialState });
    session.registerHandlers({
      group: 'app',
      // Reported synchronously, from inside the invocation window.
      handlers: { login: () => session.updateState({ authenticated: true, user: 'ada' }) },
    });

    const fired = session.fire('login', { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');
    await fired.whenSettled;

    expect(fired.transition.attribution).toMatchObject({
      basis: 'handler-window',
      certainty: 'observed',
    });
  });

  it('FIFO marks the row INFERRED — arrival order is not evidence', async () => {
    const graph = twoControls();
    const session = graph.createSession({ node: 'desk', state: { 'draft.saved': false } });
    session.registerHandlers({ group: 'app', handlers: { 'desk.save': () => undefined } });
    const fired = session.fire('desk.save', { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');
    // Let the handler finish: a fire whose handler is still in flight has first
    // claim on its own record, so bare FIFO deliberately skips it.
    await Promise.resolve();
    await Promise.resolve();

    // A bare report, from a tap that named nothing: the oldest pending gets it.
    const update = session.updateState({ 'draft.saved': true });

    expect(update.ok && update.attributed).toBe(true);
    // MUTATION PROOF: drop this arm's #foldAttribution call and the line below
    // reads 'caller-asserted' / 'observed' about a join computed from arrival
    // order.
    expect(fired.transition.attribution).toEqual({
      principal: 'agent',
      basis: 'queue-order',
      certainty: 'inferred',
    });
  });

  it('a signature match is inferred too — a shape is not an identity', async () => {
    const graph = twoControls();
    const session = graph.createSession({
      node: 'desk',
      state: { 'draft.saved': false, 'draft.sent': false },
    });
    let release!: () => void;
    session.registerHandlers({
      group: 'app',
      handlers: {
        // Both handlers stay in flight, so bare FIFO is skipped and the delta is
        // placed by what it looks like.
        'desk.save': () => new Promise<void>((resolve) => { release = resolve; }),
        'desk.send': () => new Promise<void>(() => undefined),
      },
    });
    const saved = session.fire('desk.save', { source: 'agent' });
    const sent = session.fire('desk.send', { source: 'agent' });
    if (!saved.ok || !sent.ok) throw new Error('a fire was refused');
    await Promise.resolve();

    session.updateState({ 'draft.saved': true });

    expect(saved.transition.attribution).toMatchObject({
      basis: 'signature-match',
      certainty: 'inferred',
    });
    // The other fire is untouched: one report, one settlement.
    expect(sent.transition.attribution.basis).toBe('caller-asserted');
    release();
  });

  it('a declared stimulus names its own actor, and a bare one names nobody', () => {
    const session = storefront().createSession({ node: 'catalog', state: initialState });

    const declared = session.updateState({ cartCount: 3 }, { stimulus: 'push', principal: 'system' });
    const bare = session.updateState({ cartCount: 4 });

    expect(declared.ok && declared.transition.attribution).toEqual({
      principal: 'system',
      basis: 'declared-stimulus',
      certainty: 'observed',
    });
    // THE HONEST DISAGREEMENT: the record keeps its old bytes, and the new field
    // says the true thing. MUTATION PROOF: default this principal to 'system'
    // and the second expectation goes red with the library claiming an actor
    // nobody named.
    expect(bare.ok && bare.transition.cause.principal).toBe('system');
    expect(bare.ok && bare.transition.attribution).toEqual({
      principal: 'unknown',
      basis: 'unknown',
      certainty: 'unknown',
    });
  });

  it('a stimulus that named only WHAT moved still names no actor', () => {
    const session = storefront().createSession({ node: 'catalog', state: initialState });

    const pushed = session.updateState({ cartCount: 9 }, { stimulus: 'push' });

    expect(pushed.ok && pushed.transition.attribution).toEqual({
      principal: 'unknown',
      basis: 'declared-stimulus',
      certainty: 'observed',
    });
  });

  it('an inferred row (nothing pending, one signature) files under nobody', () => {
    const graph = twoControls();
    const session = graph.createSession({ node: 'desk', state: { 'draft.saved': false } });
    session.registerHandlers({ group: 'app', handlers: { 'desk.save': () => undefined } });

    // No fire at all — the app reports a delta that exactly one registered
    // action claims to write.
    session.updateState({ 'draft.saved': true });

    const row = rowFor(session.transitions(), 'desk.save');
    expect(row?.cause.inferred).toBe(true);
    expect(row?.attribution).toEqual({
      principal: 'unknown',
      basis: 'signature-match',
      certainty: 'inferred',
    });
  });
});

// ---------------------------------------------------------------------------
// The weakest link — a stamp may only ever go down
// ---------------------------------------------------------------------------

describe('a settlement can weaken a fire’s stamp, never strengthen it', () => {
  it('an anchor’s guess is not laundered by a precise report afterwards', () => {
    const { session } = shop();
    const anchor = new FakeAnchor();
    session.registerActions('catalog', { handlers: { 'add-to-cart': () => undefined } });
    const release = session.sense('add-to-cart', contextful.sense(anchor));

    humanClick(anchor);
    const sensed = rowFor(session.transitions(), 'add-to-cart')!;
    // The app then names the very row the anchor guessed. The ASSOCIATION with
    // the delta is now observed — and WHICH ACTION the person performed is
    // exactly as much of a guess as it was a moment ago.
    session.updateState({ cart: 1 }, { transitionId: sensed.id });

    // READ BACK, never asserted on the row captured above: `transitions()` hands
    // out copies, so a stamp read before the settlement would pass whatever the
    // fold did afterwards — a test that cannot fail is not a proof.
    //
    // MUTATION PROOF: flip #foldAttribution's comparison to `<` (let a stronger
    // rung win) and this reads 'named-by-report' / 'observed' — a guess wearing
    // a receipt.
    expect(rowFor(session.transitions(), 'add-to-cart')?.attribution).toEqual({
      principal: 'user',
      basis: 'sensed-click',
      certainty: 'inferred',
    });
    release();
  });

  it('AN EXTERNAL REPORT IS A RUNG, and the row says so instead of the door it came in by', () => {
    const graph = buildNavigationGraph('desk', {
      pages: {
        desk: {
          actions: {
            pay: { does: 'Pay', highEffect: true, writes: ['bill.paid'], observability: 'external' },
          },
        },
      },
    });
    const session = graph.createSession({ node: 'desk', state: { 'bill.paid': false } });
    session.registerHandlers({ group: 'app', handlers: { 'desk.pay': () => undefined } });
    const fired = session.fire('desk.pay', { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');
    expect(fired.transition.attribution.basis).toBe('caller-asserted');

    session.observeEffect(fired.transition.id, { source: 'ops-desk', status: 'performed' });

    // MUTATION PROOF: delete #foldAttribution's call in observeEffect and this
    // reads 'caller-asserted' — the row describing the fire's own door while the
    // thing that actually closed it goes unnamed.
    expect(rowFor(session.transitions(), 'desk.pay')?.attribution).toEqual({
      principal: 'agent',
      basis: 'external-report',
      // Rank-neutral: what moved is HOW the settlement was associated, never how
      // much anybody knows about the effect itself.
      certainty: 'observed',
    });
  });

  it('and a report landing on a record already at rest closed nothing, so it renames nothing', () => {
    const graph = twoControls();
    const session = graph.createSession({ node: 'desk', state: { 'draft.saved': false } });
    session.registerHandlers({ group: 'app', handlers: { 'desk.save': () => undefined } });
    const fired = session.fire('desk.save', { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');
    session.updateState({ 'draft.saved': true }, { transitionId: fired.transition.id });
    expect(rowFor(session.transitions(), 'desk.save')?.attribution.basis).toBe('named-by-report');

    const late = session.observeEffect(fired.transition.id, { source: 'audit', status: 'performed' });

    expect(late).toMatchObject({ ok: true, settled: false });
    expect(rowFor(session.transitions(), 'desk.save')?.attribution.basis).toBe('named-by-report');
  });

  it('an observed fire closed by FIFO ends up inferred, and stays there', () => {
    const graph = twoControls();
    const session = graph.createSession({ node: 'desk', state: { 'draft.saved': false } });
    session.registerHandlers({ group: 'app', handlers: { 'desk.save': () => undefined } });
    const fired = session.fire('desk.save', { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');
    expect(fired.transition.attribution.certainty).toBe('observed');

    session.updateState({ 'draft.saved': true });

    expect(fired.transition.attribution.certainty).toBe('inferred');
  });
});

// ---------------------------------------------------------------------------
// Every row, every channel
// ---------------------------------------------------------------------------

describe('the stamp is on every transition and cannot be rewritten', () => {
  it('rides sync hops — the motion observed, the actor unknown unless named', () => {
    const session = storefront().createSession({ node: 'catalog', state: initialState });

    const hop = session.sync('cart');
    const named = session.sync('checkout', { principal: 'user' });

    expect(hop.changed && hop.transition.attribution).toEqual({
      principal: 'unknown',
      basis: 'declared-stimulus',
      certainty: 'observed',
    });
    expect(named.changed && named.transition.attribution.principal).toBe('user');
  });

  it('rides a structure-swap row', async () => {
    const { session } = shop();
    session.registerActions('catalog', { handlers: { note: () => undefined } });
    await Promise.resolve();

    const swap = session.transitions().find((row) => row.cause.stimulus === 'structure-swap');
    expect(swap?.attribution).toEqual({
      principal: 'system',
      basis: 'declared-stimulus',
      certainty: 'observed',
    });
  });

  it('is COPIED to every listener — the honesty marker is not shared memory', () => {
    const session = storefront().createSession({ node: 'catalog', state: initialState });
    wire(session, 'login');
    const seen: TransitionRecord[] = [];
    session.on('transition', (row) => seen.push(row));

    const fired = session.fire('login', { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');
    // A consumer edits its own copy — the one field whose whole job is saying
    // how much to trust the rest.
    seen[0].attribution.certainty = 'observed';
    seen[0].attribution.basis = 'named-by-report';

    // MUTATION PROOF: share the stamp by reference in #copyRecord and the log
    // now says a listener's word.
    expect(session.transitions()[0].attribution).toEqual({
      principal: 'agent',
      basis: 'caller-asserted',
      certainty: 'observed',
    });
  });
});
