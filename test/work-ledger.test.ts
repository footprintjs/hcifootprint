/**
 * `beginWork` / `openWork` — THE WORK LEDGER: the app says what it is still
 * doing, and nothing here ever says it for the app.
 *
 * A fire comes to rest when the app reports its delta. The app may keep working
 * long after that — the upload continues, the job runs on, the save's spinner
 * outlives its receipt — and until this ledger every "what is still live?" door
 * answered NOTHING about it: `pending()` had settled the record, the settlement
 * latch had been dropped, and `asks()` was never about fires at all. A confident
 * emptiness is the one answer this library keeps closing.
 *
 * WHAT THE SHAPE REFUSES, and why each refusal is a test below.
 *
 * - `done()` NEVER SETTLES A TRANSITION. Not with an error, not on a pending
 *   fire, not on a settled one. The failure spine stays the three doors it has
 *   always been (handler throw, returned `{ok:false}`, `reject()`); a `done()`
 *   that resolved a latch would fork first-settlement-wins and launder an app's
 *   note about its own bookkeeping into the receipt for an action.
 * - NO RECENCY, ANYWHERE. Binding is by CALL PATH — an explicit `transitionId`,
 *   or the call window a handler's synchronous portion opens. There is no "the
 *   newest fire" arm and no FIFO arm: a guess would be right exactly when
 *   nothing was racing (docs/design/answer-grammar.md, "How completion is
 *   correlated").
 * - THE LABEL NEVER RENDERS. It is the app's runtime text, so it rides
 *   `openWork()` as DATA and enters no authored sentence, no `groundTruth()`
 *   line, no `howToAct`, no warning.
 * - NO CLOCK IS EVIDENCE. `startedAt` is data; no duration is ever rendered, and
 *   no timer expires a row. A leaked handle stays open for the session's life,
 *   by design.
 * - NO NEW JUDGMENT WORD. `stillWorking` rides the arms that already say the
 *   right thing — `still-pending`, and BESIDE the settlement receipt exactly as
 *   `outcomeNow` does.
 *
 * MUTATION PROOFS — every one below was RUN against the whole suite, and the
 * counts are what it actually did (including the last one, which is a zero):
 * - Let `done(error)` reject its bound fire → 4 red: the pending fire's receipt
 *   and latch, the settled fire's receipt, and the wire's own arm.
 * - Bind an unbound call to the newest pending fire → 6 red: all four recency
 *   attacks, the facts block's two-arm line, and the source scan that forbids
 *   the binding path from reading the pending queue at all.
 * - Drop the `record.cause.kind === 'fired'` check → 1 red: a stimulus row
 *   becomes bindable and the ledger claims work for something nobody fired.
 * - Render the label into the facts block → 5 red, including the sweep that
 *   walks every authored surface a model reads.
 * - Render a duration beside a work line → 5 red.
 * - Bump the version on beginWork → 2 red: a plan made before the app started
 *   working comes back STALE_CURSOR.
 * - Drop `stillWorking` from `settledFacts` → 4 red, including the folded door.
 * - Drop the first-close-wins guard in #closeWork → **0 red**, and that number
 *   is reported rather than hidden. The closed stamp is deliberately served
 *   through no door (a closed row's `error` is the app's word about WORK, and
 *   every door that could carry it answers "how did this FIRE come to rest"), so
 *   nothing public can observe a re-stamp. The guard stays because a ledger
 *   row's close is written once, like a settlement receipt — and what IS
 *   observable is pinned below: a second `done()` cannot resurrect the row or
 *   move anything about its fire.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNavigationGraph, skillsAsTools } from '../src/index.js';
import type {
  InteractionSession,
  NavigationGraph,
  ServeResult,
  SkillToolsPortWithSettlement,
} from '../src/index.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** A number with a time unit welded to it — the one shape no served text may grow. */
const RENDERED_DURATION =
  /\b\d+(\.\d+)?\s?(ms|milliseconds?|secs?|seconds?|mins?|minutes?|hrs?|hours?|days?)\b/i;

function shopMap(): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: {
      catalog: {
        tools: {
          'add-to-cart': { does: 'Add the dress to the cart', writes: ['cart'] },
          'save-list': { does: 'Save the wish list', writes: ['list'] },
          'go-checkout': { does: 'Go to checkout', goTo: 'checkout' },
        },
      },
      checkout: {
        tools: { 'place-order': { does: 'Place the order', writes: ['orders'], confirm: true } },
      },
    },
  });
}

