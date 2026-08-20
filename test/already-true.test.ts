/**
 * AN ACTION WHOSE EFFECT IS ALREADY TRUE SAYS SO — it does not hang.
 *
 * Recorded by a consumer integration, from a real archived agent run. The agent
 * pressed a control while the thing that control does was ALREADY the case: it
 * asked to open a domain view while it was already inside that domain. The app's
 * store publishes on CHANGE — which is what a store does — so writing the value
 * it already held notified nobody, `updateState()` never ran, and the fire sat
 * in the state-report queue for the life of the session. `did_it_work` could
 * only ever answer 'still-pending'. The model read that as "the app is still
 * working", waited, re-checked, waited, and spent fifteen of its thirty steps
 * on an outcome that could never arrive.
 *
 * The store tap below is the field's, in eight lines, and nothing about it is
 * contrived: publish-on-change is the ordinary shape.
 *
 * RED PROOF (each neutralisation restored from a scratchpad copy, never with
 * git): drop `&& alreadyTrue === undefined` from fire()'s state-tap arm and the
 * whole first describe goes red on a settlement that never lands. Drop
 * condition 3 (the coverage check) from already-true.ts and the partial-writes
 * boundary goes red claiming a half-declared effect is already true. Drop
 * condition 1 and the declares-no-writes case goes red carrying a marker about
 * a fate it does not have.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { FireResult, InteractionSession, NavigationGraph } from '../src/index.js';
import { testApp } from '../src/testing/index.js';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function fired(result: FireResult): Extract<FireResult, { ok: true }> {
  if (!result.ok) throw new Error(`fire was refused: ${result.reason}`);
  return result;
}

/**
 * One page, one action that declares one write AND the postcondition that write
 * is for — the declaration that carries a VALUE, which is the only kind this
 * rule can honestly read.
 */
function desk(extra?: Record<string, unknown>): NavigationGraph {
  return buildNavigationGraph('desk', {
    pages: {
      workspace: {
        actions: {
          'open-billing': {
            does: 'Open the billing domain view',
            writes: ['view.domain'],
            verify: { 'view.domain': { eq: 'billing' } },
            ...extra,
          },
        },
      },
    },
    journeys: {
      'read-billing': { does: 'Open the billing view and read it', steps: ['workspace.open-billing'] },
    },
  });
}

/** A REAL store tap: publish on CHANGE. Same value in ⇒ no subscriber runs. */
function storeBacked(initialDomain: string, graph = desk()): InteractionSession {
  const session = graph.createSession({
    node: 'workspace',
    state: { 'view.domain': initialDomain },
    onWarn: () => undefined,
  });
  const store: Record<string, unknown> = { 'view.domain': initialDomain };
  session.registerHandlers({
    group: 'workspace',
    handlers: {
      'workspace.open-billing': () => {
        if (store['view.domain'] === 'billing') return; // the app's netting, and it is CORRECT
        store['view.domain'] = 'billing';
        session.updateState({ 'view.domain': 'billing' });
      },
    },
  });
  return session;
}

