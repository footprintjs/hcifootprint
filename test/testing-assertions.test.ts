/**
 * The assertions testApp hands a test writer — the half of the harness that
 * turns a session fact into a failed test.
 *
 * Each one throws a plain Error (no test-runner dependency), and nearly all of
 * the value is in the SENTENCE. A test that fails saying "expected true, got
 * false" makes the reader re-derive what happened from scratch; every message
 * below is asserted for the fact it carries — the page you are really on, the
 * value the state really holds, what IS available instead, the reason the fire
 * really gave, how far the journey really got.
 *
 * The deep-equality section is not decoration. `expectState` compares nested
 * objects and arrays, and the two failures that matter are the false PASS (two
 * different shapes called equal, so a test stays green while the app is wrong)
 * and the false FAIL (a shape that really did match, reported as drift). Both
 * directions are proved.
 *
 * Mutation proofs: swap deepEqual for `===` and every nested case below fails;
 * swap it for JSON.stringify equality and the key-order case starts failing on
 * a match that is real.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import { testApp } from '../src/testing/index.js';
import type { TestApp } from '../src/testing/index.js';
import { shopGraph, shopInitial } from './testing-fixture.js';
import type { ShopState } from './testing-fixture.js';

const resolvers = {
  'add-to-cart': (_p: unknown, { state }: { state: ShopState }) => ({
    patch: { cartCount: state.cartCount + 1 },
  }),
};

const shop = (): TestApp<ShopState> =>
  testApp<ShopState>(shopGraph(), { initialState: shopInitial, resolvers });

/** A one-page app whose only control is gated shut — nothing is available here. */
const lockedApp = (): TestApp<Record<string, unknown>> =>
  testApp(
    buildNavigationGraph('locked', {
      pages: { vault: { actions: { open: { does: 'Open the vault', when: { key: { eq: true } } } } } },
    }),
    { initialState: { key: false } },
  );

describe('“you are not where you think you are”', () => {
  it('passes on the page the cursor is really on', () => {
    expect(() => shop().expectOn('catalog')).not.toThrow();
  });

  it('names BOTH pages when it fails — the one you expected and the one you got', () => {
    expect(() => shop().expectOn('checkout')).toThrow(/expected to be on “checkout”, but on “catalog”/);
  });
});

describe('“the state does not hold what you said it would”', () => {
  it('passes when every named key matches, ignoring keys it was not asked about', () => {
    const app = shop();
    app.stimulus({ cartCount: 2, unrelated: 'left alone' });
    expect(() => app.expectState({ cartCount: 2 })).not.toThrow();
  });

  it('names the key and prints both values when it fails', () => {
    expect(() => shop().expectState({ cartCount: 9 })).toThrow(
      /expected state “cartCount” to be 9, but it is 0/,
    );
  });
});

