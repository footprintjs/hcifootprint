/**
 * settlementOf / settlementIfKnown — the settled truth, asked by whoever holds
 * the id.
 *
 * The reported hole: `whenSettled` is a live promise handed to the ONE caller
 * that called fire(). A Mode B agent — and the relay in front of it — hold only
 * a transitionId, so they could never learn how the action came to rest. Their
 * workaround was a transition listener keyed by id with a four-second ceiling,
 * rewriting results on the relay's send path; a mistyped key waited four
 * seconds and then reported a guess.
 *
 * MUTATION PROOFS (each fails if the named line is reverted):
 * - 'answers a fire that came to rest LONG ago' — drop the #settlements write
 *   in #resolveEffect and this throws "no settlement".
 * - 'a fire nothing was bound to run is still answerable' — revert
 *   #settledEffect to a bare settledNow() and this throws.
 * - 'the first settlement is the retained one' — move the retention write
 *   above the latch guard and this reads 'refused'.
 * - 'an INFERRED attribution retains unobservable' — retain 'performed' there
 *   and this reads 'performed' for an action the library never invoked.
 * - 'a detached copy' — hand back the retained object and the second ask
 *   carries the first caller's edit.
 * - the throw arms — return a never-resolving promise instead and every one of
 *   them hangs (which is the failure being fixed).
 * - 'names a fire pending() cannot see' — implement awaitingSettlement() as
 *   `pending().map(p => p.id)` and this reads [] while the handler is running.
 * - 'one list, one law' — point #noSettlementMessage at pending() instead of
 *   the door and this fails: the sentence would name no fire while the door
 *   names a live one.
 */
import { describe, expect, it } from 'vitest';
import { skillGraph } from '../src/index.js';
import type { Binding, FireResult, SkillGraph } from '../src/index.js';

const binding: Binding = { kind: 'element', locator: { role: 'button', name: 'B' } };
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** Narrow a FireResult to its success arm (throws loudly on a refusal). */
function fired(result: FireResult): Extract<FireResult, { ok: true }> {
  if (!result.ok) throw new Error(`fire was refused: ${result.reason}`);
  return result;
}

/** Resolve, or the marker — proof that a promise did NOT have to wait. */
async function immediately<T>(promise: Promise<T>): Promise<T | symbol> {
  const marker = Symbol('still-open');
  return Promise.race([promise, Promise.resolve(marker)]);
}

function app(): SkillGraph {
  return skillGraph('app')
    .page('a')
    .page('b')
    .affordance('save', { on: 'a', description: 'Save the form', binding, effect: { writes: ['saved'] } })
    .affordance('archive', { on: 'a', description: 'Archive it', binding, effect: { writes: ['archived'] } })
    .affordance('ping', { on: 'a', description: 'Ping — declares no writes', binding })
    .build();
}

// ---------------------------------------------------------------------------
// The async door — the same answer whenSettled gives, to anyone holding the id
// ---------------------------------------------------------------------------

