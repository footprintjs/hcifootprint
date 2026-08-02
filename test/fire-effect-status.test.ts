/**
 * P0-1 + P0-2 — "was it actually done?", answered honestly.
 *
 * The reported bug: fire() returned settlement:'settled' before the deferred
 * handler had run, so a caller (and a Mode B planner) read a queued action as a
 * completed one — and a handler that returned {ok:false,error} instead of
 * throwing was recorded as a SUCCESSFUL transition carrying its own failure as
 * `produced` data. fire() stays synchronous; it now says what it knows
 * (`effectStatus`) and hands over a promise for what it does not (`whenSettled`).
 *
 * MUTATION PROOFS (these fail against 0.3.0, not just on the new fields):
 * - 'settled is not performed' — the sync arm-4 pin.
 * - 'a returned failure takes exactly the throw path' + the navigation-claim
 *   rollback: outcome flips and `produced` stays empty where 0.3.0 committed
 *   the transition and stamped the failure object as data.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { Binding, FireResult, NavigationGraph } from '../src/index.js';

const binding: Binding = { kind: 'element', locator: { role: 'button', name: 'B' } };
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** Narrow a FireResult to its success arm (throws loudly on a refusal). */
function fired(result: FireResult): Extract<FireResult, { ok: true }> {
  if (!result.ok) throw new Error(`fire was refused: ${result.reason}`);
  return result;
}

function app(): NavigationGraph {
  return buildNavigationGraph('app', {
    pages: {
      a: {},
      b: {},
    },
    actions: {
      save: { on: 'a', does: 'Save the form', binding, writes: ['saved'] },
      archive: { on: 'a', does: 'Archive it', binding, writes: ['archived'] },
      ping: { on: 'a', does: 'Ping — declares no writes', binding },
      go: { on: 'a', does: 'Go to b', binding, goTo: 'b' },
    },
  });
}

// ---------------------------------------------------------------------------
// The synchronous table — what fire() knows at the instant it returns
// ---------------------------------------------------------------------------

describe('effectStatus at return time — fire() reports only what it knows', () => {
  it('a tap-mode fire is pending: the app’s report will decide', () => {
    const session = app().createSession({ node: 'a', state: { saved: false } });
    session.registerHandlers({ group: 'g', handlers: { save: () => undefined } });
    const f = fired(session.fire('save', { source: 'agent' }));
    expect(f.settlement).toBe('awaiting-state');
    expect(f.effectStatus).toBe('pending');
  });

  it('a tapless fire with a handler is pending: the handler has not run yet', () => {
    const session = app().createSession({ node: 'a' }); // no state ⇒ no state tap
    session.registerHandlers({ group: 'g', handlers: { save: () => undefined } });
    const f = fired(session.fire('save', { source: 'agent' }));
    expect(f.settlement).toBe('awaiting-state'); // 0.3.0 meaning, unchanged
    expect(f.effectStatus).toBe('pending');
  });

  it('a tapless fire with NOTHING bound is unobservable, and already final', async () => {
    const session = app().createSession({ node: 'a' });
    // source 'user' = the app reporting its own motion; nothing of ours runs.
    const f = fired(session.fire('save', { source: 'user' }));
    expect(f.settlement).toBe('settled');
    expect(f.effectStatus).toBe('unobservable');
    // Already at rest — no tick, no report, no waiting.
    const settled = await f.whenSettled;
    expect(settled).toMatchObject({ effectStatus: 'unobservable', outcome: 'committed' });
  });

  it('SETTLED IS NOT PERFORMED: a no-writes fire commits, but its handler has not run', async () => {
    // The P0-1 pin. 0.3.0 said settlement:'settled' here and had no way to add
    // "…by us, later" — so a caller read a queued handler as a done deed.
    const ran: string[] = [];
    const session = app().createSession({ node: 'a', state: {} });
    session.registerHandlers({ group: 'g', handlers: { ping: () => ran.push('ping') } });
    const f = fired(session.fire('ping', { source: 'agent' }));
    expect(f.settlement).toBe('settled'); // a commit bundle exists…
    expect(f.effectStatus).toBe('pending'); // …and nobody has done anything yet
    expect(ran).toEqual([]); // proof the handler really had not run
    await flush();
    expect(ran).toEqual(['ping']);
    expect((await f.whenSettled).effectStatus).toBe('performed');
  });

  it('a no-writes fire with nothing bound is unobservable', () => {
    const session = app().createSession({ node: 'a', state: {} });
    const f = fired(session.fire('ping', { source: 'user' }));
    expect(f.settlement).toBe('settled');
    expect(f.effectStatus).toBe('unobservable');
  });

  it('record-only (invoke:false) is pending, then performed when the app reports', async () => {
    const session = app().createSession({ node: 'a', state: { saved: false } });
    session.registerHandlers({ group: 'g', handlers: { save: () => undefined } });
    // The DOM sensor's mode: the browser already ran the app's onClick.
    const f = fired(session.fire('save', { source: 'user', invoke: false }));
    expect(f.effectStatus).toBe('pending');
    session.updateState({ saved: true });
    const settled = await f.whenSettled;
    expect(settled.effectStatus).toBe('performed');
    expect(settled.transition.effectVerified).toBe(true);
  });

  it('an allowed unmaterialized tour fire is unobservable, with its no-op marks intact', async () => {
    const session = app().createSession({
      node: 'a',
      state: { saved: false },
      allowUnmaterializedFires: true,
    });
    const f = fired(session.fire('save', { source: 'agent' })); // nothing bound
    expect(f).toMatchObject({ settlement: 'settled', executed: false, materialized: false });
    expect(f.effectStatus).toBe('unobservable'); // never 'performed': nothing ran
    expect((await f.whenSettled).effectStatus).toBe('unobservable');
    expect(session.pending()).toEqual([]); // and it never pends (0.3.0 rule, unchanged)
  });
});

