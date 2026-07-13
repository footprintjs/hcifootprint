/**
 * Mode B — skills as fixed tools. The load-bearing contract: the tool array
 * NEVER changes (prompt-cache stability + plain-MCP compatibility); disclosure
 * rides the RESULT channel as readySteps; the model acts by re-calling the
 * same skill tool with {step}.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, skillsAsTools } from '../src/index.js';
import type { NavigationGraph } from '../src/index.js';

function shopMap(): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: {
      catalog: {
        tools: {
          'add-to-cart': { does: 'Add the selected dress to the cart', writes: ['cart'] },
          'go-checkout': { does: 'Go to checkout', goTo: 'checkout' },
        },
      },
      checkout: {
        tools: {
          'place-order': { does: 'Place the order', confirm: true, writes: ['orders'] },
        },
      },
    },
    skills: {
      purchase: { does: 'Buy a dress end to end', steps: ['add-to-cart', 'go-checkout', 'place-order'] },
      browse: { does: 'Look around the catalog', steps: ['add-to-cart'] },
    },
  });
}

function freshPort() {
  const session = shopMap().createSession({ state: { cart: [] }, onWarn: () => undefined });
  return { session, port: skillsAsTools(session) };
}

describe('the static tool array', () => {
  it('is one tool per skill + whats_here + why + do_action, and NEVER changes across navigation', () => {
    const { session, port } = freshPort();
    const before = JSON.stringify(port.tools());
    expect(port.tools().map((tool) => tool.name)).toEqual([
      'shop.skill.purchase',
      'shop.skill.browse',
      'shop.whats_here',
      'shop.why',
      'shop.do_action',
    ]);

    port.call('shop.skill.purchase', {}); // open a frame
    session.sync('checkout'); // navigate
    session.updateState({ cart: ['dress'] }, { stimulus: 'push' }); // world moves

    expect(JSON.stringify(port.tools())).toBe(before); // identical BYTES — the cache contract
  });

  it('every skill tool carries the same static {step, input, confirm, instance} schema', () => {
    const { port } = freshPort();
    const tool = port.tools().find((candidate) => candidate.name === 'shop.skill.purchase')!;
    expect(Object.keys((tool.inputSchema as { properties: object }).properties).sort()).toEqual([
      'confirm',
      'input',
      'instance',
      'step',
    ]);
  });
});

describe('disclosure in the result channel', () => {
  it('opening a skill returns readySteps as DATA, never new tools', () => {
    const { port } = freshPort();
    const result = port.call('shop.skill.purchase', {});
    expect(result['ok']).toBe(true);
    expect(result['frame']).toBe('open');
    const ready = result['readySteps'] as Array<{ step: string; does: string }>;
    expect(ready.map((step) => step.step)).toEqual(['catalog.add-to-cart', 'catalog.go-checkout']);
    expect(result['howToAct']).toContain('step');
  });

  it('acting = re-calling the SAME tool with {step}; the result advances readySteps', () => {
    const { session, port } = freshPort();
    port.call('shop.skill.purchase', {});
    const step1 = port.call('shop.skill.purchase', { step: 'catalog.add-to-cart' });
    expect(step1['did']).toBe('catalog.add-to-cart');
    session.updateState({ cart: ['dress'] }); // the app's tap settles the pending write
    const step2 = port.call('shop.skill.purchase', { step: 'go-checkout' }); // suffix resolves
    expect(step2['did']).toBe('catalog.go-checkout');
    expect(step2['youAreOn']).toBe('checkout'); // navigation claim moved the cursor
  });

  it('high-effect steps stop at needs-confirm and never auto-cross', () => {
    const { session, port } = freshPort();
    port.call('shop.skill.purchase', {});
    port.call('shop.skill.purchase', { step: 'add-to-cart' });
    session.updateState({ cart: ['dress'] });
    port.call('shop.skill.purchase', { step: 'go-checkout' });

    const stopped = port.call('shop.skill.purchase', { step: 'place-order' });
    expect(stopped).toMatchObject({ ok: false, judgment: 'needs-confirm' });

    const fired = port.call('shop.skill.purchase', { step: 'place-order', confirm: true });
    expect(fired['did']).toBe('checkout.place-order');
    session.updateState({ orders: ['o-1'] });
    // every step done → the frame closes itself as completed on the next look
    const finished = port.call('shop.skill.purchase', {});
    expect(finished['frame']).toBe('completed');
  });

  it('calling ANOTHER skill tool mid-flow switches implicitly (leave + commit)', () => {
    const { session, port } = freshPort();
    port.call('shop.skill.purchase', {});
    const switched = port.call('shop.skill.browse', {});
    expect(switched['ok']).toBe(true);
    expect(session.skillFrame()!.skillId).toBe('browse');
    expect(session.frames().at(-1)).toMatchObject({ skillId: 'purchase', status: 'cancelled' });
  });

  it('an unknown step returns the step list — a structured correction, not a crash', () => {
    const { port } = freshPort();
    const result = port.call('shop.skill.purchase', { step: 'ghost' });
    expect(result).toMatchObject({ ok: false, reason: 'UNKNOWN_STEP' });
    expect(result['steps']).toContain('catalog.add-to-cart');
  });
});

describe('the generics', () => {
  it('whats_here returns the brief + actions + skills, all as data', () => {
    const { port } = freshPort();
    const here = port.call('shop.whats_here');
    expect(here['ok']).toBe(true);
    expect(here['brief']).toContain('You are on: catalog.');
    expect((here['actions'] as Array<{ action: string }>).map((a) => a.action)).toEqual([
      'catalog.add-to-cart',
      'catalog.go-checkout',
    ]);
    expect((here['skills'] as Array<{ skill: string }>).map((s) => s.skill)).toEqual(['purchase', 'browse']);
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
    const result = port.call('shop.skill.ghost');
    expect(result).toMatchObject({ ok: false, reason: 'UNKNOWN_TOOL' });
    expect(result['tools']).toContain('shop.skill.purchase');
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
