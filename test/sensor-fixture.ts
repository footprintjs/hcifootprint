/**
 * The sensor's test environment: a structural DOM, a shared clock, and one desk
 * graph.
 *
 * WHY A FAKE AND NOT jsdom. jsdom is present in node_modules right now but is NOT
 * declared in package.json, and this repo's own discipline forbids hoist-trust
 * ("esbuild is a DECLARED devDependency — never hoist-trusted",
 * test/treeshake.test.ts:6-8). A suite that depended on it would go red on a clean
 * install. The claim jsdom would prove — that a real HTMLElement satisfies the
 * sensor's port — is a TYPE claim, and it is proved better by a compiler probe
 * (test/sensor-probe, driven by test/sensor-dom-port.test.ts): a proof at build
 * time with no runtime dependency at all.
 *
 * WHAT THE FAKE MODELS, and it models only documented DOM behaviour:
 * - CAPTURE BEFORE TARGET. `dispatch` runs the root's capture listeners first,
 *   then the target's own — the DOM's dispatch order, which is exactly what the
 *   sensor's `capture: true` registration buys it.
 * - `element.click()` IS UNTRUSTED. `HTMLElement.click()` dispatches an event with
 *   `isTrusted === false`; only a real user gesture sets it. That one bit is the
 *   whole synthetic-click story, so the fake keeps the two apart by construction:
 *   `agentClick` goes through `element.click()`, `humanClick` mints a trusted
 *   event the way the browser does for a person.
 */
import { buildNavigationGraph } from '../src/index.js';
import type { NavigationGraph } from '../src/index.js';
import type {
  RecordOnlyFire,
  SensorDocument,
  SensorElement,
  SensorEvent,
  SensorListener,
  SensorListenerOptions,
  SensorRoot,
  SensorSession,
  SensorTimers,
  SensorWindow,
} from '../src/sensor/index.js';

// ---------------------------------------------------------------------------
// The structural DOM
// ---------------------------------------------------------------------------

interface Registered {
  readonly type: string;
  readonly listener: SensorListener;
  readonly capture: boolean;
}

/** One event target's own registrations — the same bookkeeping the root and elements share. */
class Listeners {
  readonly entries: Registered[] = [];

  addEventListener(type: string, listener: SensorListener, options?: SensorListenerOptions): void {
    this.entries.push({ type, listener, capture: options?.capture === true });
  }

  removeEventListener(type: string, listener: SensorListener, options?: SensorListenerOptions): void {
    const capture = options?.capture === true;
    // The DOM's own rule, modelled deliberately: a removal only cancels a
    // registration whose capture flag MATCHES. The sensor's shared frozen CAPTURE
    // object is what keeps it on the right side of this.
    const at = this.entries.findIndex((e) => e.type === type && e.listener === listener && e.capture === capture);
    if (at >= 0) this.entries.splice(at, 1);
  }

  for(type: string, capture: boolean): SensorListener[] {
    return this.entries.filter((e) => e.type === type && e.capture === capture).map((e) => e.listener);
  }
}

export interface ElementOptions {
  readonly attrs?: Readonly<Record<string, string>>;
  readonly text?: string;
  /** Only ever read as an <input type=submit> LABEL — see dom-port.ts. */
  readonly value?: unknown;
  readonly labels?: readonly FakeElement[];
  readonly children?: readonly FakeElement[];
}

export class FakeElement implements SensorElement {
  readonly tagName: string;
  parentElement: SensorElement | null = null;
  readonly textContent: string | null;
  readonly value?: unknown;
  readonly labels?: readonly SensorElement[];
  readonly children: readonly FakeElement[];
  readonly #attrs: Readonly<Record<string, string>>;
  readonly #own = new Listeners();
  /** Set by `surface()` so a dispatch can find the delegation root. */
  surface?: Surface;

