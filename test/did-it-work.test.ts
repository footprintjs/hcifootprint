/**
 * Mode B — `did_it_work`, the settled truth over the wire.
 *
 * A REMOTE agent holds a transitionId and nothing else: `whenSettled` is a live
 * promise and cannot cross a tool boundary. Until now the wire carried only the
 * word fire() knew at return time ('pending'), so the final truth — did the app
 * actually do it? — never arrived. The integration that reported this rebuilt
 * it by hand: a transition listener keyed by transitionId, a four-second
 * ceiling, and a rewrite on the relay's send path. A mistyped key waited out
 * the ceiling and then reported a guess.
 *
 * The answer here is a POLL, not a wait: `SkillToolsPort.call` stays
 * synchronous, so an unfinished action is told it is unfinished and a wrong id
 * is refused BY NAME — immediately, in the vocabulary the library already uses.
 *
 * MUTATION PROOFS:
 * - 'a mistyped id is refused BY NAME' — swallow the session's refusal and
 *   answer still-pending instead, and this test fails: that swallow IS the
 *   reported failure mode, reproduced inside the library.
 * - 'the pointer rides ONLY the pending arm' — emit howToSettle unconditionally
 *   and the tour fire (already at rest) sends the model to poll for nothing.
 * - 'no boolean writesObserved when the write was never observed' — emit
 *   `writesObserved` for the 'unobservable' case and a model reading it gets an
 *   observed write nobody ever saw.
 * - 'the three axes never share a name' — call the state axis's boolean form
 *   `verified` again and it collides with the settlement's verify-contract
 *   verdict: the payload prints `verified: true` beside an error saying the
 *   app's own check answered no.
 * - 'the contract axis crosses the wire' — drop `verifyHeld` and the remote
 *   agent this tool exists for is left inferring it from error prose.
 * - 'names the live fire even when it declared no writes' — drop
 *   awaitingSettlement from the refusal and the wire says "nothing is live"
 *   about an action that is at that moment running.
 * - 'carries outcomeNow when the app took the action back' — drop the marker
 *   and the wire answers "it worked" about an order the server rejected.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, skillsAsTools } from '../src/index.js';
import type { NavigationGraph, ServeResult, SkillToolsPort } from '../src/index.js';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function shopMap(): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: {
      catalog: {
        tools: {
          'add-to-cart': { does: 'Add the dress to the cart', writes: ['cart'] },
          'go-checkout': { does: 'Go to checkout', goTo: 'checkout' },
        },
      },
      checkout: { tools: { 'place-order': { does: 'Place the order', writes: ['orders'] } } },
    },
    skills: { purchase: { does: 'Buy a dress', steps: ['add-to-cart'] } },
  });
}

/** A wired app whose handlers do nothing on their own — the tap reports later. */
function wiredPort(handlers?: Record<string, (input?: unknown) => unknown>) {
  const session = shopMap().createSession({
    node: 'catalog',
    state: { cart: [], orders: [] },
    onWarn: () => undefined,
  });
  session.registerToolGroup('catalog', {
    handlers: {
      'add-to-cart': handlers?.['add-to-cart'] ?? (() => undefined),
      'go-checkout': handlers?.['go-checkout'] ?? (() => undefined),
    },
  });
  return { session, port: skillsAsTools(session) };
}

/** Fire through the wire and hand back the id the model would hold. */
function fireThroughWire(
  port: SkillToolsPort,
  action: string,
  graphId = 'shop',
): { result: ServeResult; id: string } {
  const result = port.call(`${graphId}.do_action`, { action });
  expect(result['ok']).toBe(true);
  return { result, id: result['transitionId'] as string };
}

// ---------------------------------------------------------------------------
// The tool itself
// ---------------------------------------------------------------------------