describe('the effect is already true: the fire answers instead of waiting', () => {
  it('fire() carries alreadyTrue, with the conditions that already hold', () => {
    const session = storeBacked('billing');
    const f = fired(session.fire('workspace.open-billing', { source: 'agent' }));
    expect(f.alreadyTrue).toEqual([
      {
        key: 'view.domain',
        op: 'eq',
        threshold: 'billing',
        actualSummary: '"billing"',
        result: true,
        redacted: false,
      },
    ]);
    // It NEVER joins the state-report queue — the half that stops a later real
    // report settling this fire by FIFO.
    expect(session.pending().map((p) => p.affordanceId)).toEqual(['workspace.open-billing']);
    expect(session.pending()[0]!.id).toBe(f.transition.id);
  });

  it('and it comes to rest on its own handler, which always answers', async () => {
    const session = storeBacked('billing');
    const f = fired(session.fire('workspace.open-billing', { source: 'agent' }));
    await flush();
    const settled = session.settlementIfKnown(f.transition.id);
    expect(settled).toMatchObject({ effectStatus: 'performed', outcome: 'committed', verifyHeld: true });
    // The state axis stays honestly unobservable: no report exists to check the
    // declared write keys against, and none is coming.
    expect(settled!.transition.effectVerified).toBe('unobservable');
    expect(settled!.transition.alreadyTrue).toHaveLength(1);
    expect(session.pending()).toEqual([]);
    expect(session.awaitingSettlement()).toEqual([]);
  });

  it('the same action against a value that really is new is untouched — the boundary', async () => {
    const session = storeBacked('claims');
    const f = fired(session.fire('workspace.open-billing', { source: 'agent' }));
    expect(f.alreadyTrue).toBeUndefined();
    await flush();
    expect(session.settlementIfKnown(f.transition.id)).toMatchObject({
      effectStatus: 'performed',
      outcome: 'committed',
    });
    // Settled by the app's REPORT, which is what proves the ordinary rail ran.
    expect(session.transitions()[0]!.effectVerified).toBe(true);
  });

  it('a handler that throws is still refused — the fire waits on a rail that can say no', async () => {
    const graph = desk();
    const session = graph.createSession({
      node: 'workspace',
      state: { 'view.domain': 'billing' },
      onWarn: () => undefined,
    });
    session.registerHandlers({
      group: 'workspace',
      handlers: {
        'workspace.open-billing': () => {
          throw new Error('the panel would not open');
        },
      },
    });
    const f = fired(session.fire('workspace.open-billing', { source: 'agent' }));
    expect(f.alreadyTrue).toHaveLength(1);
    await flush();
    expect(session.settlementIfKnown(f.transition.id)).toMatchObject({ effectStatus: 'refused' });
  });
});

