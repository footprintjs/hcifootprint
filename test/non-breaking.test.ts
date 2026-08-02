/**
 * WHAT A RELEASED CONSUMER ALREADY WROTE — still compiling, still meaning what
 * it meant.
 *
 * Two shapes an audit found this line's growth could have moved under someone,
 * and the promises that answer them:
 *
 * 1. `JourneyToolsPort` is a PUBLISHED interface, so somebody's object literal
 *    implements it — a test double, a relay facade. A required member added
 *    under one is a compile error in code that never asked for the feature, so
 *    the settlement door is optional there and required on the type the factory
 *    returns.
 * 2. `GapRecord.kind` GROWS (0.3.0 added 'unmaterialized-fire', 0.6.0 added
 *    'dead-end'). What must never grow with it is the meaning of a word already
 *    shipped — a consumer's filter for the kinds it knows has to keep returning
 *    exactly its own rows.
 *
 * The first proof is as much a TYPE test as a runtime one: this file is inside
 * `tsconfig.test.json`, so the regression is a compile error before it is a red
 * test (verified: with the member required, the literal below is TS2741).
 *
 * Mutation proofs: making `whenSettled` required again breaks the hand
 * implementation at compile time; dropping it from the built port's type breaks
 * `builtPort` below the same way; and if a new kind ever reused an old word — or
 * a 'dead-end' row started carrying `rejectionReason` — the ledger assertions
 * would change what a 0.5-era filter returns.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { ConfirmRecord, GapRecord, ServeResult, JourneyToolsPort, JourneyToolsPortWithSettlement } from '../src/index.js';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('a port hand-implemented against the previous release', () => {
  // EXACTLY the 0.5 shape: tools() + call(), nothing else. If this stops
  // compiling, every hand-rolled double and relay facade in the field has too.
  const double: JourneyToolsPort = {
    tools: () => [],
    call: (name: string): ServeResult => ({ ok: false, reason: 'UNKNOWN_TOOL', asked: name }),
  };

  it('still satisfies the type, and still answers', () => {
    expect(double.tools()).toEqual([]);
    expect(double.call('anything')).toMatchObject({ ok: false, reason: 'UNKNOWN_TOOL' });
  });

  it('is honest about the door it does not have — absent, never a stub that lies', () => {
    expect(double.whenSettled).toBeUndefined();
  });

  it('the BUILT port always has it, so a caller holding one never checks', async () => {
    const session = buildNavigationGraph('shop', {
      pages: { catalog: { actions: { save: { does: 'Save the dress' } } } },
    }).createSession({ node: 'catalog', onWarn: () => undefined });
    session.registerActions('catalog', { handlers: { save: () => undefined } });

    // Named on purpose: the annotation is the assertion.
    const builtPort: JourneyToolsPortWithSettlement = serveToAgent(session);
    const fired = builtPort.call('shop.do_action', { action: 'save' });

    expect(typeof builtPort.whenSettled).toBe('function');
    expect(await builtPort.whenSettled(fired['transitionId'] as string)).toMatchObject({
      effectStatus: 'performed',
    });
  });
});

describe('a gap-ledger consumer that knows only the kinds of its own release', () => {
  /** One page with a door, one page without: a fire-rejected row AND a dead-end row. */
  async function bothKinds(): Promise<GapRecord[]> {
    const session = buildNavigationGraph('app', {
      pages: {
        home: { actions: { greet: { does: 'Say hello' } } },
        settings: { actions: { save: { does: 'Save the settings' } } },
      },
    }).createSession({ node: 'home', onWarn: () => undefined });
    session.registerActions('home', { handlers: { greet: () => undefined } });
    await tick(); // the coalesced structure flush, before the hop

    session.fire('home.nonesuch', { source: 'agent' }); // → 'fire-rejected'
    session.sync('settings'); // a room with no doors → 'dead-end'
    return session.gaps();
  }

  it('sees exactly its own rows — a new kind adds facts, it does not relabel old ones', async () => {
    const gaps = await bothKinds();
    expect(gaps.map((gap) => gap.kind)).toEqual(['fire-rejected', 'dead-end']);

    // The 0.5-era filter, unchanged.
    const refusals = gaps.filter((gap) => gap.kind === 'fire-rejected');
    expect(refusals).toHaveLength(1);
    expect(refusals[0]).toMatchObject({
      kind: 'fire-rejected',
      affordanceId: 'home.nonesuch',
      rejectionReason: 'UNKNOWN_AFFORDANCE',
      principal: 'agent',
    });
  });

  it('the new kind cannot be picked up by a triage query written for the old ones', async () => {
    const gaps = await bothKinds();
    const deadEnd = gaps.find((gap) => gap.kind === 'dead-end')!;

    // The fields a refusal-shaped query keys on are absent, so a consumer
    // filtering by rejectionReason (or by affordanceId) never sees this row.
    expect(deadEnd.rejectionReason).toBeUndefined();
    expect(deadEnd.affordanceId).toBeUndefined();
    expect(gaps.filter((gap) => gap.rejectionReason !== undefined)).toHaveLength(1);
  });
});

