/**
 * D11 — on-demand disclosure: serve journeys for planning, expand a journey's
 * tools only on commit, and demote when the world invalidates the journey.
 * Intra-journey dependencies are DERIVED from guards × effects, never authored.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import { shop, initialState, okUpdate, wire } from './fixture.js';
import type { Session } from '../src/index.js';

function loggedInAtCatalog(): Session {
  return shop().createSession({
    node: 'catalog',
    state: { ...initialState, authenticated: true },
  });
}

/**
 * Agent commits in this file wire the journey's ENTRY step first (the 0.3.0
 * `wire` treatment, extended): since the 0.4.x never-trap gate, an agent
 * commit whose entry step cannot materialise refuses ENTRY_NOT_MATERIALIZED
 * instead of opening a frame that could never act.
 */
function commitReady(s: Session): Session {
  wire(s, 'add-to-cart'); // purchase's entry step
  return s;
}

describe('the order a journey’s steps actually unlock in — derived, never authored', () => {
  it('derives step dependencies from effect.writes ∩ guard keys — no authoring', () => {
    const plan = loggedInAtCatalog().journeyPlan('purchase');
    const byId = Object.fromEntries(plan.steps.map((s) => [s.affordanceId, s]));
    // go-to-cart's guard reads cartCount, which add-to-cart declares it writes:
    expect(byId['go-to-cart'].dependsOn).toEqual([
      { affordanceId: 'add-to-cart', viaKeys: ['cartCount'] },
    ]);
    expect(byId['place-order'].dependsOn).toEqual([
      { affordanceId: 'add-to-cart', viaKeys: ['cartCount'] },
    ]);
    // add-to-cart's guard (authenticated) is written by no step in this journey:
    expect(byId['add-to-cart'].dependsOn).toEqual([]);
  });

  it('reports live status: ready / blocked (with failing conditions) / off-node', () => {
    const s = loggedInAtCatalog();
    let byId = Object.fromEntries(s.journeyPlan('purchase').steps.map((st) => [st.affordanceId, st]));
    expect(byId['add-to-cart'].status).toBe('ready');
    expect(byId['go-to-cart'].status).toBe('blocked'); // cartCount 0
    expect(byId['go-to-cart'].blockedOn).toEqual([
      expect.objectContaining({ key: 'cartCount', op: 'gt', result: false }),
    ]);

    s.updateState({ cartCount: 2 }, { stimulus: 'push' });
    byId = Object.fromEntries(s.journeyPlan('purchase').steps.map((st) => [st.affordanceId, st]));
    expect(byId['go-to-cart'].status).toBe('ready');
    expect(byId['place-order'].status).toBe('off-node'); // guard passes, lives on checkout
    expect(byId['place-order'].onNodes).toEqual(['checkout']);
  });

  it('throws on an unknown journey (programmer error)', () => {
    expect(() => loggedInAtCatalog().journeyPlan('ghost')).toThrow(/unknown journey 'ghost'/);
  });
});

describe('committing to a journey, and always being able to walk out of it', () => {
  it('typed rejections: UNKNOWN_JOURNEY, PRECONDITION_FAILED, STALE_CURSOR, FRAME_ALREADY_OPEN', () => {
    const s = commitReady(shop().createSession({ node: 'catalog', state: initialState }));
    expect(s.commitJourney('ghost', {})).toMatchObject({ ok: false, reason: 'UNKNOWN_JOURNEY', known: ['purchase'] });
    expect(s.commitJourney('purchase')).toMatchObject({
      ok: false,
      reason: 'PRECONDITION_FAILED',
      evidence: [expect.objectContaining({ key: 'authenticated', result: false })],
    });

    const v = s.version;
    s.updateState({ authenticated: true }, { stimulus: 'push' });
    expect(s.commitJourney('purchase', { expectedVersion: v })).toMatchObject({ ok: false, reason: 'STALE_CURSOR' });

    expect(s.commitJourney('purchase')).toMatchObject({ ok: true });
    expect(s.commitJourney('purchase')).toMatchObject({ ok: false, reason: 'FRAME_ALREADY_OPEN', journeyId: 'purchase' });
  });

  it('commit and leave both bump the version (the served world changed)', () => {
    const s = commitReady(loggedInAtCatalog());
    const v0 = s.version;
    const committed = s.commitJourney('purchase');
    expect(committed.ok).toBe(true);
    expect(s.version).toBe(v0 + 1);
    s.leaveJourney();
    expect(s.version).toBe(v0 + 2);
    expect(s.journeyFrame()).toBeNull();
  });

  it('tracks fired steps; leaveJourney() auto-detects completed vs cancelled', () => {
    const g = buildNavigationGraph('g', {
      pages: {
        a: {},
      },
      actions: {
        'step-1': {
          on: 'a',
          does: 'Do the one thing',
          binding: { kind: 'element', locator: { role: 'button', name: 'Go' } },
        },
      },
      journeys: {
        'one-step': { does: 'One-step journey', steps: ['step-1'] },
      },
    });

    const cancelled = g.createSession({ node: 'a' });
    // Entry wired (never-trap gate) but never FIRED — that is what cancels.
    wire(cancelled, 'step-1');
    cancelled.commitJourney('one-step');
    expect(cancelled.leaveJourney()!.status).toBe('cancelled'); // nothing fired

    const completed = g.createSession({ node: 'a' });
    completed.registerHandlers({ group: 'app', handlers: { 'step-1': () => undefined } });
    completed.commitJourney('one-step');
    completed.fire('step-1', { source: 'agent' });
    expect(completed.journeyFrame()!.firedSteps).toEqual(['step-1']);
    expect(completed.leaveJourney()!.status).toBe('completed');
    expect(completed.frames().map((f) => f.status)).toEqual(['completed']);
  });

  it('leaveJourney() with no frame open is a null no-op', () => {
    expect(loggedInAtCatalog().leaveJourney()).toBeNull();
  });
});

