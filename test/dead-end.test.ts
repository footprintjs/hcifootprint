/**
 * The PAGE-LEVEL never-trap: a 'dead-end' gap row.
 *
 * The commit gate (never-trap.test.ts) refuses a journey FRAME that opens onto an
 * entry nothing can perform. This is the same law one level up, about the room
 * itself: a page where NOTHING the graph puts there could act is a room with no
 * doors. The agent is told the truth, fires, is refused, re-reads the same true
 * list, and loops — correctly, on the information it was given. Nobody has to
 * fire for the trap to exist, so nobody has to fire for it to be recorded.
 *
 * The row is an OBSERVATION, not a verdict: one per (page, served structure),
 * re-asked whenever the WIRING actually changes.
 *
 * Mutation proofs: before this change the gap ledger only ever grew from
 * something the caller DID (a refused fire, a tour no-op, a reported ask) — a
 * page that could trap an agent was recorded only after the agent had already
 * walked into it, once per refused fire, forever.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, fromRoutes } from '../src/index.js';
import type { InteractionSession } from '../src/index.js';
import type { NavigationGraphDef } from '../src/index.js';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** Two pages, no navigation gestures anywhere: only a registered handler can be a door. */
function twoPageDef(): NavigationGraphDef {
  return {
    pages: {
      home: { route: '/', actions: { greet: { does: 'Say hello' }, wave: { does: 'Wave' } } },
      settings: { route: '/settings', actions: { save: { does: 'Save the settings' } } },
    },
  };
}

function deadEnds(session: InteractionSession): ReturnType<InteractionSession['gaps']> {
  return session.gaps().filter((gap) => gap.kind === 'dead-end');
}

/** An app that has wired ONE page: the state where materialisation is a live question. */
async function sessionWithHomeWired(
  opts: { onWarn?: (message: string) => void } = {},
): Promise<InteractionSession> {
  const session = buildNavigationGraph('app', twoPageDef()).createSession({
    node: 'home',
    onWarn: opts.onWarn ?? (() => undefined),
  });
  session.registerActions('home', { handlers: { greet: () => undefined } });
  await tick(); // let the coalesced structure flush land before the hop
  return session;
}

describe('the trap is recorded when the cursor comes to rest in it', () => {
  it('sync() into an unwired page writes ONE row — nothing had to be fired first', async () => {
    const session = await sessionWithHomeWired();
    expect(deadEnds(session)).toHaveLength(0); // 'home' has a door

    session.sync('settings');

    expect(deadEnds(session)).toHaveLength(1);
  });

  it('the row is token-lean: the standard base fields, names only', async () => {
    const session = await sessionWithHomeWired();
    session.sync('settings');
    // toEqual, not toMatchObject: an exact shape is the point. No affordanceId,
    // no rejectionReason, no gesture — nothing was asked for and nothing refused.
    expect(deadEnds(session)[0]).toEqual({
      kind: 'dead-end',
      timestamp: expect.any(Number),
      node: 'settings',
      version: expect.any(Number),
      availableActions: ['settings.save'],
      availableJourneys: [],
    });
  });

  it("a fire()-claimed navigation that lands in an unwired room is recorded too", async () => {
    // The reported shape: the agent's ONE working action carries it somewhere
    // it can do nothing. The fire succeeds; the room is the unmet demand.
    const session = buildNavigationGraph('app', {
      pages: {
        home: { actions: { 'open-settings': { does: 'Open settings', goTo: 'settings' } } },
        settings: { actions: { save: { does: 'Save the settings' } } },
      },
    }).createSession({ node: 'home', onWarn: () => undefined });
    session.registerActions('home', { handlers: { 'open-settings': () => undefined } });
    await tick();

    expect(session.fire('home.open-settings', { source: 'agent' }).ok).toBe(true);

    expect(session.node).toBe('settings');
    expect(deadEnds(session)).toMatchObject([{ node: 'settings', availableActions: ['settings.save'] }]);
  });

  it('a page with ZERO actions counts — an empty room is the emptiest kind of dead end', async () => {
    const session = buildNavigationGraph('app', {
      pages: { home: { actions: { greet: { does: 'Say hello' } } }, empty: {} },
    }).createSession({ node: 'home', onWarn: () => undefined });
    session.registerActions('home', { handlers: { greet: () => undefined } });
    await tick();
    session.sync('empty');
    expect(deadEnds(session)).toMatchObject([{ node: 'empty', availableActions: [] }]);
  });
});

