/**
 * The worked example from docs/design/human-decisions.md, as a fixture: a
 * checkout journey whose middle step is the customer's call.
 *
 * `enter-address` → `choose-shipping-speed` → `place-order`, where the app has
 * declared that the shipping speed is the person's decision and named its own
 * condition for it having been made. Shared by the three suites that grew out of
 * that note so all of them argue about ONE graph.
 */
import { buildNavigationGraph } from '../src/index.js';
import type { InteractionSession, NavigationGraph } from '../src/index.js';

/** The app's own "it has been decided", in one place — asserted against, not retyped. */
export const SHIPPING_DONE_WHEN = { 'checkout.shipping': { ne: '' } } as const;

/** The app's own words for what is being decided. Data, and only ever data. */
export const SHIPPING_ABOUT = 'which shipping speed';

export const CHOOSE = 'checkout.choose-shipping-speed';
export const ADDRESS = 'checkout.enter-address';
export const PLACE = 'checkout.place-order';

/**
 * The checkout graph. `humanDecides` sits on the CHOOSER — the control the
 * person answers through — and nowhere else, which is the layering law: the fact
 * has one home, and `place-order`'s guard already ties the two mechanically.
 */
export function checkout(opts?: { confirmPlaceOrder?: boolean; declare?: boolean }): NavigationGraph {
  const declare = opts?.declare ?? true;
  return buildNavigationGraph('shop', {
    pages: {
      checkout: {
        actions: {
          'enter-address': { does: 'Enter the delivery address', writes: ['checkout.address'] },
          'choose-shipping-speed': {
            does: 'Choose a shipping speed',
            writes: ['checkout.shipping'],
            // The UNDECLARED TWIN — same graph, one declaration lighter. It is
            // what severability is measured against: an app that declares
            // nothing must see what it saw before this feature existed.
            ...(declare
              ? { humanDecides: { about: SHIPPING_ABOUT, doneWhen: { ...SHIPPING_DONE_WHEN } } }
              : {}),
          },
          'place-order': {
            does: 'Place the order',
            writes: ['orderId'],
            when: { 'checkout.shipping': { ne: '' } },
            ...(opts?.confirmPlaceOrder ? { confirm: true } : {}),
          },
        },
      },
    },
    journeys: {
      buy: {
        does: 'Buy what is in the cart',
        steps: ['enter-address', 'choose-shipping-speed', 'place-order'],
      },
    },
  });
}

/** Everything a projector must seed for the graph above to be decidable. */
export const seeded = {
  'checkout.address': '',
  'checkout.shipping': '',
  orderId: '',
};

/**
 * A live session on the checkout graph, wired so an AGENT can really act (a
 * declared-but-unbound action is a NOT_MATERIALIZED refusal, which would answer
 * a different question than any of these suites are asking).
 */
export function checkoutSession(opts?: {
  state?: Record<string, unknown>;
  graph?: NavigationGraph;
  now?: () => number;
  /** Turn the enforced-approval gate on — the only mode where a human's own no closes a card. */
  approval?: boolean | { expiresAfterMs?: number; refuseWhenWorldMoved?: boolean };
  handlers?: Record<string, (input?: unknown) => unknown>;
}): InteractionSession {
  const graph = opts?.graph ?? checkout();
  const session = graph.createSession({
    node: 'checkout',
    state: opts?.state ?? { ...seeded },
    onWarn: () => undefined,
    ...(opts?.now ? { now: opts.now } : {}),
    ...(opts?.approval ? { requireHumanApproval: opts.approval } : {}),
  });
  session.registerActions('checkout', {
    handlers: opts?.handlers ?? {
      'enter-address': () => undefined,
      'choose-shipping-speed': () => undefined,
      'place-order': () => undefined,
    },
  });
  return session;
}

export const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * The app reporting a step it really performed: a record-only fire, then the
 * state report NAMING it. Both halves matter — a report that names its fire is
 * the identity-bearing rung, and a step only counts as done once its delta
 * lands.
 */
export function performed(
  session: InteractionSession,
  affordanceId: string,
  delta: Record<string, unknown>,
  source: 'user' | 'agent' = 'user',
): string {
  const fired = session.fire(affordanceId, { source, invoke: false });
  if (!fired.ok) throw new Error(`fixture: '${affordanceId}' was refused (${fired.reason})`);
  session.updateState(delta, { transitionId: fired.transition.id });
  return fired.transition.id;
}

/** Is `key` present ANYWHERE inside this value — the deep-absence assertion. */
export function hasKeyDeep(value: unknown, key: string): boolean {
  if (Array.isArray(value)) return value.some((item) => hasKeyDeep(item, key));
  if (typeof value !== 'object' || value === null) return false;
  if (Object.hasOwn(value, key)) return true;
  return Object.values(value).some((child) => hasKeyDeep(child, key));
}
