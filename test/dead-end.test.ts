/**
 * The PAGE-LEVEL never-trap: a 'dead-end' gap row.
 *
 * The commit gate (never-trap.test.ts) refuses a skill FRAME that opens onto an
 * entry nothing can perform. This is the same law one level up, about the room
 * itself: a page where an agent fire of EVERY served action would refuse
 * NOT_MATERIALIZED is a room with no doors. The agent is told the truth, fires,
 * is refused, re-reads the same true list, and loops — correctly, on the
 * information it was given. Nobody has to fire for the trap to exist, so nobody
 * has to fire for it to be recorded.
 *
 * The row is an OBSERVATION, not a verdict: one per (page, structureVersion),
 * re-asked whenever the served structure actually changes.
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
      home: { route: '/', tools: { greet: { does: 'Say hello' }, wave: { does: 'Wave' } } },
      settings: { route: '/settings', tools: { save: { does: 'Save the settings' } } },
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
  session.registerToolGroup('home', { handlers: { greet: () => undefined } });
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
      availableSkills: [],
    });
  });

  it("a fire()-claimed navigation that lands in an unwired room is recorded too", async () => {
    // The reported shape: the agent's ONE working action carries it somewhere
    // it can do nothing. The fire succeeds; the room is the unmet demand.
    const session = buildNavigationGraph('app', {
      pages: {
        home: { tools: { 'open-settings': { does: 'Open settings', goTo: 'settings' } } },
        settings: { tools: { save: { does: 'Save the settings' } } },
      },
    }).createSession({ node: 'home', onWarn: () => undefined });
    session.registerToolGroup('home', { handlers: { 'open-settings': () => undefined } });
    await tick();

    expect(session.fire('home.open-settings', { source: 'agent' }).ok).toBe(true);

    expect(session.node).toBe('settings');
    expect(deadEnds(session)).toMatchObject([{ node: 'settings', availableActions: ['settings.save'] }]);
  });

  it('a page with ZERO actions counts — an empty room is the emptiest kind of dead end', async () => {
    const session = buildNavigationGraph('app', {
      pages: { home: { tools: { greet: { does: 'Say hello' } } }, empty: {} },
    }).createSession({ node: 'home', onWarn: () => undefined });
    session.registerToolGroup('home', { handlers: { greet: () => undefined } });
    await tick();
    session.sync('empty');
    expect(deadEnds(session)).toMatchObject([{ node: 'empty', availableActions: [] }]);
  });
});

describe('one row per (page, structureVersion) — an observation, never a verdict', () => {
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
    session.registerToolGroup('home', { handlers: { wave: () => undefined } });
    await tick();

    expect(deadEnds(session)).toHaveLength(2);
    expect(deadEnds(session)[1].node).toBe('settings');
  });

  it('a mount that FIXES the page ends the rows — the flush re-asks and finds a door', async () => {
    const session = await sessionWithHomeWired();
    session.sync('settings');
    expect(deadEnds(session)).toHaveLength(1);

    session.registerToolGroup('settings', { handlers: { save: () => undefined } });
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
    session.registerToolGroup('home', { handlers: { greet: () => undefined } });
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
    const handle = session.registerToolGroup('settings', { handlers: { save: () => undefined } });
    handle.setEnabled('save', false);
    await tick();
    session.sync('settings');
    expect(deadEnds(session)).toHaveLength(0);
  });

  it('an INSTANCE-keyed handler is a door — the same widened question the commit gate asks', async () => {
    const def: NavigationGraphDef = {
      pages: {
        home: { tools: { greet: { does: 'Say hello' } } },
        orders: {
          areas: {
            card: {
              repeats: true,
              instances: () => ['o-1'],
              tools: { 'cancel-order': { does: 'Cancel this order' } },
            },
          },
        },
      },
    };
    const wired = buildNavigationGraph('app', def).createSession({ node: 'home', onWarn: () => undefined });
    wired.registerToolGroup('orders.card', { instance: 'o-1', handlers: { 'cancel-order': () => undefined } });
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
      pages: { wizard: { tools: { 'pick-file': { does: 'Choose a file to upload' } } } },
      sources: [fromRoutes({ home: '/', projects: '/projects', wizard: '/projects/new' }, { crossLinks: true })],
    }).createSession({ node: 'home', navigate: () => undefined, onWarn: () => undefined });
    session.registerToolGroup('wizard', { handlers: { 'pick-file': () => undefined } });
    await tick();

    session.sync('wizard');
    session.sync('projects'); // a page with no tools of its own at all

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
    expect(warnings[0]).toContain("registerToolGroup('settings', …)");
    expect(warnings[0]).toContain('navigate:');
    expect(warnings[0]).toContain('crossLinks: true');

    // A second row (new structure version) is a new FACT for the ledger — and
    // still the same sentence for the developer, who has heard it.
    session.registerToolGroup('home', { handlers: { wave: () => undefined } });
    await tick();
    expect(deadEnds(session)).toHaveLength(2);
    expect(warnings).toHaveLength(1);
  });
});
