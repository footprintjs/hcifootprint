/**
 * `humanDecides` — A STEP A PERSON DECIDES, disclosed and never enforced.
 *
 * `requireHumanApproval` answers "may the agent ACT". This answers a different
 * question: some choices are the person's to MAKE — which plan, which shipping
 * speed, whether to sell at all — and the agent's correct move there is to
 * present options and stop. Before this, a model met a choice control like any
 * other and fired it, or invented its own vocabulary for the pause.
 *
 * WHAT THIS SUITE IS REALLY GUARDING is the attribution ladder. A decision is
 * the one place where a guessed owner is unacceptable, so `madeBy` is minted
 * from exactly the three identity-bearing rungs and CLEARED by every matching
 * one. Half this file is attempts to launder a guess into a maker.
 *
 * THE DISHONEST IMPLEMENTATIONS IT EXISTS TO CATCH, each with its own test: a
 * `made: 'unknown'` quietly rendered as "not yet"; a FIFO-settled delta
 * attributed to the person who answered the last one; a chat-typed "done"
 * reaching a session door; a stale `madeBy` surviving a rewrite it had nothing
 * to do with; a library that treats `made: true` as a trigger; and a v1 that
 * grew a refusal word nobody designed.
 *
 * MUTATION PROOFS (each one run, and the counts are what it actually did):
 * - Mint the book on the FIFO arm as well → 1 red (T-A2's FIFO case).
 * - Mint it on the single-cover arm → 1 red (T-A2's async case).
 * - Mint it on the inference arm → 1 red (T-A2's inferred case).
 * - Default `madeBy` to 'user' on the unknown-stimulus floor → 1 red.
 * - Keep the book entry on an unattributed touch instead of clearing → 1 red
 *   (T-A5, the stale stamp).
 * - Serve `madeBy` beside `made: false` → 1 red (the flip-back test).
 * - Collapse `'unknown'` into `false` → 3 red across T-A3.
 * - Read `doneWhen` once at construction instead of live → 2 red.
 * - Refuse an agent fire of a humanDecides control → 1 red (T-A12's sibling in
 *   with-the-human.test.ts, plus the gap-ledger pin here).
 * - Drop the `about` cap → 1 red; drop the empty-`doneWhen` refusal → 1 red.
 * - Skip `doneWhen` keys in requiredStateKeys() → 1 red.
 * - Stamp `humanDecides: false` on undeclared rows → 2 red (presence law).
 */
import { describe, expect, it, vi } from 'vitest';
import { GraphValidationError, buildNavigationGraph, serveToAgent } from '../src/index.js';
import { ABOUT_MAX } from '../src/graph/guards.js';
import type {
  Binding,
  EffectStatus,
  FireResult,
  FrameStatus,
  GapReason,
  GapRecord,
  JourneyStanding,
  Settlement,
  StepStatus,
} from '../src/index.js';
import {
  ADDRESS,
  CHOOSE,
  PLACE,
  SHIPPING_ABOUT,
  SHIPPING_DONE_WHEN,
  checkout,
  checkoutSession,
  seeded,
  tick,
} from './human-decisions-fixture.js';

// ---------------------------------------------------------------------------
// Declaration and compile
// ---------------------------------------------------------------------------

describe('the declaration: authored on the action, carried on the affordance', () => {
  it('compiles onto the affordance VERBATIM — enabledWhen’s exact path', () => {
    const graph = checkout();
    expect(graph.spec.affordances[CHOOSE].humanDecides).toEqual({
      about: SHIPPING_ABOUT,
      doneWhen: { 'checkout.shipping': { ne: '' } },
    });
  });

  it('owns its bytes: the author’s object is cloned, not aliased', () => {
    const declared = { about: 'which speed', doneWhen: { 'checkout.shipping': { ne: '' } } };
    const graph = buildNavigationGraph('shop', {
      pages: { checkout: { actions: { pick: { does: 'Pick a speed', humanDecides: declared } } } },
    });
    declared.about = 'something else entirely';
    expect(graph.spec.affordances['checkout.pick'].humanDecides?.about).toBe('which speed');
  });

  it('the served edge carries PRESENCE-ONLY humanDecides: true', () => {
    const edges = checkoutSession().available().edges;
    const row = edges.find((edge) => edge.affordanceId === CHOOSE);
    expect(row?.humanDecides).toBe(true);
  });

  it('an undeclared control serves NO key — never false', () => {
    const edges = checkoutSession().available().edges;
    const row = edges.find((edge) => edge.affordanceId === ADDRESS);
    // The key, not the value: `toEqual` cannot tell absent from false.
    expect(Object.hasOwn(row!, 'humanDecides')).toBe(false);
  });

  it('the row does not re-serve doneWhen, and does not carry about', () => {
    const row = checkoutSession()
      .available()
      .edges.find((edge) => edge.affordanceId === CHOOSE)!;
    expect(JSON.stringify(row)).not.toContain('doneWhen');
    expect(JSON.stringify(row)).not.toContain(SHIPPING_ABOUT);
  });
});