describe('did_it_work — the fixed settlement tool', () => {
  it('is in the static array with a single required transitionId', () => {
    const { port } = wiredPort();
    const tool = port.tools().find((candidate) => candidate.name === 'shop.did_it_work')!;
    expect(tool).toBeDefined();
    const schema = tool.inputSchema as {
      properties: Record<string, unknown>;
      required: string[];
      additionalProperties: boolean;
    };
    expect(Object.keys(schema.properties)).toEqual(['transitionId']);
    expect(schema.required).toEqual(['transitionId']);
    expect(schema.additionalProperties).toBe(false);
  });

  it('a blank call is a typed error, never a crash', () => {
    const { port } = wiredPort();
    expect(port.call('shop.did_it_work', {})).toMatchObject({
      ok: false,
      judgment: 'error',
      reason: 'TRANSITION_ID_REQUIRED',
    });
  });
});

// ---------------------------------------------------------------------------
// The three arms
// ---------------------------------------------------------------------------

describe('did_it_work — still running, then settled', () => {
  it('the fire result POINTS at the tool while the answer is pending', () => {
    const { port } = wiredPort();
    const { result } = fireThroughWire(port, 'add-to-cart');
    expect(result['effectStatus']).toBe('pending');
    expect(result['howToSettle']).toContain('shop.did_it_work');
  });

  it('answers still-pending IMMEDIATELY, and names the action so the model can wait on the right thing', () => {
    const { port } = wiredPort();
    const { id } = fireThroughWire(port, 'add-to-cart');

    const poll = port.call('shop.did_it_work', { transitionId: id });
    expect(poll).toMatchObject({
      ok: true,
      settled: false,
      judgment: 'still-pending',
      did: 'catalog.add-to-cart',
      youAreOn: 'catalog',
    });
    // The honest instruction: this is the ONE moment a model would otherwise
    // re-fire and buy the app a duplicate order.
    expect(String(poll['howToAct'])).toContain('Do NOT perform the action again');
  });

  it('then carries the settled truth: both axes, the produced data, and where you are', async () => {
    const { session, port } = wiredPort({
      'add-to-cart': () => [{ id: 'd6', name: 'Scarlet Cocktail Dress' }],
    });
    const { id } = fireThroughWire(port, 'add-to-cart');
    session.updateState({ cart: ['d6'] }); // the app's tap reports reality
    await flush();

    expect(port.call('shop.did_it_work', { transitionId: id })).toMatchObject({
      ok: true,
      settled: true,
      did: 'catalog.add-to-cart',
      effectStatus: 'performed', // the INVOCATION axis
      outcome: 'committed',
      effectVerified: true, // the STATE axis
      writesObserved: true, // …and its boolean form, named for that axis
      data: [{ id: 'd6', name: 'Scarlet Cocktail Dress' }],
      youAreOn: 'catalog',
    });
  });

  it('carries the claimed destination of a navigation', async () => {
    const { port } = wiredPort();
    const { id } = fireThroughWire(port, 'go-checkout');
    await flush();
    expect(port.call('shop.did_it_work', { transitionId: id })).toMatchObject({
      settled: true,
      effectStatus: 'performed',
      toNode: 'checkout',
    });
  });

  it('a refusal comes back as the refusal it was, with its reason as CAPPED TEXT', async () => {
    const { port } = wiredPort({
      'add-to-cart': () => {
        throw new Error(`card declined ${'x'.repeat(500)}`);
      },
    });
    const { id } = fireThroughWire(port, 'add-to-cart');
    await flush();

    const poll = port.call('shop.did_it_work', { transitionId: id });
    expect(poll).toMatchObject({ settled: true, effectStatus: 'refused', outcome: 'rejected' });
    expect(String(poll['error'])).toContain('card declined');
    expect(String(poll['error']).length).toBeLessThanOrEqual(201); // 200 + the ellipsis
    expect(poll['data']).toBeUndefined(); // a refusal is never planner-visible data
  });

  it('no boolean `writesObserved` when the declared write was never observed', () => {
    // A tour session: nothing is bound, so nothing ran and nothing reported.
    const session = shopMap().createSession({
      node: 'catalog',
      state: { cart: [] },
      allowUnmaterializedFires: true,
      onWarn: () => undefined,
    });
    const port = skillsAsTools(session);
    const { result, id } = fireThroughWire(port, 'add-to-cart');
    // Already at rest — so no pointer to a poll that has nothing new to say.
    expect(result['effectStatus']).toBe('unobservable');
    expect(result['howToSettle']).toBeUndefined();

    const poll = port.call('shop.did_it_work', { transitionId: id });
    expect(poll).toMatchObject({ settled: true, effectStatus: 'unobservable' });
    expect(poll['effectVerified']).toBe('unobservable'); // the honest word survives
    expect(poll).not.toHaveProperty('writesObserved'); // …and nothing truthy stands in for it
    expect(poll).not.toHaveProperty('verified'); // the ambiguous name is gone from the wire
  });
});