describe('one row per (page, served structure) — an observation, never a verdict', () => {
  it('re-visiting the same page at the same served structure says nothing new', async () => {
    const session = await sessionWithHomeWired();
    session.sync('settings');
    session.sync('home');
    session.sync('settings');
    expect(deadEnds(session)).toHaveLength(1);
  });

  it('a structure change re-arms it: still dead afterwards is one NEW fact, one new row', async () => {
    const session = await sessionWithHomeWired();
    session.sync('settings');
    expect(deadEnds(session)).toHaveLength(1);

    // A mount lands somewhere else. It MIGHT have fixed this page; it did not.
    session.registerActions('home', { handlers: { wave: () => undefined } });
    await tick();

    expect(deadEnds(session)).toHaveLength(2);
    expect(deadEnds(session)[1].node).toBe('settings');
  });

  it('a mount that FIXES the page ends the rows — the flush re-asks and finds a door', async () => {
    const session = await sessionWithHomeWired();
    session.sync('settings');
    expect(deadEnds(session)).toHaveLength(1);

    session.registerActions('settings', { handlers: { save: () => undefined } });
    await tick();

    expect(deadEnds(session)).toHaveLength(1); // no second row: the room has a door now
    expect(session.fire('settings.save', { source: 'agent' }).ok).toBe(true);
  });
});

describe('armed only where materialisation is a live question', () => {
  it('a session nothing has ever registered on is a graph being READ, not a trap', () => {
    const session = buildNavigationGraph('app', twoPageDef()).createSession({
      node: 'home',
      onWarn: () => undefined,
    });
    session.sync('settings');
    expect(deadEnds(session)).toHaveLength(0);
  });

  it('a tour session never records one — its fires are honest no-ops by contract', async () => {
    const session = buildNavigationGraph('app', twoPageDef()).createSession({
      node: 'home',
      allowUnmaterializedFires: true,
      onWarn: () => undefined,
    });
    session.registerActions('home', { handlers: { greet: () => undefined } });
    await tick();
    session.sync('settings');
    expect(deadEnds(session)).toHaveLength(0);
  });

  it('`navigate` alone arms it — a session holding a router can still stand in a room with no addresses', () => {
    const session = buildNavigationGraph('app', twoPageDef()).createSession({
      node: 'home',
      navigate: () => undefined,
      onWarn: () => undefined,
    });
    // Nothing here yields a literal href (no url binding, no goTo), so navigate
    // materialises nothing — and the trap is real.
    session.sync('settings');
    expect(deadEnds(session)).toHaveLength(1);
  });
});