describe('what the authoring doors refuse — loudly, and in the same words', () => {
  const build = (humanDecides: unknown): (() => unknown) => () =>
    buildNavigationGraph('shop', {
      pages: {
        checkout: {
          actions: {
            pick: { does: 'Pick a speed', humanDecides: humanDecides as never },
          },
        },
      },
    });

  it('doneWhen: {} — the empty-filter law, enabledWhen parity', () => {
    expect(build({ doneWhen: {} })).toThrow(GraphValidationError);
    expect(build({ doneWhen: {} })).toThrow(/NEVER matches an empty filter/);
    // And it names the cure the design actually offers.
    expect(build({ doneWhen: {} })).toThrow(/Omit 'doneWhen' entirely/);
  });

  it('a doneWhen shape the evaluator would silently ignore', () => {
    expect(build({ doneWhen: { 'checkout.shipping': { isnt: '' } } })).toThrow(/unknown operator/);
    expect(build({ doneWhen: 'the shipping is chosen' })).toThrow(/must be a filter over projected state/);
  });

  it(`about over ${ABOUT_MAX} characters`, () => {
    expect(build({ about: 'x'.repeat(ABOUT_MAX + 1) })).toThrow(GraphValidationError);
    expect(build({ about: 'x'.repeat(ABOUT_MAX + 1) })).toThrow(/is 201 characters/);
    // …and exactly at the cap is fine: a cap refuses what is OVER it.
    expect(build({ about: 'x'.repeat(ABOUT_MAX) })).not.toThrow();
  });

  it('an empty about — a blank where a reader expects a subject', () => {
    expect(build({ about: '   ' })).toThrow(/humanDecides.about is empty/);
  });

  it('a declaration that is not an object at all', () => {
    expect(build('the human picks')).toThrow(/humanDecides must be an object/);
    expect(build([{ about: 'x' }])).toThrow(/humanDecides must be an object/);
  });

  it('the MOUNT door refuses the same things in the same sentence', () => {
    const session = checkoutSession();
    const mount = (humanDecides: unknown): (() => unknown) => () =>
      session.registerActions('checkout', {
        actions: {
          'pick-wrap': { does: 'Choose gift wrap', humanDecides: humanDecides as never },
        },
      });
    // Same sentence, one owner apiece — that is the whole contract between the
    // two doors: what one refuses, the other refuses, and a reader learning from
    // one has learned the other.
    expect(mount({ doneWhen: {} })).toThrow(
      /mount-declared action 'checkout.pick-wrap': humanDecides.doneWhen is empty \{\}/,
    );
    expect(mount({ about: '' })).toThrow(
      /mount-declared action 'checkout.pick-wrap': humanDecides.about is empty/,
    );
    expect(() =>
      buildNavigationGraph('shop', {
        pages: { checkout: { actions: { pick: { does: 'x', humanDecides: { about: '' } } } } },
      }),
    ).toThrow(/action 'checkout.pick': humanDecides.about is empty/);
  });

  it('a mount-declared decision is served exactly like a compiled one', () => {
    const session = checkoutSession();
    session.registerActions('checkout', {
      actions: {
        'pick-wrap': {
          does: 'Choose gift wrap',
          humanDecides: { about: 'which gift wrap', doneWhen: { 'checkout.wrap': { ne: '' } } },
          handler: () => undefined,
        },
      },
    });
    const row = session.available().edges.find((edge) => edge.affordanceId === 'checkout.pick-wrap');
    expect(row?.humanDecides).toBe(true);
    expect(session.decisions()).toContainEqual({
      affordanceId: 'checkout.pick-wrap',
      about: 'which gift wrap',
      made: 'unknown', // nothing seeded 'checkout.wrap' — honest, and degraded
    });
  });
});

