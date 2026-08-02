/**
 * `useWorking` — THE APP'S OWN SPINNER FLAG, ON THE LEDGER, AND NOTHING INVENTED.
 *
 * The core already had both halves: `beginWork`/`done` for the work ledger, and
 * `setBusy` for the label a model reads on the action row. A React component
 * already had the boolean it renders its own spinner from. This hook is the
 * lifecycle between them, so each law below is one edge of that boolean and the
 * answer is always "exactly what the app said, once".
 *
 * WHAT THE SHAPE REFUSES, and why each refusal is a test:
 *
 * - IT CANNOT FAKE A SUCCESS. The two doors it drives settle nothing. `done()`
 *   does not resolve a latch even carrying an error — the core's load-bearing
 *   refusal — and it is pinned again from this side, because a hook is exactly
 *   the place someone would later be tempted to "helpfully" close the loop.
 * - IT NEVER MINTS A VERDICT FROM SILENCE. A component going away is not the
 *   work ending, so unmount does NOT close the row. The label IS taken back,
 *   because the thing keeping that claim true is gone. Two subjects, one
 *   principle, opposite answers — and the pair is asserted together, so nobody
 *   can "make them consistent" without a test saying which one they broke.
 * - IT RE-DECIDES NOTHING. A label the core refuses is refused by the CORE, with
 *   the core's own warning; the unbound-work teaching is not suppressed; a
 *   repeated label is deduped by the registry rather than by a second guard here.
 * - NO ROW IS EVER REUSED. Two episodes of work at two different times are two
 *   facts, so a flag that flaps writes a row per cycle — never one reused, and
 *   never a dedupe by recency (the correlation law this library keeps everywhere).
 * - STRICTMODE'S DOUBLE-INVOKE IS ONE PIECE OF WORK. The edge detector is a ref,
 *   which survives the simulated remount, so the row is re-adopted rather than
 *   opened twice — and the label comes straight back.
 *
 * MUTATION PROOFS — every one below was RUN, and the counts are what it did:
 * - Close the row on unmount (`open.current?.done()` in the teardown) → 3 red:
 *   the pair, the row that outlives the component, and the StrictMode mount —
 *   whose simulated teardown would close a row that is about to be re-adopted.
 * - Leave the busy label standing at unmount → 1 red (the pair, which is where
 *   the two subjects are asserted together on purpose).
 * - Drop the open-row ref guard and let the every-commit effect open one → 3 red.
 * - Keep the guard's job but move it into a dependency list (`[busy]`) → 1 red:
 *   the StrictMode mount-already-busy row, opened twice. That single red is the
 *   whole case for the ref, and it is why the case is written down here.
 * - Never clear the ref after a close, so one row is reused → 2 red.
 * - Read `error` at the rise instead of the fall → 2 red.
 * - Hand the core `{ transitionId: undefined }` instead of no options → 1 red.
 *   The row lands identically (the core reads the key by the value in it), so
 *   this is pinned at the CALL rather than at the ledger: "explicit wins" is a
 *   rule about what the caller said, and an object saying nothing is not a thing
 *   a caller said.
 * - Swallow a late `transitionId` in silence (drop the warning) → 3 red. The ROW
 *   is right either way — that is the point of the mutation: what breaks is only
 *   the teaching, which is exactly the failure a passing suite can hide.
 * - Warn on every late commit instead of once → 1 red.
 * - Warn whenever an id is present while a row is open (drop the "different from
 *   what it opened with" half) → 2 red, one of them StrictMode's remount, which
 *   would otherwise be scolded for React's own double-invoke.
 * - Record the id at the rise but never read it back → 2 red, the same pair.
 * - Forward `error` exactly as written (no null normalization) → 1 red.
 * - Guard only `undefined` in `controlsOf` → 1 red, and it is a THROW rather than
 *   an assertion: the component comes down inside an effect.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Fragment, createElement, StrictMode } from 'react';
import type { ReactElement } from 'react';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { InteractionSession, NavigationGraph, ActionHandle } from '../src/index.js';
import { useWorking } from '../src/react/index.js';
import type { WorkingSession, WorkingSpec } from '../src/react/index.js';
import { WhileRendering, mountTree } from './react-fixture.js';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** The component every test mounts: the hook, and nothing else in the way. */
function Working(props: { spec: WorkingSpec }): null {
  useWorking(props.spec);
  return null;
}