describe('the exact boundary of the rule', () => {
  it('PARTIAL — some declared writes covered, some not — is NOT already true', () => {
    const graph = buildNavigationGraph('desk', {
      pages: {
        workspace: {
          actions: {
            'open-billing': {
              does: 'Open the billing domain view on the summary tab',
              // TWO declared writes; the contract constrains ONE of them.
              writes: ['view.domain', 'view.tab'],
              verify: { 'view.domain': { eq: 'billing' } },
            },
          },
        },
      },
    });
    const session = graph.createSession({
      node: 'workspace',
      state: { 'view.domain': 'billing', 'view.tab': 'audit' },
      onWarn: () => undefined,
    });
    session.registerHandlers({ group: 'workspace', handlers: { 'workspace.open-billing': () => undefined } });
    const f = fired(session.fire('workspace.open-billing', { source: 'agent' }));
    expect(f.alreadyTrue).toBeUndefined();
    expect(f.settlement).toBe('awaiting-state');
  });

  it('PARTIAL the other way — the contract covers both keys and one does not hold', () => {
    const graph = buildNavigationGraph('desk', {
      pages: {
        workspace: {
          actions: {
            'open-billing': {
              does: 'Open the billing domain view on the summary tab',
              writes: ['view.domain', 'view.tab'],
              verify: { 'view.domain': { eq: 'billing' }, 'view.tab': { eq: 'summary' } },
            },
          },
        },
      },
    });
    const session = graph.createSession({
      node: 'workspace',
      state: { 'view.domain': 'billing', 'view.tab': 'audit' }, // half of it is already so
      onWarn: () => undefined,
    });
    session.registerHandlers({ group: 'workspace', handlers: { 'workspace.open-billing': () => undefined } });
    expect(fired(session.fire('workspace.open-billing', { source: 'agent' })).alreadyTrue).toBeUndefined();
  });

  it('AN ACTION THAT DECLARES NO WRITES is never swept in — it cannot hang', async () => {
    const graph = buildNavigationGraph('desk', {
      pages: {
        workspace: {
          actions: {
            refresh: { does: 'Refresh the panel', verify: { 'view.domain': { eq: 'billing' } } },
          },
        },
      },
    });
    const session = graph.createSession({
      node: 'workspace',
      state: { 'view.domain': 'billing' },
      onWarn: () => undefined,
    });
    session.registerHandlers({ group: 'workspace', handlers: { 'workspace.refresh': () => undefined } });
    const f = fired(session.fire('workspace.refresh', { source: 'agent' }));
    // No marker, because there is no fate to mark: a fire declaring no writes
    // never joined the state rail, so it was never at risk of waiting on it.
    expect(f.alreadyTrue).toBeUndefined();
    expect(f.settlement).toBe('settled');
    await flush();
    expect(session.settlementIfKnown(f.transition.id)).toMatchObject({ effectStatus: 'performed' });
  });

  it('WRITES WITH NO VERIFY AT ALL keeps exactly today\u2019s behaviour \u2014 the honest limit', () => {
    // The archived run\u2019s own shape, and the one this rule cannot rescue.
    // `Effect.writes` is key names only by stated law, so the library never
    // learns the value this action would set; claiming the write nets out would
    // mean inventing the value it compared against. The correction is one line
    // of declaration next to the action \u2014 `verify` \u2014 and it is what every
    // other case in this file adds.
    const graph = buildNavigationGraph('desk', {
      pages: {
        workspace: {
          actions: { 'open-billing': { does: 'Open the billing domain view', writes: ['view.domain'] } },
        },
      },
    });
    const session = storeBacked('billing', graph);
    const f = fired(session.fire('workspace.open-billing', { source: 'agent' }));
    expect(f.alreadyTrue).toBeUndefined();
    expect(f.settlement).toBe('awaiting-state');
  });

  it('A PREDICATE verify is opaque, so nothing is claimed from it', () => {
    const graph = buildNavigationGraph('desk', {
      pages: {
        workspace: {
          actions: {
            'open-billing': {
              does: 'Open the billing domain view',
              writes: ['view.domain'],
              verify: (state: Record<string, unknown>) => state['view.domain'] === 'billing',
            },
          },
        },
      },
    });
    const session = graph.createSession({
      node: 'workspace',
      state: { 'view.domain': 'billing' },
      onWarn: () => undefined,
    });
    session.registerHandlers({ group: 'workspace', handlers: { 'workspace.open-billing': () => undefined } });
    expect(fired(session.fire('workspace.open-billing', { source: 'agent' })).alreadyTrue).toBeUndefined();
  });

  it('AN UNEVALUABLE contract claims nothing — an unread key is never evidence', () => {
    const session = storeBacked('billing', desk());
    // The key the contract is about has never been in the state view.
    const bare = desk().createSession({ node: 'workspace', onWarn: () => undefined });
    bare.registerHandlers({ group: 'workspace', handlers: { 'workspace.open-billing': () => undefined } });
    expect(fired(bare.fire('workspace.open-billing', { source: 'agent' })).alreadyTrue).toBeUndefined();
    // …while the session that CAN read it still answers.
    expect(fired(session.fire('workspace.open-billing', { source: 'agent' })).alreadyTrue).toHaveLength(1);
  });

  it('A DECLARED NAVIGATION we have not made yet is not already true', () => {
    const withLedger = buildNavigationGraph('desk', {
      pages: {
        workspace: {
          actions: {
            'open-billing': {
              does: 'Open the billing domain view',
              writes: ['view.domain'],
              verify: { 'view.domain': { eq: 'billing' } },
              goTo: 'ledger',
            },
          },
        },
        ledger: {},
      },
    });
    const session = withLedger.createSession({
      node: 'workspace',
      state: { 'view.domain': 'billing' },
      onWarn: () => undefined,
    });
    session.registerHandlers({ group: 'workspace', handlers: { 'workspace.open-billing': () => undefined } });
    // The writes are already so; the page motion is not. An effect that is only
    // partly already true is not already true.
    expect(fired(session.fire('workspace.open-billing', { source: 'agent' })).alreadyTrue).toBeUndefined();
  });

  it('…and the same action fired from the page it says it goes to IS already true', () => {
    const withLedger = buildNavigationGraph('desk', {
      pages: {
        workspace: {},
        ledger: {
          actions: {
            'open-billing': {
              does: 'Open the billing domain view',
              writes: ['view.domain'],
              verify: { 'view.domain': { eq: 'billing' } },
              goTo: 'ledger',
            },
          },
        },
      },
    });
    const session = withLedger.createSession({
      node: 'ledger',
      state: { 'view.domain': 'billing' },
      onWarn: () => undefined,
    });
    session.registerHandlers({ group: 'ledger', handlers: { 'ledger.open-billing': () => undefined } });
    expect(fired(session.fire('ledger.open-billing', { source: 'agent' })).alreadyTrue).toHaveLength(1);
  });

  it('AN UNMATERIALIZED fire keeps its own word and gains no second one', () => {
    const session = desk().createSession({
      node: 'workspace',
      state: { 'view.domain': 'billing' },
      allowUnmaterializedFires: true,
      onWarn: () => undefined,
    });
    const f = fired(session.fire('workspace.open-billing', { source: 'agent' }));
    expect(f.materialized).toBe(false);
    expect(f.alreadyTrue).toBeUndefined();
    expect(f.transition.alreadyTrue).toBeUndefined();
  });
});