// ---------------------------------------------------------------------------
// whenSettled — the answer that arrives later
// ---------------------------------------------------------------------------

describe('whenSettled — how the fire came to rest', () => {
  it('a handler that returns data performs, and its data rides the settlement', async () => {
    const session = app().createSession({ node: 'a' }); // tapless: completion IS the signal
    session.registerHandlers({ group: 'g', handlers: { save: () => ({ id: 'row-1' }) } });
    const f = fired(session.fire('save', { source: 'agent' }));
    const settled = await f.whenSettled;
    expect(settled.effectStatus).toBe('performed');
    expect(settled.outcome).toBe('committed');
    expect(settled.produced).toEqual({ id: 'row-1' });
    // Two orthogonal axes, both honest: our side ran; the declared write was
    // never observed, because no report exists to observe it with.
    expect(settled.transition.effectVerified).toBe('unobservable');
  });

  it('carries a COPY of the transition — a consumer cannot rewrite the trace', async () => {
    const session = app().createSession({ node: 'a', state: {} });
    session.registerHandlers({ group: 'g', handlers: { ping: () => undefined } });
    const f = fired(session.fire('ping', { source: 'agent' }));
    const settled = await f.whenSettled;
    settled.transition.outcome = 'superseded';
    expect(session.transitions()[0].outcome).toBe('committed');
  });

  it('a throwing handler refuses: the pending record is rejected', async () => {
    const warnings: string[] = [];
    const session = app().createSession({
      node: 'a',
      state: { saved: false },
      onWarn: (m) => warnings.push(m),
    });
    session.registerHandlers({
      group: 'g',
      handlers: {
        save: () => {
          throw new Error('api down');
        },
      },
    });
    const f = fired(session.fire('save', { source: 'agent' }));
    const settled = await f.whenSettled;
    expect(settled.effectStatus).toBe('refused');
    expect(settled.outcome).toBe('rejected');
    expect(String(settled.error)).toContain('api down');
    expect(warnings.some((w) => w.includes('threw:'))).toBe(true);
  });

  it('a throwing handler on a committed navigation claim refuses AND rolls back', async () => {
    const session = app().createSession({ node: 'a', state: {}, onWarn: () => undefined });
    session.registerHandlers({
      group: 'g',
      handlers: {
        go: () => {
          throw new Error('router crashed');
        },
      },
    });
    const f = fired(session.fire('go', { source: 'agent' }));
    expect(session.node).toBe('b'); // the claim moved the cursor…
    const settled = await f.whenSettled;
    expect(settled.effectStatus).toBe('refused');
    expect(settled.outcome).toBe('rolled-back'); // …and the failure is not a success
    expect(session.node).toBe('a'); // cursor walked home (0.3.0 behaviour, kept)
  });

  it('an evidence-backed commit STANDS while the invocation is still refused', async () => {
    // The two truths in one record: the state report proves the effect landed,
    // the throw proves our handler failed. Neither is averaged away — and the
    // settlement was already answered 'performed' before the throw arrived.
    const session = app().createSession({ node: 'a', state: {}, onWarn: () => undefined });
    session.registerHandlers({
      group: 'g',
      handlers: {
        save: () => {
          session.updateState({ saved: true }); // real report, settles synchronously
          throw new Error('post-report cleanup failed');
        },
      },
    });
    const f = fired(session.fire('save', { source: 'agent' }));
    const settled = await f.whenSettled;
    expect(settled.effectStatus).toBe('performed'); // first settlement wins
    expect(settled.outcome).toBe('committed');
    expect(session.transitions()[0].outcome).toBe('committed'); // the commit stands
  });

  it('reject() refuses; reject({outcome:"superseded"}) is unobservable, not a verdict', async () => {
    const session = app().createSession({ node: 'a', state: { saved: false } });
    const first = fired(session.fire('save', { source: 'user', invoke: false }));
    session.reject(first.transition.id);
    expect(await first.whenSettled).toMatchObject({ effectStatus: 'refused', outcome: 'rejected' });

    const second = fired(session.fire('save', { source: 'user', invoke: false }));
    session.reject(second.transition.id, { outcome: 'superseded' });
    // Superseded = the library STOPPED TRACKING it. Claiming 'refused' would
    // assert a failure nobody observed.
    expect(await second.whenSettled).toMatchObject({
      effectStatus: 'unobservable',
      outcome: 'superseded',
    });
  });

  it('two pending fires settle in FIFO order, each carrying its own transition', async () => {
    const session = app().createSession({ node: 'a', state: { saved: false, archived: false } });
    const one = fired(session.fire('save', { source: 'user', invoke: false }));
    const two = fired(session.fire('archive', { source: 'user', invoke: false }));

    const order: string[] = [];
    void one.whenSettled.then((s) => order.push(`1:${s.transition.id}`));
    void two.whenSettled.then((s) => order.push(`2:${s.transition.id}`));

    session.updateState({ saved: true }); // bare FIFO: the oldest pending first
    session.updateState({ archived: true });
    await Promise.all([one.whenSettled, two.whenSettled]);
    expect(order).toEqual([`1:${one.transition.id}`, `2:${two.transition.id}`]);
  });

  it('a fire the app never reports on stays unsettled — the honest mirror of pending()', async () => {
    const session = app().createSession({ node: 'a', state: { saved: false } });
    const f = fired(session.fire('save', { source: 'user', invoke: false }));
    await flush();
    const marker = Symbol('still-open');
    expect(await Promise.race([f.whenSettled, Promise.resolve(marker)])).toBe(marker);
    expect(session.pending()).toHaveLength(1); // the record says the same thing
  });
});