describe('disclosure — toMCPTools() while a frame is open', () => {
  it('serves ONLY the frame journey\'s fireable steps + escape tools', () => {
    const s = shop().createSession({
      node: 'cart',
      state: { ...initialState, authenticated: true, cartCount: 2 },
    });
    // Full slice at cart: proceed-to-checkout, open-help, go-home
    const before = s.toMCPTools().map((t) => t.name);
    expect(before).toContain('shop.open-help');

    expect(commitReady(s).commitJourney('purchase')).toMatchObject({ ok: true });
    const during = s.toMCPTools().map((t) => t.name);
    expect(during).toContain('shop.proceed-to-checkout'); // frame step, fireable here
    expect(during).toContain('shop.go-home'); // role 'back' = always-served escape
    expect(during).toContain('shop.leave-journey'); // synthetic escape
    expect(during).not.toContain('shop.open-help'); // not in journey, not an escape role
    expect(during).not.toContain('shop.add-to-cart'); // frame step but not on this page

    s.leaveJourney();
    expect(s.toMCPTools().map((t) => t.name)).toContain('shop.open-help'); // full slice restored
  });

  it('the leave-journey descriptor is authored-class text with a no-parameter schema', () => {
    const s = shop().createSession({
      node: 'cart',
      state: { ...initialState, authenticated: true, cartCount: 1 },
    });
    commitReady(s).commitJourney('purchase');
    const leave = s.toMCPTools().find((t) => t.name === 'shop.leave-journey')!;
    expect(leave.description).toContain('Leave the current journey (purchase)');
    expect(leave.inputSchema).toEqual({ type: 'object', properties: {}, additionalProperties: false });
  });

  it("the affordance id 'leave-journey' is reserved at build time", () => {
    expect(() =>
      buildNavigationGraph('g', {
        pages: {
          a: {
            actions: {
              'leave-journey': { does: 'd', binding: { kind: 'element', locator: { role: 'button', name: 'x' } } },
            },
          },
        },
      }),
    ).toThrow(/reserved/);
  });
});

describe('inferred completions surface in the plan', () => {
  it("a user's untracked click inside a frame shows 'inferred-done', never a silent re-fire invitation", () => {
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, authenticated: true } });
    s.registerHandlers({ group: 'g', handlers: { 'add-to-cart': () => 1 } });
    s.commitJourney('purchase');
    // The user clicks the app's own untouched button; only the tap reports:
    okUpdate(s.updateState({ cart: [{ id: 'p1' }], cartCount: 1 }));
    const frame = s.journeyFrame()!;
    expect(frame.firedSteps).toEqual([]); // never advanced on a guess
    expect(frame.inferredSteps).toEqual(['add-to-cart']);
    const step = s.journeyPlan('purchase').steps.find((st) => st.affordanceId === 'add-to-cart')!;
    expect(step.status).toBe('inferred-done');
  });
});

describe('demotion — the world invalidates the committed journey', () => {
  it('a stimulus that breaks the precondition demotes the frame and re-collapses disclosure', () => {
    const s = shop().createSession({
      node: 'cart',
      state: { ...initialState, authenticated: true, cartCount: 2 },
    });
    commitReady(s).commitJourney('purchase');
    expect(s.toMCPTools().map((t) => t.name)).not.toContain('shop.open-help');

    const v = s.version;
    // session expired server-side — the journey's precondition (authenticated) breaks
    okUpdate(s.updateState({ authenticated: false }, { stimulus: 'push' }));
    expect(s.journeyFrame()).toBeNull();
    expect(s.frames().map((f) => f.status)).toEqual(['demoted']);
    expect(s.version).toBeGreaterThan(v + 1); // world change + demotion both bumped
    expect(s.toMCPTools().map((t) => t.name)).toContain('shop.open-help'); // full slice again
  });

  it('a step guard failing does NOT demote — that is normal DAG progress', () => {
    const s = commitReady(loggedInAtCatalog()); // cartCount 0: go-to-cart blocked, precondition holds
    s.commitJourney('purchase');
    okUpdate(s.updateState({ cartCount: 0 }, { stimulus: 'push' }));
    expect(s.journeyFrame()).not.toBeNull();
    expect(s.journeyFrame()!.status).toBe('open');
  });

  it('demotion also triggers when a settled fired transition breaks the precondition', () => {
    const g = buildNavigationGraph('g', {
      pages: {
        a: {},
      },
      actions: {
        logout: {
          on: 'a',
          does: 'Log out',
          binding: { kind: 'element', locator: { role: 'button', name: 'Log out' } },
          writes: ['authenticated'],
        },
        work: {
          on: 'a',
          does: 'Do work',
          binding: { kind: 'element', locator: { role: 'button', name: 'Work' } },
          when: { authenticated: { eq: true } },
        },
      },
      journeys: {
        'work-journey': { does: 'Do the work', steps: ['work'], when: { authenticated: { eq: true } } },
      },
    });
    const s = g.createSession({ node: 'a', state: { authenticated: true } });
    wire(s, 'work'); // entry materialised — the never-trap gate lets the frame open
    s.commitJourney('work-journey');
    s.fire('logout', { source: 'user' }); // user logs out mid-journey
    okUpdate(s.updateState({ authenticated: false }));
    expect(s.journeyFrame()).toBeNull();
    expect(s.frames()[0].status).toBe('demoted');
  });
});