describe('requiredStateKeys() — what makes a declaration decidable', () => {
  it('doneWhen keys join the projector checklist', () => {
    expect(checkout().requiredStateKeys()).toContain('checkout.shipping');
  });

  it('a doneWhen key no guard mentions is still listed', () => {
    const graph = buildNavigationGraph('shop', {
      pages: {
        checkout: {
          actions: {
            pick: { does: 'Pick a speed', humanDecides: { doneWhen: { 'checkout.wrap': { ne: '' } } } },
          },
        },
      },
    });
    expect(graph.requiredStateKeys()).toEqual(['checkout.wrap']);
  });
});

describe('the per-step carrier: JourneyDef.steps takes { step } and nothing else', () => {
  it('the object element compiles identically to the bare name', () => {
    const withObjects = buildNavigationGraph('shop', {
      pages: {
        checkout: {
          actions: { a: { does: 'A' }, b: { does: 'B' } },
        },
      },
      journeys: { buy: { does: 'Buy', steps: [{ step: 'a' }, 'b'] } },
    });
    const withStrings = buildNavigationGraph('shop', {
      pages: {
        checkout: {
          actions: { a: { does: 'A' }, b: { does: 'B' } },
        },
      },
      journeys: { buy: { does: 'Buy', steps: ['a', 'b'] } },
    });
    expect(withObjects.spec.journeys.buy.steps).toEqual(['checkout.a', 'checkout.b']);
    expect(withObjects.spec.journeys.buy).toEqual(withStrings.spec.journeys.buy);
  });

  it('an element that is neither dies at the door, in the compiler’s own voice', () => {
    expect(() =>
      buildNavigationGraph('shop', {
        pages: { checkout: { actions: { a: { does: 'A' } } } },
        journeys: { buy: { does: 'Buy', steps: [{ when: { x: { eq: 1 } } } as never] } },
      }),
    ).toThrow(/neither an action name nor \{ step: '<name>' \}/);
  });
});

// ---------------------------------------------------------------------------
// decisions() and made
// ---------------------------------------------------------------------------

describe('decisions() — one row per declaring control, read when you ask', () => {
  it('no doneWhen declared → made is "unknown" FOREVER, never false', () => {
    const graph = buildNavigationGraph('shop', {
      pages: {
        checkout: {
          actions: { pick: { does: 'Pick a speed', humanDecides: { about: 'which speed' } } },
        },
      },
    });
    const session = graph.createSession({ node: 'checkout', state: {}, onWarn: () => undefined });
    expect(session.decisions()).toEqual([
      { affordanceId: 'checkout.pick', about: 'which speed', made: 'unknown' },
    ]);
    session.updateState({ anything: 'at all' }, { principal: 'user' });
    expect(session.decisions()[0].made).toBe('unknown');
  });

  it('an evaluable failing condition says false; a holding one says true', () => {
    const session = checkoutSession();
    expect(session.decisions()[0].made).toBe(false);
    session.updateState({ 'checkout.shipping': 'express' }, { principal: 'user' });
    expect(session.decisions()[0].made).toBe(true);
  });

  it('re-evaluates LIVE: a flip back serves false with no maker, and a fresh flip re-mints', () => {
    const session = checkoutSession();
    session.updateState({ 'checkout.shipping': 'express' }, { principal: 'user' });
    expect(session.decisions()[0]).toEqual({
      affordanceId: CHOOSE,
      about: SHIPPING_ABOUT,
      made: true,
      madeBy: 'user',
    });

    session.updateState({ 'checkout.shipping': '' }, { principal: 'user' });
    const back = session.decisions()[0];
    expect(back.made).toBe(false);
    // The KEY, not the value: `madeBy` rides beside `made: true` and nowhere else.
    expect(Object.hasOwn(back, 'madeBy')).toBe(false);

    session.updateState({ 'checkout.shipping': 'standard' }, { principal: 'user' });
    expect(session.decisions()[0].madeBy).toBe('user');
  });

  it('about rides the row verbatim as DATA, and no instance dimension exists', () => {
    const row = checkoutSession().decisions()[0];
    expect(row.about).toBe(SHIPPING_ABOUT);
    // The stated v1 limit, pinned: the declaration is action-level, so a row
    // never carries an instance and never claims to speak for one.
    expect(Object.hasOwn(row, 'instance')).toBe(false);
  });

  it('rows exist for declarations on OTHER pages — the book is graph-wide', () => {
    const graph = buildNavigationGraph('shop', {
      pages: {
        cart: { actions: { review: { does: 'Review the cart' } } },
        checkout: {
          actions: {
            pick: {
              does: 'Pick a speed',
              humanDecides: { doneWhen: { 'checkout.shipping': { ne: '' } } },
            },
          },
        },
      },
    });
    const session = graph.createSession({
      node: 'cart', // standing somewhere else entirely
      state: { 'checkout.shipping': '' },
      onWarn: () => undefined,
    });
    expect(session.decisions()).toEqual([{ affordanceId: 'checkout.pick', made: false }]);
    // …and the ROW is not an offer: the edge is not served here.
    expect(session.available().edges.map((edge) => edge.affordanceId)).toEqual(['cart.review']);
  });
});

