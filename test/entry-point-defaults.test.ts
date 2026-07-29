/**
 * Entry points refuse in THIS library's voice, never in JavaScript's.
 *
 * A JS caller is not held to the TypeScript signature, so every public entry
 * point they can reach with fewer arguments than it declares has to survive
 * that call. `session.fire('page.tool')` did not: it read `opts.source` off
 * `undefined` and died with a TypeError (a production integration hit exactly
 * that line in the shipped bundle).
 *
 * Two rules are proved here, and both are mutation proofs against pre-fix code:
 *
 *   1. fire() is RUNTIME-optional and TYPE-required. The missing principal
 *      reads as 'agent' — the assumption commitSkill()/confirmAsk() already
 *      publish — and never as 'user': an unattributed machine action must not
 *      enter the gap ledger or the commit log as a human one, and the
 *      never-trap gate (which only refuses agents) must not be disarmed by a
 *      caller who simply said nothing.
 *   2. Where no default can honestly be invented (a flat graph's starting
 *      page), the refusal stays — but it is this library's typed sentence,
 *      naming the pages the caller could have started on.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import type { FireOptions, FireResult } from '../src/index.js';
import { initialState, shop, wire } from './fixture.js';

/**
 * The caller the types never reached: one argument, no options object at all.
 * Not `@ts-expect-error` — this is a real JS call shape, and modelling it as
 * one keeps the test honest about who it speaks for.
 */
function asJsCaller(session: unknown): {
  fire(affordanceId: string, opts?: unknown): FireResult;
} {
  return session as { fire(affordanceId: string, opts?: unknown): FireResult };
}

const okFire = (r: FireResult) => {
  if (!r.ok) throw new Error(`fire refused: ${JSON.stringify(r)}`);
  return r;
};

describe('fire() with no options — the JS caller the types never reached', () => {
  it('does not crash, and charges the action to the agent (never the human)', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    wire(s, 'login');

    const result = okFire(asJsCaller(s).fire('login'));

    expect(result.transition.cause).toMatchObject({
      kind: 'fired',
      affordanceId: 'login',
      principal: 'agent',
    });
    // The provenance the session serves back agrees with the record it kept.
    expect(s.transitions()[0].cause.principal).toBe('agent');
  });

  it('refusals carry the same assumed principal into the gap ledger', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });

    const result = asJsCaller(s).fire('ghost');

    expect(result).toMatchObject({ ok: false, reason: 'UNKNOWN_AFFORDANCE' });
    expect(s.gaps()).toMatchObject([
      { kind: 'fire-rejected', rejectionReason: 'UNKNOWN_AFFORDANCE', principal: 'agent' },
    ]);
  });

  it('keeps the never-trap gate armed: nothing bound is a LOUD refusal, not a success-shaped no-op', () => {
    // Nothing is wired, so firing would execute nothing. Defaulting the source
    // to 'user' would have laundered this into ok:true (the gate only refuses
    // agents) — the one outcome this default exists to prevent.
    const s = shop().createSession({ node: 'catalog', state: initialState });

    const result = asJsCaller(s).fire('login');

    expect(result).toMatchObject({ ok: false, reason: 'NOT_MATERIALIZED', affordanceId: 'login' });
    expect(s.transitions()).toEqual([]);
  });

  it('applies to an options object built at runtime with no source on it', () => {
    // The parameter default cannot see this one: opts EXISTS, `source` does not.
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, authenticated: true } });
    wire(s, 'add-to-cart');

    const result = okFire(asJsCaller(s).fire('add-to-cart', { payload: { productId: 'p1' } }));

    expect(result.transition.cause.principal).toBe('agent');
    expect(result.transition.payload).toEqual({ productId: 'p1' });
  });

  it('an explicit source still wins — the default never overrides what the caller said', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    wire(s, 'login');

    const result = okFire(s.fire('login', { source: 'user' }));

    expect(result.transition.cause.principal).toBe('user');
  });
});

describe('InteractionSession.fire() with no options — the tree gates run first', () => {
  const graph = () =>
    buildNavigationGraph('shop', {
      pages: {
        catalog: { tools: { 'add-to-cart': { does: 'Add the dress to the cart' } } },
        checkout: {
          modals: { 'confirm-order': { tools: { 'place-order': { does: 'Place the order' } } } },
        },
      },
    });

  it('does not crash in the override, and charges the tree-gate refusal to the agent', () => {
    // The modal was never shown: this refusal is raised by the tree override,
    // one frame BEFORE the base fire the first suite covers.
    const session = graph().createSession({ node: 'checkout' });

    const result = asJsCaller(session).fire('checkout.confirm-order.place-order');

    expect(result).toMatchObject({ ok: false, reason: 'NODE_NOT_VISIBLE' });
    expect(session.gaps()).toMatchObject([
      { rejectionReason: 'NODE_NOT_VISIBLE', principal: 'agent' },
    ]);
  });

  it('a wired tool fires through the override and records the agent as principal', () => {
    const session = graph().createSession({ node: 'catalog' });
    session.registerToolGroup('catalog', { handlers: { 'add-to-cart': () => undefined } });

    const result = okFire(asJsCaller(session).fire('catalog.add-to-cart'));

    expect(result.transition.cause.principal).toBe('agent');
  });
});

describe('createSession() with no options — no default can be invented, so the refusal speaks', () => {
  it('names the pages it could have started on instead of dying with a TypeError', () => {
    const flat = shop();

    let thrown: unknown;
    try {
      (flat as { createSession: (opts?: unknown) => unknown }).createSession();
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(TypeError); // the pre-fix failure mode
    expect(String(thrown)).toMatch(/unknown starting node/);
    expect(String(thrown)).toMatch(/Known pages: catalog, cart, checkout/);
  });

  it('the tree API needs no options at all — it starts on the first declared page', () => {
    const session = buildNavigationGraph('shop', {
      pages: { catalog: { tools: { 'add-to-cart': { does: 'Add' } } }, cart: {} },
    }).createSession();

    expect(session.node).toBe('catalog');
  });
});

// The type-level half of the change. These are assertions, not dead code:
// `npm run typecheck` compiles this file, so `source` quietly becoming
// optional — which would drop the pressure on typed callers to name the
// principal — is a build failure.

/** A TYPED caller must still name the principal — the runtime default is for JS only. */
const named: FireOptions = { source: 'agent' };
void named;
// @ts-expect-error `source` is required in TypeScript, and stays required
const unnamed: FireOptions = { payload: 1 };
void unnamed;
