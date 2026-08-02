/**
 * HOW DO I GET THERE — walked from the app's own navigation claims.
 *
 * Pages declare no edges to each other, and they should not: what connects two
 * places is always an ACTION — a link, a button, a redirect — and an action
 * that declares `navigatesTo` IS the edge. Declaring page edges separately
 * would be a second copy of something already stated, and second copies rot.
 * So reachability is DERIVED, and there is nothing to author.
 *
 * TWO LIMITS THIS MUST KEEP, both pinned below.
 *
 * A ROUTE IS NOT A PLAN. A journey is a preferred order toward a goal — that is
 * meaning, and it is declared. This is arithmetic: which declared hops lead
 * there, fewest first. No preference is expressed, nothing is recommended, and
 * the answer for a graph is the same every time it is asked.
 *
 * A ROUTE IS NOT A PERMISSION. `navigatesTo` is a CLAIM about where an action
 * goes. A route reports claims; it does not promise the hops are open. A guard
 * may be closed, a control greyed, a handler never mounted — and for a page
 * this session has never visited, the state there is a thing it cannot see.
 * Availability is answered where it is known: on the row of the action you are
 * actually about to reach for. Guessing it for later hops would be inventing
 * facts about a screen nobody has looked at.
 *
 * MUTATION PROOFS (each one run; the counts are what it actually did):
 * - Return `[]` instead of `null` when nothing declares a route → 4 red:
 *   "you are already there" and "nobody claims a path" are different answers,
 *   and collapsing them makes the second unspeakable.
 * - Walk depth-first instead of breadth-first → 1 red. Worth recording HOW that
 *   was earned: the first attempt at this proof passed, because the original
 *   graph's declaration order happened to lead a stack-based walk to the short
 *   route anyway. A claim nothing can break is not pinned, so the graph was
 *   rebuilt to distinguish them — short branch declared FIRST, so only a
 *   breadth-first walk answers it.
 * - Drop the visited set → the cyclic graph test goes red on its own 1s timeout:
 *   a loop between two pages is ordinary in a real app. Termination is the one
 *   guarantee here that no assertion can state, so the timeout IS the
 *   assertion — deliberately short, so the failure has a name instead of being
 *   a CI job that burned to its ceiling.
 * - Answer an UNDECLARED page id with `null` instead of refusing → 2 red: that
 *   is a caller's typo reported as a finding about the app.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { ServeResult } from '../src/index.js';

/** catalog → product → cart → checkout, plus a direct catalog → cart shortcut. */
function shop(opts?: { shortcut?: boolean }) {
  const map = buildNavigationGraph('shop', {
    pages: {
      catalog: {
        actions: {
          open: { does: 'Open a product', goTo: 'product' },
          ...(opts?.shortcut ? { basket: { does: 'Go to the basket', goTo: 'cart' } } : {}),
        },
      },
      product: { actions: { add: { does: 'Add to basket', goTo: 'cart' } } },
      cart: { actions: { pay: { does: 'Check out', goTo: 'checkout' } } },
      checkout: { actions: { back: { does: 'Keep shopping', goTo: 'catalog' } } },
      orphan: { actions: { nothing: { does: 'Does not lead anywhere' } } },
    },
  });
  return map.createSession({ node: 'catalog', onWarn: () => undefined });
}

