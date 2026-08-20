/**
 * The sensing half: the sense-only rung, the correlation window's two edges, and
 * the budgets that keep an anchor honest under churn.
 *
 * The budgets are the part worth reading twice. A virtualized list under an
 * anchor can produce thousands of changes for one action; a capture that carried
 * them all would be a memory leak with a timestamp, and one that silently kept
 * the first fifty would be a lie by omission. So the record says how many were
 * dropped, and the trail says which shape it used.
 *
 * MUTATION PROOF: none of this exists before D21. Sharper ones are named at the
 * cases — delete the turn-adoption in `open()` (contextful/anchor.ts) and "the
 * click that CAUSED the call is inside the window" goes red with an empty trail.
 */
import { describe, expect, it } from 'vitest';
import { contextful } from '../src/index.js';
import type { TransitionRecord } from '../src/index.js';
import { CHANGE_BUDGET, EVENT_BUDGET, INLINE_EVENTS } from '../src/contextful/anchor.js';
import {
  AnchorHost,
  FakeAnchor,
  added,
  agentClick,
  humanClick,
  humanType,
  node,
  settle,
  shop,
} from './contextful-fixture.js';

function rowFor(rows: readonly TransitionRecord[], actionId: string): TransitionRecord | undefined {
  return [...rows].reverse().find((row) => row.cause.affordanceId === actionId);
}

describe('sense-only — the rung below a registered handler', () => {
  it('records a trusted click as a record-only fire, and performs nothing', async () => {
    const { session } = shop();
    const anchor = new FakeAnchor();
    session.sense('note', contextful.sense(anchor));

    humanClick(anchor);
    await settle();

    const row = rowFor(session.transitions(), 'note')!;
    expect(row.cause).toMatchObject({ kind: 'fired', principal: 'user', inferred: true });
    expect(row.captured?.sensed?.trail).toMatchObject({ shape: 'inline' });
    // Nothing was invoked: the library has no handler here and never claims one.
    expect(row.captured?.after?.effectStatus).toBe('unobservable');
  });

  it('ignores an UNTRUSTED click — an agent driving the page is not a person', async () => {
    const { session } = shop();
    const anchor = new FakeAnchor();
    session.sense('note', contextful.sense(anchor));

    agentClick(anchor);
    await settle();

    expect(session.transitions().filter((t) => t.cause.kind === 'fired')).toHaveLength(0);
  });

  it('does not read a value: typing inside the anchor is not the action happening', async () => {
    const { session } = shop();
    const anchor = new FakeAnchor();
    session.sense('note', contextful.sense(anchor));

    humanType(anchor);
    await settle();

    expect(session.transitions().filter((t) => t.cause.kind === 'fired')).toHaveLength(0);
  });

  it('releases the anchor, token-identity, when the declaration is released', async () => {
    const { session } = shop();
    const anchor = new FakeAnchor();
    const release = session.sense('note', contextful.sense(anchor));
    expect(anchor.listenerCount).toBe(3);

    release();
    release(); // idempotent, like every other release pair in this library
    humanClick(anchor);
    await settle();

    expect(anchor.listenerCount).toBe(0);
    expect(session.transitions().filter((t) => t.cause.kind === 'fired')).toHaveLength(0);
  });

  it('keeps the NEWEST declaration when an older one is released after it', async () => {
    const { session } = shop();
    const first = new FakeAnchor();
    const second = new FakeAnchor();
    const releaseFirst = session.sense('note', contextful.sense(first));
    const releaseSecond = session.sense('note', contextful.sense(second));

    releaseFirst(); // token identity: the older release must not take the newer one
    humanClick(second);
    await settle();

    expect(session.transitions().filter((t) => t.cause.kind === 'fired')).toHaveLength(1);
    releaseSecond();
  });

  it('answers an id the graph does not have with that fire’s own typed refusal', async () => {
    const { session } = shop();
    const anchor = new FakeAnchor();
    session.sense('not-an-action', contextful.sense(anchor));

    expect(() => humanClick(anchor)).not.toThrow();
    await settle();

    expect(
      session
        .gaps()
        .some((gap) => gap.kind === 'fire-rejected' && gap.rejectionReason === 'UNKNOWN_AFFORDANCE'),
    ).toBe(true);
  });

  it('holds the window open until the app reports, on an action that declares writes', async () => {
    const { session } = shop();
    const host = new AnchorHost();
    const anchor = new FakeAnchor(host);
    session.sense('add-to-cart', contextful.sense(anchor, { expect: { name: 'a row appeared', matches: (c) => c.kind === 'added' } }));

    humanClick(anchor);
    await settle();
    // Still pending: the app's own store has not reported the delta yet, so the
    // action has not come to rest and its window is still taking evidence.
    expect(rowFor(session.transitions(), 'add-to-cart')?.captured?.sensed).toBeUndefined();

    host.mutate(added());
    session.updateState({ cart: 1 });
    await settle();

    const sensed = rowFor(session.transitions(), 'add-to-cart')?.captured?.sensed;
    expect(sensed?.changes).toBe(1);
    expect(sensed?.effect?.status).toBe('observed');
  });
});