// ---------------------------------------------------------------------------
// Three axes, three names — the collision, and the axis that never crossed
// ---------------------------------------------------------------------------

/** A wizard whose 'pick' both DECLARES a write and declares its own check. */
function wizardPort(): { session: ReturnType<NavigationGraph['createSession']>; port: SkillToolsPort } {
  const map = buildNavigationGraph('setup', {
    pages: {
      wizard: {
        tools: {
          pick: { does: 'Pick the recipe', writes: ['recipe'], verify: { chosen: { eq: true } } },
        },
      },
    },
  });
  const session = map.createSession({
    node: 'wizard',
    state: { recipe: '', chosen: false },
    onWarn: () => undefined,
  });
  session.registerToolGroup('wizard', { handlers: { pick: () => undefined } });
  return { session, port: skillsAsTools(session) };
}

describe('did_it_work — three axes, three names', () => {
  it('the app’s own check crosses the wire, and never wears the state axis’s name', async () => {
    // THE COLLISION, reproduced: the declared write DID land (the state axis
    // says true) while the app's own condition did NOT hold (the contract axis
    // says false). Under one shared name `verified` the payload printed TRUE
    // beside an error sentence saying verification failed — in the exact
    // scenario the verify contract was built for.
    const { session, port } = wizardPort();
    const { id } = fireThroughWire(port, 'pick', 'setup');
    session.updateState({ recipe: 'r1' }); // the app reports the declared write
    await flush();

    const poll = port.call('setup.did_it_work', { transitionId: id });
    expect(poll).toMatchObject({
      settled: true,
      effectStatus: 'refused', // the INVOCATION axis: the contract refused it
      effectVerified: true, // the STATE axis: the declared key really appeared
      writesObserved: true, // …its boolean form, saying WHICH axis it answers
      verifyHeld: false, // the CONTRACT axis: the app itself answered no
    });
    expect(poll).not.toHaveProperty('verified'); // no name means two questions
    expect(String(poll['error'])).toContain('answered no');

    // The wire and the in-process settlement now agree, field for field — the
    // same word, the same value, whichever door a caller came through.
    const inProcess = await session.settlementOf(id);
    expect(inProcess.verifyHeld).toBe(false);
    expect(poll['verifyHeld']).toBe(inProcess.verifyHeld);
  });

  it('an unevaluable check crosses as the WORD, never as a boolean', async () => {
    // The honesty law on the wire: a check that could not be run is not a pass
    // and not a failure, and the string says so where a boolean could not.
    const map = buildNavigationGraph('setup', {
      pages: {
        wizard: { tools: { pick: { does: 'Pick', writes: ['recipe'], verify: { absent: { eq: 1 } } } } },
      },
    });
    const session = map.createSession({ node: 'wizard', state: { recipe: '' }, onWarn: () => undefined });
    session.registerToolGroup('wizard', { handlers: { pick: () => undefined } });
    const port = skillsAsTools(session);
    const { id } = fireThroughWire(port, 'pick', 'setup');
    session.updateState({ recipe: 'r1' });
    await flush();

    expect(port.call('setup.did_it_work', { transitionId: id })).toMatchObject({
      effectStatus: 'performed',
      verifyHeld: 'unevaluable',
    });
  });

  it('silence when no contract was declared — never a passing grade', async () => {
    const { session, port } = wiredPort();
    const { id } = fireThroughWire(port, 'add-to-cart');
    session.updateState({ cart: ['d6'] });
    await flush();
    expect(port.call('shop.did_it_work', { transitionId: id })).not.toHaveProperty('verifyHeld');
  });
});

