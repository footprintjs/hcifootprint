/**
 * ONE HOOK, AND IT ONLY EVER REPEATS WHAT THE APP ALREADY SAID.
 *
 * `useWorking` is the work ledger and the busy label with React's lifecycle
 * wrapped round them. The component hands over the boolean it ALREADY maintains
 * for its own spinner, the words it already puts under that spinner, and the
 * error it already renders; this file turns the two edges of that boolean into
 * the two calls the core has always had — `session.beginWork(label)` when it
 * rises, `work.done(error)` when it falls — and stands the label on whichever
 * control handles the component points it at.
 *
 * NOTHING HERE DECIDES ANYTHING. It does not judge the label (the core refuses a
 * non-string with its own warning), does not correlate the work to a fire (the
 * core's three homes decide that at call time), does not decide what counts as
 * world motion (the registry ignores a label equal to the standing one, and the
 * session coalesces the rest by fingerprint), and does not time anything, ever.
 * A skin that re-decided any of those would be a second brain to keep in step —
 * the same law `useControl` keeps beside it.
 *
 * IT CANNOT FAKE A SUCCESS, AND THAT IS STRUCTURAL RATHER THAN A RULE. The only
 * two doors it drives are `beginWork`/`done` and `setBusy`, and neither settles a
 * transition, resolves a latch, writes state or flips an outcome — `done()`
 * records the app's error on the WORK ROW and nowhere else, by the core's own
 * load-bearing refusal (`LIBRARY_ASK.md`, "`done(error)` settles the
 * transition"). The failure spine stays the three doors it has always been: a
 * handler throw, a returned `{ ok: false }`, and `session.reject`. So the worst
 * a wrong flag here can do is say the app is working when it is not — never that
 * something worked.
 *
 * EVERY FIELD IS READ AT ITS OWN EDGE, and that is the whole timing contract.
 * `transitionId` is read where the row OPENS, because the core decides where work
 * lands at call time and never revisits it; `error` is read where the row CLOSES,
 * because that is the commit that knows how it ended. A value that arrives on
 * some other commit is not applied to the row it missed — nothing here queues one
 * for later or re-binds a row after the fact, which would be this hook keeping a
 * second, private copy of a correlation the core already decided. An id that
 * arrives late is the one case an app plainly MEANT, so it gets a dev warning
 * rather than a silent drop; the row itself keeps saying exactly what it said at
 * the rise.
 *
 * THE ASYMMETRY AT UNMOUNT IS THE ONE THING WORTH READING TWICE, and it is two
 * different answers to two different questions:
 *
 * - THE WORK ROW STAYS OPEN. A component going away is not the work ending —
 *   the fetch is still in flight, the job still runs — so calling `done()` here
 *   would be a verdict minted from silence, which is exactly the move this
 *   library exists to refuse. The row keeps saying the last thing anybody
 *   actually said (`openWork()` serves it, `did_it_work` keeps carrying
 *   `stillWorking`), and no timer will ever end it.
 * - THE BUSY LABEL IS CLEARED. A label is a CLAIM ABOUT A CONTROL that stands
 *   until somebody takes it back, and the thing that was keeping it true — a
 *   mounted component watching its own flag — is gone. Nobody is left to lower
 *   it, so leaving it up would serve a model a spinner nothing is turning.
 *   Absence over a stale claim.
 *
 * Both are the same principle read against two different subjects, which is why
 * they land on opposite answers: what is UNKNOWN stays open, what was CLAIMED is
 * taken back. One dev warning says so on the way past.
 *
 * NO DEPENDENCY ARRAYS ON THE TWO WORKING EFFECTS, deliberately. What this hook
 * watches is a TRANSITION BETWEEN TWO COMMITTED RENDERS, and the thing that
 * detects it is a ref holding the open row — not a dependency list. A list would
 * be a second, weaker copy of that edge detection sitting beside the real one,
 * and the two would disagree the first time a component re-rendered for a reason
 * neither of them named. Running on every commit and answering "nothing
 * changed" is cheap: the registry itself refuses a repeated label, so a
 * re-render that says the same thing writes nothing and moves no version.
 */
import { useEffect, useRef } from 'react';
import type { ToolHandle, WorkHandle } from '../atom/types.js';
import type { Session } from '../traverse/session.js';

/**
 * Anything that can say a control is working — `setBusy` and nothing else.
 *
 * DERIVED FROM THE REAL HANDLE, so a `ToolHandle` from `session.registerTool`
 * goes straight in. A `ToolGroup` deliberately does NOT: its `setBusy` names the
 * tool first (`setBusy(toolId, label)`), and a two-argument function is not
 * assignable to a one-argument one — so pointing this hook at a group is a
 * COMPILE ERROR rather than a call that quietly labels a tool named "Saving…".
 * Name the tool where the group already knows how:
 *
 * ```ts
 * tools: { setBusy: (label) => group.setBusy('save', label) }
 * ```
 */
