/**
 * THE INVALIDATION CONTRACT — when a live action store gets re-read, and what
 * happens when the read fails.
 *
 * A store emits when its actions change. Nothing about NAVIGATION is a change
 * the store owns: an app whose action set is derived from the router has nothing
 * to announce when the page changes, so the surface after a hop was whatever the
 * last emission left behind — served, confidently, as the actions available
 * here. The other half of the contract is now the library's: a re-read on every
 * page change the app reports.
 *
 * The two hard edges, both tested below:
 * - NEVER at report time. whats_here and the facts block read the served
 *   structure; a read that re-registered tools would mutate the answer it is in
 *   the middle of giving (the check-and-warn precedent, nav-session.ts).
 * - NEVER silent when it fails. A failed read leaves bindings from BEFORE the
 *   failure on offer, and serving those with nothing said is the same confident
 *   staleness this whole seam exists to end — so it warns AND files a gap row.
 *
 * MUTATION PROOFS:
 * - drop the whenPageChanges subscription and 'a navigation re-reads' goes red
 *   with the previous page's actions still bound;
 * - drop the gap row and 'a failed read is disclosed' goes red with the stale
 *   list served and nothing in either ledger saying so;
 * - re-read inside available() and 'a read never mutates what it serves' goes
 *   red on the read counter.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, fromLiveStore, skillsAsTools } from '../src/index.js';
import type {
  InteractionSession,
  LiveAction,
  LiveActionStore,
  LiveBindingPort,
} from '../src/index.js';

/**
 * A ROUTER-DERIVED store: its actions depend on the page, and it does NOT emit
 * when the page changes — the exact shape the page-change re-read exists for. It also
 * counts reads, because "did anything read the store" is the question two of
 * these tests are really asking.
 */
function routerStore(perPage: Record<string, LiveAction[]>) {
  const listeners = new Set<() => void>();
  let page = Object.keys(perPage)[0];
  let reads = 0;
  let broken = false;
  const store: LiveActionStore = {
    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    actions() {
      reads++;
      if (broken) throw new Error('store is down');
      // Fresh objects every read: object identity carries no information.
      return (perPage[page] ?? []).map((action) => ({ ...action }));
    },
  };
  return {
    store,
    reads: () => reads,
    /** The router moved. The store says NOTHING — that is the point. */
    goTo(next: string) {
      page = next;
    },
    break() {
      broken = true;
    },
    fix() {
      broken = false;
    },
    emit() {
      for (const listener of listeners) listener();
    },
    listenerCount: () => listeners.size,
  };
}

function twoPageApp(store: LiveActionStore, warnings: string[] = []): InteractionSession {
  return buildNavigationGraph('desk', {
    pages: { orders: {}, archive: {} },
    sources: [fromLiveStore(store)],
  }).createSession({ node: 'orders', onWarn: (message) => warnings.push(message) });
}

const microtasks = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const actionIds = (session: InteractionSession): string[] =>
  session.available().edges.map((edge) => edge.affordanceId).sort();

const reportedGaps = (session: InteractionSession) =>
  session.gaps().filter((gap) => gap.kind === 'reported');

const app = () =>
  routerStore({
    orders: [{ node: 'orders', name: 'refresh', does: 'Refresh the order list', handler: () => undefined }],
    archive: [{ node: 'archive', name: 'restore', does: 'Restore an archived order', handler: () => undefined }],
  });

