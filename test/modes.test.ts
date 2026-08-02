/**
 * Mode B — journeys as fixed tools. The load-bearing contract: the tool array
 * NEVER changes (prompt-cache stability + plain-MCP compatibility); disclosure
 * rides the RESULT channel as readySteps; the model acts by re-calling the
 * same journey tool with {step}.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { NavigationGraph } from '../src/index.js';

function shopMap(): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: {
      catalog: {
        actions: {
          'add-to-cart': { does: 'Add the selected dress to the cart', writes: ['cart'] },
          'go-checkout': { does: 'Go to checkout', goTo: 'checkout' },
        },
      },
      checkout: {
        actions: {
          'place-order': { does: 'Place the order', confirm: true, writes: ['orders'] },
        },
      },
    },
    journeys: {
      purchase: { does: 'Buy a dress end to end', steps: ['add-to-cart', 'go-checkout', 'place-order'] },
      browse: { does: 'Look around the catalog', steps: ['add-to-cart'] },
    },
  });
}

function freshPort() {
  const session = shopMap().createSession({ state: { cart: [] }, onWarn: () => undefined });
  // The app binds its buttons (Phase 1). Since 0.3.0 an agent fire of a
  // declared-but-unbound action is refused NOT_MATERIALIZED — serving an agent
  // means something is actually wired to execute.
  session.registerActions('catalog', {
    handlers: { 'add-to-cart': () => undefined, 'go-checkout': () => undefined },
  });
  session.registerActions('checkout', { handlers: { 'place-order': () => undefined } });
  return { session, port: serveToAgent(session) };
}

describe('the tool list a planner is handed never changes shape mid-run', () => {
  it('is one tool per journey + whats_here + why + do_action + did_it_work, and NEVER changes across navigation', () => {
    const { session, port } = freshPort();
    const before = JSON.stringify(port.tools());
    expect(port.tools().map((tool) => tool.name)).toEqual([
      'shop.journey.purchase',
      'shop.journey.browse',
      'shop.whats_here',
      'shop.why',
      'shop.do_action',
      'shop.did_it_work',
    ]);

    port.call('shop.journey.purchase', {}); // open a frame
    session.sync('checkout'); // navigate
    session.updateState({ cart: ['dress'] }, { stimulus: 'push' }); // world moves

    expect(JSON.stringify(port.tools())).toBe(before); // identical BYTES — the cache contract
  });

  it('every journey tool carries the same static {step, input, confirm, decline, instance} schema', () => {
    const { port } = freshPort();
    const tool = port.tools().find((candidate) => candidate.name === 'shop.journey.purchase')!;
    expect(Object.keys((tool.inputSchema as { properties: object }).properties).sort()).toEqual([
      'confirm',
      'decline',
      'input',
      'instance',
      'step',
    ]);
  });
});

describe('what a committed journey opens up arrives as DATA, never as new tools', () => {
  it('opening a journey returns readySteps as DATA, never new tools', () => {
    const { port } = freshPort();
    const result = port.call('shop.journey.purchase', {});
    expect(result['ok']).toBe(true);
    expect(result['frame']).toBe('open');
    const ready = result['readySteps'] as Array<{ step: string; does: string }>;
    expect(ready.map((step) => step.step)).toEqual(['catalog.add-to-cart', 'catalog.go-checkout']);
    expect(result['howToAct']).toContain('step');
  });

  it('acting = re-calling the SAME tool with {step}; the result advances readySteps', () => {
    const { session, port } = freshPort();
    port.call('shop.journey.purchase', {});
    const step1 = port.call('shop.journey.purchase', { step: 'catalog.add-to-cart' });
    expect(step1['did']).toBe('catalog.add-to-cart');
    session.updateState({ cart: ['dress'] }); // the app's tap settles the pending write
    const step2 = port.call('shop.journey.purchase', { step: 'go-checkout' }); // suffix resolves
    expect(step2['did']).toBe('catalog.go-checkout');
    expect(step2['youAreOn']).toBe('checkout'); // navigation claim moved the cursor
  });

  it('a high-effect step with confirm:true on the FIRST call crosses — and that is why requireHumanApproval exists', async () => {
    // The name of the test below promises more than the sequence it exercises,
    // so this is the missing case, stated honestly: with no session option, the
    // default port takes `confirm: true` as permission and never asks. That is a
    // recorded decision plus a convenience message, not enforced HITL — and the
    // opt-in gate is what makes it enforceable (test/human-approval.test.ts).
    const { session, port } = freshPort();
    port.call('shop.journey.purchase', {});
    port.call('shop.journey.purchase', { step: 'add-to-cart' });
    session.updateState({ cart: ['dress'] });
    port.call('shop.journey.purchase', { step: 'go-checkout' });

    const crossed = port.call('shop.journey.purchase', { step: 'place-order', confirm: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(crossed['did']).toBe('checkout.place-order');
    expect(session.confirms()).toHaveLength(0); // no ask ever landed, so no trace
  });

  it('high-effect steps stop at needs-confirm and never auto-cross', () => {
    const { session, port } = freshPort();
    port.call('shop.journey.purchase', {});
    port.call('shop.journey.purchase', { step: 'add-to-cart' });
    session.updateState({ cart: ['dress'] });
    port.call('shop.journey.purchase', { step: 'go-checkout' });

    const stopped = port.call('shop.journey.purchase', { step: 'place-order' });
    expect(stopped).toMatchObject({ ok: false, judgment: 'needs-confirm' });

    const fired = port.call('shop.journey.purchase', { step: 'place-order', confirm: true });
    expect(fired['did']).toBe('checkout.place-order');
    session.updateState({ orders: ['o-1'] });
    // every step done → the frame closes itself as completed on the next look
    const finished = port.call('shop.journey.purchase', {});
    expect(finished['frame']).toBe('completed');
  });

  it('calling ANOTHER journey tool mid-flow switches implicitly (leave + commit)', () => {
    const { session, port } = freshPort();
    port.call('shop.journey.purchase', {});
    const switched = port.call('shop.journey.browse', {});
    expect(switched['ok']).toBe(true);
    expect(session.journeyFrame()!.journeyId).toBe('browse');
    expect(session.frames().at(-1)).toMatchObject({ journeyId: 'purchase', status: 'cancelled' });
  });

  it('an unknown step returns the step list — a structured correction, not a crash', () => {
    const { port } = freshPort();
    const result = port.call('shop.journey.purchase', { step: 'ghost' });
    expect(result).toMatchObject({ ok: false, reason: 'UNKNOWN_STEP' });
    expect(result['steps']).toContain('catalog.add-to-cart');
  });
});

describe('a typed graph keeps its types all the way to the serving door', () => {
  it('whats_here returns the brief + actions + journeys, all as data', () => {
    const { port } = freshPort();
    const here = port.call('shop.whats_here');
    expect(here['ok']).toBe(true);
    expect(here['brief']).toContain('You are on: catalog.');
    expect((here['actions'] as Array<{ action: string }>).map((a) => a.action)).toEqual([
      'catalog.add-to-cart',
      'catalog.go-checkout',
    ]);
    expect((here['journeys'] as Array<{ journey: string }>).map((s) => s.journey)).toEqual(['purchase', 'browse']);
  });

  it('do_action fires loose actions with the same confirm gate and suffix resolution', () => {
    const { port } = freshPort();
    const fired = port.call('shop.do_action', { action: 'add-to-cart' });
    expect(fired['did']).toBe('catalog.add-to-cart');
    const missing = port.call('shop.do_action', { action: 'ghost' });
    expect(missing).toMatchObject({ ok: false, reason: 'UNKNOWN_ACTION' });
    const unnamed = port.call('shop.do_action', {});
    expect(unnamed).toMatchObject({ ok: false, reason: 'ACTION_REQUIRED' });
  });

  it('an unknown tool name lists the real tools (self-correcting dispatch)', () => {
    const { port } = freshPort();
    const result = port.call('shop.journey.ghost');
    expect(result).toMatchObject({ ok: false, reason: 'UNKNOWN_TOOL' });
    expect(result['tools']).toContain('shop.journey.purchase');
  });

  it('whats_here {sinceVersion} narrates only the delta — the mixed-initiative resync', () => {
    const { session, port } = freshPort();
    expect(session.fire('catalog.add-to-cart', { source: 'agent' }).ok).toBe(true);
    session.updateState({ cart: ['dress'] });
    const seen = session.version;

    // The USER acts after the agent's last look.
    expect(session.fire('catalog.go-checkout', { source: 'user' }).ok).toBe(true);

    const delta = port.call('shop.whats_here', { sinceVersion: seen });
    expect(delta['ok']).toBe(true);
    expect(delta['brief']).toContain(`Since version ${seen}`);
    expect(delta['brief']).toContain('user fired catalog.go-checkout');
    expect(delta['brief']).not.toContain('agent fired catalog.add-to-cart'); // before the cursor

    // Omitting sinceVersion keeps the full-session brief (back-compat).
    const full = port.call('shop.whats_here', {});
    expect(full['brief']).toContain('Session so far');
    expect(full['brief']).toContain('agent fired catalog.add-to-cart');
  });

  it('why {key} serves the causal backward slice, with position data', () => {
    const { session, port } = freshPort();
    expect(session.fire('catalog.add-to-cart', { source: 'agent' }).ok).toBe(true);
    session.updateState({ cart: ['dress'] });

    const why = port.call('shop.why', { key: 'cart' });
    expect(why['ok']).toBe(true);
    expect(why['why']).toContain('add-to-cart'); // the causal writer
    expect(why['youAreOn']).toBe('catalog');
    expect(typeof why['version']).toBe('number');

    const missing = port.call('shop.why', {});
    expect(missing).toMatchObject({ ok: false, reason: 'KEY_REQUIRED' });
  });
});
