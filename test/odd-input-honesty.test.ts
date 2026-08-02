/**
 * WHEN THE APP HANDS THIS LIBRARY SOMETHING ODD.
 *
 * Every door here is one an application calls, and applications are allowed to
 * be wrong: a `null` where a label was meant, a callback riding in a payload, a
 * card asked for a control that was renamed last week, a work row pointed at an
 * id nobody fired. None of those may cost the session a fire, a record, or its
 * honesty — and none of them may be papered over into a value this library made
 * up.
 *
 * THE RULE ALL OF THESE SHARE: a wrong input buys a WARNING plus an ABSENCE,
 * never a substitute. `busy` that is not words says nothing about the control
 * rather than "working". A work row that cannot be tied to a fire says it is
 * unbound rather than naming the newest one. A card for an unknown id shows the
 * id itself rather than borrowing another action's description.
 *
 * AND WHAT MUST SURVIVE: a payload the structured-clone algorithm refuses is
 * still the payload of a fire that really happened. The settlement keeps the
 * reference rather than losing the receipt — best effort on the copy, never a
 * lost record.
 *
 * The ask book's own bookkeeping is pinned here for the same reason: one open
 * card belongs to ONE control, and outside `requireHumanApproval` it is not
 * bound to an input at all. Both are what the enforcement tests silently assume.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import type { FireResult, FireSettlement, NavigationGraph } from '../src/index.js';

/** A writing desk: one saving control, two that ask before they act. */
function deskMap(): NavigationGraph {
  return buildNavigationGraph('desk', {
    pages: {
      home: {
        actions: {
          save: {
            does: 'Save the draft',
            when: { signedIn: { eq: true } },
            writes: ['savedAt', 'title'],
          },
          wipe: { does: 'Wipe the desk', confirm: true },
          publish: { does: 'Publish the draft', confirm: true },
        },
      },
    },
  });
}

function desk(opts?: Record<string, unknown>) {
  const warnings: string[] = [];
  const session = deskMap().createSession({
    node: 'home',
    state: { signedIn: true },
    onWarn: (message) => warnings.push(message),
    ...(opts ?? {}),
  });
  return { session, warnings };
}

const rowFor = (session: { available(): { edges: { affordanceId: string }[] } }, id: string) =>
  session.available().edges.find((edge) => edge.affordanceId === id);

describe('a control state the app described with something that is not words', () => {
  it('says nothing about the control, and names the shape it wanted — once', () => {
    const { session, warnings } = desk();
    const handle = session.registerActions('home', { handlers: { save: () => undefined } });
    handle.setBusy('save', null as unknown as string);

    expect(rowFor(session, 'home.save')).not.toHaveProperty('busy');
    expect(warnings).toEqual([
      expect.stringContaining("busy for 'home.save' was a value, not a label"),
    ]);
  });
});

describe('a payload this library cannot copy', () => {
  it('never costs the fire its receipt — the settlement keeps the app’s own reference', async () => {
    const { session } = desk();
    session.registerActions('home', { handlers: { wipe: () => undefined } });
    const onDone = (): void => undefined;

    const fired = session.fire('home.wipe', { source: 'user', payload: { onDone } });
    expect(fired.ok).toBe(true);
    const settled = await (fired as Extract<FireResult, { ok: true }>).whenSettled;
    expect((settled as FireSettlement).transition.payload).toEqual({ onDone });
  });
});

describe('two components holding a reader for the same control', () => {
  it('the survivor keeps answering after the other one unmounts', () => {
    const { session } = desk();
    session.registerActions('home', { handlers: { save: () => undefined } });
    const first = session.registerActions('home', { holds: { save: () => 'the first draft' } });
    session.registerActions('home', { holds: { save: () => 'the twin draft' } });

    first.unregister(); // only ITS reader goes
    expect(rowFor(session, 'home.save')).toMatchObject({ holds: 'the twin draft' });
  });
});

describe('an unmet ask the app files itself', () => {
  it('records the note the app wrote, capped like every other app string', () => {
    const { session } = desk();
    const row = session.reportGap({ request: 'export as PDF', note: 'x'.repeat(600) });

    expect(row.note).toHaveLength(500);
    expect(session.gaps().at(-1)).toMatchObject({ kind: 'reported', request: 'export as PDF' });
  });
});

describe('the ask book’s bookkeeping', () => {
  it('gives each control its own card, and reuses a control’s own open one', () => {
    const { session } = desk();
    const wipe = session.confirmAsk('home.wipe', { source: 'agent' });
    const publish = session.confirmAsk('home.publish', { source: 'agent' });

    expect(publish.askId).not.toBe(wipe.askId); // one open card never answers for another action
    expect(session.confirmAsk('home.wipe', { source: 'agent' }).askId).toBe(wipe.askId);
  });

  it('outside requireHumanApproval, the pointer is the control’s open card whatever input is asked about', () => {
    const { session } = desk();
    const { askId } = session.confirmAsk('home.wipe', { source: 'agent' });

    expect(session.openAskFor('home.wipe')).toBe(askId);
    expect(session.openAskFor('home.wipe', { input: { anything: true } })).toBe(askId);
    expect(session.openAskFor('home.publish')).toBeUndefined();
  });

  it('under enforcement a relayed decline with no card open is still recorded, and opens nothing', () => {
    const { session } = desk({ requireHumanApproval: true });
    const row = session.declineConfirm('home.wipe', { principal: 'agent' });

    expect(row).toMatchObject({ kind: 'declined', affordanceId: 'home.wipe' });
    expect(row.askId).toEqual(expect.any(String));
    expect(session.asks()).toEqual([]); // a report, not a card the human now has
  });

  it('a card for an id the graph does not have shows that id, and invents no conditions', () => {
    const { session } = desk();
    const { receipts } = session.confirmAsk('home.renamed-last-week', { source: 'agent' });

    expect(receipts.willDo.does).toBe('home.renamed-last-week');
    expect(receipts.because).toEqual([]);
    expect(receipts.becauseUnevaluated).toBeUndefined();
  });
});

describe('a piece of work pointed at an id nobody fired', () => {
  it('is recorded UNBOUND, with a warning that names the fix rather than guessing an action', () => {
    const { session, warnings } = desk();
    const work = session.beginWork(undefined, { transitionId: 'never-fired#9' });

    expect(warnings).toEqual([
      expect.stringContaining('names no transition in this session'),
    ]);
    expect(session.openWork().at(-1)).not.toHaveProperty('affordanceId');
    work.done();
  });
});

describe('a state report the library had to infer an action for', () => {
  it('carries the same unevaluated-condition marker a fired one would', () => {
    // Nothing seeded `signedIn`, so 'save's guard cannot be judged — the
    // inference still runs (taken on faith is not failed) and says so.
    const session = deskMap().createSession({ node: 'home', state: {}, onWarn: () => undefined });
    session.registerActions('home', { handlers: { save: () => undefined } });
    const reported = session.updateState({ savedAt: 1, title: 'Draft one' });

    expect(reported.ok).toBe(true);
    expect(reported.ok && reported.transition.cause).toMatchObject({
      affordanceId: 'home.save',
      inferred: true,
    });
    expect(reported.ok && reported.transition.guardUnevaluated).toEqual(['signedIn']);
  });
});