describe('session.howToReach — the derived route', () => {
  it('names each hop and the action whose claim makes it', () => {
    expect(shop().howToReach('checkout')).toEqual([
      { action: 'catalog.open', to: 'product' },
      { action: 'product.add', to: 'cart' },
      { action: 'cart.pay', to: 'checkout' },
    ]);
  });

  it('takes the fewest hops when the app declares a shortcut', () => {
    // The long way still exists; arithmetic prefers the short one, and that is
    // the only preference expressed anywhere here.
    expect(shop({ shortcut: true }).howToReach('checkout')).toEqual([
      { action: 'catalog.basket', to: 'cart' },
      { action: 'cart.pay', to: 'checkout' },
    ]);
  });

  it('fewest hops even when the long way is declared first and explored first', () => {
    // Built so a depth-first walk would answer the THREE-hop detour: the short
    // branch is declared first, so a stack-based walk pops it last and reaches
    // the target down the long branch before ever coming back to it. Only a
    // breadth-first walk answers `short → target` here.
    const map = buildNavigationGraph('branch', {
      pages: {
        start: {
          actions: {
            quick: { does: 'The short way', goTo: 'short' }, // declared FIRST
            scenic: { does: 'The long way', goTo: 'one' },
          },
        },
        short: { actions: { hop: { does: 'Arrive', goTo: 'target' } } },
        one: { actions: { on: { does: 'Onward', goTo: 'two' } } },
        two: { actions: { arrive: { does: 'Arrive the long way', goTo: 'target' } } },
        target: { actions: { done: { does: 'Done' } } },
      },
    });
    const session = map.createSession({ node: 'start', onWarn: () => undefined });
    expect(session.howToReach('target')).toEqual([
      { action: 'start.quick', to: 'short' },
      { action: 'short.hop', to: 'target' },
    ]);
  });

  it('answers [] when you are already there — a real answer, not an absence', () => {
    expect(shop().howToReach('catalog')).toEqual([]);
  });

  it('answers null when nobody declares a route — and that is not "impossible"', () => {
    // `orphan` is a declared page no action claims to reach. The app may well
    // navigate there by means it never told us about; silence says only that
    // nothing here knows a way.
    expect(shop().howToReach('orphan')).toBeNull();
  });

  it('a page nobody declared at all is REFUSED by name, not answered with absence', () => {
    // The one thing `null` must never mean. Read as honest absence, a typo or a
    // renamed page would report "this app declares no way there" — a caller's
    // mistake dressed up as a finding about the app, and an under-declared graph
    // is precisely what a reader of this method is hunting for.
    expect(() => shop().howToReach('nowhere')).toThrow(/unknown page 'nowhere'/);
    // And it teaches: the known pages are named, so the caller can see the typo.
    expect(() => shop().howToReach('nowhere')).toThrow(/Known: .*orphan/);
  });

  it(
    'a cycle terminates instead of being walked forever',
    () => {
      // checkout → catalog closes a loop, and `orphan` sits outside it, so
      // answering requires exhausting the cycle rather than following it.
      const session = shop();
      // The loop is real — the graph genuinely closes back on itself, so the
      // walk has something to spin on.
      expect(session.howToReach('checkout')).toEqual([
        { action: 'catalog.open', to: 'product' },
        { action: 'product.add', to: 'cart' },
        { action: 'cart.pay', to: 'checkout' },
      ]);
      expect(session.howToReach('orphan')).toBeNull();
    },
    // The guarantee here is TERMINATION, which an assertion cannot state — so
    // the timeout is the assertion. Drop the visited set and this goes red by
    // name in a second, instead of the whole job burning to the CI ceiling with
    // nothing to point at.
    1000,
  );

  it('an action that declares no destination is not an edge', () => {
    const map = buildNavigationGraph('two', {
      pages: {
        here: { actions: { poke: { does: 'Does something, goes nowhere' } } },
        there: { actions: { noop: { does: 'Also nothing' } } },
      },
    });
    const session = map.createSession({ node: 'here', onWarn: () => undefined });
    expect(session.howToReach('there')).toBeNull();
  });

  it('the route moves with the cursor', () => {
    const session = shop();
    expect(session.howToReach('checkout')).toHaveLength(3);
    session.sync('cart');
    expect(session.howToReach('checkout')).toEqual([{ action: 'cart.pay', to: 'checkout' }]);
  });

  it('A ROUTE IS NOT A PERMISSION: a guarded hop is still reported as declared', () => {
    // `pay` is only offered once the basket has something in it. The route says
    // what the app CLAIMS leads to checkout; whether that hop is open right now
    // is answered on the row for `pay`, where it is actually known.
    const map = buildNavigationGraph('guarded', {
      pages: {
        cart: {
          actions: { pay: { does: 'Check out', goTo: 'checkout', when: { items: { gt: 0 } } } },
        },
        checkout: { actions: { done: { does: 'Finish' } } },
      },
    });
    const session = map.createSession({ node: 'cart', state: { items: 0 }, onWarn: () => undefined });
    // The guard is closed — the action is not even offered here…
    expect(session.available().edges.some((e) => e.affordanceId === 'cart.pay')).toBe(false);
    // …and the declared route still says what the app claims.
    expect(session.howToReach('checkout')).toEqual([{ action: 'cart.pay', to: 'checkout' }]);
  });

  it('A ROUTE IS NOT A PLAN: it carries hops and nothing that reads as advice', () => {
    for (const step of shop().howToReach('checkout')!) {
      expect(Object.keys(step).sort()).toEqual(['action', 'to']);
    }
  });

  it('the same graph answers the same way every time', () => {
    expect(shop({ shortcut: true }).howToReach('checkout')).toEqual(
      shop({ shortcut: true }).howToReach('checkout'),
    );
  });
});