interface Wired {
  session: InteractionSession;
  port: SkillToolsPortWithSettlement;
  warnings: string[];
}

/** A wired shop whose handlers do nothing on their own — the tap reports later. */
function wired(
  handlers: Record<string, (input?: unknown) => unknown> = {},
  opts: { now?: () => number } = {},
): Wired {
  const warnings: string[] = [];
  const session = shopMap().createSession({
    node: 'catalog',
    state: { cart: [], list: [], orders: [] },
    onWarn: (message: string) => warnings.push(message),
    ...(opts.now !== undefined ? { now: opts.now } : {}),
  });
  session.registerToolGroup('catalog', {
    handlers: {
      'add-to-cart': handlers['add-to-cart'] ?? (() => undefined),
      'save-list': handlers['save-list'] ?? (() => undefined),
      'go-checkout': handlers['go-checkout'] ?? (() => undefined),
    },
  });
  return { session, port: skillsAsTools(session), warnings };
}

/** Fire in-process and hand back the id the app (and the model) would hold. */
function fireIt(session: InteractionSession, action = 'catalog.add-to-cart'): string {
  const fired = session.fire(action, { source: 'agent' });
  if (!fired.ok) throw new Error(`fixture fire failed: ${fired.reason}`);
  return fired.transition.id;
}

/** Every string a result carries, flattened — for sweeps over what a model reads. */
function textOf(result: ServeResult): string {
  return Object.values(result)
    .filter((value): value is string => typeof value === 'string')
    .join(' | ');
}

// ---------------------------------------------------------------------------
// Where the row lands — binding at CALL TIME, three homes
// ---------------------------------------------------------------------------

describe('home 1 — an explicit transitionId binds exactly', () => {
  it('binds the row to that fire, with its action and its principal', () => {
    const { session } = wired();
    const id = fireIt(session);

    session.beginWork('Uploading the photo', { transitionId: id });

    expect(session.openWork()).toEqual([
      {
        workId: expect.any(String),
        label: 'Uploading the photo',
        transitionId: id,
        affordanceId: 'catalog.add-to-cart',
        startedAt: expect.any(Number),
        principal: 'agent',
      },
    ]);
  });

  it('EXPLICIT WINS over the call window — the same order updateState keeps', async () => {
    const warnings: string[] = [];
    const session = shopMap().createSession({
      node: 'catalog',
      state: { cart: [], list: [] },
      onWarn: (message: string) => warnings.push(message),
    });
    // One group, registered once: its add-to-cart handler opens work for the
    // fire made BEFORE it, naming that id explicitly from inside its own window.
    let firstId = '';
    let workId = '';
    session.registerToolGroup('catalog', {
      handlers: {
        'save-list': () => undefined,
        'add-to-cart': () => {
          workId = session.beginWork('for the earlier fire', { transitionId: firstId }).workId;
        },
      },
    });
    firstId = fireIt(session, 'catalog.save-list');
    const innerId = fireIt(session, 'catalog.add-to-cart');
    await flush();

    const row = session.openWork().find((candidate) => candidate.workId === workId)!;
    expect(row.transitionId).toBe(firstId); // what the caller SAID
    expect(row.transitionId).not.toBe(innerId); // not the handler it was inside
    expect(row.affordanceId).toBe('catalog.save-list');
    expect(warnings).toEqual([]);
  });

  it('the handle hands back the id its own row carries', () => {
    const { session } = wired();
    const work = session.beginWork('anything');
    expect(session.openWork()[0]!.workId).toBe(work.workId);
  });
});

describe('home 2 — inside a handler, the call window binds it', () => {
  it('a handler that opens work before its first await binds to its own fire', async () => {
    const { session } = wired();
    session.registerToolGroup('catalog', {
      handlers: {
        'add-to-cart': async () => {
          session.beginWork('Uploading');
          await flush();
        },
      },
    });
    const id = fireIt(session);
    await flush();

    expect(session.openWork()).toMatchObject([
      { transitionId: id, affordanceId: 'catalog.add-to-cart', principal: 'agent' },
    ]);
  });

  it('binds to the handler it is INSIDE, not to the newest fire', async () => {
    const { session } = wired();
    let first: string | undefined;
    session.registerToolGroup('catalog', {
      handlers: {
        'add-to-cart': async () => {
          first = session.beginWork('slow work').workId;
          await flush();
        },
        'save-list': () => undefined,
      },
    });
    const older = fireIt(session, 'catalog.add-to-cart');
    const newer = fireIt(session, 'catalog.save-list');
    await flush();

    const row = session.openWork().find((candidate) => candidate.workId === first)!;
    expect(row.transitionId).toBe(older);
    expect(row.transitionId).not.toBe(newer);
  });
});