describe('a confirm-journal consumer that knows only the three kinds of its own release', () => {
  /** An enforcing session run to the end: ask, approval, spend, and a replay. */
  function everyKind(): ConfirmRecord[] {
    const session = buildNavigationGraph('shop', {
      pages: { checkout: { actions: { 'place-order': { does: 'Place the order', confirm: true, writes: ['orders'] } } } },
    }).createSession({ node: 'checkout', state: {}, requireHumanApproval: true, onWarn: () => undefined });
    session.registerActions('checkout', { handlers: { 'place-order': () => undefined } });

    const { askId } = session.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 1 } });
    session.approveAsk(askId, { by: 'alice@ops' });
    session.fire('checkout.place-order', { source: 'agent', payload: { total: 1 }, askId }); // → 'used'
    session.fire('checkout.place-order', { source: 'agent', payload: { total: 1 }, askId }); // → 'refused'
    session.alwaysApprove('checkout.place-order', { by: 'alice@ops' });
    session.revokeAlwaysApprove('checkout.place-order', { by: 'alice@ops' });
    return session.confirms();
  }

  it('sees exactly its own rows — four new kinds add facts, they do not relabel old ones', () => {
    const rows = everyKind();
    expect(rows.map((row) => row.kind)).toEqual([
      'ask',
      'approved',
      'used',
      'refused',
      'always-approved',
      'revoked',
    ]);

    // The 0.6-era reader, unchanged: "an approval is a row whose kind is
    // 'approved'". It must still return exactly one row, and that row must still
    // be about the same gate.
    const approvals = rows.filter((row) => row.kind === 'approved');
    expect(approvals).toHaveLength(1);
    expect(approvals[0]).toMatchObject({ affordanceId: 'checkout.place-order', askId: 'ask#1' });
    expect(rows.filter((row) => row.kind === 'ask')).toHaveLength(1);
    expect(rows.filter((row) => row.kind === 'declined')).toHaveLength(0);
  });

  it('the new kinds never carry an old kind’s fields, so an old query cannot pick them up', () => {
    const rows = everyKind();
    // A 0.6 consumer joining approvals to the commit log keys on transitionId. A
    // 'used' row carries one — it IS a spend — but it is not named 'approved', so
    // the join returns the spend as its own fact rather than as a second approval.
    expect(rows.find((row) => row.kind === 'always-approved')!.transitionId).toBeUndefined();
    expect(rows.find((row) => row.kind === 'revoked')!.transitionId).toBeUndefined();
    expect(rows.find((row) => row.kind === 'refused')!.transitionId).toBeUndefined();
    // And a durable grant can never be miscounted as a single yes — the whole
    // reason it is a new KIND and not a field on 'approved'.
    expect(rows.filter((row) => row.kind === 'approved').map((row) => row.askId)).toEqual(['ask#1']);
    expect(rows.find((row) => row.kind === 'always-approved')!.askId).toMatch(/^grant#/);
  });
});