describe('navigation is covered by the page-change re-read', () => {
  it('a sync re-reads the store: the new page binds, the old page releases', () => {
    const live = app();
    const session = twoPageApp(live.store);
    expect(actionIds(session)).toEqual(['orders.refresh']);

    live.goTo('archive'); // the router moved and the store emitted NOTHING
    session.sync('archive', { stimulus: 'navigation' });

    expect(actionIds(session)).toEqual(['archive.restore']);
    expect(session.node).toBe('archive');
  });

  it('a CLAIMED navigation does NOT re-read — the app has not left the page yet', async () => {
    // The claim moves the cursor on the app's word, and it lands INSIDE the fire:
    // the handler has not run, so the store still describes the page the app is
    // still on. Reading there would bind the old page's actions to the new
    // position — and, worse, could release the very handler the fire is one
    // statement away from invoking. The observation is what re-reads.
    const live = routerStore({
      home: [{ node: 'home', name: 'open', does: 'Open the desk', handler: () => undefined }],
      desk: [{ node: 'desk', name: 'file', does: 'File the paperwork', handler: () => undefined }],
    });
    const session = buildNavigationGraph('desk', {
      pages: {
        home: { tools: { open: { does: 'Open the desk', goTo: 'desk' } } },
        desk: {},
      },
      sources: [fromLiveStore(live.store)],
    }).createSession({ node: 'home', onWarn: () => undefined });

    const readsBefore = live.reads();
    live.goTo('desk'); // the app's handler will navigate; the store stays quiet
    const fired = session.fire('home.open', { source: 'agent' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    await fired.whenSettled; // the handler really ran — nothing released it mid-fire

    expect(session.node).toBe('desk');
    expect(live.reads()).toBe(readsBefore);
    // …and the router's confirmation is what catches the surface up. It changes
    // no node — the claim already moved the cursor — but it is the FIRST report
    // of this position, which is the only word anything outside can act on.
    const confirmed = session.sync('desk', { stimulus: 'navigation' });
    expect(confirmed.changed).toBe(false);
    expect(actionIds(session)).toEqual(['desk.file']);
  });

  it('a REPEAT report re-reads nothing — a chatty router is not world motion', () => {
    const live = app();
    const session = twoPageApp(live.store);
    live.goTo('archive');
    session.sync('archive', { stimulus: 'navigation' });
    const afterFirstReport = live.reads();

    session.sync('archive', { stimulus: 'navigation' });
    session.sync('archive', { stimulus: 'navigation' });
    expect(live.reads()).toBe(afterFirstReport);
  });

  it('a re-read that changes nothing is free: no re-registration, no world motion', async () => {
    // A store whose actions do not depend on the page: every rest re-reads and
    // every re-read finds the same identities, which is the case the ledger
    // exists for — a chatty store must cause zero last-wins warnings and zero
    // phantom structure bumps.
    const live = routerStore({
      both: [
        { node: 'orders', name: 'refresh', does: 'Refresh', handler: () => undefined },
        { node: 'archive', name: 'restore', does: 'Restore', handler: () => undefined },
      ],
    });
    const warnings: string[] = [];
    const session = twoPageApp(live.store, warnings);
    await microtasks(); // let the attach's own structure row flush
    const settled = session.structureVersion;

    session.sync('archive', { stimulus: 'navigation' });
    session.sync('orders', { stimulus: 'navigation' });
    session.sync('archive', { stimulus: 'navigation' });
    await microtasks();

    expect(live.reads()).toBeGreaterThan(1); // it really did re-read on every rest
    expect(session.structureVersion).toBe(settled);
    expect(warnings).toEqual([]);
  });
});

describe('a read never mutates what it serves', () => {
  it('whats_here, the facts block and available() re-read NOTHING', () => {
    const live = app();
    const session = twoPageApp(live.store);
    const port = skillsAsTools(session);
    const afterAttach = live.reads();

    live.goTo('archive'); // the store's answer WOULD change if anyone asked
    port.call('desk.whats_here', {});
    session.available();
    session.groundTruth();
    session.contextBrief();

    // Nobody asked. The served structure is the one the last REST established,
    // and a report that re-read would be answering about a surface it changed
    // while answering.
    expect(live.reads()).toBe(afterAttach);
    expect(actionIds(session)).toEqual(['orders.refresh']);
  });
});

describe('a failed read is disclosed, not swallowed', () => {
  it('warns, files ONE gap row per failure streak, and keeps serving what it had', () => {
    const live = app();
    const warnings: string[] = [];
    const session = twoPageApp(live.store, warnings);
    expect(actionIds(session)).toEqual(['orders.refresh']);

    live.break();
    live.emit();

    // The bindings from before the failure are still on offer…
    expect(actionIds(session)).toEqual(['orders.refresh']);
    // …and BOTH readers are told: the developer's console, and the ledger a
    // serving layer reads.
    expect(warnings.some((message) => message.includes('could not be reconciled'))).toBe(true);
    const rows = reportedGaps(session);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: 'reported',
      reason: 'other', // the published GapReason union did not grow for this
      principal: 'system',
      request: 'live action store read failed; serving bindings from before the failure',
    });

    // A streak is one broken read, not forty unmet demands.
    live.emit();
    live.emit();
    expect(reportedGaps(session)).toHaveLength(1);
  });

  it('the model is told too — the facts block says the list could not be re-read', () => {
    // The half that was missing. The row reached `gaps()` and `onGap` — the app's
    // triage — and the MODEL, which is looking at the stale list right now, was
    // served it as current fact with nothing said. A warning reaches a console;
    // this reaches the reader who is about to act on the list.
    const live = app();
    const session = twoPageApp(live.store, []);
    const port = skillsAsTools(session);

    expect(session.groundTruth().text).not.toContain('could not re-read');
    live.break();
    live.emit();

    const facts = session.groundTruth().text;
    expect(facts).toContain('could not re-read its own list of actions');
    expect(facts).toContain('may be from before that');
    expect(String(port.call('desk.whats_here', {})['facts'])).toContain('could not re-read');
    // AUTHORED: the row's own `request` is not what crosses — a hand-rolled
    // source could put anything in it, and this block admits no runtime text.
    expect(facts).not.toContain('serving bindings from before the failure');
  });

  it('an ORDINARY reported gap stays out of the facts block — one channel, one meaning', () => {
    // The mark is not a general "tell the model" flag: an unmet-demand row is
    // triage for the app team, and free text besides.
    const live = app();
    const session = twoPageApp(live.store, []);
    session.reportGap({ request: 'I want a bulk export button', principal: 'agent' });
    expect(session.groundTruth().text).not.toContain('bulk export');
    expect(session.groundTruth().text).not.toContain('could not re-read');
  });

  it('a read that works ends the streak, so the NEXT failure is a new fact', () => {
    const live = app();
    const session = twoPageApp(live.store, []);
    live.break();
    live.emit();
    expect(reportedGaps(session)).toHaveLength(1);

    live.fix();
    live.emit(); // recovered — nothing filed for a read that worked
    expect(reportedGaps(session)).toHaveLength(1);

    live.break();
    live.emit();
    expect(reportedGaps(session)).toHaveLength(2);
  });

  it('a read that fails ON A HOP is disclosed the same way, and the hop still stands', () => {
    const live = app();
    const warnings: string[] = [];
    const session = twoPageApp(live.store, warnings);
    live.break();

    const hop = session.sync('archive', { stimulus: 'navigation' });

    // The navigation happened; a store read cannot un-happen it.
    expect(hop).toMatchObject({ changed: true, node: 'archive' });
    expect(session.node).toBe('archive');
    expect(reportedGaps(session)).toHaveLength(1);
    expect(warnings.some((message) => message.includes('could not be reconciled'))).toBe(true);
  });

  it('the FIRST read at attach stays loud — an authoring error still dies at createSession', () => {
    const live = app();
    live.break();
    expect(() => twoPageApp(live.store)).toThrow('store is down');
    expect(live.listenerCount()).toBe(0); // …and a loud death leaks no subscription
  });
});