describe('comparing a whole shape, not just a number', () => {
  /** Put `held` in state, then ask whether it equals `claim`. */
  const matches = (held: unknown, claim: unknown): boolean => {
    const app = shop();
    app.stimulus({ shape: held });
    try {
      app.expectState({ shape: claim });
      return true;
    } catch {
      return false;
    }
  };

  it('matches a nested object regardless of the order its keys were written in', () => {
    expect(matches({ a: 1, b: { c: [1, 2, 3] } }, { b: { c: [1, 2, 3] }, a: 1 })).toBe(true);
  });

  it('refuses two shapes that merely look alike', () => {
    expect(matches(1, '1')).toBe(false); //                     a number is not its own spelling
    expect(matches('yes', 'no')).toBe(false); //                two strings, neither equal
    expect(matches(null, {})).toBe(false); //                   null is not an empty object
    expect(matches({}, null)).toBe(false); //                   nor is an empty object null
    expect(matches([], {})).toBe(false); //                     an empty list is not an empty record
    expect(matches({}, [])).toBe(false); //                     nor the other way round
    expect(matches([1, 2], [1, 2, 3])).toBe(false); //          a shorter list is a different list
    expect(matches([1, 2], [1, 9])).toBe(false); //             same length, different contents
    expect(matches({ a: 1 }, { a: 1, b: 2 })).toBe(false); //   an extra key is a different record
    expect(matches({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false); // difference buried a level down
  });

  it('matches the shapes that really are the same, to the leaves', () => {
    expect(matches([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(matches({ a: [{ b: null }] }, { a: [{ b: null }] })).toBe(true);
    expect(matches('same', 'same')).toBe(true);
  });
});

describe('“that control is not on offer right now”', () => {
  it('passes for a control the page really offers, named either way', () => {
    const app = shop();
    expect(() => app.expectAvailable('add-to-cart')).not.toThrow(); //       the bare name
    expect(() => app.expectAvailable('catalog.add-to-cart')).not.toThrow(); // the qualified id
  });

  it('lists what IS available when it fails, so the next line of the test writes itself', () => {
    expect(() => shop().expectAvailable('go-to-cart')).toThrow(
      /expected “go-to-cart” to be available on “catalog”, but available: catalog\.add-to-cart/,
    );
  });

  it('says “(none)” rather than trailing off when the page offers nothing at all', () => {
    expect(() => lockedApp().expectAvailable('open')).toThrow(/but available: \(none\)\./);
  });
});

describe('“that fire did not go the way you claimed”', () => {
  it('passes for a refusal, and can hold the refusal to a specific reason', async () => {
    const app = shop();
    const refused = await app.user.tryFire('go-to-cart'); // guarded on a cart with something in it
    expect(() => app.expectRejected(refused)).not.toThrow();
    expect(() => app.expectRejected(refused, 'GUARD_FAILED')).not.toThrow();
  });

  it('fails when the fire actually SUCCEEDED — the silent-green case', async () => {
    const app = shop();
    const worked = await app.user.tryFire('add-to-cart');
    expect(() => app.expectRejected(worked)).toThrow(/expected a rejection, but the fire succeeded/);
  });

  it('fails when it was refused for a DIFFERENT reason, and prints both', async () => {
    const app = shop();
    const refused = await app.user.tryFire('go-to-cart');
    expect(() => app.expectRejected(refused, 'NOT_ON_NODE')).toThrow(
      /expected rejection “NOT_ON_NODE”, but got “GUARD_FAILED”/,
    );
  });
});

describe('“that journey never finished”', () => {
  it('passes once a journey has a completed frame', async () => {
    const app = testApp<ShopState>(shopGraph(), {
      initialState: shopInitial,
      resolvers: {
        ...resolvers,
        'place-order': () => ({ patch: { cartCount: 0 } }),
      },
    });
    await app.agent.journey('purchase');
    await app.agent.journey('purchase', { step: 'add-to-cart' });
    await app.agent.journey('purchase', { step: 'go-to-cart' });
    await app.agent.journey('purchase', { step: 'checkout' });
    await app.agent.journey('purchase', { step: 'place-order', confirm: true });
    await app.agent.journey('purchase');
    expect(() => app.expectJourneyCompleted('purchase')).not.toThrow();
  });

  it('reports the fate the journey DID meet, rather than only that it is not “completed”', async () => {
    const app = testApp(
      buildNavigationGraph('two-ways', {
        pages: { home: { actions: { a: { does: 'A', writes: ['x'] }, b: { does: 'B', writes: ['y'] } } } },
        journeys: { first: { does: 'First', steps: ['a'] }, second: { does: 'Second', steps: ['b'] } },
      }),
      { initialState: {} },
    );
    await app.agent.journey('first');
    await app.agent.journey('second'); // walking away closes the first one
    expect(() => app.expectJourneyCompleted('first')).toThrow(
      /expected journey “first” to have completed, but its frames were: cancelled/,
    );
  });

  it('says “(never opened)” rather than blaming the journey for failing', () => {
    expect(() => shop().expectJourneyCompleted('purchase')).toThrow(
      /but its frames were: \(never opened\)/,
    );
  });
});

describe('the release gate: “nothing drifted, and nothing went unmet”', () => {
  it('passes on a run where every handler did what its action claims', async () => {
    const app = shop();
    await app.user.fire('add-to-cart');
    expect(() => app.expectClean()).not.toThrow();
    expect(() => app.expectClean({ includeGaps: true })).not.toThrow();
  });

  it('stays quiet about gaps unless asked, then names how many there were', async () => {
    const app = shop();
    await app.user.tryFire('go-to-cart'); // refused → one unmet-demand row
    expect(() => app.expectClean()).not.toThrow(); //           drift-only by default
    expect(() => app.expectClean({ includeGaps: true })).toThrow(/1 gap\(s\) recorded/);
  });
});