// ---------------------------------------------------------------------------
// The honesty-stress attacks, named
// ---------------------------------------------------------------------------

describe('T-A1 attribution-only-through-identity', () => {
  it('a delta naming the user’s own fire → madeBy: "user"', () => {
    const session = checkoutSession();
    // The app reporting motion that really happened: record-only, principal
    // 'user' — the sensor's own tier.
    const fired = session.fire(CHOOSE, { source: 'user', invoke: false });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    session.updateState({ 'checkout.shipping': 'express' }, { transitionId: fired.transition.id });
    expect(session.decisions()[0].madeBy).toBe('user');
  });

  it('the handler’s OWN call window → that fire’s recorded principal', async () => {
    let session = checkoutSession();
    session = checkoutSession({
      handlers: {
        'enter-address': () => undefined,
        'choose-shipping-speed': () => session.updateState({ 'checkout.shipping': 'standard' }),
        'place-order': () => undefined,
      },
    });
    session.fire(CHOOSE, { source: 'user' });
    await tick();
    expect(session.decisions()[0]).toMatchObject({ made: true, madeBy: 'user' });
  });

  it('an attributed updateState({ principal }) → the caller’s word, verbatim', () => {
    const session = checkoutSession();
    session.updateState({ 'checkout.shipping': 'express' }, { principal: 'user' });
    expect(session.decisions()[0].madeBy).toBe('user');
  });

  it('…and verbatim means verbatim: a system report is filed as the system', () => {
    const session = checkoutSession();
    session.updateState({ 'checkout.shipping': 'express' }, { principal: 'system', stimulus: 'push' });
    expect(session.decisions()[0].madeBy).toBe('system');
  });
});

describe('T-A2 unattributed-flip-serves-no-maker', () => {
  /** Made, and nobody named — the whole assertion, said once. */
  function expectMadeByNobody(rows: ReturnType<ReturnType<typeof checkoutSession>['decisions']>): void {
    expect(rows[0].made).toBe(true);
    expect(Object.hasOwn(rows[0], 'madeBy')).toBe(false);
    expect(JSON.stringify(rows[0])).not.toContain('user');
  }

  it('FIFO-settled', () => {
    const session = checkoutSession();
    session.fire(CHOOSE, { source: 'user', invoke: false }); // pends, nothing runs
    session.updateState({ 'checkout.shipping': 'express' }); // no hint at all → FIFO
    expectMadeByNobody(session.decisions());
  });

  it('the single-cover arm, while every pending handler is still in flight', async () => {
    const session = checkoutSession({
      handlers: {
        'enter-address': () => undefined,
        'choose-shipping-speed': () => new Promise(() => undefined), // never resolves
        'place-order': () => undefined,
      },
    });
    session.fire(CHOOSE, { source: 'user' });
    await tick();
    session.updateState({ 'checkout.shipping': 'express' });
    expectMadeByNobody(session.decisions());
  });

  it('effect-signature inference — a guess the record itself flags', () => {
    const session = checkoutSession();
    const result = session.updateState({ 'checkout.shipping': 'express' });
    expect(result.ok && result.attributed).toBe(false);
    expect(session.transitions().at(-1)?.cause.inferred).toBe(true);
    expectMadeByNobody(session.decisions());
  });

  it('the unknown-stimulus floor', () => {
    const graph = checkout();
    // Nothing registered, so nothing can be inferred either: the honest floor.
    const session = graph.createSession({
      node: 'checkout',
      state: { ...seeded },
      onWarn: () => undefined,
    });
    session.updateState({ 'checkout.shipping': 'express' });
    expect(session.transitions().at(-1)?.cause.kind).toBe('stimulus');
    expectMadeByNobody(session.decisions());
  });

  it('a stimulus that stated no principal names nobody — the record’s "system" is not a claim', () => {
    const session = checkoutSession();
    session.updateState({ 'checkout.shipping': 'express' }, { stimulus: 'push' });
    expect(session.transitions().at(-1)?.cause.principal).toBe('system');
    expectMadeByNobody(session.decisions());
  });
});

