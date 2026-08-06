/**
 * A NAME FOR THE ROW THAT WAS SERVED — and a fire that can cite it.
 *
 * `available()` handed back a version and `fire()` took an `expectedVersion` the
 * caller typed in by hand. Nothing joined a fire to the ROW it was planned
 * against, so the library could not answer the question every freshness rule
 * rests on: what was true when you were offered this? An `offerId` on the row and
 * a citation on the fire closes exactly that, and closes nothing else.
 *
 * WHAT AN OFFER IS NOT, pinned here because the name invites the bigger reading:
 * it is a CITATION to a session record. Not a secret (it is printed on the row a
 * model reads), not a capability (holding one authorizes nothing — every gate
 * still runs), not a nonce (the same row served twice is the same offer).
 *
 * MUTATION PROOFS — each one was applied to the source and this file re-run
 * (32 tests); the number is how many died.
 * - Mint a fresh id on every serve (ignore the facts index) → 3 red.
 * - Rewrite `servedAt` on a re-serve instead of keeping the first → 1 red.
 * - Put `version` back in the identity key → 1 red.
 * - Hand out the ledger's own record instead of a copy → 2 red.
 * - Report an evicted citation as 'unknown' → 1 red.
 * - Evict newest-first instead of oldest-first → 3 red.
 * - Evict the record but leave its facts-index entry → 1 red.
 * - Warn on every eviction instead of once → 1 red.
 * - Warn a session that requires no citation → 3 red (the ledger fills on every
 *   session; only an enforcing one can be COST anything by the bound).
 * - Render the identity key by joining instead of JSON.stringify → 1 red.
 *
 * (Two more live in freshness-policy.test.ts, where the citation is judged: an
 * offer minted for another control, and an evicted id reported as unknown.)
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import { OfferLedger } from '../src/traverse/offers.js';
import type { OfferFacts } from '../src/traverse/offers.js';

// ---------------------------------------------------------------------------
// The ledger, on its own — the identity rule and the bound
// ---------------------------------------------------------------------------

function facts(over: Partial<OfferFacts> = {}): OfferFacts {
  return {
    actionId: 'trip.hold-room',
    node: 'trip',
    version: 3,
    stateVersion: 1,
    structureVersion: 0,
    guardEvaluated: ['trip.open'],
    guardUnevaluated: [],
    staleReads: [],
    staleWrites: [],
    ...over,
  };
}

function ledger(opts: { max?: number; citationsRequired?: boolean } = {}) {
  const warnings: string[] = [];
  let clock = 1000;
  // Enforcing by default here: these tests are about the BOUND, and the audience
  // rule gets its own describe block below.
  let required = opts.citationsRequired ?? true;
  const led = new OfferLedger({
    ...(opts.max !== undefined ? { max: opts.max } : {}),
    now: () => (clock += 1),
    warn: (message) => warnings.push(message),
    citationsRequired: () => required,
  });
  return { led, warnings, startRequiringCitations: () => (required = true) };
}

describe('an offer is its facts — the identity rule', () => {
  it('the same facts twice is ONE offer, with one record', () => {
    const { led } = ledger();
    const first = led.mint(facts());
    const second = led.mint(facts());
    expect(second.offerId).toBe(first.offerId);
    expect(led.all()).toHaveLength(1);
  });

  it('and the record is the FIRST one — a receipt at rest is never rewritten', () => {
    const { led } = ledger();
    const first = led.mint(facts());
    const servedAt = led.get(first.offerId)!.servedAt;
    led.mint(facts());
    expect(led.get(first.offerId)!.servedAt).toBe(servedAt);
  });

  it('a different fact is a different offer — each of them, one at a time', () => {
    const { led } = ledger();
    const base = led.mint(facts()).offerId;
    const different = [
      facts({ actionId: 'trip.hold-flight' }),
      facts({ node: 'home' }),
      facts({ stateVersion: 2 }),
      facts({ structureVersion: 1 }),
      facts({ guardEvaluated: ['trip.other'] }),
      facts({ guardUnevaluated: ['trip.unknown'] }),
      facts({ staleReads: ['trip.budget'] }),
      facts({ staleWrites: ['trip.budget'] }),
    ].map((f) => led.mint(f).offerId);
    expect(new Set([base, ...different]).size).toBe(9);
  });

  it('AND NO TWO FACT SETS CAN RENDER TO ONE KEY — the separator cannot be forged', () => {
    // Nothing validates the characters in a state key, so a key containing the
    // list separator used to collapse two different fact sets into one id:
    // ['a,b'] and ['a', 'b'] joined to the same string. The identity rule is what
    // makes this ledger append-only in practice, so it cannot rest on nobody
    // having tried. MUTATION PROOF: render the key by joining and this goes red.
    const { led } = ledger();
    const one = led.mint(facts({ guardEvaluated: ['a,b'] }));
    const two = led.mint(facts({ guardEvaluated: ['a', 'b'] }));
    expect(two.offerId).not.toBe(one.offerId);
    // …and the same shape across a field boundary.
    const three = led.mint(facts({ node: 'home', guardEvaluated: [] }));
    const four = led.mint(facts({ node: 'home', guardEvaluated: [''] }));
    expect(four.offerId).not.toBe(three.offerId);
  });

  it('the CURSOR alone is not a new fact: a version that moved with nothing committed reuses the offer', () => {
    // The anchor a reused offer carries is its first serve's, and it names the
    // same keys — no state key can be committed without stateVersion moving.
    const { led } = ledger();
    const first = led.mint(facts({ version: 3 }));
    const later = led.mint(facts({ version: 9 }));
    expect(later.offerId).toBe(first.offerId);
    expect(led.get(first.offerId)!.version).toBe(3);
  });

  it('the ref carries the five fields a row needs, and nothing the record keeps to itself', () => {
    const { led } = ledger();
    const ref = led.mint(facts());
    expect(Object.keys(ref).sort()).toEqual([
      'actionId',
      'node',
      'offerId',
      'stateVersion',
      'structureVersion',
    ]);
  });
});

describe('the record is handed out as a copy', () => {
  it('sorting a key list in place does not reach the ledger', () => {
    const { led } = ledger();
    const ref = led.mint(facts({ guardEvaluated: ['b', 'a'] }));
    led.get(ref.offerId)!.guardEvaluated.push('mine');
    expect(led.get(ref.offerId)!.guardEvaluated).toEqual(['b', 'a']);
  });

  it('and so is every row of the whole list', () => {
    const { led } = ledger();
    const ref = led.mint(facts({ staleWrites: ['x'] }));
    led.all()[0].staleWrites.push('mine');
    expect(led.get(ref.offerId)!.staleWrites).toEqual(['x']);
  });

  it('an id nobody minted answers with nothing', () => {
    const { led } = ledger();
    expect(led.get('offer#404')).toBeUndefined();
  });
});

describe('the bound, and saying so', () => {
  it('the OLDEST goes first, and the count says how many', () => {
    const { led } = ledger({ max: 2 });
    const first = led.mint(facts({ stateVersion: 1 }));
    const second = led.mint(facts({ stateVersion: 2 }));
    const third = led.mint(facts({ stateVersion: 3 }));
    expect(led.get(first.offerId)).toBeUndefined();
    expect(led.get(second.offerId)).toBeDefined();
    expect(led.get(third.offerId)).toBeDefined();
    expect(led.dropped).toBe(1);
  });

  it('AN EVICTED CITATION IS SAID TO BE EVICTED, never called made up', () => {
    const { led } = ledger({ max: 1 });
    const first = led.mint(facts({ stateVersion: 1 }));
    led.mint(facts({ stateVersion: 2 }));
    expect(led.standing(first.offerId)).toBe('evicted');
  });

  it('and an id this session never minted is unknown, however it is shaped', () => {
    const { led } = ledger();
    const mine = led.mint(facts());
    expect(led.standing(mine.offerId)).toBe('retained');
    expect(led.standing('offer#99')).toBe('unknown'); // past the counter
    expect(led.standing('offer#0')).toBe('unknown'); // before the counter
    expect(led.standing('not-an-offer')).toBe('unknown'); // not our shape at all
  });

  it('an evicted offer’s FACTS are dropped with it, so a re-serve mints a live id', () => {
    const { led } = ledger({ max: 1 });
    const first = led.mint(facts({ stateVersion: 1 }));
    led.mint(facts({ stateVersion: 2 }));
    // Exactly the first facts again. The index must not hand back the id whose
    // record is gone — that would be a citation this session could neither
    // answer nor honestly call evicted.
    const again = led.mint(facts({ stateVersion: 1 }));
    expect(again.offerId).not.toBe(first.offerId);
    expect(led.get(again.offerId)).toBeDefined();
  });

  it('the integrator is told ONCE, and the sentence names the fix', () => {
    const { led, warnings } = ledger({ max: 1 });
    led.mint(facts({ stateVersion: 1 }));
    led.mint(facts({ stateVersion: 2 }));
    led.mint(facts({ stateVersion: 3 }));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('maxOffers');
  });

  it('a cap of zero is read as one — a ledger that retains nothing is not a smaller ledger', () => {
    const { led } = ledger({ max: 0 });
    const only = led.mint(facts());
    expect(led.get(only.offerId)).toBeDefined();
  });
});

describe('the warning is ADDRESSED, not broadcast', () => {
  it('a ledger nobody cites from evicts in SILENCE — counted, never announced', () => {
    const { led, warnings } = ledger({ max: 1, citationsRequired: false });
    led.mint(facts({ stateVersion: 1 }));
    led.mint(facts({ stateVersion: 2 }));
    led.mint(facts({ stateVersion: 3 }));
    expect(led.dropped).toBe(2); // the bound is doing its job
    expect(warnings).toEqual([]); // and saying nothing about it
  });

  it('and a session that STARTS requiring citations still hears about the bound it already hit', () => {
    const { led, warnings, startRequiringCitations } = ledger({ max: 1, citationsRequired: false });
    led.mint(facts({ stateVersion: 1 }));
    led.mint(facts({ stateVersion: 2 }));
    expect(warnings).toEqual([]);
    // A mount-declared action brings a freshness policy in. The eviction that
    // already happened is exactly what the integrator now needs to know about.
    startRequiringCitations();
    led.mint(facts({ stateVersion: 3 }));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('maxOffers');
  });
});

// ---------------------------------------------------------------------------
// Through a real session
// ---------------------------------------------------------------------------

function board() {
  const map = buildNavigationGraph('board', {
    pages: {
      trip: {
        actions: {
          'hold-room': {
            does: 'Put a hold on a room',
            when: { 'trip.open': { eq: true } },
            reads: ['trip.budget'],
            writes: ['itinerary.roomHeld'],
          },
          'hold-flight': { does: 'Put a hold on a flight', writes: ['itinerary.flightHeld'] },
        },
      },
      home: { actions: { back: { does: 'Go back to the trip', goTo: 'trip' } } },
    },
  });
  const session = map.createSession({
    node: 'trip',
    state: { 'trip.open': true, 'trip.budget': 1000, 'itinerary.roomHeld': false },
    onWarn: () => undefined,
  });
  session.registerActions('trip', {
    handlers: { 'hold-room': () => undefined, 'hold-flight': () => undefined },
  });
  return { map, session };
}

const roomRow = (session: ReturnType<typeof board>['session']) =>
  session.available().edges.find((e) => e.affordanceId === 'trip.hold-room')!;

describe('every served row carries its offer', () => {
  it('the ref names the action, the page and the versions it was served under', () => {
    const { session } = board();
    const ref = roomRow(session).offerRef!;
    expect(ref).toEqual({
      offerId: expect.stringMatching(/^offer#\d+$/) as unknown as string,
      actionId: 'trip.hold-room',
      node: 'trip',
      stateVersion: session.stateVersion,
      structureVersion: session.structureVersion,
    });
  });

  it('LOOKING TWICE IS ONE OFFER — a read path does not grow a ledger', () => {
    const { session } = board();
    const first = roomRow(session).offerRef!.offerId;
    for (let i = 0; i < 20; i++) session.available();
    expect(roomRow(session).offerRef!.offerId).toBe(first);
    expect(session.offers()).toHaveLength(2); // one per served action, not per look
  });

  it('and a world that moved is a new offer', () => {
    const { session } = board();
    const before = roomRow(session).offerRef!.offerId;
    session.updateState({ 'trip.budget': 400 }, { stimulus: 'push' });
    expect(roomRow(session).offerRef!.offerId).not.toBe(before);
  });

  it('the record says what was true: the guard keys it judged, and what it could not', () => {
    const map = buildNavigationGraph('board', {
      pages: {
        trip: {
          actions: {
            look: { does: 'Look', when: { 'trip.open': { eq: true }, 'trip.mystery': { eq: 1 } } },
          },
        },
      },
    });
    const session = map.createSession({ node: 'trip', state: { 'trip.open': true }, onWarn: () => undefined });
    const ref = session.available().edges[0].offerRef!;
    const record = session.offerFor(ref.offerId)!;
    expect(record.guardEvaluated).toEqual(['trip.open']);
    expect(record.guardUnevaluated).toEqual(['trip.mystery']);
  });

  it('and what it was already carrying unanswered for that control', () => {
    const { session } = board();
    session.carryStale('trip.hold-room', ['trip.budget', 'itinerary.roomHeld', 'not.declared']);
    const record = session.offerFor(roomRow(session).offerRef!.offerId)!;
    // The DECLARED halves only: an outstanding key the control never named is
    // not a fact about this row.
    expect(record.staleReads).toEqual(['trip.budget']);
    expect(record.staleWrites).toEqual(['itinerary.roomHeld']);
  });

  it('offerFor answers with a copy, and offers() lists them oldest first', () => {
    const { session } = board();
    const ref = roomRow(session).offerRef!;
    session.offerFor(ref.offerId)!.guardEvaluated.push('mine');
    expect(session.offerFor(ref.offerId)!.guardEvaluated).toEqual(['trip.open']);
    expect(session.offers().map((o) => o.actionId)).toEqual(['trip.hold-room', 'trip.hold-flight']);
    expect(session.offersDropped()).toBe(0);
  });

  it('the bound is the session’s to set, and the drop count is answerable', () => {
    const map = buildNavigationGraph('board', {
      pages: { trip: { actions: { look: { does: 'Look' } } } },
    });
    const session = map.createSession({
      node: 'trip',
      state: { n: 0 },
      maxOffers: 2,
      onWarn: () => undefined,
    });
    for (let n = 1; n <= 5; n++) {
      session.available();
      session.updateState({ n }, { stimulus: 'push' });
    }
    session.available();
    expect(session.offers().length).toBeLessThanOrEqual(2);
    expect(session.offersDropped()).toBeGreaterThan(0);
  });

  // LAW 2, on the one surface that could move without anybody opting in: the
  // ledger fills from the READ path on every session, so its bound is reached by
  // consumers who declared nothing. They must not be told to tune it.
  it('A SESSION THAT OPTED INTO NOTHING OVERFLOWS IN SILENCE — no warning, ever', () => {
    const map = buildNavigationGraph('board', {
      pages: { trip: { actions: { look: { does: 'Look' } } } },
    });
    const warnings: string[] = [];
    const session = map.createSession({ node: 'trip', state: { n: 0 }, onWarn: (m) => warnings.push(m) });
    // Past the default cap of 500 distinct fact-sets, twice over.
    for (let n = 1; n <= 600; n++) {
      session.available();
      session.updateState({ n }, { stimulus: 'push' });
    }
    session.available();
    expect(session.offersDropped()).toBeGreaterThan(0);
    expect(warnings).toEqual([]);
  });

  it('and a session that DOES require a citation is told once, because there it costs something', () => {
    const map = buildNavigationGraph('board', {
      pages: { trip: { actions: { look: { does: 'Look', reads: ['n'] } } } },
    });
    const warnings: string[] = [];
    const session = map.createSession({
      node: 'trip',
      state: { n: 0 },
      maxOffers: 2,
      freshness: { readChanges: 'refuse' },
      onWarn: (m) => warnings.push(m),
    });
    for (let n = 1; n <= 5; n++) {
      session.available();
      session.updateState({ n }, { stimulus: 'push' });
    }
    session.available();
    expect(session.offersDropped()).toBeGreaterThan(0);
    expect(warnings.filter((m) => m.includes('offer ledger is full'))).toHaveLength(1);
  });
});

describe('a fire may cite the row it was planned against', () => {
  it('the citation lands on the transition, whether or not anything enforces', () => {
    const { session } = board();
    const offerId = roomRow(session).offerRef!.offerId;
    const fired = session.fire('trip.hold-room', { source: 'agent', offerId });
    expect(fired.ok).toBe(true);
    expect(session.transitions()[0].offerId).toBe(offerId);
  });

  it('AND IT CHANGES NOTHING ELSE: an unresolved citation is still just a fire', () => {
    // The whole default-behaviour promise. Nothing here declares a policy, so a
    // citation is recorded and never judged — an id this session never minted
    // cannot refuse a fire that would otherwise have been allowed.
    const { session } = board();
    const fired = session.fire('trip.hold-room', { source: 'agent', offerId: 'offer#nope' });
    expect(fired.ok).toBe(true);
    expect(session.transitions()[0].offerId).toBe('offer#nope');
  });

  it('a fire that cites nothing carries no key at all', () => {
    const { session } = board();
    session.fire('trip.hold-room', { source: 'agent' });
    expect(session.transitions()[0]).not.toHaveProperty('offerId');
  });

  it('and the citation survives being read back through the transition copy', () => {
    const { session } = board();
    const offerId = roomRow(session).offerRef!.offerId;
    session.fire('trip.hold-flight', { source: 'agent', offerId });
    const seen: string[] = [];
    session.on('transition', (t) => seen.push(String(t.offerId)));
    session.fire('trip.hold-flight', { source: 'agent', offerId });
    expect(seen).toContain(offerId);
  });
});

describe('the offer is not a capability', () => {
  it('citing a valid offer does not get past a guard that has closed', () => {
    const { session } = board();
    const offerId = roomRow(session).offerRef!.offerId;
    session.updateState({ 'trip.open': false }, { stimulus: 'push' });
    const fired = session.fire('trip.hold-room', { source: 'agent', offerId });
    expect(fired).toMatchObject({ ok: false, reason: 'GUARD_FAILED' });
  });

  it('and it does not carry a control onto a page it is not on', () => {
    const { session } = board();
    const offerId = roomRow(session).offerRef!.offerId;
    session.sync('home');
    const fired = session.fire('trip.hold-room', { source: 'agent', offerId });
    expect(fired).toMatchObject({ ok: false, reason: 'NOT_ON_NODE' });
  });
});