/**
 * AN APP THAT DECLARES NOTHING SEES WHAT IT SAW BEFORE.
 *
 * The boundary law: declarations are additive and severable, and this is the pin
 * for it. Everything the human-decisions release added is driven by an authored
 * `humanDecides` — absent it, every new key is absent, the reader answers with an
 * empty list, no new lists appear in a frame result, and the facts block prints
 * no new lines.
 *
 * ONE FIELD IS UNCONDITIONALLY NEW and it is named here rather than hidden:
 * `standing`, on the two doors that serve a journey. That is a deliberate
 * disclosure — one word for where a chain stands, from one derivation, so two
 * doors cannot disagree about it — and it is a WORD about the chain, never a
 * claim about a declaration nobody made.
 *
 * MUTATION PROOFS:
 * - Stamp `humanDecides: false` on undeclared rows → 2 red.
 * - Emit an empty `withTheHuman: []` rather than omitting it → 1 red.
 * - Print a decisions line for a graph with none → 1 red.
 */
describe('a graph that declares no human decisions', () => {
  /** The pre-feature graph, wired: one journey, two ordinary steps. */
  function plain(): ReturnType<typeof buildNavigationGraph> {
    return buildNavigationGraph('shop', {
      pages: {
        checkout: {
          actions: {
            'enter-address': { does: 'Enter the delivery address', writes: ['address'] },
            'place-order': { does: 'Place the order', when: { address: { ne: '' } }, writes: ['orderId'] },
          },
        },
      },
      journeys: { buy: { does: 'Buy what is in the cart', steps: ['enter-address', 'place-order'] } },
    });
  }

  function session(): ReturnType<ReturnType<typeof plain>['createSession']> {
    const live = plain().createSession({
      node: 'checkout',
      state: { address: '', orderId: '' },
      onWarn: () => undefined,
    });
    live.registerActions('checkout', {
      handlers: { 'enter-address': () => undefined, 'place-order': () => undefined },
    });
    return live;
  }

  it('the reader answers with an empty list, and nothing is stamped anywhere', () => {
    const live = session();
    expect(live.decisions()).toEqual([]);
    for (const edge of live.available().edges) {
      expect(Object.hasOwn(edge, 'humanDecides')).toBe(false);
    }
    for (const step of live.journeyPlan('buy').steps) {
      expect(Object.hasOwn(step, 'humanDecides')).toBe(false);
    }
  });

  it('a frame result grows no new list, and the facts block no new line', () => {
    const live = session();
    const port = serveToAgent(live);
    const result = port.call('shop.journey.buy');
    for (const key of ['withTheHuman', 'withTheHumanMeans', 'awaitingHuman']) {
      expect(Object.hasOwn(result, key)).toBe(false);
    }
    expect(live.groundTruth().text).not.toContain('A decision is with the human');
    expect(JSON.stringify(port.call('shop.whats_here'))).not.toContain('humanDecides');
  });

  it('the only new key on either journey door is the standing word', () => {
    const port = serveToAgent(session());
    // The 1.2-era key set, written down, so a NEW one has to be argued for here.
    expect(Object.keys(port.call('shop.journey.buy')).sort()).toEqual([
      'frame',
      'howToAct',
      'journey',
      'judgment',
      'laterSteps',
      'ok',
      'readySteps',
      'standing',
      'version',
      'youAreOn',
    ]);
    const rows = port.call('shop.whats_here')['journeys'] as Array<Record<string, unknown>>;
    expect(Object.keys(rows[0]).sort()).toEqual(['does', 'feasible', 'journey', 'standing']);
  });
});
