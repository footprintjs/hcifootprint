/**
 * ONE ACT, ONE ROW — the turn window.
 *
 * THE LIBRARY HAS NO DEDUPE PRIMITIVE, and that is checked rather than assumed:
 * `FireOptions` carries no idempotency key (atom/types.ts:699-760) and the
 * transition log is append-only. So this rule is the sensor's to own, and it is
 * owned here, in one small module, rather than spread through the assembly.
 *
 * WHAT IT CATCHES. The sensor listens for several event classes on ONE root, and
 * nothing in the DOM stops two of them — or two elements — from delivering ONE
 * human act inside ONE synchronous task. The shape that does it in a real page:
 * a `<label>` and the control it labels, both handed over for the same edge.
 * Clicking the label dispatches a click on the label and then, as the label's own
 * activation behaviour, a click on the control — same task, one human act, and
 * two ledger rows unless something says no.
 *
 * WHY (edge, instance) IS THE KEY. It is the identity of the ROW, which is the
 * thing that must not double. Keying on the element would miss the label pair
 * (two elements), and keying on the event class would miss it too (both clicks).
 * Two different instances of a repeats container stay two rows, correctly: they
 * are not the same row.
 *
 * WHY A MICROTASK CLOSES IT. "One synchronous task" is exactly the window the
 * session itself coalesces structure flips in (`queueMicrotask` at
 * session.ts:3268-3275), so the sensor and the session agree about what "now"
 * means. A consequence worth stating out loud: under `'per-keystroke'`, two
 * `input` events inside ONE task collapse to one row — which is right, because a
 * human cannot produce two keystrokes in one task, so the second delivery is a
 * duplicate and not a second keystroke.
 */

export interface TurnWindow {
  /**
   * `true` the first time this (edge, instance) is claimed in the current task,
   * `false` every later time until the task ends.
   */
  claim(edge: string, instance?: string): boolean;
  /** Forget everything pending — teardown only, so a stopped watcher carries nothing over. */
  forget(): void;
}

export function createTurnWindow(): TurnWindow {
  const seen = new Set<string>();
  let scheduled = false;
  return {
    claim(edge, instance): boolean {
      // NUL joins the two parts for the same reason the recognition key uses it:
      // an instance key is app-chosen text and could contain any separator the
      // parts can also contain, which is how two different rows collide on one.
      const key = instance === undefined ? edge : `${edge}\u0000${instance}`;
      if (seen.has(key)) return false;
      seen.add(key);
      if (!scheduled) {
        scheduled = true;
        // A promise continuation IS a microtask, and `Promise` is in
        // `lib: ["ES2022"]` while `queueMicrotask` is not — so this is the one
        // form of the session's own coalescing window that compiles under the
        // house law. The callback only clears a Set, so it cannot reject.
        void Promise.resolve().then(() => {
          scheduled = false;
          seen.clear();
        });
      }
      return true;
    },
    forget(): void {
      seen.clear();
    },
  };
}