describe('home 3 — nothing to bind to lands UNBOUND, and says so out loud', () => {
  it('an app-side call outside any handler is unbound at principal system', () => {
    const { session, warnings } = wired();
    session.beginWork('a background sync');

    expect(session.openWork()).toEqual([
      {
        workId: expect.any(String),
        label: 'a background sync',
        startedAt: expect.any(Number),
        principal: 'system',
      },
    ]);
    expect(warnings.join(' ')).toContain('UNBOUND');
  });

  it('the warning teaches BOTH windows — before the first await, and around fire()', () => {
    const { session, warnings } = wired();
    session.beginWork();
    const message = warnings.join(' ');
    expect(message).toContain('BEFORE its first await');
    expect(message).toContain('{ transitionId }');
    expect(message).toContain('outside that window');
    // And it says the work was not dropped — the row is real.
    expect(message).toContain('openWork()');
  });

  it('one warning per callsite, not one per call (the #warnedOnce discipline)', () => {
    const { session, warnings } = wired();
    for (let i = 0; i < 20; i++) session.beginWork('the same callsite');
    expect(warnings).toHaveLength(1);
    session.beginWork('a different callsite');
    expect(warnings).toHaveLength(2);
    expect(session.openWork()).toHaveLength(21); // every row still opened
  });

  it('an id this session never minted is unbound, and the warning names what IS live', () => {
    const { session, warnings } = wired();
    const live = fireIt(session);

    session.beginWork('typo', { transitionId: 'catalog.add-to-cart#99' });

    expect(session.openWork()[0]).toMatchObject({ principal: 'system' });
    expect(session.openWork()[0]!.transitionId).toBeUndefined();
    expect(warnings.join(' ')).toContain('no transition in this session');
    expect(warnings.join(' ')).toContain(live); // the fire that IS awaiting a settlement
  });

  it('one callsite passing ROTATING bad ids still teaches once', () => {
    // The discipline is per CALLSITE, and the id is the one thing here a caller
    // can rotate: `beginWork('save', { transitionId: job.id })` on stale ids
    // warned on every single call, and grew the warned set by one
    // caller-supplied string each time — a warn-once set that grows with traffic
    // is not a warn-once set.
    const { session, warnings } = wired();

    for (let i = 0; i < 20; i++) session.beginWork('save', { transitionId: `job-${i}` });

    expect(warnings).toHaveLength(1);
    expect(session.openWork()).toHaveLength(20); // every row still opened
    // A different place in the app is still a different complaint…
    session.beginWork('upload', { transitionId: 'job-x' });
    expect(warnings).toHaveLength(2);
    // …and so is the other unbound arm about the same callsite.
    session.beginWork('save');
    expect(warnings).toHaveLength(3);
  });

  it('the id in the warning is CAPPED — app text, bounded like every other', () => {
    const { session, warnings } = wired();

    session.beginWork('save', { transitionId: 'Z'.repeat(5000) });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.length).toBeLessThan(600);
    expect(warnings[0]).toContain('…');
  });

  it('a stimulus row is not a fire, so work cannot be filed against it', () => {
    const { session, warnings } = wired();
    const moved = session.updateState({ cart: [1] }, { stimulus: 'push', principal: 'system' });
    const stimulusId = moved.ok ? moved.transition.id : '';

    session.beginWork('work for a server push', { transitionId: stimulusId });

    expect(session.openWork()[0]!.transitionId).toBeUndefined();
    expect(warnings.join(' ')).toContain('a row nobody fired');
  });

  it('work is never DROPPED for being unbound — it is served, and it is a fact', () => {
    const { session } = wired();
    session.beginWork('a background sync');
    expect(session.openWork()).toHaveLength(1);
    expect(session.groundTruth().text).toContain('The app is still working on something');
  });
});

// ---------------------------------------------------------------------------
// done() — closes the row, and NOTHING else
// ---------------------------------------------------------------------------

