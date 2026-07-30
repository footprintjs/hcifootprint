/**
 * The DOM surface the sensor needs — stated, never assumed.
 *
 * WHY THIS FILE EXISTS AT ALL: the library compiles with `lib: ["ES2022"]` and
 * no DOM (tsconfig.json), and `src/` holds zero `window`/`document`/`globalThis`
 * tokens. That is not a convention here, it is the house law — the app hands the
 * environment in and the library never reaches for a global (the same stance
 * from-live-store.ts:25-28 takes with its type-only LiveBindingPort, and the one
 * verify.ts:15 states by putting `document.querySelector` in a JSDoc example
 * rather than in code). Declaring the DOM structurally keeps SSR safety
 * COMPILER-enforced instead of convention-enforced: a Node importer cannot
 * accidentally reach a browser global that was never named.
 *
 * These interfaces are deliberately the SMALLEST surface that does the job.
 * Every member below is read by a named module in this folder; nothing is here
 * "because the DOM has it". Real `HTMLElement`, `Document`, `ShadowRoot` and
 * `Window` all satisfy them structurally — proved, not hoped: test/sensor-dom-port.test.ts
 * compiles a probe under `lib: ["ES2022","DOM"]` and asserts the assignment.
 *
 * One deliberate `unknown`: an element's `value`. The DOM's own typing is not
 * uniform (`HTMLInputElement.value` is a string, `HTMLProgressElement.value` is
 * a number), so promising `string` here would be a claim this port cannot keep.
 * The payload ladder narrows it at the one place it reads it.
 */

/** The subset of AddEventListenerOptions the sensor uses. Capture, and nothing else. */
export interface SensorListenerOptions {
  capture?: boolean;
}

/** What the sensor hands to addEventListener. */
export type SensorListener = (event: SensorEvent) => void;

/** Anything the sensor can attach a delegated listener to. */
export interface SensorEventTarget {
  addEventListener(type: string, listener: SensorListener, options?: SensorListenerOptions): void;
  removeEventListener(type: string, listener: SensorListener, options?: SensorListenerOptions): void;
}

/**
 * The three things the sensor asks of an event: what happened, where, and
 * whether a human really did it.
 *
 * `isTrusted` is optional because the port must not pretend a hand-built event
 * object carries it — the trust predicate reads it and answers honestly either
 * way (an absent flag is not a human).
 */
export interface SensorEvent {
  readonly type: string;
  readonly target: SensorElement | null;
  readonly isTrusted?: boolean;
  /** Present on keydown — the only event class where the key itself is the gesture. */
  readonly key?: string;
}

/**
 * An element, as far as RECOGNITION is concerned — and recognition is all the
 * sensor does to an element.
 *
 * Note what is NOT here: no `checked`, no `form`, no `children`, no per-control
 * `name`. Those are the members a DOM value-scraper needs, and this sensor does
 * not scrape values (see payload.ts). Leaving them out of the port is the
 * cheapest possible enforcement: the value-reading bug class is not a rule
 * somebody has to remember, it is a surface that does not exist.
 */
export interface SensorElement {
  /** Uppercase in HTML documents ('BUTTON') — the native-semantics table folds case itself. */
  readonly tagName: string;
  readonly parentElement: SensorElement | null;
  getAttribute(name: string): string | null;
  /** The visible-text rung of the accessible-name ladder. */
  readonly textContent: string | null;
  /**
   * Read for ONE thing only: an `<input type="submit" value="Save">` carries its
   * LABEL in `value`, which is what HTML says that attribute is for on a button.
   * It is never read as a payload — the sensor sends none. Typed `unknown`
   * because the real DOM is not uniform here (`HTMLProgressElement.value` is a
   * number), so promising `string` would be a claim this port cannot keep.
   */
  readonly value?: unknown;
  /** Native label association, when the DOM already answers it. */
  readonly labels?: ArrayLike<SensorElement> | null;
}

/** The window, for location motion only. */
export interface SensorWindow extends SensorEventTarget {
  readonly location?: { readonly pathname?: string } | null;
}

/** The document, for id lookup (aria-labelledby) and for reaching the view. */
export interface SensorDocument extends SensorEventTarget {
  getElementById(elementId: string): SensorElement | null;
  readonly defaultView?: SensorWindow | null;
}

/**
 * The delegation root the app hands in. An element, a document, or a shadow
 * root — all three are real answers to "where do my controls live", so the port
 * names what they have in common and asks for nothing more.
 */
export interface SensorRoot extends SensorEventTarget {
  readonly ownerDocument?: SensorDocument | null;
  getElementById?(elementId: string): SensorElement | null;
  readonly defaultView?: SensorWindow | null;
}

/**
 * The document that owns this root.
 *
 * The root's OWN id lookup wins when it has one. That order is not cosmetic: a
 * shadow root has both an `ownerDocument` (the outer page) and its own
 * `getElementById`, and resolving an `aria-labelledby` inside a shadow tree
 * against the OUTER document would either miss or, worse, find a same-id
 * element that has nothing to do with the control. Ask the tree the element
 * actually lives in.
 *
 * `undefined` when neither answers — a detached element, say. Callers degrade
 * honestly (an unresolvable label yields no name, which yields no match).
 */
export function documentOf(root: SensorRoot): SensorDocument | undefined {
  if (typeof root.getElementById === 'function') return root as unknown as SensorDocument;
  return root.ownerDocument ?? undefined;
}

/**
 * The view that publishes location motion, or `undefined` when there is none
 * (a detached document, a non-browser host). Absence is a real answer here:
 * with no view there is nothing to listen to, and the sensor says so through
 * coverage rather than pretending it is watching.
 */
export function viewOf(document: SensorDocument | undefined): SensorWindow | undefined {
  return document?.defaultView ?? undefined;
}