describe('the hook is severable, and detach releases it', () => {
  it('a port WITHOUT the hook degrades to store emissions only — never throws', () => {
    const live = app();
    const session = buildNavigationGraph('desk', {
      pages: { orders: {}, archive: {} },
    }).createSession({ node: 'orders', onWarn: () => undefined });

    // A hand-rolled port: the three members a live source has always needed,
    // and neither of the two optional ones. (The typed-paths generic is why a
    // delegating port has to widen — a real hand-rolled port drives whatever it
    // drives; this one happens to drive a compiled graph.)
    const wide = session as unknown as LiveBindingPort;
    const port: LiveBindingPort = {
      registerToolGroup: (path, opts) => wide.registerToolGroup(path, opts),
      show: (path) => wide.show(path),
      setVisible: (path, visible) => wide.setVisible(path, visible),
    };
    const detach = fromLiveStore(live.store).attach(port);
    expect(actionIds(session)).toEqual(['orders.refresh']);

    live.goTo('archive');
    session.sync('archive', { stimulus: 'navigation' });
    // No hook, so no re-read: today's behaviour exactly, and the store's own
    // emission is still the app's way to say so.
    expect(actionIds(session)).toEqual([]);
    live.emit();
    expect(actionIds(session)).toEqual(['archive.restore']);
    detach();
  });

  it('detachSources drops the page-change subscription too — a later hop re-reads nothing', () => {
    const live = app();
    const session = twoPageApp(live.store);
    session.detachSources();
    const afterDetach = live.reads();

    live.goTo('archive');
    session.sync('archive', { stimulus: 'navigation' });

    expect(live.reads()).toBe(afterDetach);
    expect(actionIds(session)).toEqual([]);
  });
});