describe('what counts as a door', () => {
  it('a registered-but-DISABLED action is a door — TOOL_DISABLED is retriable, not missing wiring', async () => {
    const session = await sessionWithHomeWired();
    const handle = session.registerActions('settings', { handlers: { save: () => undefined } });
    handle.setEnabled('save', false);
    await tick();
    session.sync('settings');
    expect(deadEnds(session)).toHaveLength(0);
  });

  it('an INSTANCE-keyed handler is a door — the same widened question the commit gate asks', async () => {
    const def: NavigationGraphDef = {
      pages: {
        home: { actions: { greet: { does: 'Say hello' } } },
        orders: {
          areas: {
            card: {
              repeats: true,
              instances: () => ['o-1'],
              actions: { 'cancel-order': { does: 'Cancel this order' } },
            },
          },
        },
      },
    };
    const wired = buildNavigationGraph('app', def).createSession({ node: 'home', onWarn: () => undefined });
    wired.registerActions('orders.card', { instance: 'o-1', handlers: { 'cancel-order': () => undefined } });
    await tick();
    wired.sync('orders');
    expect(deadEnds(wired)).toHaveLength(0);

    // MUTATION PROOF for the widening: the same page with NO instance wiring
    // (only a router) is dead, so the arm above is load-bearing, not vacuous.
    const bare = buildNavigationGraph('app', def).createSession({
      node: 'home',
      navigate: () => undefined,
      onWarn: () => undefined,
    });
    bare.sync('orders');
    expect(deadEnds(bare)).toMatchObject([{ node: 'orders' }]);
  });

  it('crossLinks + navigate is a cure: every page keeps a way out', async () => {
    const session = buildNavigationGraph('app', {
      pages: { wizard: { actions: { 'pick-file': { does: 'Choose a file to upload' } } } },
      sources: [fromRoutes({ home: '/', projects: '/projects', wizard: '/projects/new' }, { crossLinks: true })],
    }).createSession({ node: 'home', navigate: () => undefined, onWarn: () => undefined });
    session.registerActions('wizard', { handlers: { 'pick-file': () => undefined } });
    await tick();

    session.sync('wizard');
    session.sync('projects'); // a page with no actions of its own at all

    expect(deadEnds(session)).toHaveLength(0);
  });
});

describe('the write-path rule and the one dev warning', () => {
  it('available() never emits one — reading the action space cannot write to the ledger', async () => {
    const session = await sessionWithHomeWired();
    session.sync('settings');
    const before = session.gaps().length;
    for (let i = 0; i < 5; i++) session.available();
    expect(session.gaps()).toHaveLength(before);
  });

  it("a refused fire adds ITS row and nothing else — recordRejection's own available() cannot recurse", async () => {
    const session = await sessionWithHomeWired();
    session.sync('settings');
    expect(session.gaps()).toHaveLength(1);

    expect(session.fire('settings.save', { source: 'agent' })).toMatchObject({ reason: 'NOT_MATERIALIZED' });

    expect(session.gaps().map((gap) => gap.kind)).toEqual(['dead-end', 'fire-rejected']);
  });

  it('warns ONCE per page for the session life, teaching all three fixes', async () => {
    const warnings: string[] = [];
    const session = await sessionWithHomeWired({ onWarn: (message) => warnings.push(message) });

    session.sync('settings');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("page 'settings' offers 1 action(s) and an agent could perform NONE of them");
    expect(warnings[0]).toContain("registerActions('settings', …)");
    expect(warnings[0]).toContain('navigate:');
    expect(warnings[0]).toContain('crossLinks: true');

    // A second row (new structure version) is a new FACT for the ledger — and
    // still the same sentence for the developer, who has heard it.
    session.registerActions('home', { handlers: { wave: () => undefined } });
    await tick();
    expect(deadEnds(session)).toHaveLength(2);
    expect(warnings).toHaveLength(1);
  });
});

/**
 * A landing OFF the graph is a different trap from a room with no doors, and
 * the difference is load-bearing: sync() blesses it ("an unauthored page is NOT
 * an error"), yet the generic warning's first cure — registerActions(node) —
 * THROWS for an unknown node, and no mount can ever change the answer.
 */