function deskMap(): NavigationGraph {
  return buildNavigationGraph('desk', {
    pages: {
      compose: {
        actions: {
          save: { does: 'Save the draft', writes: ['draft'] },
          discard: { does: 'Throw the draft away' },
        },
      },
    },
  });
}

interface Wired {
  session: InteractionSession;
  save: ActionHandle;
  discard: ActionHandle;
  warnings: string[];
  /** The app's word on one action row, as an in-process caller reads it. */
  busyOf(action: string): string | undefined;
}

function wired(): Wired {
  const warnings: string[] = [];
  const session = deskMap().createSession({
    node: 'compose',
    state: { draft: null },
    onWarn: (message: string) => warnings.push(message),
  });
  return {
    session,
    save: session.registerAction('compose', 'save', { does: 'Save the draft', handler: () => undefined }),
    discard: session.registerAction('compose', 'discard', { does: 'Throw the draft away', handler: () => undefined }),
    warnings,
    busyOf: (action) => session.available().edges.find((edge) => edge.affordanceId === action)?.busy,
  };
}

type WorkCall =
  | { kind: 'begin'; label: string | undefined; transitionId: string | undefined; named: boolean }
  | { kind: 'done'; error: unknown };

/**
 * The real session, observed at the seam the hook actually drives.
 *
 * `openWork()` cannot answer "was `done` called with an error" — the core serves
 * a closed row through no door at all, deliberately (a closed row's error is the
 * app's word about WORK, and every door that could carry it answers about a
 * FIRE). The only place that question is observable is the call itself, and
 * `WorkingSession` is precisely the seam to observe it at. Everything delegates,
 * so the ledger under test is still the real one.
 */
function recordWork(session: InteractionSession): { port: WorkingSession; calls: WorkCall[] } {
  const calls: WorkCall[] = [];
  const port: WorkingSession = {
    beginWork: (label, opts) => {
      calls.push({
        kind: 'begin',
        label,
        transitionId: opts?.transitionId,
        // Presence of the OPTIONS object, kept apart from the id inside it: the
        // hook's claim is that it hands over no options at all when the app
        // named no fire, rather than an object with an undefined key in it.
        named: opts !== undefined,
      });
      const handle = session.beginWork(label, opts);
      return {
        workId: handle.workId,
        done: (error?: unknown) => {
          calls.push({ kind: 'done', error });
          handle.done(error);
        },
      };
    },
    warn: (message: string) => session.warn(message),
  };
  return { port, calls };
}

/** Fire in-process and hand back the id the component would hold. */
function fireIt(session: InteractionSession, action = 'compose.save'): string {
  const fired = session.fire(action, { source: 'user' });
  if (!fired.ok) throw new Error(`fixture fire failed: ${fired.reason}`);
  return fired.transition.id;
}

/** One mounted component, with the spec a real render would produce. */
function working(spec: WorkingSpec): ReactElement {
  return createElement(Working, { spec });
}

// ---------------------------------------------------------------------------
// The rising edge — one row, and the app's words on the control
// ---------------------------------------------------------------------------

