/**
 * THE NAVIGATION CLAIM, DISCLOSED TO BOTH READERS.
 *
 * A navigation declares no writes, so from the element's side success looks
 * exactly like nothing happening: the control the agent clicked is still there,
 * no state key moved, and an agent watching for either signal reads a working
 * link as a dead one. The evidence that it WORKED is page motion.
 *
 * The human already had that fact before deciding — `ConfirmWillDo.navigatesTo`
 * has ridden the confirm receipt since d21 (src/atom/types.ts). The agent's own
 * row did not carry it, so the two readers of the same edge were told different
 * things. Now `available()` stamps the declared destination and `whats_here`
 * serves it as `goesTo`, BEFORE anything is fired.
 *
 * The frame surface was the last one still silent. Inside a journey, `readySteps`
 * IS the action list — so a navigating STEP was the same working link read as a
 * dead one, on the one row a planner has while the frame is open.
 *
 * MUTATION PROOFS:
 * - 'the agent's row discloses what the human's receipt discloses' — drop the
 *   stamp in available() and the two readers disagree again.
 * - 'absent stays absent' — default it to the current page (or to anything) and
 *   the library starts claiming a destination the app never declared.
 * - Drop the `goesTo` spread from the readySteps row → 2 red: the step row and
 *   the equality that says one edge cannot be described two ways.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { ConfirmReceipts, NavigationGraph } from '../src/index.js';

function shopMap(): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: {
      catalog: {
        actions: {
          'go-checkout': { does: 'Go to checkout', goTo: 'checkout' },
          'add-to-cart': { does: 'Add the dress to the cart', writes: ['cart'] },
          'empty-cart': { does: 'Empty the cart', confirm: true, goTo: 'catalog', writes: ['cart'] },
        },
      },
      checkout: { actions: { 'place-order': { does: 'Place the order', writes: ['orders'] } } },
    },
    // The frame surface, where the same claim had to travel too: inside a journey,
    // `readySteps` is the whole action list a planner reads.
    journeys: {
      purchase: { does: 'Buy the dress', steps: ['catalog.add-to-cart', 'catalog.go-checkout'] },
    },
  });
}

function shop() {
  const session = shopMap().createSession({
    node: 'catalog',
    state: { cart: [] },
    onWarn: () => undefined,
  });
  session.registerActions('catalog', {
    handlers: {
      'go-checkout': () => undefined,
      'add-to-cart': () => undefined,
      'empty-cart': () => undefined,
    },
  });
  return { session, port: serveToAgent(session) };
}

/** One action row out of a whats_here reply. */
function actionRow(result: Record<string, unknown>, action: string): Record<string, unknown> {
  const rows = result['actions'] as Array<Record<string, unknown>>;
  return rows.find((row) => row['action'] === action)!;
}

/** One readySteps row out of an opened journey frame. */
function stepRow(result: Record<string, unknown>, step: string): Record<string, unknown> {
  const rows = result['readySteps'] as Array<Record<string, unknown>>;
  return rows.find((row) => row['step'] === step)!;
}

describe('the declared destination is served before the fire', () => {
  it('available() stamps navigatesTo from the declared effect', () => {
    const { session } = shop();
    const edges = session.available().edges;
    expect(edges.find((e) => e.affordanceId === 'catalog.go-checkout')?.navigatesTo).toBe('checkout');
  });

  it('whats_here serves it as goesTo — the wire consumer knows before it fires', () => {
    const { port } = shop();
    const here = port.call('shop.whats_here', {});
    expect(actionRow(here, 'catalog.go-checkout')).toMatchObject({
      action: 'catalog.go-checkout',
      does: 'Go to checkout',
      goesTo: 'checkout',
    });
  });

  it('absent stays absent — an action that declares no destination claims none', () => {
    const { session, port } = shop();
    expect(session.available().edges.find((e) => e.affordanceId === 'catalog.add-to-cart')).not.toHaveProperty(
      'navigatesTo',
    );
    expect(actionRow(port.call('shop.whats_here', {}), 'catalog.add-to-cart')).not.toHaveProperty('goesTo');
  });

  it('the agent’s row discloses exactly what the human’s receipt discloses', () => {
    // One fact, two readers. The receipt has carried it since d21; the row that
    // an agent plans from now carries the same value, from the same declaration.
    const { session, port } = shop();
    const { receipts } = session.confirmAsk('catalog.empty-cart') as { receipts: ConfirmReceipts };
    const row = actionRow(port.call('shop.whats_here', {}), 'catalog.empty-cart');
    expect(receipts.willDo.navigatesTo).toBe('catalog');
    expect(row['goesTo']).toBe(receipts.willDo.navigatesTo);
  });

  it('it is a CLAIM, served whether or not anything is wired to make it true', () => {
    // Nothing registered: the edge still discloses what the app DECLARED, beside
    // the honest marker saying nothing is bound. A claim and its verification are
    // two different facts and the row carries both.
    const session = shopMap().createSession({
      node: 'catalog',
      state: { cart: [] },
      allowUnmaterializedFires: true,
      onWarn: () => undefined,
    });
    const row = actionRow(serveToAgent(session).call('shop.whats_here', {}), 'catalog.go-checkout');
    expect(row).toMatchObject({ goesTo: 'checkout', materialized: false });
  });

  it('survives structuredClone like every other served row', () => {
    const { port } = shop();
    expect(() => structuredClone(port.call('shop.whats_here', {}))).not.toThrow();
  });
});

describe('a journey frame’s readySteps make the same claim', () => {
  it('a navigating STEP carries goesTo — the last surface that read as a dead link', () => {
    // Inside a frame the action list IS readySteps, and it was the one row still
    // silent about the destination: a step that declares no writes and no
    // destination looks, from the element's side, exactly like a step that did
    // nothing. Same key, same declaration, same rule.
    const { port } = shop();
    const opened = port.call('shop.journey.purchase', {});

    expect(stepRow(opened, 'catalog.go-checkout')).toMatchObject({
      step: 'catalog.go-checkout',
      does: 'Go to checkout',
      goesTo: 'checkout',
    });
  });

  it('and it is the SAME value the action row carries — one edge, one claim', () => {
    // The asymmetry this closes, asserted as an equality: two rows a model plans
    // over, about one edge, must not disagree about where it goes.
    const { port } = shop();
    const opened = port.call('shop.journey.purchase', {});
    const here = port.call('shop.whats_here', {});

    expect(stepRow(opened, 'catalog.go-checkout')['goesTo']).toBe(
      actionRow(here, 'catalog.go-checkout')['goesTo'],
    );
  });

  it('absent stays absent — a step that declares no destination claims none', () => {
    // The attack: defaulting it to the current page, or to anything at all. An
    // add-to-cart step goes nowhere and says nothing about going anywhere.
    const { port } = shop();
    const opened = port.call('shop.journey.purchase', {});

    expect(stepRow(opened, 'catalog.add-to-cart')).not.toHaveProperty('goesTo');
  });

  it('the tool schema did not move a byte for it — a claim rides RESULTS', () => {
    // Mode B's whole design is a tool array whose bytes never change; a stamp
    // that reached the model by growing the schema would cost every caller a
    // cache miss on every turn, for a fact that belongs in the answer.
    const { port } = shop();
    const journeyTool = port.tools().find((tool) => tool.name === 'shop.journey.purchase')!;

    expect(JSON.stringify(journeyTool)).not.toContain('goesTo');
  });
});