describe('settlementOf() — how a fire came to rest, asked later', () => {
  it('an OPEN fire hands back its own latch: one answer, for both doors', async () => {
    const session = app().createSession({ node: 'a', state: { saved: false } });
    const f = fired(session.fire('save', { source: 'user', invoke: false }));
    const asked = session.settlementOf(f.transition.id);

    session.updateState({ saved: true });
    expect((await asked).effectStatus).toBe('performed');
    // Not a second latch: the two doors resolve to the same settlement.
    expect(await asked).toEqual(await f.whenSettled);
  });

  it('answers a fire that came to rest LONG ago — the retention', async () => {
    const session = app().createSession({ node: 'a', state: { saved: false } });
    const f = fired(session.fire('save', { source: 'user', invoke: false }));
    session.updateState({ saved: true });
    await f.whenSettled; // the question closed, the latch is gone

    // Three unrelated things happen; the answer is still there afterwards.
    session.sync('b');
    session.updateState({ archived: true }, { stimulus: 'push' });
    await flush();

    const settled = await immediately(session.settlementOf(f.transition.id));
    expect(settled).toMatchObject({ effectStatus: 'performed', outcome: 'committed' });
  });

  it('a fire nothing was bound to run is still answerable (the born-at-rest arms)', async () => {
    const session = app().createSession({ node: 'a' }); // tapless, nothing registered
    const withWrites = fired(session.fire('save', { source: 'user' }));
    const noWrites = fired(session.fire('ping', { source: 'user' }));

    expect(await immediately(session.settlementOf(withWrites.transition.id))).toMatchObject({
      effectStatus: 'unobservable',
    });
    expect(await immediately(session.settlementOf(noWrites.transition.id))).toMatchObject({
      effectStatus: 'unobservable',
    });
  });

  it('THE FIRST SETTLEMENT IS THE RETAINED ONE — a later failure never rewrites it', async () => {
    // The record moves on (rolled-back); the settlement does not. Both truths
    // stay readable, from the two surfaces that own them.
    const session = app().createSession({ node: 'a', state: {}, onWarn: () => undefined });
    session.registerTools({
      group: 'g',
      tools: {
        save: () => {
          session.updateState({ saved: true }); // real report — settles 'performed'
          throw new Error('post-report cleanup failed');
        },
      },
    });
    const f = fired(session.fire('save', { source: 'agent' }));
    await f.whenSettled;
    await flush();

    expect(await session.settlementOf(f.transition.id)).toMatchObject({
      effectStatus: 'performed',
      outcome: 'committed',
    });
  });

  it('a refusal is retained WITH its reason (capped nowhere in-process)', async () => {
    const session = app().createSession({ node: 'a', state: { saved: false }, onWarn: () => undefined });
    session.registerTools({
      group: 'g',
      tools: {
        save: () => {
          throw new Error('api down');
        },
      },
    });
    const f = fired(session.fire('save', { source: 'agent' }));
    await f.whenSettled;

    const settled = await session.settlementOf(f.transition.id);
    expect(settled.effectStatus).toBe('refused');
    expect(settled.outcome).toBe('rejected');
    expect(String(settled.error)).toContain('api down');
  });

  it('an INFERRED attribution retains unobservable — the library invoked nothing', async () => {
    // Effect-signature inference GUESSES who acted. The writes really landed
    // (the state axis stays true), but nobody called a handler, so claiming
    // 'performed' would launder the guess for whoever asks later.
    const session = app().createSession({ node: 'a', state: { saved: false } });
    session.registerTools({ group: 'g', tools: { save: () => undefined } });
    await flush(); // let the registration's structure row flush first

    const update = session.updateState({ saved: true });
    expect(update.ok).toBe(true);
    const record = update.ok ? update.transition : undefined;
    expect(record?.cause.inferred).toBe(true);
    expect(record?.effectVerified).toBe(true); // the writes DID land

    const settled = await immediately(session.settlementOf(record!.id));
    expect(settled).toMatchObject({ effectStatus: 'unobservable', outcome: 'committed' });
  });

  it('hands back a DETACHED copy — one caller’s edit reaches neither the log nor the next caller', async () => {
    const session = app().createSession({ node: 'a', state: { saved: false } });
    const f = fired(session.fire('save', { source: 'user', invoke: false }));
    session.updateState({ saved: true });
    await f.whenSettled;

    const first = await session.settlementOf(f.transition.id);
    first.transition.outcome = 'superseded';
    first.transition.evidence = [];

    expect(session.transitions()[0].outcome).toBe('committed');
    expect((await session.settlementOf(f.transition.id)).transition.outcome).toBe('committed');
  });

  it('two askers waiting on the SAME open fire cannot edit each other’s answer', async () => {
    const session = app().createSession({ node: 'a', state: { saved: false } });
    const f = fired(session.fire('save', { source: 'user', invoke: false }));
    const relay = session.settlementOf(f.transition.id);
    const poller = session.settlementOf(f.transition.id);

    session.updateState({ saved: true });
    (await relay).transition.outcome = 'superseded';
    expect((await poller).transition.outcome).toBe('committed');
  });

  it('a fire the app never reports on stays OPEN — no fabricated timeout answer', async () => {
    const session = app().createSession({ node: 'a', state: { saved: false } });
    const f = fired(session.fire('save', { source: 'user', invoke: false }));
    await flush();
    // FireSettlement excludes 'pending' by construction, so the only answer
    // this could invent is a guessed 'unobservable'. It waits instead, and
    // pending() is the non-blocking door.
    expect(await immediately(session.settlementOf(f.transition.id))).toBeTypeOf('symbol');
    expect(session.pending().map((p) => p.id)).toEqual([f.transition.id]);
  });
});

// ---------------------------------------------------------------------------
// awaitingSettlement — what is still live, without waiting to find out
// ---------------------------------------------------------------------------