export type BusyControl = Pick<ToolHandle, 'setBusy'>;

/**
 * The two session doors this hook drives, and not one more.
 *
 * Picked from the real {@link Session} rather than restated, so it can never
 * drift from what a session actually offers — and narrow on purpose: the type
 * itself says a component that adopts this hook handed over the power to open
 * work and to warn, and no power at all to fire, settle, reject or write state.
 */
export type WorkingSession = Pick<Session, 'beginWork' | 'warn'>;

/** What a component says about the work it is doing right now. */
export interface WorkingSpec {
  /**
   * YOUR OWN SPINNER FLAG — the boolean this component already renders from.
   *
   * Pass the one you already have (`mutation.isPending`, `isSaving`, your
   * store's own field). A flag maintained ONLY for this hook is a second copy of
   * a fact, and the copy nobody looks at is the one that rots: it is the shape
   * that leaves a work row open after the work finished, because nothing on
   * screen depended on it being right.
   */
  readonly busy: boolean;
  /**
   * Your own words for what is happening — 'Saving your draft…'.
   *
   * It rides two rails as DATA and never enters an authored sentence: the work
   * row's `label`, and the `busy` label on every control in `tools`. The core
   * caps it and refuses a non-string with its own warning; nothing here judges
   * it. Write labels a stranger may read — never interpolate a secret, a
   * customer's name, or the payload.
   */
  readonly label: string;
  /**
   * The error you are already rendering, if the work ended badly.
   *
   * READ BY PRESENCE AT FALL TIME, and only then: whatever this holds on the
   * commit where `busy` goes false is what the work row records, and an absent
   * one closes the row cleanly. So set the flag and the error together — React
   * batches both updates from one `catch` into a single commit, which is what
   * makes "completion and outcome arrive together" the ordinary case rather than
   * a rule to remember. It is recorded on the WORK ROW ONLY: it settles nothing,
   * rejects nothing, and reaches no door that answers how a FIRE came to rest.
   *
   * `null` IS ABSENT HERE, exactly as `undefined` is. React's ecosystem says "no
   * error" with `null` — `mutation.error` is `null` on every clean settle — and a
   * hook whose own headline example passes that field must mean the same thing by
   * it that the app does. Nothing else is normalized: any other value is the
   * app's word and travels whole.
   *
   * IT IS NOT REMEMBERED BETWEEN EPISODES, because it is not this hook's to
   * remember: an error your component still renders when the NEXT piece of work
   * ends is read at that fall too, and closes that row carrying a failure it never
   * had. A data layer that resets its own error on each attempt (React Query
   * does) is already correct; a hand-rolled one clears it where it sets the flag.
   */
  readonly error?: unknown;
  /**
   * The control handle, or handles, that should carry the label while this is
   * working — the spinner in the button, said out loud on the row a model reads.
   *
   * Omit it and the hook keeps the work ledger only, which is the honest answer
   * for work no single control stands for (a background sync, a page-level
   * load). ONE WRITER PER CONTROL: point the hook at a handle or drive that
   * handle's `setBusy` by hand, never both, or two writers will take turns
   * describing one control.
   *
   * An adapter written inline is FINE and needs no memo. Identity is all this
   * hook can compare, so a fresh object each render is a new control to it — the
   * old one is told to stop and the new one to start, about one tool — and the
   * session coalesces world motion by fingerprint, so a take-back-and-re-say
   * inside one window cancels to nothing at all.
   */
  readonly tools?: BusyControl | readonly BusyControl[];
  /** The session this component reports to. */
  readonly session: WorkingSession;
  /**
   * The fire this work belongs to — a `transitionId` from a `FireResult`.
   *
   * WITHOUT IT THE ROW IS UNBOUND, at principal `'system'`, and that is the
   * honest answer rather than a shortfall: an effect runs long after any
   * handler's call window closed, so there is no fire this hook is "inside of"
   * and a guess would be right exactly when nothing was racing. Unbound work
   * still says the app is working; it just does not claim which action. The core
   * says so once per label, and this hook does not suppress that.
   *
   * KNOWN ON THE COMMIT WHERE THE FLAG GOES UP, OR NOT AT ALL. This is read once,
   * where the row opens, because the core decides where work lands at call time
   * and never revisits it — so an id that arrives on a later commit does not move
   * the row it missed, and the hook says so once instead of dropping it in
   * silence. A flag that rises before its own fire has one (a mutation's
   * `isPending` flips before the function that fires runs) is exactly that shape:
   * set the flag and the id from ONE state update after the fire result hands the
   * id back, or open the work inside the handler before its first `await`, where
   * it binds itself. Neither is available? Leave it out — unbound is honest, and
   * the next rise reads whatever is in hand then.
   */
  readonly transitionId?: string;
}