describe('off-graph is the other trap — named, and asked only once', () => {
  it('the row carries offGraph, so triage separates "unwired" from "unauthored"', async () => {
    const session = await sessionWithHomeWired();

    const result = session.sync('/some/unknown/url');

    expect(result.changed && result.offGraph).toBe(true); // sync already knew
    expect(deadEnds(session)).toEqual([
      {
        kind: 'dead-end',
        timestamp: expect.any(Number),
        node: '/some/unknown/url',
        version: expect.any(Number),
        availableActions: [],
        availableJourneys: [],
        offGraph: true,
      },
    ]);
    // MUTATION PROOF that the flag is discriminating, not decorative: an
    // on-graph dead end must NOT carry it.
    session.sync('settings');
    expect(deadEnds(session)[1].offGraph).toBeUndefined();
  });

  it('the warning never prescribes a call that throws', async () => {
    const warnings: string[] = [];
    const session = await sessionWithHomeWired({ onWarn: (message) => warnings.push(message) });

    session.sync('nowhere');

    expect(warnings[0]).toContain("'nowhere', which is NOT a page in this graph");
    expect(warnings[0]).toContain('throws: the node is unknown');
    // The generic sentence prescribed registration as fix #1. Proof it is wrong
    // here — the library's own API refuses the node the warning would name:
    expect(() => session.registerActions('nowhere' as never, { handlers: {} })).toThrow(
      /unknown node 'nowhere'/,
    );
    // ...and the NOT_MATERIALIZED claim is absent, because it is not the truth here.
    expect(warnings[0]).not.toContain('NOT_MATERIALIZED');
  });

  it('asked ONCE for the session: no mount can author a page, so re-arming is spam', async () => {
    const session = await sessionWithHomeWired();
    session.sync('/some/unknown/url');
    expect(deadEnds(session)).toHaveLength(1);

    // Two unrelated mounts — real structure changes, on other pages.
    const handle = session.registerActions('home', { handlers: { wave: () => undefined } });
    await tick();
    handle.unregister();
    session.registerActions('settings', { handlers: { save: () => undefined } });
    await tick();

    // MUTATION PROOF that the churn was real: the same churn re-arms an
    // ON-graph page (see the suite above), and the structure axis did move.
    expect(session.structureVersion).toBeGreaterThan(0);
    expect(deadEnds(session)).toHaveLength(1); // still one — the answer never changed
  });
});

/**
 * The gate asks couldMaterialise over FULL capability. available() has already
 * dropped every guard-closed edge, so asking over IT calls a wired page dead:
 * an empty-cart checkout, where `pay` sits registered behind cartCount > 0.
 * That refusal is GUARD_FAILED — as retriable, and as wired, as the
 * TOOL_DISABLED this gate already forgives.
 */
describe('a closed guard is not missing wiring', () => {
  const checkoutDef: NavigationGraphDef = {
    pages: {
      home: { actions: { greet: { does: 'Say hello' } } },
      checkout: { actions: { pay: { does: 'Pay now', when: { cartCount: { gt: 0 } } } } },
    },
  };

  async function emptyCart(wirePay: boolean, onWarn: (m: string) => void = () => undefined) {
    const session = buildNavigationGraph('app', checkoutDef).createSession({
      node: 'home',
      state: { cartCount: 0 },
      onWarn,
    });
    session.registerActions('home', { handlers: { greet: () => undefined } });
    if (wirePay) session.registerActions('checkout', { handlers: { pay: () => undefined } });
    await tick();
    return session;
  }

  it('an empty-cart checkout is not a dead end — the door is built, the state is shut', async () => {
    const session = await emptyCart(true);

    session.sync('checkout');

    expect(session.available().edges).toHaveLength(0); // nothing SERVED, honestly
    expect(deadEnds(session)).toHaveLength(0); // ...but the room has a door
    expect(session.fire('checkout.pay', { source: 'agent' })).toMatchObject({
      reason: 'GUARD_FAILED', // not NOT_MATERIALIZED: this is state, not wiring
    });
  });

  it('the state opens it, and no row was ever needed', async () => {
    const session = await emptyCart(true);
    session.sync('checkout');

    session.updateState({ cartCount: 2 }, { stimulus: 'push' });

    expect(session.fire('checkout.pay', { source: 'agent' }).ok).toBe(true);
    expect(deadEnds(session)).toHaveLength(0);
  });

  it('MUTATION PROOF: the same closed guard with NO handler IS a dead end', async () => {
    const warnings: string[] = [];
    const session = await emptyCart(false, (message) => warnings.push(message));

    session.sync('checkout');

    // Guard-closed AND unwired: opening the guard would only reveal an action
    // nothing can perform, so the wiring really is the unmet demand.
    expect(deadEnds(session)).toMatchObject([{ node: 'checkout', availableActions: [] }]);
    expect(warnings[0]).toContain('every one of the 1 authored here');
    expect(warnings[0]).toContain('refused GUARD_FAILED');
  });
});

