/**
 * THE ANCHOR PORT — the DOM surface D21 needs, stated rather than assumed.
 *
 * Same law, same reason, as `sensor/dom-port.ts`: the library compiles with
 * `lib: ["ES2022"]` and no DOM, so a free `document` in here is `TS2304` and SSR
 * safety is COMPILER-enforced instead of convention-enforced. The app hands the
 * environment in — an anchor element it already holds — and this file names the
 * smallest thing that element has to be.
 *
 * IT IS ITS OWN PORT AND NOT THE SENSOR'S, deliberately. `hcifootprint/sensor`
 * is a separate entry point precisely so a consumer who never names it never
 * ships it (test/sensor-boundary.test.ts pins that the main entry does not
 * import the subpath), and `contextful` lives on the ROOT entry. Ten structural
 * lines here keep that boundary intact; importing the sensor to save them would
 * pull a whole watcher into every consumer's bundle.
 *
 * WHAT IS NOT HERE, and the absence is the enforcement (dom-port.ts's own
 * stance): no `textContent`, no `value`, no `innerHTML`, no `children`. This
 * port CANNOT read content, so the boundary law is a surface that does not
 * exist rather than a rule somebody has to remember.
 */

/** The subset of AddEventListenerOptions the anchor uses. Capture, and nothing else. */
export interface AnchorListenerOptions {
  capture?: boolean;
}

export type AnchorListener = (event: AnchorEvent) => void;

/**
 * The three things an anchor asks of an event: what happened, on what, and
 * whether a human really did it.
 *
 * `target` is `unknown` on purpose. A real event's target is an `EventTarget`,
 * which promises none of the members below — so the port refuses to claim it is
 * an element and {@link anchorNode} narrows it at the one place that reads it.
 */
export interface AnchorEvent {
  readonly type: string;
  readonly target?: unknown;
  /** Only a real user gesture sets it. An absent flag is not a human. */
  readonly isTrusted?: boolean;
}

/** An element as far as NAMING is concerned — a tag and an explicit role, and nothing else. */
export interface AnchorNode {
  /** Uppercase in HTML documents ('BUTTON'); the reader folds case itself. */
  readonly tagName?: unknown;
  getAttribute?(name: string): string | null;
}

/** One record from the observer, reduced to what a name-only capture can use. */
export interface AnchorChangeRecord {
  readonly type?: unknown;
  readonly target?: unknown;
  readonly attributeName?: string | null;
  readonly addedNodes?: { readonly length: number };
  readonly removedNodes?: { readonly length: number };
}

export interface AnchorObserverInit {
  childList?: boolean;
  subtree?: boolean;
  attributes?: boolean;
  characterData?: boolean;
}

/** The observer the view hands over — `MutationObserver`, named structurally. */
export interface AnchorObserver {
  observe(target: AnchorElement, options: AnchorObserverInit): void;
  disconnect(): void;
}

export type AnchorObserverCtor = new (
  callback: (records: readonly AnchorChangeRecord[]) => void,
) => AnchorObserver;

/** The view that owns the observer, or has none (a detached tree, a non-browser host). */
export interface AnchorView {
  readonly MutationObserver?: AnchorObserverCtor;
}

export interface AnchorDocument {
  readonly defaultView?: AnchorView | null;
}

/**
 * The anchor itself: an element the app hands over, which the library listens
 * ON (capture phase, so the whole subtree is in scope) and observes INSIDE.
 */
export interface AnchorElement extends AnchorNode {
  addEventListener(type: string, listener: AnchorListener, options?: AnchorListenerOptions): void;
  removeEventListener(type: string, listener: AnchorListener, options?: AnchorListenerOptions): void;
  readonly ownerDocument?: AnchorDocument | null;
}

/**
 * How an app names its anchor: the element, or a getter for it.
 *
 * THE GETTER IS THE SSR-SAFE FORM and the reason the option is a union at all:
 * `contextful()` runs at module scope in plenty of apps, and a getter is not
 * called until the session attaches — so wrapping a handler on a server touches
 * no `document` at all.
 */
export type AnchorSource = AnchorElement | (() => AnchorElement | null | undefined);

/** Resolve an anchor source. Returns undefined when there is nothing to watch (yet). */
export function resolveAnchor(source: AnchorSource | undefined): AnchorElement | undefined {
  if (source === undefined) return undefined;
  const element = typeof source === 'function' ? source() : source;
  return element ?? undefined;
}

/**
 * The observer constructor the ANCHOR'S OWN view publishes, or undefined.
 *
 * Reached THROUGH the element the app handed in — the `timersOf` construction
 * (dom-port.ts), and the same reason: this is reading the environment the app
 * supplied, never grabbing a global. With no view (a detached node, jsdom-less
 * Node, a server) the answer is absence, and the capture says
 * `changes: 'unobservable'` rather than pretending.
 */
export function observerCtorOf(anchor: AnchorElement): AnchorObserverCtor | undefined {
  const ctor = anchor.ownerDocument?.defaultView?.MutationObserver;
  return typeof ctor === 'function' ? ctor : undefined;
}

/** The event/mutation target as something with a tag and attributes, or undefined. */
export function anchorNode(target: unknown): AnchorNode | undefined {
  if (typeof target !== 'object' || target === null) return undefined;
  return target as AnchorNode;
}

/**
 * What an element is CALLED — the two name-class facts, never its content.
 *
 * `targetRole` is the element's own `role` attribute and nothing else: rung one
 * of the sensor's accessible-role ladder ("the app said so, and the app wins",
 * sensor/role.ts). The native-semantics table is deliberately NOT duplicated
 * here — a `<button>` with no role attribute reports `targetTag: 'button'`,
 * which is the raw fact, rather than an ARIA role this file would have had to
 * derive with a second copy of somebody else's table.
 */
export function nameOf(target: unknown): { targetRole?: string; targetTag?: string } {
  const node = anchorNode(target);
  if (node === undefined) return {};
  const role = typeof node.getAttribute === 'function' ? node.getAttribute('role') : null;
  const named = typeof role === 'string' ? role.trim() : '';
  const tag = typeof node.tagName === 'string' ? node.tagName.trim().toLowerCase() : '';
  // Empty is ABSENT, both times: a blank role attribute and a node with no tag
  // name are the same fact — this library could not name what was touched — and
  // a key holding '' would read as a control called nothing.
  return {
    ...(named !== '' ? { targetRole: named } : {}),
    ...(tag !== '' ? { targetTag: tag } : {}),
  };
}