describe('did_it_work — a wrong id is refused, never soothed', () => {
  it('a mistyped id is refused BY NAME, listing the fires that ARE live', () => {
    const { port } = wiredPort();
    const { id } = fireThroughWire(port, 'add-to-cart');

    const poll = port.call('shop.did_it_work', { transitionId: 'catalog.add-to-cart#99' });
    expect(poll).toMatchObject({
      ok: false,
      judgment: 'error',
      reason: 'UNKNOWN_TRANSITION',
      youAreOn: 'catalog',
    });
    expect(poll['pending']).toEqual([id]);
    expect(poll['awaitingSettlement']).toEqual([id]);
  });

  it('names the live fire even when it declared no writes — `pending` alone would say "nothing"', async () => {
    // A navigation declares no writes, so it NEVER joins the state-report queue
    // — but its handler is running and its settlement is coming. Served alone,
    // `pending: []` reads as "nothing is live" about this very action, which is
    // the confident emptiness this tool exists to end.
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { session, port } = wiredPort({ 'go-checkout': async () => { await held; } });
    const { id } = fireThroughWire(port, 'go-checkout');
    await flush();

    const poll = port.call('shop.did_it_work', { transitionId: 'catalog.go-checkout#99' });
    expect(poll).toMatchObject({ ok: false, reason: 'UNKNOWN_TRANSITION' });
    expect(poll['pending']).toEqual([]); // the state-report queue, honestly empty
    expect(poll['awaitingSettlement']).toEqual([id]); // …and what is actually live

    // The wire is not the weaker door: it teaches what the in-process refusal
    // teaches, which has always named the open latches.
    let thrown = '';
    try {
      session.settlementIfKnown('catalog.go-checkout#99');
    } catch (error) {
      thrown = String(error);
    }
    for (const live of poll['awaitingSettlement'] as string[]) expect(thrown).toContain(live);
    release();
  });

  it('a stimulus row is refused too — and the session’s throw never escapes call()', () => {
    const { session, port } = wiredPort();
    const update = session.updateState({ cart: ['pushed'] }, { stimulus: 'push' });
    const id = update.ok ? update.transition.id : '';
    expect(() => port.call('shop.did_it_work', { transitionId: id })).not.toThrow();
    expect(port.call('shop.did_it_work', { transitionId: id })).toMatchObject({
      ok: false,
      reason: 'UNKNOWN_TRANSITION',
    });
  });
});

// ---------------------------------------------------------------------------
// The receipt, and the record that moved after it
// ---------------------------------------------------------------------------