/** Read once, so an omitted `tools` allocates nothing on every commit. */
const NO_CONTROLS: readonly BusyControl[] = [];

/**
 * One handle or many, always as a list.
 *
 * `== null` catches BOTH absences on purpose. The type says `undefined`, but a
 * JS caller is not held to it and writes `tools: null` for "no controls" as
 * readily — and `'setBusy' in null` is a TypeError thrown from inside an effect,
 * which takes down the component with no teaching at all. The library tolerates
 * the JS caller everywhere else it crosses this line (`principalOf` casts for a
 * missing `source`; the core keeps a row whose label is not a string); a hook has
 * the same duty, because the type was the only thing guarding here.
 */
function controlsOf(tools: WorkingSpec['tools']): readonly BusyControl[] {
  // The cast is the honest part, and it is the one `principalOf` already makes
  // in the core: the type says this cannot be null, and a JS caller really can
  // hand one over anyway.
  if (tools === undefined || (tools as unknown) === null) return NO_CONTROLS;
  return 'setBusy' in tools ? [tools] : tools;
}

/**
 * An authored constant, and every word of it is here rather than in a template:
 * the label is the app's runtime text, and a warning is one of the places
 * runtime text must not ride (the row itself carries the label as data, which is
 * where a reader should go looking for WHICH piece of work this was).
 */
const TORN_DOWN_MID_WORK =
  'hcifootprint: a useWorking() component was torn down while its work row was still open. ' +
  'THE ROW STAYS OPEN — a component going away is not the work ending, so nothing here closes it: ' +
  'openWork() keeps serving it and did_it_work keeps saying stillWorking, for the session lifetime. ' +
  'THE BUSY LABEL WAS CLEARED — a label is a claim about a control, and the component that was ' +
  'keeping it true is gone. Close the row from the code that owns the work (beginWork in the try, ' +
  'done() in the finally), or keep the busy flag in a component that outlives the work. ' +
  'In development React StrictMode tears every effect down once on mount, so a component that ' +
  'mounts ALREADY busy sees this once with nothing wrong: the row is not duplicated and the label ' +
  'comes straight back.';

/**
 * The other authored constant, and it spends no runtime text either — not the
 * label, and not the id it is refusing, which is the app's string too. What a
 * reader needs in order to act on this is WHEN the id is read, and that is a fact
 * about the hook rather than about the value.
 */
const ID_AFTER_THE_RISE =
  'hcifootprint: a useWorking() component named a transitionId while its work row was ALREADY OPEN, ' +
  'and THE ROW WAS NOT MOVED ONTO IT — where a piece of work lands is decided once, where it opens, ' +
  'and nothing in this library revisits a correlation later. The row still says exactly what it said ' +
  'at the rise: for a component that had no id then, UNBOUND — the app is working, and which action ' +
  'is not claimed. Nothing was lost otherwise; the row is open and openWork() serves it. To bind ' +
  'exactly, have the id in hand on the commit where the flag goes up — set the flag and the id in ' +
  'ONE state update, after the fire result hands the id back — or open the work inside the handler ' +
  'before its first await, where it binds itself.';

/**
 * Say the app is working, for as long as your own flag says so.
 *
 * ```ts
 * useWorking({ busy: save.isPending, label: 'Saving your draft…', error: save.error, tools: saveTool, session });
 * ```
 *
 * The flag rising opens one work row and stands the label on each control; the
 * flag falling closes that row — with the error if one is present — and takes
 * the label back. Every rise is its own row: a flag that flaps three times
 * writes three rows, never one reused, because two pieces of work that happened
 * at different times are two facts.
 */