describe('done() closes the row', () => {
  it('the row leaves openWork() the moment it is closed', () => {
    const { session } = wired();
    const work = session.beginWork('saving');
    expect(session.openWork()).toHaveLength(1);
    work.done();
    expect(session.openWork()).toEqual([]);
  });

  it('FIRST CLOSE WINS — a second done() cannot reopen or re-stamp it', () => {
    const { session } = wired();
    const id = fireIt(session);
    const work = session.beginWork('saving', { transitionId: id });
    work.done();
    work.done(new Error('too late'));
    work.done();
    expect(session.openWork()).toEqual([]);
    // and nothing about the fire moved (see the attack tests below)
    expect(session.transitions().find((row) => row.id === id)!.outcome).toBe('pending');
  });

  it('closing one row leaves the others open', () => {
    const { session } = wired();
    const a = session.beginWork('a');
    session.beginWork('b');
    a.done();
    expect(session.openWork().map((row) => row.label)).toEqual(['b']);
  });
});

// ---------------------------------------------------------------------------
// openWork() — the reader beside pending() / awaitingSettlement() / asks()
// ---------------------------------------------------------------------------

describe('openWork() — the third "what is still live" door', () => {
  it('answers about work that is live when the other two lists are empty', async () => {
    const { session } = wired();
    const id = fireIt(session);
    session.beginWork('Uploading the photo', { transitionId: id });
    await flush();
    session.updateState({ cart: [1] }, { transitionId: id });

    // The fire is finished, by both of the doors that knew about fires…
    expect(session.pending()).toEqual([]);
    expect(session.awaitingSettlement()).toEqual([]);
    // …and the app is still working. THIS is the hole the ledger fills.
    expect(session.openWork()).toHaveLength(1);
  });

  it('rows are oldest first', () => {
    const { session } = wired();
    session.beginWork('first');
    session.beginWork('second');
    session.beginWork('third');
    expect(session.openWork().map((row) => row.label)).toEqual(['first', 'second', 'third']);
  });

  it('hands out COPIES — a caller cannot edit the ledger through them', () => {
    const { session } = wired();
    const id = fireIt(session);
    session.beginWork('mine', { transitionId: id });
    const row = session.openWork()[0]!;
    (row as { transitionId?: string }).transitionId = 'catalog.save-list#7';
    (row as { label?: string }).label = 'rewritten';
    expect(session.openWork()[0]).toMatchObject({ transitionId: id, label: 'mine' });
  });

  it('a label is optional, and a non-string one simply does not become a label', () => {
    const { session } = wired();
    session.beginWork();
    session.beginWork(42 as unknown as string);
    session.beginWork('   ');
    expect(session.openWork().every((row) => row.label === undefined)).toBe(true);
    expect(session.openWork()).toHaveLength(3); // the row is the point; its name is not
  });

  it('a runaway label is capped, like every other app string that crosses', () => {
    const { session } = wired();
    session.beginWork('x'.repeat(5000));
    expect((session.openWork()[0]!.label ?? '').length).toBeLessThanOrEqual(210);
  });
});