  constructor(tagName: string, options: ElementOptions = {}) {
    this.tagName = tagName.toUpperCase();
    this.#attrs = options.attrs ?? {};
    this.children = options.children ?? [];
    if (options.value !== undefined) this.value = options.value;
    if (options.labels !== undefined) this.labels = options.labels;
    for (const child of this.children) child.parentElement = this;
    // A container's text is its descendants' text, the way textContent reads.
    this.textContent = options.text ?? (this.children.length > 0 ? this.children.map(textOf).join(' ') : null);
  }

  getAttribute(name: string): string | null {
    return this.#attrs[name] ?? null;
  }

  /** The app's own handler — registered in the TARGET phase, as an app's onClick is. */
  addEventListener(type: string, listener: SensorListener, options?: SensorListenerOptions): void {
    this.#own.addEventListener(type, listener, options);
  }

  removeEventListener(type: string, listener: SensorListener, options?: SensorListenerOptions): void {
    this.#own.removeEventListener(type, listener, options);
  }

  targetListeners(type: string): SensorListener[] {
    return this.#own.for(type, false);
  }

  /**
   * A PROGRAMMATIC click, exactly as `HTMLElement.click()` produces one:
   * `isTrusted` is false, and everything else about it is identical to a human's.
   */
  click(): void {
    dispatch(this, { type: 'click', target: this, isTrusted: false });
  }
}

function textOf(element: FakeElement): string {
  return element.textContent ?? '';
}

/** Build one element. Children are wired to their parent as they are handed in. */
export function el(tagName: string, options: ElementOptions = {}): FakeElement {
  return new FakeElement(tagName, options);
}

export class FakeView implements SensorWindow {
  location: { pathname: string };
  readonly #own = new Listeners();
  readonly #timers: SensorTimers | undefined;

  constructor(pathname: string, timers?: SensorTimers) {
    this.location = { pathname };
    this.#timers = timers;
    if (timers !== undefined) {
      this.setTimeout = (handler, timeout) => timers.setTimeout(handler, timeout);
      this.clearTimeout = (handle) => timers.clearTimeout(handle);
    }
  }

  /** Present only when the fixture was given a clock — the no-clock case is a real one. */
  setTimeout?: (handler: () => void, timeout: number) => unknown;
  clearTimeout?: (handle: unknown) => void;

  addEventListener(type: string, listener: SensorListener, options?: SensorListenerOptions): void {
    this.#own.addEventListener(type, listener, options);
  }

  removeEventListener(type: string, listener: SensorListener, options?: SensorListenerOptions): void {
    this.#own.removeEventListener(type, listener, options);
  }

  /** How many listeners are live — the teardown proof reads it. */
  get listenerCount(): number {
    return this.#own.entries.length;
  }

  /** Move the URL and announce it the way a browser Back button does. */
  navigate(pathname: string): void {
    this.location = { pathname };
    for (const listener of [...this.#own.for('popstate', false)]) {
      listener({ type: 'popstate', target: null });
    }
  }

  hasTimers(): boolean {
    return this.#timers !== undefined;
  }
}

/** The delegation root the app hands in: document-like, with an id index and a view. */
export class Surface implements SensorRoot {
  readonly defaultView: FakeView;
  readonly #own = new Listeners();
  readonly #byId = new Map<string, FakeElement>();

  constructor(view: FakeView) {
    this.defaultView = view;
  }

  addEventListener(type: string, listener: SensorListener, options?: SensorListenerOptions): void {
    this.#own.addEventListener(type, listener, options);
  }

  removeEventListener(type: string, listener: SensorListener, options?: SensorListenerOptions): void {
    this.#own.removeEventListener(type, listener, options);
  }

  getElementById(elementId: string): SensorElement | null {
    return this.#byId.get(elementId) ?? null;
  }

  /** Adopt a tree: index its ids and point every element back at this root. */
  mount(...roots: readonly FakeElement[]): void {
    const walk = (element: FakeElement): void => {
      element.surface = this;
      const id = element.getAttribute('id');
      if (id !== null) this.#byId.set(id, element);
      for (const child of element.children) walk(child);
    };
    for (const root of roots) walk(root);
  }

  captureListeners(type: string): SensorListener[] {
    return this.#own.for(type, true);
  }

