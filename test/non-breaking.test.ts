/**
 * WHAT A RELEASED CONSUMER ALREADY WROTE — still compiling, still meaning what
 * it meant.
 *
 * Two shapes an audit found this line's growth could have moved under someone,
 * and the promises that answer them:
 *
 * 1. `SkillToolsPort` is a PUBLISHED interface, so somebody's object literal
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
import { buildNavigationGraph, skillsAsTools } from '../src/index.js';
import type { GapRecord, ServeResult, SkillToolsPort, SkillToolsPortWithSettlement } from '../src/index.js';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('a port hand-implemented against the previous release', () => {
  // EXACTLY the 0.5 shape: tools() + call(), nothing else. If this stops
  // compiling, every hand-rolled double and relay facade in the field has too.
  const double: SkillToolsPort = {
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
      pages: { catalog: { tools: { save: { does: 'Save the dress' } } } },
    }).createSession({ node: 'catalog', onWarn: () => undefined });
    session.registerToolGroup('catalog', { handlers: { save: () => undefined } });

    // Named on purpose: the annotation is the assertion.
    const builtPort: SkillToolsPortWithSettlement = skillsAsTools(session);
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
        home: { tools: { greet: { does: 'Say hello' } } },
        settings: { tools: { save: { does: 'Save the settings' } } },
      },
    }).createSession({ node: 'home', onWarn: () => undefined });
    session.registerToolGroup('home', { handlers: { greet: () => undefined } });
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