describe('what the record shows, and what it must not look like', () => {
  it('one ordinary committed row carrying the marker — and an empty commit bundle', async () => {
    const session = storeBacked('billing');
    session.commitJourney('read-billing');
    const f = fired(session.fire('workspace.open-billing', { source: 'agent' }));
    await flush();
    const fires = session.transitions().filter((t) => t.cause.kind === 'fired');
    expect(fires).toHaveLength(1);
    expect(fires[0]!.outcome).toBe('committed');
    expect(fires[0]!.alreadyTrue).toHaveLength(1);
    // A press that did nothing is a deliberate cursor stop, not a move: the
    // bundle exists and carries no keys.
    const bundle = session.commitLog().find((b) => b.runtimeStageId === f.transition.id);
    expect(bundle).toBeDefined();
    expect(bundle!.trace).toEqual([]);
    expect(Object.keys(bundle!.updates)).toEqual([]);
    expect(Object.keys(bundle!.overwrite)).toEqual([]);
  });

  it('the journey step advances, so the agent is not offered it forever', async () => {
    const session = storeBacked('billing');
    session.commitJourney('read-billing');
    fired(session.fire('workspace.open-billing', { source: 'agent' }));
    await flush();
    expect(session.journeyFrame()?.firedSteps).toEqual(['workspace.open-billing']);
  });

  it('the drift sensor does not read it as drift — nothing failed here', async () => {
    const session = storeBacked('billing');
    fired(session.fire('workspace.open-billing', { source: 'agent' }));
    await flush();
    // effectVerified is 'unobservable', never false: the drift sensor's own
    // filter is `=== false`, so an honest no-change never becomes a drift row.
    expect(session.transitions()[0]!.effectVerified).toBe('unobservable');
    const app = testApp({ session });
    expect(app.report()).toMatchObject({ ok: true, effectDrift: [] });
  });

  it('single flight is released, so the action is pressable again', async () => {
    const graph = buildNavigationGraph('desk', {
      pages: {
        workspace: {
          actions: {
            'open-billing': {
              does: 'Open the billing domain view',
              writes: ['view.domain'],
              verify: { 'view.domain': { eq: 'billing' } },
              concurrency: { mode: 'single-flight' },
            },
          },
        },
      },
    });
    const session = storeBacked('billing', graph);
    fired(session.fire('workspace.open-billing', { source: 'agent' }));
    await flush();
    // Before this release the flight was held forever and every later press was
    // refused PRIOR_FIRE_PENDING, pointing at a settlement that never came.
    expect(fired(session.fire('workspace.open-billing', { source: 'agent' })).alreadyTrue).toHaveLength(1);
  });
});

describe('what the agent is told, on the wire', () => {
  it('the FIRE result already says it — the first answer, not the fifteenth', async () => {
    const session = storeBacked('billing');
    const port = serveToAgent(session, { source: 'agent' });
    const done = port.call('desk.do_action', { action: 'open-billing' });
    expect(done['ok']).toBe(true);
    expect(done['alreadyTrue']).toHaveLength(1);
    expect(done['why']).toContain('That was already the case');
    expect(done['why']).toContain('do not perform it again');
    await flush();
    // …and one poll ENDS, where before it repeated 'still-pending' forever.
    const answer = port.call('desk.did_it_work', { transitionId: done['transitionId'] as string });
    expect(answer).toMatchObject({ ok: true, settled: true, effectStatus: 'performed' });
    expect(answer['alreadyTrue']).toHaveLength(1);
    expect(answer['why']).toBe(done['why']);
  });

  it('an ordinary fire on the same tool carries neither the marker nor the sentence', async () => {
    const session = storeBacked('claims');
    const port = serveToAgent(session, { source: 'agent' });
    const done = port.call('desk.do_action', { action: 'open-billing' });
    expect(done['alreadyTrue']).toBeUndefined();
    expect(done['why']).toBeUndefined();
    await flush();
    const answer = port.call('desk.did_it_work', { transitionId: done['transitionId'] as string });
    expect(answer['alreadyTrue']).toBeUndefined();
  });
});
