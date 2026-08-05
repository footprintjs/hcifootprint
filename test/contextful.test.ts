/**
 * D21 — the capture envelope, and the second door it opens.
 *
 * The claim under test, in one line: ONE wrapper at registration, and BOTH ways
 * an action can happen — the agent's `fire()` and the app's own call — land in
 * the same envelope, settle through the same code, and stay severable.
 *
 * MUTATION PROOF: src/contextful/ did not exist before this change and
 * `TransitionRecord.captured` was never written, so every assertion here fails
 * against pre-change source. The sharper proofs are named at their own cases:
 * delete the `assist?.direct` arm of `handlerWillRun` (session.ts) and "a human's
 * click settles like an agent's" goes red with `effectStatus: 'unobservable'`;
 * delete the `invoking()` check in the wrapper and "an agent's fire writes ONE
 * row" goes red with two.
 */
import { describe, expect, it, vi } from 'vitest';
import { contextful } from '../src/index.js';
import type { TransitionRecord } from '../src/index.js';
import { readContextful } from '../src/contextful/contextful.js';
import { FakeAnchor, humanClick, settle, shop, shopGraph } from './contextful-fixture.js';

/** The row one action wrote, newest first. */
function rowFor(rows: readonly TransitionRecord[], actionId: string): TransitionRecord | undefined {
  return [...rows].reverse().find((row) => row.cause.affordanceId === actionId);
}

describe('the envelope — an agent fires a contextful action', () => {
  it('opens with what was true the moment before it ran, before any observer sees the row', () => {
    const { session } = shop();
    const seen: TransitionRecord[] = [];
    session.on('transition', (row) => seen.push(row));
    session.registerActions('catalog', {
      handlers: { 'add-to-cart': contextful(() => undefined, { include: ['qty'] }) },
    });

    session.fire('add-to-cart', { source: 'agent', payload: { qty: 2 } });

    // The FIRST emission already carries it: an observer must never see a
    // contextful row before its own before-block.
    expect(seen[0]?.captured?.before).toMatchObject({
      node: 'catalog',
      cursorVersion: 0,
      guard: [{ key: 'authenticated', held: true }],
      input: { qty: 2 },
    });
    expect(typeof seen[0]?.captured?.before.at).toBe('number');
  });

  it('closes at rest with how it came to rest, and the receipt carries it', async () => {
    const { session } = shop();
    session.registerActions('catalog', { handlers: { 'add-to-cart': contextful(() => undefined) } });

    const result = session.fire('add-to-cart', { source: 'agent' });
    if (!result.ok) throw new Error('the fire was refused');
    session.updateState({ cart: 1 });
    const settlement = await result.whenSettled;

    expect(settlement.effectStatus).toBe('performed');
    // Stamped by the fire itself, so the RECEIPT has it — sensing is the half
    // that lands later, and only on the live record.
    expect(settlement.transition.captured?.after).toMatchObject({
      effectStatus: 'performed',
      outcome: 'committed',
    });
    expect(settlement.transition.captured?.after?.ms).toBeGreaterThanOrEqual(0);
  });

  it('records the failure CLASS when the app throws, and still rejects the row', async () => {
    const { session } = shop();
    session.registerActions('catalog', {
      handlers: {
        'add-to-cart': contextful(() => {
          throw new TypeError('card 4111-1111 declined');
        }),
      },
    });

    const result = session.fire('add-to-cart', { source: 'agent' });
    if (!result.ok) throw new Error('the fire was refused');
    const settlement = await result.whenSettled;

    expect(settlement.effectStatus).toBe('refused');
    expect(result.transition.captured?.failure).toEqual({ errorClass: 'TypeError' });
    expect(result.transition.outcome).toBe('rejected');
  });

  it('writes ONE row: the wrapper stays out of the way of the fire it is already inside', async () => {
    const { session } = shop();
    const handler = vi.fn(() => undefined);
    session.registerActions('catalog', { handlers: { note: contextful(handler) } });

    session.fire('note', { source: 'agent' });
    await settle();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(session.transitions().filter((t) => t.cause.affordanceId === 'note')).toHaveLength(1);
  });

  it('leaves a plain handler alone — no envelope, nothing captured', () => {
    const { session } = shop();
    session.registerActions('catalog', { handlers: { note: () => undefined } });

    session.fire('note', { source: 'agent' });

    expect(rowFor(session.transitions(), 'note')?.captured).toBeUndefined();
  });
});

