/**
 * D11 — on-demand disclosure: serve skills for planning, expand a skill's
 * tools only on commit, and demote when the world invalidates the skill.
 * Intra-skill dependencies are DERIVED from guards × effects, never authored.
 */
import { describe, expect, it } from 'vitest';
import { skillGraph } from '../src/index.js';
import { shop, initialState, okUpdate } from './fixture.js';
import type { Session } from '../src/index.js';

function loggedInAtCatalog(): Session {
  return shop().createSession({
    node: 'catalog',
    state: { ...initialState, authenticated: true },
  });
}

describe('skillPlan() — the derived dependency DAG', () => {
  it('derives step dependencies from effect.writes ∩ guard keys — no authoring', () => {
    const plan = loggedInAtCatalog().skillPlan('purchase');
    const byId = Object.fromEntries(plan.steps.map((s) => [s.affordanceId, s]));
    // go-to-cart's guard reads cartCount, which add-to-cart declares it writes:
    expect(byId['go-to-cart'].dependsOn).toEqual([
      { affordanceId: 'add-to-cart', viaKeys: ['cartCount'] },
    ]);
    expect(byId['place-order'].dependsOn).toEqual([
      { affordanceId: 'add-to-cart', viaKeys: ['cartCount'] },
    ]);
    // add-to-cart's guard (authenticated) is written by no step in this skill:
    expect(byId['add-to-cart'].dependsOn).toEqual([]);
  });

  it('reports live status: ready / blocked (with failing conditions) / off-node', () => {
    const s = loggedInAtCatalog();
    let byId = Object.fromEntries(s.skillPlan('purchase').steps.map((st) => [st.affordanceId, st]));
    expect(byId['add-to-cart'].status).toBe('ready');
    expect(byId['go-to-cart'].status).toBe('blocked'); // cartCount 0
    expect(byId['go-to-cart'].blockedOn).toEqual([
      expect.objectContaining({ key: 'cartCount', op: 'gt', result: false }),
    ]);

    s.updateState({ cartCount: 2 }, { stimulus: 'push' });
    byId = Object.fromEntries(s.skillPlan('purchase').steps.map((st) => [st.affordanceId, st]));
    expect(byId['go-to-cart'].status).toBe('ready');
    expect(byId['place-order'].status).toBe('off-node'); // guard passes, lives on checkout
    expect(byId['place-order'].onNodes).toEqual(['checkout']);
  });

  it('throws on an unknown skill (programmer error)', () => {
    expect(() => loggedInAtCatalog().skillPlan('ghost')).toThrow(/unknown skill 'ghost'/);
  });
});

describe('commitSkill() / leaveSkill() — the frame lifecycle', () => {
  it('typed rejections: UNKNOWN_SKILL, PRECONDITION_FAILED, STALE_CURSOR, FRAME_ALREADY_OPEN', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    expect(s.commitSkill('ghost', {})).toMatchObject({ ok: false, reason: 'UNKNOWN_SKILL', known: ['purchase'] });
    expect(s.commitSkill('purchase')).toMatchObject({
      ok: false,
      reason: 'PRECONDITION_FAILED',
      evidence: [expect.objectContaining({ key: 'authenticated', result: false })],
    });

    const v = s.version;
    s.updateState({ authenticated: true }, { stimulus: 'push' });
    expect(s.commitSkill('purchase', { expectedVersion: v })).toMatchObject({ ok: false, reason: 'STALE_CURSOR' });

    expect(s.commitSkill('purchase')).toMatchObject({ ok: true });
    expect(s.commitSkill('purchase')).toMatchObject({ ok: false, reason: 'FRAME_ALREADY_OPEN', skillId: 'purchase' });
  });

  it('commit and leave both bump the version (the served world changed)', () => {
    const s = loggedInAtCatalog();
    const v0 = s.version;
    const committed = s.commitSkill('purchase');
    expect(committed.ok).toBe(true);
    expect(s.version).toBe(v0 + 1);
    s.leaveSkill();
    expect(s.version).toBe(v0 + 2);
    expect(s.skillFrame()).toBeNull();
  });

  it('tracks fired steps; leaveSkill() auto-detects completed vs cancelled', () => {
    const g = skillGraph('g')
      .page('a')
      .affordance('step-1', {
        on: 'a',
        description: 'Do the one thing',
        binding: { kind: 'element', locator: { role: 'button', name: 'Go' } },
      })
      .skill('one-step', { description: 'One-step skill', steps: ['step-1'] })
      .build();

    const cancelled = g.createSession({ node: 'a' });
    cancelled.commitSkill('one-step');
    expect(cancelled.leaveSkill()!.status).toBe('cancelled'); // nothing fired

    const completed = g.createSession({ node: 'a' });
    completed.commitSkill('one-step');
    completed.fire('step-1', { source: 'agent' });
    expect(completed.skillFrame()!.firedSteps).toEqual(['step-1']);
    expect(completed.leaveSkill()!.status).toBe('completed');
    expect(completed.frames().map((f) => f.status)).toEqual(['completed']);
  });

  it('leaveSkill() with no frame open is a null no-op', () => {
    expect(loggedInAtCatalog().leaveSkill()).toBeNull();
  });
});