export function useWorking(spec: WorkingSpec): void {
  const { busy, error, label, session, tools, transitionId } = spec;

  /**
   * The row this hook opened and has not closed — THE EDGE DETECTOR.
   *
   * A ref rather than a dependency, and it survives React's StrictMode
   * double-invoke (the same component instance is re-used, so refs are not
   * reset), which is exactly what makes the simulated remount re-adopt the row
   * it already opened instead of opening a second one for one piece of work.
   */
  const open = useRef<WorkHandle | null>(null);
  /**
   * The id the OPEN row was opened with — what the core was told, kept so a
   * later commit naming a different one can be recognised as a thing the app
   * said and this hook cannot honour. Never used to re-bind anything.
   */
  const openedWith = useRef<string | undefined>(undefined);
  /** The word this hook last stood on its controls, so an unchanged one is not re-said. */
  const said = useRef<string | undefined>(undefined);
  /** The controls it was said to — reachable from a teardown, whose render is long gone. */
  const told = useRef<readonly BusyControl[]>(NO_CONTROLS);
  /**
   * The newest COMMITTED session, for the same reason — a teardown runs long
   * after its render, and the warning below has to reach the sink the app is
   * capturing NOW (`SessionOptions.onWarn`), not the one it was mounted with.
   */
  const reportTo = useRef(session);
  /**
   * ONCE PER COMPONENT, and the key is a decision rather than an accident.
   *
   * React tears effects down in three situations, and only one of them is the
   * component really going away: a real unmount, StrictMode's development
   * double-invoke, and an `<Activity>` subtree being hidden. Nothing distinguishes
   * them at teardown time — React tells a cleanup nothing about why it is running
   * — so a warning per teardown would fire on every hide, and a component that
   * mounts already busy would teach the same lesson twice in development.
   *
   * The message below is the WHOLE rule rather than an alert about one event, so
   * whichever teardown spends it, the reader has been told everything the second
   * one would say. That is what makes once the right count instead of a lossy one.
   */
  const warned = useRef(false);
  /**
   * ONCE PER COMPONENT for the late-id teaching too, and for the plainer reason:
   * a component wired that way is late on EVERY episode, so a warning per
   * occurrence would repeat one lesson for as long as the screen lives — and the
   * message below is the whole rule, so the second copy adds nothing.
   */
  const warnedLateId = useRef(false);

  useEffect(() => {
    reportTo.current = session;
  });

  // THE LEDGER — one row per episode of work, opened on the rise and closed on
  // the fall. Guarded by the ref, never by a dependency: "is a row already open"
  // is the actual question, and it is the only one that answers correctly under
  // a double-invoke, a re-render nobody asked about, or a flag that flaps.
  useEffect(() => {
    if (busy) {
      if (open.current !== null) {
        // A row this hook opened is already standing, and the core bound it at
        // that moment. An id naming a DIFFERENT fire now is an input the app
        // meant and this hook cannot honour — re-binding a live row would be a
        // correlation decided twice, and the second one decided by a skin. So it
        // is refused OUT LOUD instead of dropped: the row is unchanged, and the
        // developer who did pass an id is told when it needed to be there.
        if (transitionId !== undefined && transitionId !== openedWith.current && !warnedLateId.current) {
          warnedLateId.current = true;
          session.warn(ID_AFTER_THE_RISE);
        }
        return;
      }
      openedWith.current = transitionId;
      open.current = session.beginWork(
        label,
        // Absent rather than `{ transitionId: undefined }`, so the core takes the
        // arm it would have taken if the app had never mentioned an id at all.
        transitionId === undefined ? undefined : { transitionId },
      );
      return;
    }
    const work = open.current;
    if (work === null) return;
    open.current = null;
    // Read from THIS commit — the one where the flag fell. Absent closes it
    // cleanly, and `null` is absent: it is how React's own data layers spell "no
    // error", and handing it on would put a present-but-empty failure on a row
    // that succeeded. Everything else travels exactly as the app rendered it.
    work.done(error ?? undefined);
  });

  // THE LABEL — the app's word, standing on each control for as long as the flag
  // does. Written only when this hook's own claim changes, or to a control it
  // has not spoken to yet, so a component re-rendering sixty times a second is
  // silent; a control that has LEFT the list gets its label taken back, because
  // this hook stopped being the thing keeping it true.
  useEffect(() => {
    const controls = controlsOf(tools);
    const word = busy ? label : undefined;
    const changed = word !== said.current;
    for (const control of told.current) {
      if (!controls.includes(control)) control.setBusy(undefined);
    }
    for (const control of controls) {
      if (changed || !told.current.includes(control)) control.setBusy(word);
    }
    told.current = controls;
    said.current = word;
  });

  // THE TEARDOWN — the asymmetry, in the only place React offers for it. The row
  // is deliberately NOT closed and `open` is deliberately NOT cleared: on a
  // StrictMode remount the same row is picked back up, and on a real unmount it
  // stays open because nobody said the work ended.
  useEffect(
    () => () => {
      for (const control of told.current) control.setBusy(undefined);
      told.current = NO_CONTROLS;
      said.current = undefined;
      if (open.current === null || warned.current) return;
      warned.current = true;
      reportTo.current.warn(TORN_DOWN_MID_WORK);
    },
    [],
  );
}