describe('T-A3 unknown-is-not-not-yet', () => {
  it('a key the state view never contained → "unknown"', () => {
    const session = checkoutSession({ state: { 'checkout.address': '' } });
    expect(session.decisions()[0].made).toBe('unknown');
  });

  it('a key HOLDING undefined → "unknown" too (a value guard would match it)', () => {
    const session = checkoutSession({ state: { ...seeded, 'checkout.shipping': undefined } });
    expect(session.decisions()[0].made).toBe('unknown');
  });

  it('provably distinct from false, in the same graph one seed apart', () => {
    const unknown = checkoutSession({ state: { 'checkout.address': '' } }).decisions()[0].made;
    const no = checkoutSession().decisions()[0].made;
    expect(unknown).toBe('unknown');
    expect(no).toBe(false);
    expect(unknown).not.toBe(no);
  });

  it('carries through the frame row and the standing evidence unchanged', () => {
    const session = checkoutSession({ state: { 'checkout.address': '' } });
    session.commitJourney('buy', { source: 'agent' });
    const fired = session.fire(ADDRESS, { source: 'user', invoke: false });
    if (!fired.ok) throw new Error('the address step should have been fireable');
    session.updateState({ 'checkout.address': '12 Elm Row' }, { transitionId: fired.transition.id });

    expect(session.journeyStanding('buy').evidence.made).toBe('unknown');
    const port = serveToAgent(session);
    const result = port.call('shop.journey.buy');
    expect(result['withTheHuman']).toEqual([
      { step: CHOOSE, made: 'unknown', about: SHIPPING_ABOUT },
    ]);
  });
});

describe('T-A4 chat-done-cannot-launder', () => {
  it('no Mode B door reaches updateState — the port has four members and none is one', () => {
    const port = serveToAgent(checkoutSession());
    expect(Object.keys(port).sort()).toEqual(['call', 'settledAnswer', 'tools', 'whenSettled']);
    const toolNames = port.tools().map((tool) => tool.name);
    expect(toolNames).not.toContain('update_state');
    expect(JSON.stringify(port.tools())).not.toContain('updateState');
  });

  it('a conversation with no delta changes nothing', () => {
    const session = checkoutSession();
    const port = serveToAgent(session);
    const before = session.decisions();
    port.call('shop.whats_here');
    port.call('shop.whats_here', { sinceVersion: 0 });
    port.call('shop.why', { key: 'checkout.shipping' });
    expect(session.decisions()).toEqual(before);
  });

  it('a PORT fire that satisfies doneWhen is disclosed as the AGENT’s', async () => {
    let session = checkoutSession();
    session = checkoutSession({
      handlers: {
        'enter-address': () => undefined,
        'choose-shipping-speed': () => session.updateState({ 'checkout.shipping': 'express' }),
        'place-order': () => undefined,
      },
    });
    const port = serveToAgent(session);
    port.call('shop.do_action', { action: 'choose-shipping-speed' });
    await tick();
    // v1 is DISCLOSURE: the fire succeeded, and the book says who did it.
    expect(session.decisions()[0]).toMatchObject({ made: true, madeBy: 'agent' });
  });

  it('a port constructed as the user cannot make a chat report into a person’s decision', () => {
    // Even a port stamped 'user' has no door here: `call` routes to fire/why/
    // whats_here, and none of them writes state. The delta still has to come
    // from the app.
    const session = checkoutSession();
    const port = serveToAgent(session, { source: 'user' });
    port.call('shop.whats_here');
    expect(session.decisions()[0].made).toBe(false);
    expect(Object.hasOwn(session.decisions()[0], 'madeBy')).toBe(false);
  });
});