describe('did_it_work — a settlement is a receipt, and receipts go stale', () => {
  it('carries outcomeNow when the app took the action back — never rewriting the receipt', async () => {
    const { session, port } = wiredPort();
    const { id } = fireThroughWire(port, 'add-to-cart');
    session.updateState({ cart: ['d6'] }); // the app reports optimistically
    await flush();

    // Nothing has moved yet: no marker, no noise.
    const clean = port.call('shop.did_it_work', { transitionId: id });
    expect(clean).toMatchObject({ effectStatus: 'performed', outcome: 'committed' });
    expect(clean).not.toHaveProperty('outcomeNow');
    expect(clean).not.toHaveProperty('howToAct');

    session.reject(id); // …and now the server says no

    const poll = port.call('shop.did_it_work', { transitionId: id });
    expect(poll).toMatchObject({
      settled: true,
      effectStatus: 'performed', // the receipt STANDS — first settlement wins
      outcome: 'committed',
      outcomeNow: 'rolled-back', // …and the later word rides alongside it
    });
    // The settled arm now points somewhere, like the pending arm always has.
    expect(String(poll['howToAct'])).toContain('whats_here');
  });

  it('reports whatever the later word IS — a superseded record reads superseded', async () => {
    const { session, port } = wiredPort();
    const { id } = fireThroughWire(port, 'add-to-cart');
    session.updateState({ cart: ['d6'] });
    await flush();
    session.reject(id, { outcome: 'superseded' });

    expect(port.call('shop.did_it_work', { transitionId: id })).toMatchObject({
      effectStatus: 'performed',
      outcome: 'committed',
      outcomeNow: 'superseded',
    });
  });

  it('a handler that reported real evidence and THEN failed carries NO marker', async () => {
    // The library's own law (session.ts #handleHandlerFailure): a commit backed
    // by REAL evidence — the app reported the declared writes — is stronger
    // than the handler's later failure, so the record stays committed. Nothing
    // drifted, so nothing is flagged. The marker tracks the RECORD; it never
    // editorialises about a settlement it disagrees with.
    const { session, port } = wiredPort({
      'add-to-cart': () => {
        session.updateState({ cart: ['d6'] });
        throw new Error('post-report cleanup failed');
      },
    });
    const { id } = fireThroughWire(port, 'add-to-cart');
    await flush();

    const poll = port.call('shop.did_it_work', { transitionId: id });
    expect(poll).toMatchObject({ effectStatus: 'performed', outcome: 'committed' });
    expect(poll).not.toHaveProperty('outcomeNow');
    expect(session.transitions().find((row) => row.id === id)?.outcome).toBe('committed');
  });

  it('a refused fire carries no marker — the record and the receipt already agree', async () => {
    const { port } = wiredPort({
      'add-to-cart': () => {
        throw new Error('card declined');
      },
    });
    const { id } = fireThroughWire(port, 'add-to-cart');
    await flush();
    expect(port.call('shop.did_it_work', { transitionId: id })).not.toHaveProperty('outcomeNow');
  });
});

describe('did_it_work — wire safety', () => {
  it('every arm survives structuredClone: no promise, no live error object', async () => {
    const { session, port } = wiredPort({
      'add-to-cart': () => {
        throw new Error('boom');
      },
    });
    const { id } = fireThroughWire(port, 'add-to-cart');
    expect(() => structuredClone(port.call('shop.did_it_work', { transitionId: id }))).not.toThrow();
    await flush();

    const rowsBefore = session.transitions().length;
    expect(() => structuredClone(port.call('shop.did_it_work', { transitionId: id }))).not.toThrow();
    expect(() =>
      structuredClone(port.call('shop.did_it_work', { transitionId: 'nope#1' })),
    ).not.toThrow();
    // A poll is a READ: asking how it went never moves the world it asks about.
    expect(session.transitions()).toHaveLength(rowsBefore);
  });
});

// ---------------------------------------------------------------------------
// The port's own async door — for a relay holding the port and nothing else
// ---------------------------------------------------------------------------

describe('SkillToolsPort.whenSettled — the hole the field report named', () => {
  it('delegates to the session: the same settlement, with the same laws', async () => {
    const { session, port } = wiredPort();
    const { id } = fireThroughWire(port, 'add-to-cart');
    const viaPort = port.whenSettled(id);

    session.updateState({ cart: ['d6'] });
    expect(await viaPort).toMatchObject({ effectStatus: 'performed', outcome: 'committed' });
    expect(await viaPort).toEqual(await session.settlementOf(id));
  });

  it('never rejects — a refusal arrives as data on the resolved value', async () => {
    const { port } = wiredPort({
      'add-to-cart': () => ({ ok: false, error: 'card declined' }),
    });
    const { id } = fireThroughWire(port, 'add-to-cart');
    const settled = await port.whenSettled(id); // would throw here if it rejected
    expect(settled).toMatchObject({ effectStatus: 'refused', error: 'card declined' });
  });

  it('throws synchronously on an id that can never settle', () => {
    const { port } = wiredPort();
    expect(() => port.whenSettled('nope#1')).toThrow(/no transition 'nope#1'/);
  });
});
