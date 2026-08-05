/**
 * D21's test environment: one anchor, one observer, one shop.
 *
 * WHY A FAKE AND NOT jsdom — the sensor fixture's own reason, unchanged: jsdom
 * is not a declared dependency of this package, so a suite that leaned on it
 * would go red on a clean install. The claim a real DOM would prove (that a real
 * `HTMLElement` and a real `MutationObserver` satisfy the anchor port) is a TYPE
 * claim, and test/sensor-probe/real-dom.ts proves it with a compiler instead.
 *
 * WHAT THE FAKE MODELS, and only what the DOM documents:
 * - CAPTURE ON THE ANCHOR SEES THE SUBTREE. A listener registered on an element
 *   with `capture: true` runs for events on its descendants, before the target's
 *   own handlers — which is exactly why the anchor watcher registers that way.
 * - `element.click()` IS UNTRUSTED. Only a real user gesture sets `isTrusted`,
 *   so `humanClick` and `agentClick` differ in that one bit and nothing else.
 * - AN OBSERVER DELIVERS IN BATCHES, at a microtask checkpoint. `mutate()` hands
 *   a batch to every connected observer, the way the real one does.
 */
import { buildNavigationGraph } from '../src/index.js';
import type { InteractionSession, NavigationGraph, SessionOptions } from '../src/index.js';
import type {
  AnchorChangeRecord,
  AnchorDocument,
  AnchorElement,
  AnchorEvent,
  AnchorListener,
  AnchorListenerOptions,
  AnchorObserver,
  AnchorObserverCtor,
  AnchorObserverInit,
} from '../src/contextful/anchor-port.js';

interface Registered {
  readonly type: string;
  readonly listener: AnchorListener;
  readonly capture: boolean;
}

/** A plain node — what an event or a change points AT. Named, never read for content. */
export class FakeNode {
  readonly tagName: string;
  readonly #attrs: Readonly<Record<string, string>>;

  constructor(tagName: string, attrs: Readonly<Record<string, string>> = {}) {
    this.tagName = tagName.toUpperCase();
    this.#attrs = attrs;
  }

  getAttribute(name: string): string | null {
    return this.#attrs[name] ?? null;
  }
}

export function node(tagName: string, attrs?: Record<string, string>): FakeNode {
  return new FakeNode(tagName, attrs);
}

/** One observer registration, as the fake host hands it out. */
class FakeObserver implements AnchorObserver {
  connected = false;
  init?: AnchorObserverInit;
  readonly callback: (records: readonly AnchorChangeRecord[]) => void;

  constructor(callback: (records: readonly AnchorChangeRecord[]) => void) {
    this.callback = callback;
  }

  observe(_target: AnchorElement, init: AnchorObserverInit): void {
    this.connected = true;
    this.init = init;
  }

  disconnect(): void {
    this.connected = false;
  }
}

/** The environment an anchor reaches through `ownerDocument.defaultView`. */
export class AnchorHost {
  readonly observers: FakeObserver[] = [];
  readonly ownerDocument: AnchorDocument;

  constructor(withObserver = true) {
    const observers = this.observers;
    class Observer extends FakeObserver {
      constructor(callback: (records: readonly AnchorChangeRecord[]) => void) {
        super(callback);
        observers.push(this);
      }
    }
    const ctor: AnchorObserverCtor = Observer;
    this.ownerDocument = { defaultView: withObserver ? { MutationObserver: ctor } : {} };
  }

  /** Deliver one batch of changes to every connected observer. */
  mutate(...records: readonly AnchorChangeRecord[]): void {
    for (const observer of this.observers) {
      if (observer.connected) observer.callback(records);
    }
  }

  /** How many observers are still connected — the teardown proof reads it. */
  get connected(): number {
    return this.observers.filter((o) => o.connected).length;
  }
}

/** The element the app hands over. Capture listeners on it see its whole subtree. */
export class FakeAnchor implements AnchorElement {
  readonly tagName = 'DIV';
  readonly ownerDocument: AnchorDocument | null;
  readonly entries: Registered[] = [];