describe('T-A5 stale-stamp-does-not-survive', () => {
  it('an unattributed rewrite clears a person’s name off a value they never chose', () => {
    const session = checkoutSession();
    session.updateState({ 'checkout.shipping': 'standard' }, { principal: 'user' });
    expect(session.decisions()[0].madeBy).toBe('user');

    // The condition STILL holds — only the value moved, and nobody said who.
    session.updateState({ 'checkout.shipping': 'express' });
    const row = session.decisions()[0];
    expect(row.made).toBe(true);
    expect(Object.hasOwn(row, 'madeBy')).toBe(false);
  });

  it('a delta that misses every doneWhen key is not news about the decision', () => {
    const session = checkoutSession();
    session.updateState({ 'checkout.shipping': 'standard' }, { principal: 'user' });
    session.updateState({ 'checkout.address': '12 Elm Row' }); // unattributed, unrelated
    expect(session.decisions()[0].madeBy).toBe('user');
  });

  it('the world arriving decided serves made: true with nobody named', () => {
    const session = checkoutSession({ state: { ...seeded, 'checkout.shipping': 'express' } });
    const row = session.decisions()[0];
    expect(row.made).toBe(true);
    expect(Object.hasOwn(row, 'madeBy')).toBe(false);
  });
});

describe('T-A7 never-auto-fires', () => {
  type Session = ReturnType<typeof checkoutSession>;
  type Land = (session: Session) => void;

  /**
   * MEASURED AGAINST THE UNDECLARED TWIN, which is the only way to ask this
   * question honestly. A delta records a transition and may bump a version all
   * by itself — that is the app reporting reality, and it happened before this
   * feature existed. What must be true is that the DECLARATION adds nothing: the
   * same delta on the same graph, one declaration lighter, has to end in the same
   * place.
   */
  const paths: Array<[string, Land]> = [
    [
      'an attributed report',
      (session) => {
        session.updateState({ 'checkout.shipping': 'express' }, { principal: 'user' });
      },
    ],
    [
      'a report nobody attributed',
      (session) => {
        session.updateState({ 'checkout.shipping': 'express' });
      },
    ],
    [
      'a report naming its own fire',
      (session) => {
        const fired = session.fire(CHOOSE, { source: 'user', invoke: false });
        if (!fired.ok) throw new Error('the chooser should have been fireable');
        session.updateState(
          { 'checkout.shipping': 'express' },
          { transitionId: fired.transition.id },
        );
      },
    ],
  ];

  it.each(paths)('%s: made: true lands and the declaration moves nothing', (_name, land) => {
    const handler = vi.fn(() => undefined);
    const handlers = {
      'enter-address': handler,
      'choose-shipping-speed': handler,
      'place-order': handler,
    };
    const declared = checkoutSession({ handlers });
    const twin = checkoutSession({ graph: checkout({ declare: false }), handlers });
    for (const session of [declared, twin]) session.commitJourney('buy', { source: 'agent' });

    land(declared);
    land(twin);

    expect(declared.decisions()[0].made).toBe(true);
    expect(twin.decisions()).toEqual([]);
    // Nothing was invoked, nothing extra was recorded, and the version moved by
    // exactly what the twin's did.
    expect(handler).not.toHaveBeenCalled();
    expect(declared.transitions().length).toBe(twin.transitions().length);
    expect(declared.version).toBe(twin.version);
    // No frame motion beyond the twin's: no step advanced because a reading
    // turned true.
    const shape = (session: Session): unknown => {
      const frame = session.journeyFrame();
      return { status: frame?.status, firedSteps: frame?.firedSteps, inferredSteps: frame?.inferredSteps };
    };
    expect(shape(declared)).toEqual(shape(twin));
  });
});

describe('T-A8 no-card-no-ids', () => {
  it('a decision mints no ask, no askId, no card, no receipts', () => {
    const session = checkoutSession();
    session.commitJourney('buy', { source: 'agent' });
    session.updateState({ 'checkout.shipping': 'express' }, { principal: 'user' });

    expect(session.asks()).toEqual([]);
    expect(session.confirms()).toEqual([]);
    const row = session.decisions()[0];
    expect(Object.hasOwn(row, 'askId')).toBe(false);
    expect(Object.hasOwn(row, 'transitionId')).toBe(false);
    expect(Object.hasOwn(row, 'receipts')).toBe(false);
  });

  it('the held rows carry no such keys either — there is nothing to ask did_it_work about', () => {
    const session = checkoutSession();
    const port = serveToAgent(session);
    const held = (port.call('shop.journey.buy')['withTheHuman'] as Array<Record<string, unknown>>)[0];
    expect(Object.keys(held).sort()).toEqual(['about', 'made', 'step']);
  });
});