describe('disclosure — toMCPTools() while a frame is open', () => {
  it('serves ONLY the frame skill\'s fireable steps + escape tools', () => {
    const s = shop().createSession({
      node: 'cart',
      state: { ...initialState, authenticated: true, cartCount: 2 },
    });
    // Full slice at cart: proceed-to-checkout, open-help, go-home
    const before = s.toMCPTools().map((t) => t.name);
    expect(before).toContain('shop.open-help');

    expect(s.commitSkill('purchase')).toMatchObject({ ok: true });
    const during = s.toMCPTools().map((t) => t.name);
    expect(during).toContain('shop.proceed-to-checkout'); // frame step, fireable here
    expect(during).toContain('shop.go-home'); // role 'back' = always-served escape
    expect(during).toContain('shop.leave-skill'); // synthetic escape
    expect(during).not.toContain('shop.open-help'); // not in skill, not an escape role
    expect(during).not.toContain('shop.add-to-cart'); // frame step but not on this page

    s.leaveSkill();
    expect(s.toMCPTools().map((t) => t.name)).toContain('shop.open-help'); // full slice restored
  });

  it('the leave-skill descriptor is authored-class text with a no-parameter schema', () => {
    const s = shop().createSession({
      node: 'cart',
      state: { ...initialState, authenticated: true, cartCount: 1 },
    });
    s.commitSkill('purchase');
    const leave = s.toMCPTools().find((t) => t.name === 'shop.leave-skill')!;
    expect(leave.description).toContain('Leave the current skill (purchase)');
    expect(leave.inputSchema).toEqual({ type: 'object', properties: {}, additionalProperties: false });
  });

  it("the affordance id 'leave-skill' is reserved at build time", () => {
    expect(() =>
      skillGraph('g')
        .page('a')
        .affordance('leave-skill', {
          on: 'a',
          description: 'd',
          binding: { kind: 'element', locator: { role: 'button', name: 'x' } },
        }),
    ).toThrow(/reserved/);
  });
});

describe('inferred completions surface in the plan', () => {
  it("a user's untracked click inside a frame shows 'inferred-done', never a silent re-fire invitation", () => {
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, authenticated: true } });
    s.registerTools({ group: 'g', tools: { 'add-to-cart': () => 1 } });
    s.commitSkill('purchase');
    // The user clicks the app's own untouched button; only the tap reports:
    okUpdate(s.updateState({ cart: [{ id: 'p1' }], cartCount: 1 }));
    const frame = s.skillFrame()!;
    expect(frame.firedSteps).toEqual([]); // never advanced on a guess
    expect(frame.inferredSteps).toEqual(['add-to-cart']);
    const step = s.skillPlan('purchase').steps.find((st) => st.affordanceId === 'add-to-cart')!;
    expect(step.status).toBe('inferred-done');
  });
});

describe('demotion — the world invalidates the committed skill', () => {
  it('a stimulus that breaks the precondition demotes the frame and re-collapses disclosure', () => {
    const s = shop().createSession({
      node: 'cart',
      state: { ...initialState, authenticated: true, cartCount: 2 },
    });
    s.commitSkill('purchase');
    expect(s.toMCPTools().map((t) => t.name)).not.toContain('shop.open-help');

    const v = s.version;
    // session expired server-side — the skill's precondition (authenticated) breaks
    okUpdate(s.updateState({ authenticated: false }, { stimulus: 'push' }));
    expect(s.skillFrame()).toBeNull();
    expect(s.frames().map((f) => f.status)).toEqual(['demoted']);
    expect(s.version).toBeGreaterThan(v + 1); // world change + demotion both bumped
    expect(s.toMCPTools().map((t) => t.name)).toContain('shop.open-help'); // full slice again
  });

  it('a step guard failing does NOT demote — that is normal DAG progress', () => {
    const s = loggedInAtCatalog(); // cartCount 0: go-to-cart blocked, precondition holds
    s.commitSkill('purchase');
    okUpdate(s.updateState({ cartCount: 0 }, { stimulus: 'push' }));
    expect(s.skillFrame()).not.toBeNull();
    expect(s.skillFrame()!.status).toBe('open');
  });

  it('demotion also triggers when a settled fired transition breaks the precondition', () => {
    const g = skillGraph('g')
      .page('a')
      .affordance('logout', {
        on: 'a',
        description: 'Log out',
        binding: { kind: 'element', locator: { role: 'button', name: 'Log out' } },
        effect: { writes: ['authenticated'] },
      })
      .affordance('work', {
        on: 'a',
        description: 'Do work',
        binding: { kind: 'element', locator: { role: 'button', name: 'Work' } },
        guard: { authenticated: { eq: true } },
      })
      .skill('work-skill', {
        description: 'Do the work',
        steps: ['work'],
        precondition: { authenticated: { eq: true } },
      })
      .build();
    const s = g.createSession({ node: 'a', state: { authenticated: true } });
    s.commitSkill('work-skill');
    s.fire('logout', { source: 'user' }); // user logs out mid-skill
    okUpdate(s.updateState({ authenticated: false }));
    expect(s.skillFrame()).toBeNull();
    expect(s.frames()[0].status).toBe('demoted');
  });
});
