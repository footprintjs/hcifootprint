/**
 * The session at its edges — the answers it gives when the ordinary path is not
 * the one being walked.
 *
 * Each block is one honesty rule meeting one awkward case: an id nobody can
 * answer about, a fire the library only INFERRED, a handler that reports twice,
 * a value too big or too strange to carry, a page with no address. The rule is
 * always the same one — say the true thing, or say nothing, and never round a
 * guess up into a fact — and what varies is how easy that is to get wrong.
 *
 * These are the arms a reader most needs to see proved, because they are the
 * ones nobody exercises by hand.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import type { NavigationGraph, Session } from '../src/index.js';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** A shop whose checkout page has NO route — an address the library does not have. */
function shop(): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: {
      catalog: {
        route: '/catalog',
        actions: {
          'add-to-cart': { does: 'Add a dress to the cart', writes: ['cart'] },
          note: { does: 'Leave a gift note' },
          'go-checkout': { does: 'Go to checkout', goTo: 'checkout' },
        },
      },
      checkout: { actions: { pay: { does: 'Pay for the order', confirm: true, writes: ['orders'] } } },
    },
  });
}

const wired = (opts?: Parameters<NavigationGraph['createSession']>[0]): Session => {
  const session = shop().createSession({ node: 'catalog', state: {}, onWarn: () => undefined, ...opts });
  session.registerActions('catalog', {
    handlers: {
      'add-to-cart': () => session.updateState({ cart: ['a-dress'] }),
      note: () => undefined,
    },
  });
  return session;
};

describe('“there is no settlement for that id”, said three different ways', () => {
  it('refuses an id this session never handed out, and lists what IS still in flight', () => {
    const session = wired();
    expect(() => session.settlementIfKnown('never-minted#9')).toThrow(
      /no transition 'never-minted#9' in this session.*Fires still awaiting one: \(none\)/s,
    );
  });

  it('refuses a row the WORLD wrote — nobody fired it, so nothing can have settled', () => {
    const session = wired();
    session.updateState({ cart: [] }, { stimulus: 'push' });
    const pushed = session.transitions().find((t) => t.cause.kind === 'stimulus');
    expect(() => session.settlementIfKnown(pushed!.id)).toThrow(
      /is a 'push' row — the world moved, nobody fired it/,
    );
  });

  it('answers about a fire the library only INFERRED — as unobservable, never as performed', () => {
    const session = wired();
    // Nobody called fire(); the state simply moved in exactly the shape one
    // wired action declares, so the session attributes it — and marks the row a
    // guess. No handler ran, so nothing about the EFFECT was observed either.
    session.updateState({ cart: ['a-dress'] });
    const guessed = session.transitions().find((t) => t.cause.inferred === true);
    expect(guessed).toBeDefined();
    expect(session.settlementIfKnown(guessed!.id)).toMatchObject({
      effectStatus: 'unobservable',
      outcome: 'committed',
    });
  });
});