describe('the route reaches the agent, on the call it already makes', () => {
  /**
   * Of the three contexts this library serves — the map, the traversal and the
   * actions — traversal was the thin one: a model was told WHERE IT IS and had
   * no way to ask HOW TO GET somewhere. It rides `whats_here` rather than
   * arriving as a sixth tool because the tool array is a contract: its bytes
   * are identical for every caller on every turn, and a new tool would change
   * them for everyone.
   */
  const port = () => serveToAgent(shop());
  const ask = (routeTo?: string): ServeResult =>
    port().call('shop.whats_here', routeTo === undefined ? {} : { routeTo }) as ServeResult;

  it('answers the declared hops when a destination is named', () => {
    const route = ask('checkout')['routeTo'] as ServeResult;
    expect(route['to']).toBe('checkout');
    expect(route['hops']).toEqual([
      { action: 'catalog.open', to: 'product' },
      { action: 'product.add', to: 'cart' },
      { action: 'cart.pay', to: 'checkout' },
    ]);
  });

  it('says nothing about routes when none was asked for', () => {
    // Presence-only, like every other stamp: a model that did not ask is not
    // handed an answer it has to skip past on every single turn.
    expect('routeTo' in ask()).toBe(false);
  });

  it('a destination you are already on is a real answer, not an empty route', () => {
    expect((ask('catalog')['routeTo'] as ServeResult)['alreadyHere']).toBe(true);
  });

  it('nobody declaring a way there is said as exactly that — not as "impossible"', () => {
    const route = ask('orphan')['routeTo'] as ServeResult;
    expect(route['hops']).toBeUndefined();
    expect(String(route['why'])).toContain('may navigate in ways it never declared');
  });

  it('THE TOOL ARRAY IS A CONTRACT: naming a destination changes no tool bytes', () => {
    // The fixed tool set is what every caller sees every turn. A route answer
    // must ride an existing tool's RESULT; if it ever grew the array, every
    // consumer's prompt would change underneath them.
    const p = port();
    const before = JSON.stringify(p.tools());
    // Guard the guard: a vacuous version of this test (comparing two
    // `undefined`s, because `tools` is a METHOD) would pass while proving
    // nothing. Assert there is really an array of tools here first.
    expect(p.tools().length).toBeGreaterThan(0);
    p.call('shop.whats_here', { routeTo: 'checkout' });
    expect(JSON.stringify(p.tools())).toBe(before);
  });

  it('the wire keeps the laws: what a route MEANS is said, and never as permission', () => {
    const route = ask('checkout')['routeTo'] as ServeResult;
    expect(String(route['means'])).toContain('not here');
    // Authored constant — no runtime value is built into the sentence.
    expect(String(route['means'])).not.toContain('checkout');
  });
});