describe('re-entrancy — a reaction never corrupts the hop it is reacting to', () => {
  it('a re-read that mounts a tool leaves the in-flight sync exactly as it was', async () => {
    const live = app();
    const session = twoPageApp(live.store);
    live.goTo('archive');

    const versionBefore = session.version;
    const hop = session.sync('archive', { stimulus: 'navigation' });

    expect(hop.changed).toBe(true);
    if (!hop.changed) return;
    // The record is the hop's own, not the mount's: same fromNode/toNode, and a
    // cursorVersion stamped before the bump the hop itself made.
    expect(hop.transition).toMatchObject({
      fromNode: 'orders',
      toNode: 'archive',
      cursorVersion: versionBefore,
      unverifiedEdge: true,
    });
    expect(hop.node).toBe('archive');
    expect(session.transitions().filter((row) => row.id === hop.transition.id)).toHaveLength(1);

    // The mount's own structure row lands afterwards, coalesced, and moves
    // nothing about where the cursor is.
    await microtasks();
    expect(session.node).toBe('archive');
    expect(actionIds(session)).toEqual(['archive.restore']);
  });

  it('a page-change listener that moves the cursor again does not recurse — the pass runs AGAIN instead', () => {
    const live = app();
    const session = twoPageApp(live.store);
    let hops = 0;
    session.whenPageChanges(() => {
      hops++;
      if (session.node === 'archive') session.sync('orders', { stimulus: 'navigation' });
    });

    session.sync('archive', { stimulus: 'navigation' });

    // The nested hop happened and was recorded; the broadcast did not NEST…
    expect(session.node).toBe('orders');
    expect(session.transitions().map((row) => row.toNode)).toEqual(['archive', 'orders']);
    // …and it was not DROPPED either: the second pass tells every listener where
    // the cursor finally is. Dropping it left a live source that had re-read at
    // 'archive' serving archive's bindings under the name 'orders' — and the
    // worst version of that is a confident empty list.
    expect(hops).toBe(2);
  });

  it('every listener sees the final page, not just the one that moved the cursor', () => {
    const live = app();
    const session = twoPageApp(live.store);
    const seen: string[] = [];
    session.whenPageChanges(() => {
      if (session.node === 'archive') session.sync('orders', { stimulus: 'navigation' });
    });
    session.whenPageChanges(() => {
      seen.push(session.node);
    });

    session.sync('archive', { stimulus: 'navigation' });

    // The second listener ran on the swallowed page first — that is unavoidable,
    // it was already on the stack — and then again on the page the session
    // actually rests on. What it must never do is end on the stale one.
    expect(seen[seen.length - 1]).toBe('orders');
  });

  it('listeners that bounce the cursor forever are stopped, and the library says so', () => {
    const live = app();
    const warnings: string[] = [];
    const session = twoPageApp(live.store, warnings);
    let hops = 0;
    session.whenPageChanges(() => {
      hops++;
      session.sync(session.node === 'archive' ? 'orders' : 'archive', { stimulus: 'navigation' });
    });

    session.sync('archive', { stimulus: 'navigation' });

    // Bounded — a library that spins is worse than one that says it stopped.
    expect(hops).toBeLessThanOrEqual(10);
    expect(warnings.some((message) => message.includes('kept moving the cursor'))).toBe(true);
  });

  it('a throwing listener is isolated: warned, and the hop still happened', () => {
    const live = app();
    const warnings: string[] = [];
    const session = twoPageApp(live.store, warnings);
    session.whenPageChanges(() => {
      throw new Error('listener blew up');
    });

    const hop = session.sync('archive', { stimulus: 'navigation' });
    expect(hop.changed).toBe(true);
    expect(session.node).toBe('archive');
    expect(warnings.some((message) => message.includes('page-change listener threw'))).toBe(true);
  });
});