describe('the flag going up says the app is working', () => {
  it('opens exactly one work row, in the app’s own words', () => {
    const { session, save } = wired();

    const tree = mountTree(working({ busy: false, label: 'Saving your draft…', actions: save, session }));
    expect(session.openWork(), 'a flag that is down says nothing').toEqual([]);

    tree.render(working({ busy: true, label: 'Saving your draft…', actions: save, session }));

    expect(session.openWork()).toEqual([
      {
        workId: expect.any(String),
        label: 'Saving your draft…',
        startedAt: expect.any(Number),
        // UNBOUND, at the honest floor: an effect runs long after any handler's
        // call window, so there is no fire this hook is inside of.
        principal: 'system',
      },
    ]);
  });

  it('stands the same label on every control the component pointed at', () => {
    const { session, save, discard, busyOf } = wired();

    mountTree(working({ busy: true, label: 'Saving…', actions: [save, discard], session }));

    expect(busyOf('compose.save')).toBe('Saving…');
    expect(busyOf('compose.discard')).toBe('Saving…');
  });

  it('mounting ALREADY busy is a rise — the component that mounts mid-flight says so', () => {
    const { session, save, busyOf } = wired();

    mountTree(working({ busy: true, label: 'Placing your order', actions: save, session }));

    expect(session.openWork()).toHaveLength(1);
    expect(busyOf('compose.save')).toBe('Placing your order');
  });

  it('with no controls at all the ledger still moves, and nothing is labelled', () => {
    const { session, busyOf } = wired();

    mountTree(working({ busy: true, label: 'Syncing in the background', session }));

    expect(session.openWork()).toHaveLength(1);
    expect(busyOf('compose.save'), 'work no control stands for labels no control').toBeUndefined();
  });

  it('a JS caller’s null actions is "no controls" — not a TypeError from inside an effect', () => {
    const { session, busyOf } = wired();

    // Untyped callers are not held to `WorkingSpec`, and `actions: null` is how
    // half of them write "none": `'setBusy' in null` throws, from an effect,
    // which trips an error boundary and teaches nothing. The core tolerates the
    // JS caller at every other crossing (a non-string label keeps its row); this
    // is the same duty one layer out.
    mountTree(
      working({ busy: true, label: 'Syncing in the background', actions: null, session } as unknown as WorkingSpec),
    );

    expect(session.openWork()).toHaveLength(1);
    expect(busyOf('compose.save')).toBeUndefined();
  });

  it('a named transitionId binds the row exactly, and nothing else is passed', () => {
    const { session, save } = wired();
    const id = fireIt(session);
    const { port, calls } = recordWork(session);

    mountTree(working({ busy: true, label: 'Saving…', actions: save, session: port, transitionId: id }));

    expect(session.openWork()).toEqual([
      {
        workId: expect.any(String),
        label: 'Saving…',
        transitionId: id,
        affordanceId: 'compose.save',
        // The bound fire's captured name rides along — authored spec text, not
        // anything the binding passed.
        does: 'Save the draft',
        startedAt: expect.any(Number),
        principal: 'user',
      },
    ]);
    expect(calls).toEqual([{ kind: 'begin', label: 'Saving…', transitionId: id, named: true }]);
  });

  it('and with no id it hands over no options at all — the arm the core takes when nobody said', () => {
    const { session, save } = wired();
    const { port, calls } = recordWork(session);

    mountTree(working({ busy: true, label: 'Saving…', actions: save, session: port }));

    expect(calls).toEqual([{ kind: 'begin', label: 'Saving…', transitionId: undefined, named: false }]);
  });

  it('the core’s unbound-work teaching is not suppressed by the skin', () => {
    const { session, save, warnings } = wired();

    mountTree(working({ busy: true, label: 'Saving…', actions: save, session }));

    expect(warnings.filter((line) => line.includes('UNBOUND'))).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// The falling edge — completion and outcome, together
// ---------------------------------------------------------------------------

describe('the flag coming down ends what the flag going up started', () => {
  it('closes the row and takes the label back', () => {
    const { session, save, busyOf } = wired();

    const tree = mountTree(working({ busy: true, label: 'Saving…', actions: save, session }));
    tree.render(working({ busy: false, label: 'Saving…', actions: save, session }));

    expect(session.openWork()).toEqual([]);
    expect(busyOf('compose.save')).toBeUndefined();
  });

  it('an absent error is a clean close — silence is not a failure', () => {
    const { session, save } = wired();
    const { port, calls } = recordWork(session);

    const tree = mountTree(working({ busy: true, label: 'Saving…', actions: save, session: port }));
    tree.render(working({ busy: false, label: 'Saving…', actions: save, session: port }));

    expect(calls.filter((call) => call.kind === 'done')).toEqual([{ kind: 'done', error: undefined }]);
  });

  it('an error PRESENT at fall time is the one the row records', () => {
    const { session, save } = wired();
    const { port, calls } = recordWork(session);
    const failed = new Error('the save failed');

    const tree = mountTree(working({ busy: true, label: 'Saving…', actions: save, session: port }));
    // The ordinary shape of a `catch`: React batches both updates into ONE
    // commit, which is what makes "completion and outcome arrive together" the
    // default rather than a rule to remember.
    tree.render(working({ busy: false, label: 'Saving…', error: failed, actions: save, session: port }));

    expect(calls.filter((call) => call.kind === 'done')).toEqual([{ kind: 'done', error: failed }]);
  });

  it('a null error is an ABSENT one — React’s own way of saying nothing went wrong', () => {
    const { session, save } = wired();
    const { port, calls } = recordWork(session);

    // `mutation.error` is `null`, not `undefined`, on every clean settle — and
    // the hook's own headline example passes exactly that field. Forwarded as
    // written it would put a present-but-empty failure on a row that succeeded:
    // the example shipping the bug.
    const tree = mountTree(working({ busy: true, label: 'Saving…', error: null, actions: save, session: port }));
    tree.render(working({ busy: false, label: 'Saving…', error: null, actions: save, session: port }));

    expect(calls.filter((call) => call.kind === 'done')).toEqual([{ kind: 'done', error: undefined }]);
  });

  it('and nothing else is normalized — a falsy error the app rendered is still the app’s word', () => {
    const { session, save } = wired();
    const { port, calls } = recordWork(session);

    // The line is drawn at React's own spelling of absence and nowhere else. An
    // app whose error channel carries a string, a code, an empty one — that is a
    // value it chose to render, and a hook that decided which of them "count"
    // would be judging the app's own bookkeeping.
    const tree = mountTree(working({ busy: true, label: 'Saving…', actions: save, session: port }));
    tree.render(working({ busy: false, label: 'Saving…', error: '', actions: save, session: port }));

    expect(calls.filter((call) => call.kind === 'done')).toEqual([{ kind: 'done', error: '' }]);
  });

  it('an error the app never clears closes the NEXT episode too — read at the fall, never remembered', () => {
    const { session, save } = wired();
    const { port, calls } = recordWork(session);
    const failed = new Error('the first attempt');
    const spec = (busy: boolean, error?: unknown): WorkingSpec => ({
      busy,
      label: 'Saving…',
      error,
      actions: save,
      session: port,
    });

    const tree = mountTree(working(spec(true)));
    tree.render(working(spec(false, failed))); // episode one ended badly
    tree.render(working(spec(true, failed))); // episode two begins, the error still on screen
    tree.render(working(spec(false, failed))); // and is still there when it ends

    // EXACTLY what the field says it is — whatever is rendered on the commit
    // where the flag fell — and the cure belongs to the app: a data layer that
    // resets its own error per attempt (React Query does) is already right, and
    // a hand-rolled one clears it where it sets the flag. A hook that decided
    // "this looks like the same error, so it cannot be a new failure" would be
    // minting a fact about two objects it knows nothing about.
    expect(calls.filter((call) => call.kind === 'done')).toEqual([
      { kind: 'done', error: failed },
      { kind: 'done', error: failed },
    ]);
  });

  it('an error that arrives only at the RISE never reaches the close', () => {
    const { session, save } = wired();
    const { port, calls } = recordWork(session);
    const stale = new Error('the previous attempt');

    // A component that still renders last time's error while the retry runs. The
    // row is about THIS attempt, so the fall is what is read — and by then the
    // app has cleared it.
    const tree = mountTree(working({ busy: true, label: 'Saving…', error: stale, actions: save, session: port }));
    tree.render(working({ busy: false, label: 'Saving…', actions: save, session: port }));

    expect(calls.filter((call) => call.kind === 'done')).toEqual([{ kind: 'done', error: undefined }]);
  });
});

// ---------------------------------------------------------------------------
// The id is read where the row OPENS — and a late one is refused OUT LOUD
// ---------------------------------------------------------------------------

describe('an id that arrives after the rise', () => {
  it('does not move the row it missed — and is not dropped in silence either', () => {
    const { session, save, warnings } = wired();
    const { port, calls } = recordWork(session);
    const id = fireIt(session);

    // The shape a mutation library actually produces: `isPending` flips true
    // where the app calls it, and the id only exists once the function that
    // fires has run — one commit later. The row was already standing by then.
    const tree = mountTree(working({ busy: true, label: 'Saving…', actions: save, session: port }));
    tree.render(working({ busy: true, label: 'Saving…', actions: save, session: port, transitionId: id }));

    expect(calls, 'one row, opened once, with what was in hand then').toEqual([
      { kind: 'begin', label: 'Saving…', transitionId: undefined, named: false },
    ]);
    expect(session.openWork()).toEqual([
      { workId: expect.any(String), label: 'Saving…', startedAt: expect.any(Number), principal: 'system' },
    ]);
    // The honest half is the row; this is the other half. An input the app
    // plainly meant, refused without a word, is the shape of a library that
    // looks correct and teaches nothing.
    expect(warnings.filter((line) => line.includes('ALREADY OPEN'))).toHaveLength(1);
  });

  it('says it once however many commits repeat it, and carries none of the app’s own text', () => {
    const { session, save, warnings } = wired();
    const id = fireIt(session);
    const spec = (transitionId?: string): WorkingSpec => ({
      busy: true,
      label: 'SENTINEL-label',
      actions: save,
      session,
      transitionId,
    });

    const tree = mountTree(working(spec()));
    tree.render(working(spec(id)));
    tree.render(working(spec(id)));
    tree.render(working(spec(id)));

    const late = warnings.filter((line) => line.includes('ALREADY OPEN'));
    // A component wired this way is late on EVERY commit and every episode; a
    // warning per occurrence would repeat one lesson for as long as the screen
    // lives, which is how a warning becomes noise somebody filters out.
    expect(late).toHaveLength(1);
    expect(late[0], 'a warning is one of the places runtime text must not ride').not.toContain('SENTINEL-label');
    expect(late[0], 'and the id is the app’s string too').not.toContain(id);
  });

  it('the same id, said again while the row stands, is not a mistake and says nothing', () => {
    const { session, save, warnings } = wired();
    const id = fireIt(session);
    const spec = (): WorkingSpec => ({ busy: true, label: 'Saving…', actions: save, session, transitionId: id });

    const tree = mountTree(working(spec()));
    tree.render(working(spec()));
    tree.render(working(spec()));

    expect(warnings.filter((line) => line.includes('ALREADY OPEN'))).toEqual([]);
    expect(session.openWork()[0]!.transitionId, 'the row bound at the rise, as it always did').toBe(id);
  });

  it('a DIFFERENT id mid-row is refused the same way — two fires are not one row', () => {
    const { session, save, warnings } = wired();
    const { port, calls } = recordWork(session);
    const first = fireIt(session);
    const second = fireIt(session);
    const spec = (transitionId: string): WorkingSpec => ({
      busy: true,
      label: 'Saving…',
      actions: save,
      session: port,
      transitionId,
    });

    const tree = mountTree(working(spec(first)));
    tree.render(working(spec(second)));

    expect(calls).toEqual([{ kind: 'begin', label: 'Saving…', transitionId: first, named: true }]);
    expect(session.openWork()[0]!.transitionId, 'the row keeps the fire it was opened for').toBe(first);
    expect(warnings.filter((line) => line.includes('ALREADY OPEN'))).toHaveLength(1);
  });

  it('and the NEXT rise reads whatever is in hand then — the id is late, never lost', () => {
    const { session, save, warnings } = wired();
    const { port, calls } = recordWork(session);
    const id = fireIt(session);
    const spec = (busy: boolean, transitionId?: string): WorkingSpec => ({
      busy,
      label: 'Saving…',
      actions: save,
      session: port,
      transitionId,
    });

    const tree = mountTree(working(spec(true))); // nothing named yet — unbound, honestly
    tree.render(working(spec(false, id))); // the fall closes the row it opened
    tree.render(working(spec(true, id))); // a second episode, and this one knows

    expect(calls.filter((call) => call.kind === 'begin')).toEqual([
      { kind: 'begin', label: 'Saving…', transitionId: undefined, named: false },
      { kind: 'begin', label: 'Saving…', transitionId: id, named: true },
    ]);
    expect(session.openWork()[0]!.transitionId).toBe(id);
    expect(warnings.filter((line) => line.includes('ALREADY OPEN')), 'nothing was refused here').toEqual([]);
  });

  it('a StrictMode remount re-adopting its row does not read the id as a late one', () => {
    const { session, save, warnings } = wired();
    const id = fireIt(session);

    // setup → teardown → setup, with the SAME id in the spec throughout: the
    // second setup finds the row it opened and must recognise the id on it,
    // not mistake React's own double-invoke for an app changing its mind.
    mountTree(
      createElement(
        StrictMode,
        null,
        working({ busy: true, label: 'Saving…', actions: save, session, transitionId: id }),
      ),
    );

    expect(warnings.filter((line) => line.includes('ALREADY OPEN'))).toEqual([]);
    expect(session.openWork()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// THE LOAD-BEARING REFUSAL — this hook can never report that something worked
// ---------------------------------------------------------------------------

describe('closing a work row is never a verdict about a fire', () => {
  it('a fall carrying an error settles nothing — the fire is still pending', async () => {
    const { session, save } = wired();
    const port = serveToAgent(session);
    const fired = session.fire('compose.save', { source: 'user' });
    if (!fired.ok) throw new Error('fixture');
    const id = fired.transition.id;
    await flush();

    let settledWith: unknown;
    void fired.whenSettled.then((settlement) => (settledWith = settlement));

    const tree = mountTree(
      working({ busy: true, label: 'Saving…', actions: save, session, transitionId: id }),
    );
    tree.render(
      working({
        busy: false,
        label: 'Saving…',
        error: new Error('the save failed'),
        actions: save,
        session,
        transitionId: id,
      }),
    );
    await flush();

    expect(settledWith, 'the settlement promise is still open').toBeUndefined();
    expect(session.settlementIfKnown(id)).toBeUndefined();
    expect(session.transitions().find((row) => row.id === id)!.outcome).toBe('pending');
    expect(session.pending().map((row) => row.id)).toEqual([id]);
    expect(port.call('desk.did_it_work', { transitionId: id })).toMatchObject({
      settled: false,
      judgment: 'still-pending',
    });
  });

  it('and a clean fall does not report a success either', async () => {
    const { session, save } = wired();
    const port = serveToAgent(session);
    const id = fireIt(session);
    await flush();

    const tree = mountTree(working({ busy: true, label: 'Saving…', actions: save, session, transitionId: id }));
    tree.render(working({ busy: false, label: 'Saving…', actions: save, session, transitionId: id }));
    await flush();

    expect(session.settlementIfKnown(id)).toBeUndefined();
    expect(port.call('desk.did_it_work', { transitionId: id })).toMatchObject({ judgment: 'still-pending' });
  });

  it('the subpath names no door that could settle one', () => {
    // The structural half of the same promise, in the file rather than in a
    // rule: a later "helpful" close-the-loop edit has to name one of these.
    const code = readFileSync('src/react/use-working.ts', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    for (const door of ['updateState', 'reject', 'settlementOf', 'whenSettled', 'fire(', 'sync(']) {
      expect(code, `use-working.ts names ${door}`).not.toContain(door);
    }
  });
});

// ---------------------------------------------------------------------------
// Flapping — two episodes are two facts
// ---------------------------------------------------------------------------

describe('every rise is its own piece of work', () => {
  it('a flag that flaps writes a row per cycle — never one reused', () => {
    const { session, save } = wired();
    const { port, calls } = recordWork(session);
    const spec = (busy: boolean): WorkingSpec => ({ busy, label: 'Saving…', actions: save, session: port });

    const tree = mountTree(working(spec(true)));
    const first = session.openWork()[0]!.workId;
    tree.render(working(spec(false)));
    tree.render(working(spec(true)));
    const second = session.openWork()[0]!.workId;

    expect(second, 'a second episode is a second row, not the first one warmed up').not.toBe(first);
    expect(calls.map((call) => call.kind)).toEqual(['begin', 'done', 'begin']);

    tree.render(working(spec(false)));
    expect(session.openWork()).toEqual([]);
    expect(calls.map((call) => call.kind)).toEqual(['begin', 'done', 'begin', 'done']);
  });

  it('a flag held up across re-renders is still ONE row', () => {
    const { session, save } = wired();
    const { port, calls } = recordWork(session);
    const spec = (): WorkingSpec => ({ busy: true, label: 'Saving…', actions: save, session: port });

    const tree = mountTree(working(spec()));
    tree.render(working(spec()));
    tree.render(working(spec()));

    expect(calls).toHaveLength(1);
    expect(session.openWork()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// The unmount asymmetry — what is unknown stays open, what was claimed is taken back
// ---------------------------------------------------------------------------

describe('a component going away is not the work ending', () => {
  it('THE PAIR: the row stays open and the label is cleared', () => {
    const { session, save, busyOf } = wired();
    const { port, calls } = recordWork(session);

    const tree = mountTree(working({ busy: true, label: 'Uploading the photo', actions: save, session: port }));
    tree.unmount();

    // Nobody said the upload finished, so nothing here says it did. The row is
    // visible in openWork() for the session's life, by design.
    expect(session.openWork()).toHaveLength(1);
    expect(calls.some((call) => call.kind === 'done'), 'a verdict minted from silence').toBe(false);
    // The claim about the CONTROL had a keeper, and the keeper is gone.
    expect(busyOf('compose.save')).toBeUndefined();
  });

  it('says so once, and the warning is authored text carrying none of the app’s', () => {
    const { session, save, warnings } = wired();

    const tree = mountTree(working({ busy: true, label: 'SENTINEL-label', actions: save, session }));
    tree.unmount();

    const torn = warnings.filter((line) => line.includes('torn down while its work row was still open'));
    expect(torn).toHaveLength(1);
    expect(torn[0], 'a warning is one of the places runtime text must not ride').not.toContain('SENTINEL-label');
  });

  it('unmounting with nothing open says nothing at all', () => {
    const { session, save, warnings, busyOf } = wired();

    const tree = mountTree(working({ busy: true, label: 'Saving…', actions: save, session }));
    tree.render(working({ busy: false, label: 'Saving…', actions: save, session }));
    tree.unmount();

    expect(warnings.filter((line) => line.includes('torn down'))).toEqual([]);
    expect(session.openWork()).toEqual([]);
    expect(busyOf('compose.save')).toBeUndefined();
  });

  it('a row left open is still the app’s claim to close — the handle it was opened with works', () => {
    // The documented cure, asserted: nothing here strands the work. The app that
    // owns it closes it from wherever it owns it.
    const { session, save } = wired();
    const tree = mountTree(working({ busy: true, label: 'Uploading', actions: save, session }));
    tree.unmount();

    expect(session.openWork()).toHaveLength(1);
    session.beginWork('a second thing');
    expect(session.openWork()).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// StrictMode — a double-invoke is one piece of work
// ---------------------------------------------------------------------------

describe('React’s development double-invoke does not double-register anything', () => {
  it('a mount ALREADY busy under StrictMode writes ONE row, and the label comes back', () => {
    const { session, save, busyOf } = wired();
    const { port, calls } = recordWork(session);

    // React's own order: setup, teardown, setup — every effect, not just the
    // ones whose dependencies changed.
    mountTree(
      createElement(StrictMode, null, working({ busy: true, label: 'Saving…', actions: save, session: port })),
    );

    expect(session.openWork(), 'one piece of work, whatever React did to the effects').toHaveLength(1);
    expect(calls.filter((call) => call.kind === 'begin')).toHaveLength(1);
    expect(calls.some((call) => call.kind === 'done'), 'the simulated teardown is not a completion').toBe(false);
    expect(busyOf('compose.save'), 'the label is re-said after the simulated remount').toBe('Saving…');
  });

  it('a rise AFTER a StrictMode mount is one row too', () => {
    const { session, save } = wired();
    const { port, calls } = recordWork(session);
    const spec = (busy: boolean): WorkingSpec => ({ busy, label: 'Saving…', actions: save, session: port });

    const tree = mountTree(createElement(StrictMode, null, working(spec(false))));
    tree.render(createElement(StrictMode, null, working(spec(true))));

    expect(calls.filter((call) => call.kind === 'begin')).toHaveLength(1);
    expect(session.openWork()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// The label — the app's word, said once
// ---------------------------------------------------------------------------

describe('the label is the app’s word, and this hook only carries it', () => {
  it('a re-render that says the same thing moves no version', async () => {
    const { session, save } = wired();
    const spec = (): WorkingSpec => ({ busy: true, label: 'Saving…', actions: save, session });

    const tree = mountTree(working(spec()));
    await flush();
    let structure = 0;
    session.on('structure', () => (structure += 1));

    tree.render(working(spec()));
    tree.render(working(spec()));
    await flush();

    expect(structure, 'saying the same thing twice is not world motion').toBe(0);
  });

  it('and rewording it IS world motion, once, however many renders said it', async () => {
    const { session, save } = wired();

    const tree = mountTree(working({ busy: true, label: 'Saving…', actions: save, session }));
    await flush();
    let structure = 0;
    session.on('structure', () => (structure += 1));

    tree.render(working({ busy: true, label: 'Still saving…', actions: save, session }));
    tree.render(working({ busy: true, label: 'Still saving…', actions: save, session }));
    await flush();

    expect(structure, 'the served row reads differently, so a plan made against it is stale').toBe(1);
  });

  it('rewording it while working moves the word and does not open a second row', () => {
    const { session, save, busyOf } = wired();

    const tree = mountTree(working({ busy: true, label: 'Saving…', actions: save, session }));
    const workId = session.openWork()[0]!.workId;
    tree.render(working({ busy: true, label: 'Still saving…', actions: save, session }));

    expect(busyOf('compose.save')).toBe('Still saving…');
    expect(session.openWork().map((row) => row.workId)).toEqual([workId]);
    expect(session.openWork()[0]!.label, 'the row keeps the words the work STARTED under').toBe('Saving…');
  });

  it('a control dropped from the list gets its label taken back', () => {
    const { session, save, discard, busyOf } = wired();

    const tree = mountTree(working({ busy: true, label: 'Saving…', actions: [save, discard], session }));
    expect(busyOf('compose.discard')).toBe('Saving…');

    tree.render(working({ busy: true, label: 'Saving…', actions: [save], session }));

    expect(busyOf('compose.discard'), 'this hook stopped being what kept it true').toBeUndefined();
    expect(busyOf('compose.save')).toBe('Saving…');
  });

  it('a GROUP is labelled through the one-line adapter the docs print', () => {
    // `registerActions` is the library's main mount door and its handle names
    // the action first, so it is deliberately not assignable here — a two-argument
    // `setBusy` would otherwise be called with the label as the actionId and
    // quietly label nothing. This is the documented way to point at one action in
    // a group, asserted so the printed line is a line that runs.
    const session = deskMap().createSession({ node: 'compose', state: { draft: null }, onWarn: () => undefined });
    const group = session.registerActions('compose', {
      handlers: { save: () => undefined, discard: () => undefined },
    });
    const busyOf = (action: string): string | undefined =>
      session.available().edges.find((edge) => edge.affordanceId === action)?.busy;
    // Held steady across renders, which is what the docs say to do and what the
    // test below shows the cost of not doing.
    const saving = { setBusy: (label: string | undefined) => group.setBusy('save', label) };

    const tree = mountTree(working({ busy: true, label: 'Saving…', actions: saving, session }));

    expect(busyOf('compose.save')).toBe('Saving…');
    expect(busyOf('compose.discard'), 'the adapter names one action, and only that one').toBeUndefined();

    tree.render(working({ busy: false, label: 'Saving…', actions: saving, session }));
    expect(busyOf('compose.save')).toBeUndefined();
  });

  it('an adapter rebuilt every render costs nothing either — the core absorbs the churn', async () => {
    // Object identity is the only thing that can say "this is the control I
    // already spoke to" — a `setBusy` closure cannot be compared any other way —
    // so an adapter written inline is honestly a NEW control every render: the
    // old one is told to stop and the new one to start, both about one action.
    // That would be two flips a second on a busy screen, and it is free anyway:
    // world motion is coalesced to a microtask and compared by FINGERPRINT, so a
    // leave-and-enter of the same shape inside one window cancels to nothing —
    // the same property that keeps a StrictMode double-mount out of the trace.
    // A skin does not have to be careful about this, which is why nothing here is.
    const { session, save, busyOf } = wired();
    const rebuilt = (): WorkingSpec => ({
      busy: true,
      label: 'Saving…',
      actions: { setBusy: (label) => save.setBusy(label) },
      session,
    });

    const tree = mountTree(working(rebuilt()));
    await flush();
    let motion = 0;
    session.on('structure', () => (motion += 1));

    tree.render(working(rebuilt()));
    tree.render(working(rebuilt()));
    await flush();

    expect(motion, 'taken back and re-said inside one window is not motion').toBe(0);
    expect(busyOf('compose.save'), 'and the word is still standing').toBe('Saving…');
  });

  it('a label the core refuses is refused BY THE CORE — nothing is pre-judged here', () => {
    const { session, save, warnings, busyOf } = wired();

    // The empty string is not a label. The row still opens, because the row is
    // the point and a name for it is not; the control keeps saying nothing.
    mountTree(working({ busy: true, label: '', actions: save, session }));

    expect(session.openWork()).toHaveLength(1);
    expect(session.openWork()[0]).not.toHaveProperty('label');
    expect(busyOf('compose.save')).toBeUndefined();
    expect(warnings.some((line) => line.includes('busy'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SSR — the hook is silent where there is no browser
// ---------------------------------------------------------------------------

describe('a component using it renders on a server in silence', () => {
  it('schedules through useEffect alone — the one React never runs and never warns about', () => {
    const code = readFileSync('src/react/use-working.ts', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    // `useLayoutEffect` warns during `renderToString`, and a component adopting
    // this hook must render there exactly as it did before. `useControl` reaches
    // for `useInsertionEffect` to beat React's ref attachment; nothing here is
    // attached to anything, so the plain one is both sufficient and quieter.
    expect(code).toContain('useEffect');
    expect(code).not.toContain('useLayoutEffect');
    expect(code).not.toContain('useInsertionEffect');
  });

  it('and nothing whatever happens during the render itself', () => {
    const { session, save } = wired();
    let duringRender: number | undefined;

    // The probe renders as the hook's next SIBLING: React has run the hook's
    // render and has committed nothing, which is the same instant a server
    // render lives in permanently. A hook that opened work from its render body
    // would have opened it by now.
    mountTree(
      createElement(
        Fragment,
        null,
        working({ busy: true, label: 'Saving…', actions: save, session }),
        createElement(WhileRendering, { act: () => (duringRender = session.openWork().length) }),
      ),
    );

    expect(duringRender, 'rendering is not reporting').toBe(0);
    expect(session.openWork(), 'and the commit is').toHaveLength(1);
  });
});