describe('T-A10 no-timer-anywhere', () => {
  it('no advance of an injected clock changes made, madeBy, a list, or a standing', () => {
    let clock = 1_000;
    const session = checkoutSession({ now: () => clock });
    session.commitJourney('buy', { source: 'agent' });
    session.updateState({ 'checkout.shipping': 'express' }, { principal: 'user' });

    const port = serveToAgent(session);
    const before = {
      decisions: session.decisions(),
      standing: session.journeyStanding('buy'),
      frame: port.call('shop.journey.buy'),
    };

    clock += 1_000 * 60 * 60 * 24 * 365; // a year

    expect(session.decisions()).toEqual(before.decisions);
    expect(session.journeyStanding('buy')).toEqual(before.standing);
    expect(port.call('shop.journey.buy')).toEqual(before.frame);
  });
});

describe('T-A11 vocabulary-firewall', () => {
  it('about never enters groundTruth(), and neither does any app runtime string', () => {
    const session = checkoutSession();
    const facts = session.groundTruth().text;
    expect(facts).toContain('A decision is with the human');
    expect(facts).not.toContain(SHIPPING_ABOUT);
    expect(facts).not.toContain('express');
  });

  it('the approval words never appear on a decision surface', () => {
    const session = checkoutSession();
    session.updateState({ 'checkout.shipping': 'express' }, { principal: 'user' });
    const serialized = JSON.stringify(session.decisions());
    for (const word of ['askId', 'approved', 'declined', 'spent', 'stale', 'APPROVAL_']) {
      expect(serialized).not.toContain(word);
    }
  });

  it('…and this note’s words never appear on an approval surface', () => {
    const session = checkoutSession({ graph: checkout({ confirmPlaceOrder: true }) });
    session.updateState({ 'checkout.shipping': 'express' }, { principal: 'user' });
    session.confirmAsk(PLACE, { source: 'agent' });
    const serialized = JSON.stringify([session.asks(), session.confirms()]);
    for (const word of ['made', 'madeBy', 'with-the-human', 'humanDecides']) {
      expect(serialized).not.toContain(word);
    }
  });
});

