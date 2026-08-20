/**
 * THE MAP & WALKER VOCABULARY (1.10.0) — the official names, as PERMANENT
 * aliases of doors that already shipped.
 *
 * WHY THIS EXISTS. The family says one sentence at three altitudes: footprintjs
 * walks stages, agentfootprint walks skills (`defineSkillMap`), this walks
 * screens — you declare the JourneyMap; the session is the Walker; the recording
 * carries both. Naming a thing the library already does is only worth doing if
 * the name is the SAME thing: an alias that quietly becomes a fork gives the
 * ecosystem two doors that drift, which is worse than one door with an awkward
 * name. So the pin is reference equality, not behaviour — two functions that
 * behave identically today are exactly what drift looks like on day one.
 *
 * And the vocabulary's honest half: there is no `Walker` to construct. The
 * walker is the session, so the library exports no synonym for it — asserted
 * below, because an export nobody meant to add is how a metaphor turns into a
 * second runtime object.
 *
 * MUTATION PROOFS: replace `export const defineJourneyMap = buildNavigationGraph`
 * with a wrapper (`(id, def) => buildNavigationGraph(id, def)`) and the first
 * case goes red while every behavioural case still passes — which is the whole
 * argument for pinning identity. Export a `Walker` object from the barrel and
 * the last case goes red.
 */
import { describe, expect, it } from 'vitest';
import * as api from '../src/index.js';
import { buildNavigationGraph, defineJourneyMap, InteractionSession } from '../src/index.js';
import type { JourneyMap, NavigationGraph, NavigationGraphDef } from '../src/index.js';

const DEF: NavigationGraphDef = {
  pages: {
    catalog: {
      route: '/catalog',
      actions: {
        'add-to-cart': { does: 'Add the open dress to the cart', writes: ['cart.items'] },
        'go-checkout': { does: 'Go to checkout', goTo: 'checkout' },
      },
    },
    checkout: {
      route: '/checkout',
      actions: {
        'place-order': { does: 'Place the order', enabledWhen: { 'cart.items': { gt: 0 } } },
      },
    },
  },
  journeys: { purchase: { does: 'Buy a dress end to end', steps: ['add-to-cart', 'place-order'] } },
};

describe('defineJourneyMap / JourneyMap — the official names, as permanent aliases', () => {
  it('defineJourneyMap IS buildNavigationGraph (reference-equal — an alias, never a fork)', () => {
    expect(defineJourneyMap).toBe(buildNavigationGraph);
  });

  it('a map declared through either name compiles to the same graph', () => {
    const declared = defineJourneyMap('shop', DEF);
    const built = buildNavigationGraph('shop', DEF);
    expect(declared.spec).toEqual(built.spec);
    expect(declared.nodes).toEqual(built.nodes);
    expect(declared.actionNodes).toEqual(built.actionNodes);
    expect(declared.requiredStateKeys()).toEqual(built.requiredStateKeys());
  });

  it('the session it mounts is the walker — the same InteractionSession, walking', () => {
    const map = defineJourneyMap('shop', DEF);
    const walker = map.createSession({ node: 'catalog', state: { 'cart.items': 0 } });
    expect(walker).toBeInstanceOf(InteractionSession);
    // Looking (whats_here's answer), navigating (a goesTo edge), and the task
    // list (journeys with standing) all answer off the map it was mounted on.
    expect(walker.available().edges.map((edge) => edge.affordanceId)).toContain('catalog.add-to-cart');
    expect(walker.howToReach('checkout')).toEqual([{ action: 'catalog.go-checkout', to: 'checkout' }]);
    expect(walker.journeyStanding('purchase').journeyId).toBe('purchase');
  });

  it('JourneyMap names the same type as NavigationGraph (typed node paths intact)', () => {
    // The assignments in BOTH directions are the pin: `tsc -p tsconfig.test.json`
    // fails here if the alias is ever narrowed into a different type.
    const map: JourneyMap<'catalog' | 'checkout'> = defineJourneyMap('shop', {
      pages: { catalog: { actions: { open: { does: 'Open the catalog' } } }, checkout: {} },
    });
    const asGraph: NavigationGraph<'catalog' | 'checkout'> = map;
    const backAgain: JourneyMap<'catalog' | 'checkout'> = asGraph;
    const session = backAgain.createSession({ node: 'catalog' });
    session.setVisible('checkout', true);
    // Never CALLED — the compiler is the assertion. The `const Def` node-path
    // union survives the alias, so a page this map does not declare is a
    // COMPILE error rather than a silent no-op (running it would only prove the
    // runtime's own unknown-node throw, which is a different law).
    const typoIsACompileError = (): void => {
      // @ts-expect-error — 'chekcout' is not a declared node path.
      session.setVisible('chekcout', true);
    };
    expect(typeof typoIsACompileError).toBe('function');
    expect(map.id).toBe('shop');
  });

  it('exports no Walker to construct — the walker is the session', () => {
    // The metaphor names something that already exists; it must not grow a
    // second runtime object for people to wire up.
    expect(Object.keys(api)).not.toContain('Walker');
    expect(Object.keys(api)).not.toContain('JourneyWalker');
    expect(Object.keys(api)).toContain('defineJourneyMap');
  });
});