describe('the correlation window — where it starts and where it stops', () => {
  it('adopts the click that CAUSED the call: capture phase runs before the app’s onClick', async () => {
    const { session } = shop();
    const anchor = new FakeAnchor();
    const note = contextful(() => undefined, { watch: true, anchor });
    session.registerActions('catalog', { handlers: { note } });

    // One task: the browser delivers the click, then the app's handler calls the
    // wrapped function.
    humanClick(anchor, node('button', { role: 'button' }));
    note();
    await settle();

    const trail = rowFor(session.transitions(), 'note')?.captured?.sensed?.trail;
    expect(trail?.shape === 'inline' && trail.events).toEqual([
      expect.objectContaining({ type: 'click', targetRole: 'button', targetTag: 'button' }),
    ]);
  });

  it('drops page churn that happens while NO action is in flight', async () => {
    const { session } = shop();
    const host = new AnchorHost();
    const anchor = new FakeAnchor(host);
    const note = contextful(() => undefined, { watch: true, anchor });
    session.registerActions('catalog', { handlers: { note } });

    host.mutate(added(), added()); // a re-render nobody asked about
    note();
    await settle();

    expect(rowFor(session.transitions(), 'note')?.captured?.sensed?.changes).toBe(0);
  });

  it('ends one action’s window when the next action opens its own', async () => {
    const { session } = shop();
    const host = new AnchorHost();
    const anchor = new FakeAnchor(host);
    const note = contextful(() => undefined, { watch: true, anchor });
    session.registerActions('catalog', { handlers: { note } });

    note();
    note();
    host.mutate(added());
    await settle();

    const rows = session.transitions().filter((t) => t.cause.affordanceId === 'note');
    expect(rows).toHaveLength(2);
    // The change landed inside the SECOND window; the first one had already been
    // finalized by the act that followed it.
    expect(rows[0]?.captured?.sensed?.changes).toBe(0);
    expect(rows[1]?.captured?.sensed?.changes).toBe(1);
  });

  it('stops taking evidence once the anchor is released', async () => {
    const { session } = shop();
    const host = new AnchorHost();
    const anchor = new FakeAnchor(host);
    const note = contextful(() => undefined, { watch: true, anchor });
    const handle = session.registerActions('catalog', { handlers: { note } });

    handle.unregister();
    expect(host.connected).toBe(0);
    expect(() => host.mutate(added())).not.toThrow();
    await settle();
  });
});