  /** Every live registration — the teardown proof reads it. */
  get listenerCount(): number {
    return this.#own.entries.length;
  }

  asDocument(): SensorDocument {
    return this as unknown as SensorDocument;
  }
}

/**
 * Deliver one event: the ROOT's capture listeners first, then the TARGET's own.
 *
 * That order is the DOM's, and it is the whole reason the sensor registers with
 * `capture: true` — it sees the act before the app's handler moves the page under
 * it. Listener lists are copied before the walk so a listener that attaches or
 * detaches mid-dispatch cannot change this dispatch, which is also the DOM's rule.
 */
export function dispatch(target: FakeElement, event: SensorEvent): void {
  const surface = target.surface;
  if (surface !== undefined) {
    for (const listener of surface.captureListeners(event.type)) listener(event);
  }
  for (const listener of [...target.targetListeners(event.type)]) listener(event);
}

/** A real person clicking. The one bit that differs from `element.click()` is `isTrusted`. */
export function humanClick(target: FakeElement): void {
  dispatch(target, { type: 'click', target, isTrusted: true });
}

/** A real person pressing a key on a focused control. */
export function humanKey(target: FakeElement, key: string): void {
  dispatch(target, { type: 'keydown', target, isTrusted: true, key });
}

/** A real person finishing with a field — the browser's `change`, on blur or Enter. */
export function humanCommit(target: FakeElement): void {
  dispatch(target, { type: 'change', target, isTrusted: true });
}

/** One keystroke — the browser's `input`. */
export function humanType(target: FakeElement): void {
  dispatch(target, { type: 'input', target, isTrusted: true });
}

// ---------------------------------------------------------------------------
// The clock
// ---------------------------------------------------------------------------

export interface Clock extends SensorTimers {
  now(): number;
  advance(ms: number): void;
  /** How many timers are armed — the teardown proof reads it. */
  readonly pending: number;
}

/**
 * ONE clock for the session and the sensor.
 *
 * The library's own comment on `SessionOptions.now` is that the two must never
 * disagree about time; the sensor's debounce and the session's timestamps
 * therefore read this same object in every test that involves either.
 */
export function clock(startMs = 1_000): Clock {
  let nowMs = startMs;
  let nextId = 1;
  const armed = new Map<number, { due: number; handler: () => void }>();
  return {
    now: () => nowMs,
    setTimeout(handler, timeout) {
      const id = nextId++;
      armed.set(id, { due: nowMs + timeout, handler });
      return id;
    },
    clearTimeout(handle) {
      if (typeof handle === 'number') armed.delete(handle);
    },
    advance(ms) {
      nowMs += ms;
      for (const [id, entry] of [...armed]) {
        if (entry.due > nowMs) continue;
        armed.delete(id);
        entry.handler();
      }
    },
    get pending(): number {
      return armed.size;
    },
  };
}

/**
 * Let the microtask queue run out.
 *
 * The sensor's turn window and the session's structure coalescing both close on a
 * microtask, so a test that asserts across turns has to let them close — the same
 * drain-to-quiescence the testing harness performs (harness.ts:342-366).
 */
export async function settle(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

// ---------------------------------------------------------------------------
// The app
// ---------------------------------------------------------------------------

/**
 * The desk: one page carrying every gesture and contract shape the sensor has an
 * answer for, plus a repeats container.
 *
 * `save` and `save-draft` deliberately share one locator — that collision is what
 * genuine RECOGNISED ambiguity looks like, and the sensor must refuse it rather
 * than pick.
 */
export function deskGraph(): NavigationGraph {
  return buildNavigationGraph('desk', {
    pages: {
      inbox: {
        route: '/inbox',
        tools: {
          send: {
            does: 'Send the message',
            binding: { kind: 'element', locator: { role: 'button', name: 'Send' }, actuation: 'click' },
            input: 'none',
            writes: ['sent'],
          },
          archive: {
            does: 'Archive the thread',
            binding: { kind: 'element', locator: { role: 'button', name: 'Archive' }, actuation: 'click' },
            writes: ['archived'],
          },
          compose: {
            does: 'Save the message draft',
            binding: { kind: 'element', locator: { role: 'textbox', name: 'Message' }, actuation: 'type' },
            input: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'] },
            writes: ['draft'],
          },
          plan: {
            does: 'Pick a plan',
            binding: { kind: 'element', locator: { role: 'combobox', name: 'Plan' }, actuation: 'select' },
            input: { type: 'object', properties: { plan: { type: 'string' } }, required: ['plan'] },
            writes: ['plan'],
          },
          undo: {
            does: 'Undo the last change',
            binding: { kind: 'element', locator: { role: 'button', name: 'Undo' }, actuation: 'press' },
            writes: ['undone'],
          },
          preview: {
            does: 'Preview the thread',
            binding: { kind: 'element', locator: { role: 'button', name: 'Preview' }, actuation: 'hover' },
          },
          help: { does: 'Open the help page', binding: { kind: 'url', href: '/help' } },
          refresh: { does: 'Refresh the list' },
          save: {
            does: 'Save the message',
            binding: { kind: 'element', locator: { role: 'button', name: 'Save' }, actuation: 'click' },
            input: 'none',
          },
          'save-draft': {
            does: 'Save it as a draft instead',
            binding: { kind: 'element', locator: { role: 'button', name: 'Save' }, actuation: 'click' },
            input: 'none',
          },
        },
        areas: {
          thread: {
            repeats: true,
            instances: (state) => (state['threadIds'] as string[]) ?? [],
            tools: {
              reply: {
                does: 'Reply to this thread',
                binding: { kind: 'element', locator: { role: 'button', name: 'Reply' }, actuation: 'click' },
                input: 'none',
              },
            },
          },
        },
      },
      profile: { route: '/profile' },
    },
  });
}

/**
 * A live desk session plus the surface its controls live on.
 *
 * The session and the sensor share ONE clock, and the sensor is handed the
 * surface's own view for timers — so nothing in these tests can disagree about
 * time. `withoutClock` drops the view's timers, which is the real shape of a
 * non-browser host and the one the `cadence-unavailable` refusal exists for.
 */
export function mountDesk(options: { state?: Record<string, unknown>; withoutClock?: boolean } = {}): {
  session: ReturnType<NavigationGraph['createSession']>;
  surface: Surface;
  view: FakeView;
  time: Clock;
} {
  const time = clock();
  const view = new FakeView('/inbox', options.withoutClock === true ? undefined : time);
  const surface = new Surface(view);
  const session = deskGraph().createSession({
    node: 'inbox',
    state: options.state ?? { threadIds: ['t-1'] },
    now: () => time.now(),
    onWarn: () => undefined,
  });
  return { session, surface, view, time };
}

/**
 * The exact fire options the sensor built, captured at the port boundary.
 *
 * A `TransitionRecord` cannot answer "did the sensor send a payload key" — the
 * session builds that record and owns its shape. The only place the question is
 * observable is the call itself, and the structural `SensorSession` port is
 * precisely the seam to observe it at. The wrapper delegates everything, so the
 * session under test is still the real one.
 */
export function recordFires(session: SensorSession): {
  port: SensorSession;
  fires: Array<{ edge: string; opts: RecordOnlyFire }>;
} {
  const fires: Array<{ edge: string; opts: RecordOnlyFire }> = [];
  const port: SensorSession = {
    available: () => session.available(),
    fire: (edge, opts) => {
      fires.push({ edge, opts });
      return session.fire(edge, opts);
    },
    on: (event, listener) => session.on(event, listener),
    sync: (node, opts) => session.sync(node, opts),
  };
  return { port, fires };
}

/** The desk's edge ids, so a test names them once and reads as prose. */
export const desk = {
  send: 'inbox.send',
  archive: 'inbox.archive',
  compose: 'inbox.compose',
  plan: 'inbox.plan',
  undo: 'inbox.undo',
  preview: 'inbox.preview',
  help: 'inbox.help',
  refresh: 'inbox.refresh',
  save: 'inbox.save',
  saveDraft: 'inbox.save-draft',
  reply: 'inbox.thread.reply',
} as const;