describe('the ledger is not world motion — it can never make a plan stale', () => {
  it('beginWork and done leave the session version alone', () => {
    const { session } = wired();
    const before = session.version;
    const work = session.beginWork('saving');
    expect(session.version).toBe(before);
    work.done();
    expect(session.version).toBe(before);
  });

  it('a plan made before the app started working is still fireable', () => {
    const { session } = wired();
    const planned = session.version;
    session.beginWork('a background sync');
    const fired = session.fire('catalog.add-to-cart', { source: 'agent', expectedVersion: planned });
    expect(fired.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// groundTruth — one authored line, two arms
// ---------------------------------------------------------------------------

describe('the facts block says the app is still working', () => {
  it('a BOUND row names the action, through the registry-derived label', () => {
    const { session } = wired();
    const id = fireIt(session);
    session.beginWork('Uploading the photo', { transitionId: id });
    expect(session.groundTruth().text).toContain(
      'The app is still working on: catalog.add-to-cart.',
    );
  });

  it('an UNBOUND row gets the authored constant — never the app’s own words', () => {
    const { session } = wired();
    session.beginWork('Uploading the photo');
    const text = session.groundTruth().text;
    expect(text).toContain('The app is still working on something it did not tie to an action here.');
    expect(text).not.toContain('Uploading the photo');
  });

  it('two rows on one action are one name (facts, not repetitions)', () => {
    const { session } = wired();
    const id = fireIt(session);
    session.beginWork('part one', { transitionId: id });
    session.beginWork('part two', { transitionId: id });
    const lines = session.groundTruth().text.split('\n').filter((line) => line.includes('still working'));
    expect(lines).toEqual(['The app is still working on: catalog.add-to-cart.']);
  });

  it('the line disappears the moment the app closes the row', () => {
    const { session } = wired();
    const id = fireIt(session);
    const work = session.beginWork('Uploading', { transitionId: id });
    expect(session.groundTruth().text).toContain('still working');
    work.done();
    expect(session.groundTruth().text).not.toContain('still working');
  });

  it('says nothing at all when the app never opened any work', () => {
    const { session } = wired();
    fireIt(session);
    expect(session.groundTruth().text).not.toContain('still working');
  });

  it('is CAPPED like its neighbours — a leaked loop cannot flood the block', () => {
    const { session } = wired();
    const cart = fireIt(session, 'catalog.add-to-cart');
    const list = fireIt(session, 'catalog.save-list');
    session.beginWork('a', { transitionId: cart });
    session.beginWork('b', { transitionId: list });

    const text = session.groundTruth({ maxAttempts: 1 }).text;
    const workLine = text.split('\n').find((line) => line.startsWith('The app is still working on:'))!;
    expect(workLine).toBe('The app is still working on: catalog.add-to-cart.');
    expect(workLine).not.toContain('catalog.save-list');
    expect(text).toContain('… 1 more the app says it is working on, not listed.');
  });

  it('both arms can be true at once, and each keeps its own line', () => {
    const { session } = wired();
    const id = fireIt(session);
    session.beginWork('bound', { transitionId: id });
    session.beginWork('unbound');
    const text = session.groundTruth().text;
    expect(text).toContain('The app is still working on: catalog.add-to-cart.');
    expect(text).toContain('The app is still working on something it did not tie to an action here.');
  });
});

// ---------------------------------------------------------------------------
// did_it_work — stillWorking rides ALONGSIDE, never over
// ---------------------------------------------------------------------------

describe('did_it_work — the app’s own work, on the arms about a fire', () => {
  it('rides the still-pending arm without changing its word', async () => {
    const { session, port } = wired();
    const id = fireIt(session);
    session.beginWork('Uploading', { transitionId: id });
    await flush();

    const answer = port.call('shop.did_it_work', { transitionId: id });
    expect(answer).toMatchObject({
      ok: true,
      settled: false,
      judgment: 'still-pending', // no new judgment word
      stillWorking: true,
    });
    expect(answer['stillWorkingMeans']).toContain('still working on this action');
  });

  it('rides BESIDE the receipt when work outlives the settlement, exactly as outcomeNow does', async () => {
    const { session, port } = wired();
    const id = fireIt(session);
    session.beginWork('the upload continues', { transitionId: id });
    await flush();
    session.updateState({ cart: [1] }, { transitionId: id });

    const answer = port.call('shop.did_it_work', { transitionId: id });
    // The receipt is NOT rewritten…
    expect(answer).toMatchObject({
      ok: true,
      settled: true,
      effectStatus: 'performed',
      outcome: 'committed',
      // …and the later truth rides alongside it.
      stillWorking: true,
    });
  });

  it('the sentence is BYTE-IDENTICAL on both arms — one fact, one wording', async () => {
    const { session, port } = wired();
    const id = fireIt(session);
    session.beginWork('working', { transitionId: id });
    await flush();
    const pendingArm = port.call('shop.did_it_work', { transitionId: id });
    session.updateState({ cart: [1] }, { transitionId: id });
    const settledArm = port.call('shop.did_it_work', { transitionId: id });

    expect(pendingArm['stillWorkingMeans']).toBe(settledArm['stillWorkingMeans']);
  });

  it('the key disappears the moment the app closes the row — absence, not false', async () => {
    const { session, port } = wired();
    const id = fireIt(session);
    const work = session.beginWork('working', { transitionId: id });
    await flush();
    expect(port.call('shop.did_it_work', { transitionId: id })).toHaveProperty('stillWorking');

    work.done();
    const answer = port.call('shop.did_it_work', { transitionId: id });
    expect(answer).not.toHaveProperty('stillWorking');
    expect(answer).not.toHaveProperty('stillWorkingMeans');
    expect(answer['judgment']).toBe('still-pending'); // the arm itself is untouched
  });

  it('a fire with no work open says nothing about work at all', async () => {
    const { session, port } = wired();
    const id = fireIt(session);
    await flush();
    expect(port.call('shop.did_it_work', { transitionId: id })).not.toHaveProperty('stillWorking');
  });

  it('the folded door carries it too — one builder, one answer', async () => {
    const { session, port } = wired();
    const id = fireIt(session);
    session.beginWork('the upload continues', { transitionId: id });
    await flush();
    session.updateState({ cart: [1] }, { transitionId: id });

    expect(port.settledAnswer(id)).toMatchObject({ outcome: 'committed', stillWorking: true });
  });

  it('a failed handler settles the fire and leaves the app’s work exactly where it was', async () => {
    const { session, port } = wired();
    session.registerToolGroup('catalog', {
      handlers: {
        'add-to-cart': () => {
          session.beginWork('a job that outlives the failure');
          throw new Error('the click failed');
        },
      },
    });
    const id = fireIt(session);
    await flush();

    // The failure spine did its job…
    expect(port.call('shop.did_it_work', { transitionId: id })).toMatchObject({
      settled: true,
      effectStatus: 'refused',
    });
    // …and the work row is still the app's to close.
    expect(session.openWork()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// The dishonest implementations — each one is a way this could have lied
// ---------------------------------------------------------------------------

describe('ATTACK — done(error) settles or flips a transition', () => {
  it('does not settle a PENDING fire, and does not resolve its latch', async () => {
    const { session, port } = wired();
    const fired = session.fire('catalog.add-to-cart', { source: 'agent' });
    if (!fired.ok) throw new Error('fixture');
    const id = fired.transition.id;
    const work = session.beginWork('saving', { transitionId: id });
    await flush();

    let settledWith: unknown;
    void fired.whenSettled.then((settlement) => (settledWith = settlement));
    work.done(new Error('the save failed'));
    await flush();

    expect(settledWith).toBeUndefined(); // the promise is still open
    expect(session.settlementIfKnown(id)).toBeUndefined();
    expect(session.transitions().find((row) => row.id === id)!.outcome).toBe('pending');
    expect(session.pending().map((row) => row.id)).toEqual([id]);
    expect(port.call('shop.did_it_work', { transitionId: id })).toMatchObject({
      settled: false,
      judgment: 'still-pending',
    });
  });

  it('does not rewrite a SETTLED fire’s receipt', async () => {
    const { session, port } = wired();
    const id = fireIt(session);
    const work = session.beginWork('saving', { transitionId: id });
    await flush();
    session.updateState({ cart: [1] }, { transitionId: id });
    const receipt = port.call('shop.did_it_work', { transitionId: id });

    work.done(new Error('the app changed its mind'));

    const after = port.call('shop.did_it_work', { transitionId: id });
    expect(after['outcome']).toBe(receipt['outcome']);
    expect(after['effectStatus']).toBe(receipt['effectStatus']);
    expect(after).not.toHaveProperty('outcomeNow');
    expect(after).not.toHaveProperty('error');
  });

  it('the app’s error text reaches no door that answers about the FIRE', async () => {
    const { session, port } = wired();
    const id = fireIt(session);
    const work = session.beginWork('saving', { transitionId: id });
    await flush();
    work.done(new Error('SENTINEL-work-error'));
    session.updateState({ cart: [1] }, { transitionId: id });

    const everything = JSON.stringify([
      port.call('shop.did_it_work', { transitionId: id }),
      port.settledAnswer(id),
      session.transitions(),
      session.groundTruth().text,
      session.contextBrief().text,
    ]);
    expect(everything).not.toContain('SENTINEL-work-error');
  });

  it('does not close, answer or age a human’s ask', async () => {
    const { session } = wired();
    session.sync('checkout');
    session.registerToolGroup('checkout', { handlers: { 'place-order': () => undefined } });
    const ask = session.confirmAsk('checkout.place-order', { source: 'agent' });
    const work = session.beginWork('placing the order');
    work.done(new Error('nope'));
    expect(session.asks().find((row) => row.askId === ask.askId)!.answer).toBeUndefined();
  });
});

describe('ATTACK — the free label rendered where a model reads it', () => {
  it('never enters the facts block, the brief, a wire result or a warning', async () => {
    const { session, port, warnings } = wired();
    const secret = 'ZZQQ-label-carrying-a-customer-name';
    const id = fireIt(session);
    session.beginWork(secret, { transitionId: id });
    session.beginWork(secret); // and the unbound arm
    await flush();

    const authored = [
      session.groundTruth().text,
      session.contextBrief().text,
      textOf(port.call('shop.did_it_work', { transitionId: id })),
      textOf(port.call('shop.whats_here', {})),
      warnings.join(' '),
    ].join(' | ');

    expect(authored).not.toContain(secret);
    // …and it is still there on the DATA channel, which is the whole point.
    expect(session.openWork()[0]!.label).toBe(secret);
  });
});

describe('ATTACK — a rendered duration anywhere', () => {
  it('no served text turns a clock into a fact, however long the work has run', async () => {
    let clock = 1_700_000_000_000;
    const { session, port } = wired({}, { now: () => clock });
    const id = fireIt(session);
    session.beginWork('a very long upload', { transitionId: id });
    await flush();
    clock += 6 * 60 * 60 * 1000; // six hours later

    const served = [
      session.groundTruth().text,
      textOf(port.call('shop.did_it_work', { transitionId: id })),
      textOf(port.call('shop.whats_here', {})),
    ].join(' | ');

    expect(served).not.toMatch(RENDERED_DURATION);
    expect(served).not.toMatch(/\bago\b|\belapsed\b|\btaking too long\b/i);
    // The instant itself IS served — as data, for a caller that wants to render it.
    expect(session.openWork()[0]!.startedAt).toBe(1_700_000_000_000);
  });

  it('no timer expires a row: six hours on, it still says the one true thing', async () => {
    let clock = 1_700_000_000_000;
    const { session, port } = wired({}, { now: () => clock });
    const id = fireIt(session);
    session.beginWork('a very long upload', { transitionId: id });
    await flush();
    clock += 6 * 60 * 60 * 1000;

    expect(session.openWork()).toHaveLength(1);
    expect(port.call('shop.did_it_work', { transitionId: id })).toMatchObject({
      judgment: 'still-pending',
      stillWorking: true,
    });
  });
});

describe('ATTACK — recency attribution', () => {
  it('an unbound call never attaches to the newest fire', async () => {
    const { session, port } = wired();
    const older = fireIt(session, 'catalog.add-to-cart');
    const newer = fireIt(session, 'catalog.save-list');

    session.beginWork('a background sync');
    await flush();

    expect(session.openWork()[0]!.transitionId).toBeUndefined();
    expect(session.openWork()[0]!.principal).toBe('system');
    expect(port.call('shop.did_it_work', { transitionId: newer })).not.toHaveProperty('stillWorking');
    expect(port.call('shop.did_it_work', { transitionId: older })).not.toHaveProperty('stillWorking');
  });

  it('an unbound call never attaches to the OLDEST one either (no FIFO arm)', async () => {
    const { session } = wired();
    fireIt(session, 'catalog.add-to-cart');
    fireIt(session, 'catalog.save-list');
    session.beginWork('a background sync');
    await flush();
    expect(session.openWork()[0]!.affordanceId).toBeUndefined();
  });

  it('post-await, a handler is no longer inside its own call window: unbound, and warned', async () => {
    const { session, warnings } = wired();
    session.registerToolGroup('catalog', {
      handlers: {
        'add-to-cart': async () => {
          await flush();
          session.beginWork('opened too late');
        },
      },
    });
    const id = fireIt(session);
    await flush();
    await flush();

    expect(session.openWork()).toHaveLength(1);
    expect(session.openWork()[0]!.transitionId).toBeUndefined();
    expect(warnings.join(' ')).toContain('BEFORE its first await');
    expect(session.transitions().find((row) => row.id === id)).toBeDefined(); // the record is right there — and still not guessed at
  });

  it('work bound to one fire says nothing about its neighbour', async () => {
    const { session, port } = wired();
    const mine = fireIt(session, 'catalog.add-to-cart');
    const theirs = fireIt(session, 'catalog.save-list');
    session.beginWork('mine', { transitionId: mine });
    await flush();

    expect(port.call('shop.did_it_work', { transitionId: mine })).toHaveProperty('stillWorking', true);
    expect(port.call('shop.did_it_work', { transitionId: theirs })).not.toHaveProperty('stillWorking');
  });

  it('an UNBOUND row rides no fire’s answer at all', async () => {
    const { session, port } = wired();
    const id = fireIt(session);
    session.beginWork('a background sync');
    await flush();
    expect(port.call('shop.did_it_work', { transitionId: id })).not.toHaveProperty('stillWorking');
    // …while the facts block still says the app is working. Two true things.
    expect(session.groundTruth().text).toContain('The app is still working on something');
  });

  it('the binding path never reads the pending queue — the mutation this forbids', () => {
    const source = readFileSync(path.join(REPO, 'src', 'traverse', 'session.ts'), 'utf8');
    const start = source.indexOf('  #bindWork(');
    const end = source.indexOf('  #warnWorkOnce(', start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const body = source.slice(start, end);
    expect(body).not.toContain('#pending');
    expect(body).not.toContain('.pop()');
    expect(body).not.toContain('at(-1)');
  });
});

describe('ATTACK — the pause arms grow a work word', () => {
  it('an ask answer carries no stillWorking, whatever the app has open', () => {
    const { session, port } = wired();
    session.sync('checkout');
    session.registerToolGroup('checkout', { handlers: { 'place-order': () => undefined } });
    const paused = port.call('shop.do_action', { action: 'checkout.place-order' });
    const askId = paused['askId'] as string;
    session.beginWork('some work');

    const answer = port.call('shop.did_it_work', { transitionId: askId });
    expect(answer).toMatchObject({ settled: false, judgment: 'awaiting-human' });
    expect(answer).not.toHaveProperty('stillWorking');
  });
});

// ---------------------------------------------------------------------------
// The doc-comment promises the pairing discipline (a leaked handle is visible)
// ---------------------------------------------------------------------------

describe('the leak is documented as the honest failure, not fixed by a timer', () => {
  it('WorkHandle states the try/finally pairing and the forever-visible leak', () => {
    const types = readFileSync(path.join(REPO, 'src', 'atom', 'types.ts'), 'utf8');
    const declaration = types.indexOf('export interface WorkHandle');
    // Compared as PROSE: comment markers and wrapping are formatting, not meaning.
    const doc = types
      .slice(Math.max(0, declaration - 2000), declaration)
      .replace(/[*`]/g, ' ')
      .replace(/\s+/g, ' ');
    expect(doc).toContain('finally');
    expect(doc).toContain("for the session's life");
    expect(doc).toContain('a clock is not evidence');
  });

  it('a leaked handle keeps answering, and the session never garbage-collects it', async () => {
    const { session, port } = wired();
    const id = fireIt(session);
    session.registerToolGroup('catalog', {
      handlers: {
        'save-list': () => {
          session.beginWork('leaked', { transitionId: id }); // nobody ever calls done()
        },
      },
    });
    fireIt(session, 'catalog.save-list');
    await flush();
    session.updateState({ cart: [1] }, { transitionId: id });
    session.updateState({ list: [1] });
    await flush();

    expect(session.openWork()).toHaveLength(1);
    expect(port.call('shop.did_it_work', { transitionId: id })).toHaveProperty('stillWorking', true);
  });
});

describe('the page a reader meets quotes what the library actually serves', () => {
  /** Prose compared as PROSE: wrapping and markdown markers are formatting, not meaning. */
  const flatten = (text: string): string => text.replace(/[*>"`…]/g, ' ').replace(/\s+/g, ' ').trim();

  it('quotes the served sentence and the authored facts line, byte for byte', async () => {
    // The content gate's own rule, held where this feature lives: reword a
    // constant without touching the page and the page teaches a sentence no
    // model ever receives. This page had no such test at all — it was the one
    // page in the wave nothing pinned.
    const { session, port } = wired();
    const id = fireIt(session);
    session.beginWork('Uploading the attachment', { transitionId: id });
    session.updateState({ cart: [1] }, { transitionId: id });
    await flush();

    const answer = port.call('shop.did_it_work', { transitionId: id });
    const served = String(answer['stillWorkingMeans']);
    const raw = readFileSync(
      path.join(REPO, 'docs-next/content/docs/serve/when-the-app-is-still-working.mdx'),
      'utf8',
    );
    const page = flatten(raw);

    // The page shows the sentence ELIDED, so what is checked is that its quote
    // is a real PREFIX of the real thing — reword the constant and the fragment
    // on the page stops being one.
    const quoted = /"stillWorkingMeans": "([^"…]+)…"/.exec(raw)?.[1];
    expect(quoted).toBeDefined();
    expect(served.startsWith(quoted!)).toBe(true);

    // The unbound row's facts line is quoted whole.
    const unbound = wired();
    unbound.session.beginWork('a background sync');
    const line = unbound.session
      .groundTruth()
      .text.split('\n')
      .find((row) => row.includes('did not tie'))!;
    expect(page).toContain(flatten(line));
  });
});