describe('awaitingSettlement() — the fires whose question is still open', () => {
  it('names a fire pending() cannot see: no declared writes, handler still running', async () => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const session = app().createSession({ node: 'a', state: {}, onWarn: () => undefined });
    session.registerTools({ group: 'g', tools: { ping: async () => { await held; } } });
    const f = fired(session.fire('ping', { source: 'agent' }));
    await flush();

    // It really is live: no settlement exists for it yet.
    expect(session.settlementIfKnown(f.transition.id)).toBeUndefined();
    // …and the STATE-report queue is empty, because a fire declaring no writes
    // never joins it. Asked "what is still live?", pending() alone answers
    // "nothing" about an action that is running at that very moment.
    expect(session.pending()).toEqual([]);
    expect(session.awaitingSettlement()).toEqual([f.transition.id]);

    release();
    await f.whenSettled;
    expect(session.awaitingSettlement()).toEqual([]); // the question closed; the list did too
  });

  it('is the SUPERSET: a pending fire is awaiting a settlement too', () => {
    const session = app().createSession({ node: 'a', state: { saved: false } });
    const f = fired(session.fire('save', { source: 'user', invoke: false }));
    expect(session.pending().map((p) => p.id)).toEqual([f.transition.id]);
    expect(session.awaitingSettlement()).toEqual([f.transition.id]);
  });

  it('a fire born at rest never enters it — there is nothing to wait for', () => {
    const session = app().createSession({ node: 'a' }); // tapless, nothing registered
    fired(session.fire('ping', { source: 'user' }));
    fired(session.fire('save', { source: 'user' }));
    expect(session.awaitingSettlement()).toEqual([]);
  });

  it('lists in fire order, so the oldest live action reads first', () => {
    const session = app().createSession({ node: 'a', state: { saved: false, archived: false } });
    const first = fired(session.fire('save', { source: 'user', invoke: false }));
    const second = fired(session.fire('archive', { source: 'user', invoke: false }));
    expect(session.awaitingSettlement()).toEqual([first.transition.id, second.transition.id]);
  });

  it('ONE LIST, ONE LAW: the refusal message names exactly what the door lists', async () => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const session = app().createSession({ node: 'a', state: {}, onWarn: () => undefined });
    session.registerTools({ group: 'g', tools: { ping: async () => { await held; } } });
    fired(session.fire('ping', { source: 'agent' }));
    await flush();

    const live = session.awaitingSettlement();
    expect(live).toHaveLength(1);
    // The sentence a caller reads and the list a caller can query cannot drift.
    for (const id of live) expect(() => session.settlementOf('nope#1')).toThrow(id);
    release();
  });
});

// ---------------------------------------------------------------------------
// The refusals — a teaching throw, never a promise nobody will resolve
// ---------------------------------------------------------------------------

describe('settlementOf() refuses what can never settle — synchronously', () => {
  it('an unknown id throws AT THE CALL, naming the fires that are live', () => {
    const session = app().createSession({ node: 'a', state: { saved: false } });
    const f = fired(session.fire('save', { source: 'user', invoke: false }));

    // Synchronous: no await, no ceiling, no four-second lie.
    expect(() => session.settlementOf('a.save#99')).toThrow(/no transition 'a\.save#99'/);
    expect(() => session.settlementOf('a.save#99')).toThrow(f.transition.id);
  });

  it('a STIMULUS row throws: the world moved, nobody fired it', () => {
    const session = app().createSession({ node: 'a', state: {} });
    const update = session.updateState({ loggedOut: true }, { stimulus: 'push' });
    const id = update.ok ? update.transition.id : '';
    expect(() => session.settlementOf(id)).toThrow(/the world moved, nobody fired it/);
  });

  it('a SYNC row throws the same way', () => {
    const session = app().createSession({ node: 'a', state: {} });
    const hop = session.sync('b');
    expect(hop.changed).toBe(true);
    const id = hop.changed ? hop.transition.id : '';
    expect(() => session.settlementOf(id)).toThrow(/'navigation' row/);
  });

  it('a STRUCTURE-SWAP row throws the same way', async () => {
    const session = app().createSession({ node: 'a', state: {} });
    session.registerTools({ group: 'g', tools: { save: () => undefined } });
    await flush(); // the coalesced structure flush lands its row

    const swap = session.transitions().find((t) => t.cause.stimulus === 'structure-swap');
    expect(swap).toBeDefined();
    expect(() => session.settlementOf(swap!.id)).toThrow(/'structure-swap' row/);
  });
});

// ---------------------------------------------------------------------------
// The sync door — the same law, without waiting
// ---------------------------------------------------------------------------

describe('settlementIfKnown() — the answer only if it exists yet', () => {
  it('is undefined while the question is open, and the settlement once it closes', async () => {
    const session = app().createSession({ node: 'a', state: { saved: false } });
    const f = fired(session.fire('save', { source: 'user', invoke: false }));
    expect(session.settlementIfKnown(f.transition.id)).toBeUndefined();

    session.updateState({ saved: true });
    await f.whenSettled;
    expect(session.settlementIfKnown(f.transition.id)).toMatchObject({ effectStatus: 'performed' });
  });

  it('refuses an unknown id exactly as settlementOf does — one law, two doors', () => {
    const session = app().createSession({ node: 'a', state: {} });
    expect(() => session.settlementIfKnown('nope#1')).toThrow(/no transition 'nope#1'/);
  });

  it('hands back a detached copy too', async () => {
    const session = app().createSession({ node: 'a' });
    session.registerTools({ group: 'g', tools: { save: () => ({ id: 'row-1' }) } });
    const f = fired(session.fire('save', { source: 'agent' }));
    await f.whenSettled;

    const known = session.settlementIfKnown(f.transition.id)!;
    (known.produced as { id: string }).id = 'tampered';
    expect((session.settlementIfKnown(f.transition.id)!.produced as { id: string }).id).toBe('row-1');
  });
});