describe('a handler that reports its state change more than once', () => {
  it('settles its own record on the first report and does not steal a neighbour’s on the second', async () => {
    const session = shop().createSession({ node: 'catalog', state: {}, onWarn: () => undefined });
    session.registerActions('catalog', {
      handlers: {
        'add-to-cart': () => {
          session.updateState({ cart: ['a-dress'] }); // settles THIS record
          session.updateState({ cart: ['a-dress', 'a-hat'] }); // …and this one has no record left
        },
      },
    });
    const fired = session.fire('catalog.add-to-cart', { source: 'user' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    await tick();

    const rows = session.transitions().filter((t) => t.cause.affordanceId === 'catalog.add-to-cart');
    // The FIRE's own row is settled by the first report and is not a guess.
    expect(rows[0].id).toBe(fired.transition.id);
    expect(rows[0].cause.inferred).toBeUndefined();
    // The second report had no record of its own left to claim, so it is filed
    // as an attribution the library INFERRED — marked as a guess rather than
    // folded silently into a fire that had already come to rest.
    expect(rows[1].cause.inferred).toBe(true);
    expect(session.state()['cart']).toEqual(['a-dress', 'a-hat']);
  });
});

describe('taking back a fire the app already committed', () => {
  it('rolls a committed transition back, and did_it_work stops saying it happened', async () => {
    const session = wired();
    const fired = session.fire('catalog.add-to-cart', { source: 'user' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    await fired.whenSettled;

    const rolled = session.reject(fired.transition.id, { outcome: 'rolled-back' });
    expect(rolled.outcome).toBe('rolled-back');
    expect(session.groundTruth().text).toContain('it was rolled back');
  });

  it('refuses an id there is nothing to take back for', () => {
    expect(() => wired().reject('never-fired#9')).toThrow(
      /no pending or committed transition 'never-fired#9' to reject/,
    );
  });
});

describe('the plain-words verdict on one recorded fire', () => {
  const verdictFor = async (outcome: 'rejected' | 'rolled-back' | 'superseded'): Promise<string> => {
    const session = wired();
    const fired = session.fire('catalog.add-to-cart', { source: 'user' });
    if (!fired.ok) throw new Error('unreachable');
    await fired.whenSettled;
    session.reject(fired.transition.id, { outcome });
    return session.groundTruth().text;
  };

  it('grades each ending on its own terms, and never rounds one up', async () => {
    expect(await verdictFor('rejected')).toContain('did NOT happen — user fired catalog.add-to-cart (the app refused it)');
    expect(await verdictFor('rolled-back')).toContain(
      'did NOT happen — user fired catalog.add-to-cart (it was rolled back)',
    );
    // 'superseded' means the library STOPPED WATCHING, not that the action
    // failed — calling it a failure would be a guess dressed as a fact.
    expect(await verdictFor('superseded')).toContain(
      'ran, but the outcome was never observed — user fired catalog.add-to-cart ' +
        '(tracking of it stopped (superseded))',
    );
  });
});

describe('an address the library does not have', () => {
  it('will not synthesize a navigation to a page with no route, even with a navigate function', () => {
    // `checkout` declares no route, so there is nothing literal to hand a
    // router. The library never guesses an address — the fire is refused as
    // unmaterialized rather than sent somewhere invented.
    const session = shop().createSession({
      node: 'catalog',
      state: {},
      navigate: () => undefined,
      onWarn: () => undefined,
    });
    expect(session.fire('catalog.go-checkout', { source: 'agent' })).toMatchObject({
      ok: false,
      reason: 'NOT_MATERIALIZED',
    });
  });
});

describe('a value the record cannot carry as data', () => {
  it('keeps a handler’s return bounded in depth, in breadth, and safe from a cycle', async () => {
    const graph = buildNavigationGraph('deep', {
      pages: { home: { actions: { fetch: { does: 'Fetch the record' } } } },
    });
    const session = graph.createSession({ node: 'home', state: {}, onWarn: () => undefined });
    const wide: Record<string, number> = {};
    for (let i = 0; i < 60; i += 1) wide[`k${i}`] = i;
    const cyclic: Record<string, unknown> = { name: 'root' };
    cyclic['self'] = cyclic;
    session.registerActions('home', {
      handlers: { fetch: () => ({ deep: { a: { b: { c: { d: 'too far' } } } }, wide, cyclic }) },
    });

    const fired = session.fire('home.fetch', { source: 'agent' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    await fired.whenSettled;

    const produced = session.producedFor(fired.transition.id) as Record<string, Record<string, unknown>>;
    // Depth: four levels down the answer is null rather than the app's object.
    expect((produced['deep']['a'] as Record<string, Record<string, unknown>>)['b']['c']).toBeNull();
    // Breadth: forty keys, not sixty — a search result cannot flood a tool call.
    // 1.13.0 — plus the cut NAMES its size under the one key no app object can
    // silently collide with, instead of hiding twenty keys without a word.
    expect(Object.keys(produced['wide'])).toHaveLength(41);
    expect(produced['wide']['…']).toMatch(/more key\(s\) omitted/);
    // A cycle terminates instead of recursing forever, and what survives is JSON.
    expect(() => JSON.stringify(produced)).not.toThrow();
  });
});

describe('a payload contract the library validates by asking the app’s own validator', () => {
  const graphWith = (input: unknown): NavigationGraph =>
    buildNavigationGraph('forms', {
      pages: { home: { actions: { save: { does: 'Save the form', input } } } },
    });

  const fireWith = (input: unknown, payload: unknown) => {
    const session = graphWith(input).createSession({ node: 'home', state: {}, onWarn: () => undefined });
    session.registerActions('home', { handlers: { save: () => undefined } });
    return session.fire('home.save', { source: 'agent', payload });
  };

  it('accepts a parse-only validator — the answer is “it did not throw”', () => {
    const parseOnly = {
      parse: (value: unknown): unknown => {
        if (typeof (value as { name?: unknown })?.name !== 'string') throw new Error('name must be a string');
        return value;
      },
    };
    expect(fireWith(parseOnly, { name: 'Ada' }).ok).toBe(true);
    const refused = fireWith(parseOnly, { name: 42 });
    expect(refused).toMatchObject({ ok: false, reason: 'PAYLOAD_INVALID' });
    expect(refused.ok === false && refused.reason === 'PAYLOAD_INVALID' && String(refused.issues)).toContain('name must be a string');
  });

  it('treats a safeParse that THROWS as a refusal, not as a pass', () => {
    // A validator that blows up has said nothing about the payload. Reading
    // that silence as approval is how a bad input reaches a handler.
    const brokenValidator = {
      safeParse: (): { success: boolean } => {
        throw new Error('the validator itself is broken');
      },
    };
    const refused = fireWith(brokenValidator, { name: 'Ada' });
    expect(refused).toMatchObject({ ok: false, reason: 'PAYLOAD_INVALID' });
    expect(refused.ok === false && refused.reason === 'PAYLOAD_INVALID' && String(refused.issues)).toContain('the validator itself is broken');
  });
});