/**
 * "Every fire here would be refused NOT_MATERIALIZED" is TRUE only where actions
 * are served-but-unwired. A dev warning that names the wrong refusal sends
 * someone hunting the wrong bug, so each room states its own refusal.
 */
describe('the warning names only the refusal this room actually gives', () => {
  it('a page with nothing authored says UNKNOWN_AFFORDANCE / NOT_ON_NODE — and means it', async () => {
    const warnings: string[] = [];
    const session = buildNavigationGraph('app', {
      pages: { home: { actions: { greet: { does: 'Say hello' } } }, empty: {} },
    }).createSession({ node: 'home', onWarn: (message) => warnings.push(message) });
    session.registerActions('home', { handlers: { greet: () => undefined } });
    await tick();

    session.sync('empty');

    expect(warnings[0]).toContain("page 'empty' has NO actions authored on it at all");
    expect(warnings[0]).toContain('never NOT_MATERIALIZED');
    // The sentence is checked against the fire path, not against itself:
    expect(session.fire('empty.anything', { source: 'agent' })).toMatchObject({
      reason: 'UNKNOWN_AFFORDANCE',
    });
    expect(session.fire('home.greet', { source: 'agent' })).toMatchObject({ reason: 'NOT_ON_NODE' });
  });

  it('the served-but-unwired room keeps the NOT_MATERIALIZED sentence — there it is the truth', async () => {
    const warnings: string[] = [];
    const session = await sessionWithHomeWired({ onWarn: (message) => warnings.push(message) });

    session.sync('settings');

    expect(warnings[0]).toContain('every fire here would be refused NOT_MATERIALIZED');
    expect(session.fire('settings.save', { source: 'agent' })).toMatchObject({
      reason: 'NOT_MATERIALIZED', // the sentence checked against the fire path
    });
  });
});

/**
 * `structureVersion` also bumps for journey-frame open/close/demote — churn that
 * cannot wire anything. Keying the dedup on it multiplied rows for a page whose
 * answer never moved, so the key is the served-structure FINGERPRINT instead.
 */
describe('the re-arm axis is the wiring, not the version counter', () => {
  it('journey-frame churn cannot wire anything, so it cannot write a second row', async () => {
    const session = buildNavigationGraph('app', {
      pages: {
        home: { actions: { greet: { does: 'Say hello' }, wave: { does: 'Wave' } } },
        settings: { actions: { save: { does: 'Save' } } },
      },
      journeys: { tour: { does: 'A guided tour', steps: ['home.greet'] } },
    }).createSession({ node: 'home', onWarn: () => undefined });
    session.registerActions('home', { handlers: { greet: () => undefined } });
    await tick();
    session.sync('settings');
    expect(deadEnds(session)).toHaveLength(1);

    const before = session.structureVersion;
    for (let i = 0; i < 3; i++) {
      expect(session.commitJourney('tour', { source: 'agent' }).ok).toBe(true);
      expect(session.leaveJourney()).not.toBeNull();
      session.sync('home');
      session.sync('settings');
    }

    // MUTATION PROOF that the old key would have re-armed: the counter moved
    // six times over churn that touched no registration at all.
    expect(session.structureVersion).toBe(before + 6);
    expect(deadEnds(session)).toHaveLength(1);
  });
});