// ---------------------------------------------------------------------------
// P0-2 — a handler that fails by RETURNING
// ---------------------------------------------------------------------------

describe('a returned {ok:false} is a failure, not data', () => {
  it('takes exactly the throw path: rejected, no produced data, distinct warning', async () => {
    // MUTATION PROOF. 0.3.0: outcome stayed 'committed'/'pending' and the
    // failure object was stamped onto the record as `produced`.
    const warnings: string[] = [];
    const session = app().createSession({
      node: 'a',
      state: { saved: false },
      onWarn: (m) => warnings.push(m),
    });
    session.registerHandlers({
      group: 'g',
      handlers: { save: () => ({ ok: false, error: 'card declined' }) },
    });
    const f = fired(session.fire('save', { source: 'agent' }));
    await flush();

    // Asserted on the RECORD first, so this proof does not lean on the new
    // fields at all: 0.3.0 left this transition 'pending' with the failure
    // object stamped on as `produced`.
    const record = session.transitions().find((t) => t.id === f.transition.id)!;
    expect(record.outcome).toBe('rejected');
    expect(record.produced).toBeUndefined(); // a refusal is never planner-visible data
    expect(session.producedFor(f.transition.id)).toBeUndefined();
    expect(session.pending()).toEqual([]); // not stuck, exactly like a throw
    // Distinguishable in the log: protocol refusal vs exception.
    expect(warnings.some((w) => w.includes('returned failure: card declined'))).toBe(true);
    expect(warnings.some((w) => w.includes('threw:'))).toBe(false);

    const settled = await f.whenSettled;
    expect(settled.effectStatus).toBe('refused');
    expect(settled.outcome).toBe('rejected');
    expect(settled.error).toBe('card declined');
    expect(settled.produced).toBeUndefined();
  });

  it('rolls back a committed navigation claim, same as a throw', async () => {
    const session = app().createSession({ node: 'a', state: {}, onWarn: () => undefined });
    session.registerHandlers({ group: 'g', handlers: { go: () => ({ ok: false }) } });
    const f = fired(session.fire('go', { source: 'agent' }));
    expect(session.node).toBe('b'); // the claim moved the cursor…
    await flush();
    // Record-level again — 0.3.0 kept this committed and stayed on 'b'.
    expect(session.transitions()[0].outcome).toBe('rolled-back');
    expect(session.transitions()[0].produced).toBeUndefined();
    expect(session.node).toBe('a');

    const settled = await f.whenSettled;
    expect(settled.effectStatus).toBe('refused');
    expect(settled.outcome).toBe('rolled-back');
    expect(settled.error).toEqual({ ok: false }); // no named error ⇒ the object is the story
  });

  it('leaves the gap ledger alone — gaps record refusals to fire, not handler failures', async () => {
    const session = app().createSession({
      node: 'a',
      state: { saved: false },
      onWarn: () => undefined,
    });
    session.registerHandlers({ group: 'g', handlers: { save: () => ({ ok: false, error: 'nope' }) } });
    const f = fired(session.fire('save', { source: 'agent' }));
    await f.whenSettled;
    expect(session.gaps()).toEqual([]); // exact parity with the throw path
  });

  it('still keeps ordinary returns as data — {ok:true} and error-only objects', async () => {
    const session = app().createSession({ node: 'a' });
    session.registerHandlers({
      group: 'g',
      handlers: {
        save: () => ({ ok: true, id: 'row-9' }),
        archive: () => ({ error: 'shown to the user, not a protocol refusal' }),
      },
    });
    const ok = fired(session.fire('save', { source: 'agent' }));
    const errorShaped = fired(session.fire('archive', { source: 'agent' }));
    expect((await ok.whenSettled).produced).toEqual({ ok: true, id: 'row-9' });
    expect((await ok.whenSettled).effectStatus).toBe('performed');
    expect((await errorShaped.whenSettled).effectStatus).toBe('performed');
    expect((await errorShaped.whenSettled).produced).toEqual({
      error: 'shown to the user, not a protocol refusal',
    });
  });
});

// ---------------------------------------------------------------------------
// The wire — where the bug was actually reported from
// ---------------------------------------------------------------------------

describe('Mode B — the planner sees the invocation truth too', () => {
  function port() {
    const graph = buildNavigationGraph('shop', {
      pages: {
        catalog: { actions: { 'add-to-cart': { does: 'Add the dress to the cart', writes: ['cart'] } } },
      },
      journeys: { purchase: { does: 'Buy a dress', steps: ['add-to-cart'] } },
    });
    const session = graph.createSession({ state: { cart: [] }, onWarn: () => undefined });
    session.registerActions('catalog', { handlers: { 'add-to-cart': () => undefined } });
    return serveToAgent(session);
  }

  it('do_action carries effectStatus, and no promise ever crosses the wire', () => {
    const result = port().call('shop.do_action', { action: 'add-to-cart' });
    expect(result).toMatchObject({ ok: true, settlement: 'awaiting-state', effectStatus: 'pending' });
    // Wire safety: structuredClone throws on a Promise, so this is the pin that
    // whenSettled stays in-process while the WORD crosses.
    expect(() => structuredClone(result)).not.toThrow();
  });
});
