/**
 * `contextful(fn)` — turn a UI action into a contextful action.
 *
 * ONE WRAPPER AT REGISTRATION, and both directions of the same action land in
 * the same envelope:
 *
 * ```ts
 * const addToCart = contextful(shop.add, { watch: true, anchor: () => buttonRef.current });
 *
 * session.registerActions('catalog', { handlers: { 'add-to-cart': addToCart } });
 * // the agent's door:  session.fire('catalog.add-to-cart', { source: 'agent' })
 * // the human's door:  <button onClick={() => addToCart({ qty: 2 })}>
 * ```
 *
 * The agent's fire already went through `fire()`, so the session captures around
 * it. The human's click never did — the app called its own function — so THIS is
 * where that call enters the ledger: the wrapper reports it record-only
 * (`invoke: false`, the one canonical door — the browser has already run the
 * app's code, and a fire that also invoked would run one human click twice) and
 * then calls the app's function exactly as before.
 *
 * SEVERABLE, in the strong sense: delete the wrapper and the app behaves
 * identically. The wrapper forwards every argument, returns exactly what the
 * function returned, and rethrows exactly what it threw. A wrapped function no
 * session has registered is a plain call with one property on it — so importing
 * this on a server, or in a test with no session, does nothing at all.
 *
 * THE BRAND IS THE RECOGNITION MECHANISM. A registered handler is just a
 * function by the time the registry holds it (registry.ts is deliberately
 * session-blind), so the wrapper carries its own declaration on itself, under a
 * non-enumerable symbol: `registerActions` / `registerHandlers` read it at
 * registration to attach the anchor, and `fire()` reads it again to know what to
 * capture. No new registration option, no parallel table to keep in step, and
 * the opt-in stays visible in the app's own source.
 */
import type { AnchorSource } from './anchor-port.js';
import type { ContextfulOptions, SenseDeclaration } from './types.js';

/** The symbol the declaration hides under. `Symbol.for` so two copies of the library agree. */
const BRAND = Symbol.for('hcifootprint.contextful');

/**
 * What a registration binds the wrapper to — the session side of the wire,
 * handed over at registration and taken back on unregister.
 */
export interface ContextfulSite {
  /**
   * True while the session is invoking THIS action's handler right now. The
   * agent's fire is already being captured by the session, so the wrapper stays
   * out of the way rather than opening a second row for one act.
   */
  invoking(): boolean;
  /** Record around a DIRECT (app-initiated) call. Returns exactly what `run` returned. */
  direct(payload: unknown, run: () => unknown): unknown;
}

/** The declaration a wrapped handler carries on itself. */
export interface ContextfulBrand {
  readonly options: ContextfulOptions;
  /**
   * The registration that owns this handler right now, or null. Last
   * registration wins — the registry's own rule (registry.ts:23-25), one field
   * over — and a release only clears the site it put there (token identity), so
   * a StrictMode remount leaves the survivor wired.
   */
  site: ContextfulSite | null;
}

/** Read the declaration off a handler, or nothing if it is a plain function. */
export function readContextful(value: unknown): ContextfulBrand | undefined {
  if (typeof value !== 'function') return undefined;
  const brand: unknown = (value as unknown as Record<symbol, unknown>)[BRAND];
  return brand === undefined ? undefined : (brand as ContextfulBrand);
}

function wrap<A extends unknown[], R>(
  fn: (...args: A) => R,
  options: ContextfulOptions = {},
): (...args: A) => R {
  if (typeof fn !== 'function') {
    throw new TypeError(
      `hcifootprint: contextful() takes the handler function you are registering — got ${typeof fn}. ` +
        `For an action with no handler at all, declare the anchor instead: ` +
        `session.sense('page.action', contextful.sense(() => el)).`,
    );
  }
  if (readContextful(fn) !== undefined) {
    throw new TypeError(
      `hcifootprint: this handler is already contextful — wrapping it twice would record one act twice. ` +
        `Pass the options to the single contextful() call instead.`,
    );
  }
  const brand: ContextfulBrand = { options, site: null };
  const wrapped = (...args: A): R => {
    const site = brand.site;
    // Not registered anywhere, or the session is already recording this very
    // invocation: run the app's function and nothing else.
    if (site === null || site.invoking()) return fn(...args);
    // The app is calling its own action. `args[0]` is the payload by the same
    // convention the registry states (`ActionHandler = (payload?) => …`); every
    // argument is still forwarded untouched.
    return site.direct(args.length > 0 ? args[0] : undefined, () => fn(...args)) as R;
  };
  Object.defineProperty(wrapped, BRAND, { value: brand, enumerable: false });
  return wrapped;
}

/**
 * SENSE-ONLY — the rung below a registered handler.
 *
 * An app with no handler to wrap (the L0 shape: the button does its own thing
 * and nothing is bound) still has an anchor, and an anchor is enough to see that
 * a person acted. A TRUSTED click inside it opens a record-only fire stamped
 * `cause.inferred`, with the correlation rule on the record. The library
 * performs nothing here — it writes down what it saw, and says how it knows.
 *
 * ```ts
 * const release = session.sense('catalog.add-to-cart', contextful.sense(() => buttonRef.current));
 * ```
 */
function sense(anchor: AnchorSource, options: ContextfulOptions = {}): SenseDeclaration {
  return { anchor, options: { ...options, watch: true, anchor } };
}

/**
 * Wrap a handler so both doors into one action — the agent's `fire()` and the
 * app's own call — land in the same capture envelope. See the module header.
 */
export const contextful = Object.assign(wrap, { sense });