describe('the second door — the app calls its own action', () => {
  it('records the human call the agent path would have recorded', () => {
    const { session } = shop();
    const add = contextful((input: unknown) => `added ${(input as { qty: number }).qty}`, {
      include: ['qty'],
    });
    session.registerActions('catalog', { handlers: { 'add-to-cart': add } });

    const returned = add({ qty: 3 });

    const row = rowFor(session.transitions(), 'add-to-cart');
    expect(returned).toBe('added 3'); // severable: the app gets its own value back
    expect(row?.cause.principal).toBe('user');
    expect(row?.captured?.before.input).toEqual({ qty: 3 });
    // NOT inferred: the app called its own function, which is an observation.
    expect(row?.cause.inferred).toBeUndefined();
  });

  it("settles like an agent's fire — the app's own function IS the invocation", async () => {
    const { session } = shop();
    const note = contextful(() => 'noted');
    session.registerActions('catalog', { handlers: { note } });

    note();
    await settle();

    const row = rowFor(session.transitions(), 'note');
    expect(row).toBeDefined();
    const settlement = await session.settlementOf(row!.id);
    // MUTATION PROOF: drop the `assist?.direct` arm of handlerWillRun and this
    // reads 'unobservable' — the fire came to rest before the app's own function
    // had started.
    expect(settlement.effectStatus).toBe('performed');
    expect(row?.captured?.after?.effectStatus).toBe('performed');
  });

  it('waits for an async app function before it comes to rest', async () => {
    const { session } = shop();
    let finish!: () => void;
    const note = contextful(async () => {
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      return 'done';
    });
    session.registerActions('catalog', { handlers: { note } });

    const promise = note();
    await settle();
    const row = rowFor(session.transitions(), 'note')!;
    expect(session.settlementIfKnown(row.id)).toBeUndefined();

    finish();
    await promise;
    await settle();
    expect(session.settlementIfKnown(row.id)?.effectStatus).toBe('performed');
  });

  it('attributes a state report the app makes INSIDE its own handler to that row', () => {
    const { session } = shop();
    const add = contextful(() => {
      session.updateState({ cart: 1 });
    });
    session.registerActions('catalog', { handlers: { 'add-to-cart': add } });

    add();

    const row = rowFor(session.transitions(), 'add-to-cart');
    expect(row?.outcome).toBe('committed');
    expect(row?.effectVerified).toBe(true);
  });

  it('captures a thrown failure and rethrows it unchanged', async () => {
    const { session } = shop();
    const boom = new RangeError('nope');
    const note = contextful(() => {
      throw boom;
    });
    session.registerActions('catalog', { handlers: { note } });

    expect(() => note()).toThrow(boom);
    await settle();

    const row = rowFor(session.transitions(), 'note');
    expect(row?.captured?.failure).toEqual({ errorClass: 'RangeError' });
    expect(row?.outcome).toBe('rolled-back');
  });

  it('captures a REJECTED promise the same way, and the app still sees the rejection', async () => {
    const { session } = shop();
    const note = contextful(() => Promise.reject(new Error('later')));
    session.registerActions('catalog', { handlers: { note } });

    await expect(note()).rejects.toThrow('later');
    await settle();

    expect(rowFor(session.transitions(), 'note')?.captured?.failure).toEqual({
      errorClass: 'Error',
    });
  });

  it('a REFUSED fire still runs the app function — deleting the wrapper changes nothing', () => {
    const { session } = shop({ state: { authenticated: false } });
    const ran = vi.fn(() => 'ran anyway');
    const add = contextful(ran);
    session.registerActions('catalog', { handlers: { 'add-to-cart': add } });

    expect(add()).toBe('ran anyway');
    expect(ran).toHaveBeenCalledTimes(1);
    // The refusal is on the ledger; the app's own button is untouched.
    expect(session.gaps().some((gap) => gap.kind === 'fire-rejected')).toBe(true);
  });

  it('is a plain call when no session ever registered it', () => {
    const { session } = shop();
    const bare = contextful((n: number) => n * 2);

    expect(bare(21)).toBe(42);
    expect(session.transitions()).toHaveLength(0);
  });

  it('is a plain call again once its group unregisters', () => {
    const { session } = shop();
    const note = contextful(() => undefined);
    const handle = session.registerActions('catalog', { handlers: { note } });

    handle.unregister();
    note();

    expect(session.transitions()).toHaveLength(0);
  });

  it('files a direct call under the principal the app named', () => {
    const { session } = shop();
    const note = contextful(() => undefined, { principal: 'system' });
    session.registerActions('catalog', { handlers: { note } });

    note();

    expect(rowFor(session.transitions(), 'note')?.cause.principal).toBe('system');
  });

  it('a wrapped action called from INSIDE another action does not join its neighbour', async () => {
    const { session } = shop();
    const note = contextful(() => 'inner');
    const add = contextful(() => note());
    session.registerActions('catalog', { handlers: { note, 'add-to-cart': add } });

    session.fire('add-to-cart', { source: 'agent' });
    await settle();

    // Two actions happened, so two rows — the inner call must not attach itself
    // to the outer fire just because the session is invoking something.
    expect(session.transitions().filter((t) => t.cause.affordanceId === 'note')).toHaveLength(1);
    expect(rowFor(session.transitions(), 'note')?.cause.principal).toBe('user');
  });
});