describe('T-A12 frozen-unions-stay-frozen', () => {
  /** Exact set equality at the type level — a grown union stops compiling here. */
  type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

  it('FireResult["reason"] is byte-identical — enforcement minted no refusal', () => {
    const pin: Exact<
      Extract<FireResult, { ok: false }>['reason'],
      | 'UNKNOWN_AFFORDANCE'
      | 'STALE_CURSOR'
      | 'NOT_ON_NODE'
      | 'GUARD_FAILED'
      | 'PAYLOAD_INVALID'
      | 'BLOCKED_BY_OVERLAY'
      | 'NODE_NOT_VISIBLE'
      | 'STILL_MOUNTING'
      | 'INSTANCE_REQUIRED'
      | 'INSTANCE_UNKNOWN'
      | 'TOOL_DISABLED'
      | 'NOT_MATERIALIZED'
      | 'APPROVAL_REQUIRED'
      | 'APPROVAL_SPENT'
      | 'APPROVAL_MISMATCH'
      | 'APPROVAL_STALE'
      | 'APPROVAL_DECLINED'
      // revokeAsk (the ask book's third word) grew the union by exactly this
      // one — a conscious act, recorded here, exactly what the pin is for.
      | 'APPROVAL_REVOKED'
      // Freshness and single-flight, each a conscious act recorded the same way.
      | 'OFFER_REQUIRED'
      | 'OFFER_NOT_ON_RECORD'
      | 'WORLD_MOVED'
      | 'ACKNOWLEDGEMENT_REQUIRED'
      | 'ACKNOWLEDGEMENT_STALE'
      | 'PRIOR_FIRE_PENDING'
      // AND THE TWO THIS RELEASE ADDS — read what the pin is actually for
      // before reading them as this test failing at its own job. It guards
      // `humanDecides`: ownership is DISCLOSURE and mints no refusal word, and
      // neither of these is one. `PRINCIPAL_NOT_ALLOWED` belongs to a separate
      // declaration (`principalPolicy.mayInvoke`) that an integrator must switch
      // on, and it is deliberately NOT reachable from `decisionOwner` — the test
      // 'NEVER refuses on ownership' in principal-policy.test.ts is that claim's
      // own pin. `EFFECT_NOT_VERIFIABLE` is about an app's missing declaration
      // and touches no ownership surface at all.
      | 'PRINCIPAL_NOT_ALLOWED'
      | 'EFFECT_NOT_VERIFIABLE'
    > = true;
    expect(pin).toBe(true);
  });

  it('GapRecord["rejectionReason"] is byte-identical — the two grow only in lockstep', () => {
    const pin: Exact<
      NonNullable<GapRecord['rejectionReason']>,
      | 'UNKNOWN_AFFORDANCE'
      | 'STALE_CURSOR'
      | 'NOT_ON_NODE'
      | 'GUARD_FAILED'
      | 'PAYLOAD_INVALID'
      | 'BLOCKED_BY_OVERLAY'
      | 'NODE_NOT_VISIBLE'
      | 'STILL_MOUNTING'
      | 'INSTANCE_REQUIRED'
      | 'INSTANCE_UNKNOWN'
      | 'TOOL_DISABLED'
      | 'NOT_MATERIALIZED'
      | 'ENTRY_NOT_MATERIALIZED'
      | 'APPROVAL_REQUIRED'
      | 'APPROVAL_SPENT'
      | 'APPROVAL_MISMATCH'
      | 'APPROVAL_STALE'
      | 'APPROVAL_DECLINED'
      // grown with FireResult above, in lockstep — revokeAsk's refusal word.
      | 'APPROVAL_REVOKED'
      | 'OFFER_REQUIRED'
      | 'OFFER_NOT_ON_RECORD'
      | 'WORLD_MOVED'
      | 'ACKNOWLEDGEMENT_REQUIRED'
      | 'ACKNOWLEDGEMENT_STALE'
      | 'PRIOR_FIRE_PENDING'
      // IN LOCKSTEP, as the two always are — see the sentence on the pin above
      // for why neither of these is `humanDecides` growing a refusal.
      | 'PRINCIPAL_NOT_ALLOWED'
      | 'EFFECT_NOT_VERIFIABLE'
    > = true;
    expect(pin).toBe(true);
  });

  it('the four status/word unions and the gesture kinds are untouched', () => {
    const effect: Exact<EffectStatus, 'pending' | 'performed' | 'refused' | 'unobservable'> = true;
    const settlement: Exact<
      Settlement,
      'pending' | 'committed' | 'rejected' | 'rolled-back' | 'superseded'
    > = true;
    const step: Exact<StepStatus, 'done' | 'inferred-done' | 'ready' | 'blocked' | 'off-node'> = true;
    const frame: Exact<FrameStatus, 'open' | 'completed' | 'cancelled' | 'demoted'> = true;
    const gap: Exact<
      GapReason,
      'no-journey-matched' | 'guard-blocked' | 'needs-backend-data' | 'sensor-drift' | 'other'
    > = true;
    const binding: Exact<Binding['kind'], 'element' | 'keychord' | 'programmatic' | 'url' | 'tab'> =
      true;
    expect([effect, settlement, step, frame, gap, binding]).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
    ]);
  });

  it('the standing strings live ONLY on the new type', () => {
    const standing: Exact<
      JourneyStanding['standing'],
      | 'done'
      | 'in-progress'
      | 'awaiting-human'
      | 'with-the-human'
      | 'blocked'
      | 'failed'
      | 'declined'
    > = true;
    expect(standing).toBe(true);
    // The runtime half: no frozen union ever answers with the new word.
    const frozen: string[] = [
      'pending',
      'performed',
      'refused',
      'unobservable',
      'committed',
      'rejected',
      'rolled-back',
      'superseded',
      'done',
      'inferred-done',
      'ready',
      'blocked',
      'off-node',
      'open',
      'completed',
      'cancelled',
      'demoted',
    ];
    expect(frozen).not.toContain('with-the-human');
  });
});