  constructor(readonly host: AnchorHost | null = new AnchorHost()) {
    this.ownerDocument = host === null ? null : host.ownerDocument;
  }

  getAttribute(): string | null {
    return null;
  }

  addEventListener(type: string, listener: AnchorListener, options?: AnchorListenerOptions): void {
    this.entries.push({ type, listener, capture: options?.capture === true });
  }

  removeEventListener(type: string, listener: AnchorListener, options?: AnchorListenerOptions): void {
    const capture = options?.capture === true;
    // The DOM's own rule: a removal only cancels a registration whose capture
    // flag MATCHES.
    const at = this.entries.findIndex(
      (e) => e.type === type && e.listener === listener && e.capture === capture,
    );
    if (at >= 0) this.entries.splice(at, 1);
  }

  /** How many listeners are live — the StrictMode and teardown proofs read it. */
  get listenerCount(): number {
    return this.entries.length;
  }

  dispatch(event: AnchorEvent): void {
    for (const { type, listener } of [...this.entries]) {
      if (type === event.type) listener(event);
    }
  }
}

/** A real person acting inside the anchor. The one bit that differs is `isTrusted`. */
export function humanClick(anchor: FakeAnchor, target: unknown = node('button')): void {
  anchor.dispatch({ type: 'click', target, isTrusted: true });
}

/** A programmatic click, exactly as `HTMLElement.click()` produces one. */
export function agentClick(anchor: FakeAnchor, target: unknown = node('button')): void {
  anchor.dispatch({ type: 'click', target, isTrusted: false });
}

/** A person typing into a field inside the anchor. */
export function humanType(anchor: FakeAnchor, target: unknown = node('input')): void {
  anchor.dispatch({ type: 'input', target, isTrusted: true });
}

/** One `childList` change: something appeared under the anchor. */
export function added(target: unknown = node('li')): AnchorChangeRecord {
  return { type: 'childList', target, addedNodes: { length: 1 }, removedNodes: { length: 0 } };
}

/** One `childList` change: something left. */
export function removed(target: unknown = node('li')): AnchorChangeRecord {
  return { type: 'childList', target, addedNodes: { length: 0 }, removedNodes: { length: 1 } };
}

/** One attribute change — the NAME of the attribute, never its value. */
export function attribute(name: string, target: unknown = node('div')): AnchorChangeRecord {
  return { type: 'attributes', attributeName: name, target };
}

/** Let every pending microtask run — the turn boundary both windows are cut on. */
export async function settle(times = 3): Promise<void> {
  for (let i = 0; i < times; i += 1) await Promise.resolve();
}

/** The graph: one guarded action that writes, one that does not, on one page. */
export function shopGraph(): NavigationGraph {
  return buildNavigationGraph('shop', {
    does: 'A shop with two controls',
    pages: {
      catalog: { route: '/catalog' },
      cart: { route: '/cart' },
      // A repeats container: one declaration, many cards, and a registration per
      // card — the shape an instance-keyed contextful handler lives in.
      orders: {
        route: '/orders',
        areas: {
          'order-card': {
            repeats: true,
            instances: (state) => (state['orderIds'] as string[]) ?? [],
            actions: { cancel: { does: 'Cancel this order' } },
          },
        },
      },
    },
    actions: {
      'add-to-cart': {
        on: 'catalog',
        does: 'Add the open dress to the cart',
        when: { authenticated: { eq: true } },
        writes: ['cart'],
      },
      note: { on: 'catalog', does: 'Leave a note on the order' },
    },
  });
}

export interface Shop {
  session: InteractionSession;
  warnings: string[];
}

/** A session on that graph, with the app's own warning sink captured. */
export function shop(opts?: Partial<SessionOptions>): Shop {
  const warnings: string[] = [];
  const session = shopGraph().createSession({
    node: 'catalog',
    state: { authenticated: true },
    onWarn: (message) => warnings.push(message),
    ...opts,
  });
  return { session, warnings };
}