describe('registration — the brand, and what a mount owes it', () => {
  it('refuses to wrap something that is not a function, in this library’s own voice', () => {
    // @ts-expect-error the refusal is for the JS caller the types never reached.
    expect(() => contextful(undefined)).toThrow(/contextful\(\) takes the handler function/);
  });

  it('refuses to wrap an already-wrapped handler rather than record one act twice', () => {
    const once = contextful(() => undefined);
    expect(() => contextful(once)).toThrow(/already contextful/);
  });

  it('reads no declaration off something that is not a handler at all', () => {
    // The recognition door itself: a registry holding a plain function, or a
    // caller asking about `undefined`, gets absence rather than a guess.
    expect(readContextful(undefined)).toBeUndefined();
    expect(readContextful('not a handler')).toBeUndefined();
    expect(readContextful(() => undefined)).toBeUndefined();
    expect(readContextful(contextful(() => undefined))).toMatchObject({ site: null });
  });

  it('does not double-attach under a StrictMode double mount, and releases on the last unmount', () => {
    const { session } = shop();
    const anchor = new FakeAnchor();
    const note = contextful(() => undefined, { watch: true, anchor });

    const first = session.registerActions('catalog', { handlers: { note } });
    const second = session.registerActions('catalog', { handlers: { note } });
    // click + input + change, ONCE — not once per mount.
    expect(anchor.listenerCount).toBe(3);

    first.unregister();
    expect(anchor.listenerCount).toBe(3); // the survivor is still watching
    second.unregister();
    expect(anchor.listenerCount).toBe(0);
    expect(anchor.host?.connected).toBe(0);
  });

  it('keeps the newest registration wired when an older group releases after it', () => {
    const { session } = shop();
    const note = contextful(() => 'ok');
    const first = session.registerActions('catalog', { handlers: { note } });
    const second = session.registerActions('catalog', { handlers: { note } });

    first.unregister(); // token identity: the older release must not unwire the newer site
    note();

    expect(session.transitions()).toHaveLength(1);
    second.unregister();
  });

  it('says so, once, when watch was asked for and no anchor was handed over', () => {
    const { session, warnings } = shop();
    const note = contextful(() => undefined, { watch: true });

    session.registerActions('catalog', { handlers: { note } });
    session.registerActions('catalog', { handlers: { note } });

    const complaints = warnings.filter((w) => w.includes('no anchor was handed over'));
    expect(complaints).toHaveLength(1);
    expect(complaints[0]).toContain('anchor: () => ref.current');
  });

  it('watches an anchor the app hands over as a GETTER, and calls it only at attach', () => {
    const { session } = shop();
    const anchor = new FakeAnchor();
    const read = vi.fn(() => anchor);
    const note = contextful(() => undefined, { watch: true, anchor: read });

    // SSR: wrapping touches nothing. The getter runs when a session attaches.
    expect(read).not.toHaveBeenCalled();
    const handle = session.registerActions('catalog', { handlers: { note } });
    expect(read).toHaveBeenCalledTimes(1);
    expect(anchor.listenerCount).toBe(3);
    handle.unregister();
  });

  it('follows the control when a re-registration names a DIFFERENT element', () => {
    const { session } = shop();
    const first = new FakeAnchor();
    const second = new FakeAnchor();
    let current = first;
    const note = contextful(() => undefined, { watch: true, anchor: () => current });

    const a = session.registerActions('catalog', { handlers: { note } });
    current = second;
    const b = session.registerActions('catalog', { handlers: { note } });

    expect(first.listenerCount).toBe(0); // the move stopped the old watch
    expect(second.listenerCount).toBe(3);
    a.unregister();
    expect(second.listenerCount).toBe(3); // an older release cannot blind the live one
    b.unregister();
    expect(second.listenerCount).toBe(0);
  });

  it('carries the instance key of the card it was registered on', async () => {
    const session = shopGraph().createSession({
      node: 'orders',
      state: { orderIds: ['o-1', 'o-2'] },
    });
    const cancel = contextful(() => undefined);
    session.registerActions('orders.order-card', {
      instance: 'o-2',
      handlers: { cancel },
    });

    cancel();
    await settle();

    // A repeats row's fire REQUIRES an instance key (INSTANCE_REQUIRED otherwise),
    // and the wrapper carries the one its own registration was made under.
    const row = session.transitions().at(-1);
    expect(row?.cause.affordanceId).toBe('orders.order-card.cancel');
    expect(row?.captured?.after?.effectStatus).toBe('performed');
    expect(session.gaps()).toHaveLength(0);
  });

  it('carries the envelope through the flat registerHandlers door too', () => {
    const { session } = shop();
    session.registerHandlers({ group: 'app', handlers: { note: contextful(() => undefined) } });

    session.fire('note', { source: 'agent' });

    expect(rowFor(session.transitions(), 'note')?.captured?.before.node).toBe('catalog');
  });

  it('carries it through a mount-DECLARED action as well', async () => {
    const { session } = shop();
    session.registerActions('catalog', {
      actions: { print: { does: 'Print the receipt', handler: contextful(() => undefined) } },
    });

    session.fire('catalog.print', { source: 'agent' });
    await settle();

    expect(rowFor(session.transitions(), 'catalog.print')?.captured?.after?.effectStatus).toBe(
      'performed',
    );
  });
});

describe('the anchor is bidirectional', () => {
  it("puts the human's own click in the same envelope as the call it caused", async () => {
    const { session } = shop();
    const anchor = new FakeAnchor();
    const note = contextful(() => undefined, { watch: true, anchor });
    session.registerActions('catalog', { handlers: { note } });

    // The capture-phase listener sees the click first; the app's own onClick
    // then calls the wrapped handler, in the same task.
    humanClick(anchor);
    note();
    await settle();

    const sensed = rowFor(session.transitions(), 'note')?.captured?.sensed;
    expect(sensed?.trail).toMatchObject({ shape: 'inline' });
    expect(sensed?.trail.shape === 'inline' && sensed.trail.events[0]).toMatchObject({
      type: 'click',
      targetTag: 'button',
    });
  });
});