describe('the budgets — honest degradation, never silence', () => {
  it('examines CHANGE_BUDGET changes and says how many it dropped', async () => {
    const { session } = shop();
    const host = new AnchorHost();
    const anchor = new FakeAnchor(host);
    const note = contextful(() => undefined, { watch: true, anchor });
    session.registerActions('catalog', { handlers: { note } });

    note();
    host.mutate(...Array.from({ length: CHANGE_BUDGET + 3 }, () => added()));
    await settle();

    const sensed = rowFor(session.transitions(), 'note')?.captured?.sensed;
    expect(sensed?.changes).toBe(CHANGE_BUDGET);
    expect(sensed?.changesDropped).toBe(3);
  });

  it('carries a small trail INLINE and says so', async () => {
    const { session } = shop();
    const anchor = new FakeAnchor();
    const note = contextful(() => undefined, { watch: true, anchor });
    session.registerActions('catalog', { handlers: { note } });

    for (let i = 0; i < INLINE_EVENTS; i += 1) humanType(anchor);
    note();
    await settle();

    const row = rowFor(session.transitions(), 'note')!;
    expect(row.captured?.sensed?.trail).toMatchObject({ shape: 'inline' });
    expect(session.sensedTrail(row.id)).toHaveLength(INLINE_EVENTS);
  });

  it('sends a long trail BY REFERENCE, with the count on the record and the events at the door', async () => {
    const { session } = shop();
    const anchor = new FakeAnchor();
    const note = contextful(() => undefined, { watch: true, anchor });
    session.registerActions('catalog', { handlers: { note } });

    for (let i = 0; i < INLINE_EVENTS + 1; i += 1) humanType(anchor);
    note();
    await settle();

    const row = rowFor(session.transitions(), 'note')!;
    expect(row.captured?.sensed?.trail).toEqual({
      shape: 'by-reference',
      count: INLINE_EVENTS + 1,
    });
    expect(session.sensedTrail(row.id)).toHaveLength(INLINE_EVENTS + 1);
    // A copy, never the live array: a caller cannot rewrite the evidence.
    const trail = session.sensedTrail(row.id);
    expect(trail[0]).not.toBe(session.sensedTrail(row.id)[0]);
  });

  it('retains EVENT_BUDGET events per window and counts what it dropped', async () => {
    const { session } = shop();
    const anchor = new FakeAnchor();
    // An action that declares writes stays OPEN until the app's store reports,
    // which is the window long enough for a burst to overflow.
    const add = contextful(() => undefined, { watch: true, anchor });
    session.registerActions('catalog', { handlers: { 'add-to-cart': add } });

    add();
    for (let i = 0; i < EVENT_BUDGET + 2; i += 1) humanType(anchor);
    session.updateState({ cart: 1 });
    await settle();

    const sensed = rowFor(session.transitions(), 'add-to-cart')?.captured?.sensed;
    expect(sensed?.trail).toEqual({ shape: 'by-reference', count: EVENT_BUDGET });
    expect(sensed?.eventsDropped).toBe(2);
  });

  it('refuses a trail it cannot answer for, in words that name what survived', () => {
    const { session } = shop();
    session.registerActions('catalog', { handlers: { note: contextful(() => undefined) } });
    session.fire('note', { source: 'agent' });

    const row = rowFor(session.transitions(), 'note')!;
    expect(() => session.sensedTrail(row.id)).toThrow(/no event trail for/);
    expect(() => session.sensedTrail('nope#0')).toThrow(/only the newest 20 oversized trails/);
  });

  it('keeps the newest oversized trails only — and the record’s own count survives eviction', async () => {
    const { session } = shop();
    const anchor = new FakeAnchor();
    const note = contextful(() => undefined, { watch: true, anchor });
    session.registerActions('catalog', { handlers: { note } });

    for (let fire = 0; fire < 21; fire += 1) {
      for (let i = 0; i < INLINE_EVENTS + 1; i += 1) humanType(anchor);
      note();
      await settle();
    }

    const rows = session.transitions().filter((t) => t.cause.affordanceId === 'note');
    expect(rows[0]?.captured?.sensed?.trail).toEqual({
      shape: 'by-reference',
      count: INLINE_EVENTS + 1,
    });
    // 1.13.0 — an evicted trail says EVICTED (with the surviving count), which
    // a reader can finally tell apart from "this fire never sensed anything".
    expect(() => session.sensedTrail(rows[0]!.id)).toThrow(/EVICTED/);
    expect(() => session.sensedTrail(rows[0]!.id)).toThrow(/21 event\(s\)/);
    expect(session.sensedTrailsDropped()).toBeGreaterThan(0);
    expect(session.sensedTrail(rows[20]!.id)).toHaveLength(INLINE_EVENTS + 1);
  });
});

describe('what the anchor carries', () => {
  it('names an element by its explicit role AND its tag — never by its content', async () => {
    const { session } = shop();
    const host = new AnchorHost();
    const anchor = new FakeAnchor(host);
    const note = contextful(() => undefined, { watch: true, anchor });
    session.registerActions('catalog', { handlers: { note } });

    note();
    humanType(anchor, node('input', { role: 'searchbox' }));
    host.mutate({ type: 'characterData', target: node('span') });
    await settle();

    const sensed = rowFor(session.transitions(), 'note')?.captured?.sensed;
    // The event that arrived DURING the window (typing after the call) is not in
    // the trail — it arrived after the action came to rest — but the change is.
    expect(sensed?.changes).toBe(1);
  });

  it('survives a target the port cannot name at all', async () => {
    const { session } = shop();
    const anchor = new FakeAnchor();
    const note = contextful(() => undefined, { watch: true, anchor });
    session.registerActions('catalog', { handlers: { note } });

    anchor.dispatch({ type: 'click', target: null, isTrusted: true });
    note();
    await settle();

    const trail = rowFor(session.transitions(), 'note')?.captured?.sensed?.trail;
    expect(trail?.shape === 'inline' && trail.events[0]).toEqual({
      type: 'click',
      at: expect.any(Number),
    });
  });
});
