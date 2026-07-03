/**
 * The mock APPLICATION — plays the role of a real web app: it owns its state
 * and handlers, mounts/unmounts "pages" (register/unregister tool groups),
 * and reports state changes through the tap (updateState). Everything
 * HCIFootprint learns about it flows through the same three wires a real
 * integration would use: registerTools + sync + updateState.
 */
import type { Session } from '../../src/index.js';
import { dressShopGraph } from './graph.js';
import { DRESSES, filterByColor, searchDresses } from './data.js';

export interface DressShopApp {
  session: Session;
  /** Simulate the user/router navigating: unmount old page group, mount new, sync the cursor. */
  goto(page: string): void;
  /** The app's own state (source of truth — the session only sees the projected keys). */
  appState(): Record<string, unknown>;
}

const initialProjection = {
  resultIds: [] as string[],
  resultCount: 0,
  activeColor: '',
  selectedDressId: '',
  cartIds: [] as string[],
  cartCount: 0,
  lastOrderId: '',
  orderCount: 0,
  orderStatus: '',
};

/** Which affordances "mount" on which page (mirrors components rendering). */
const PAGE_GROUPS: Record<string, string[]> = {
  home: ['browse-dresses', 'view-orders'],
  catalog: ['search-dresses', 'filter-by-color', 'view-dress', 'go-to-cart', 'view-orders'],
  product: ['add-to-cart', 'go-to-cart'],
  cart: ['proceed-to-checkout', 'view-orders'],
  checkout: ['place-order', 'view-orders'],
  orders: ['check-order-status'],
};

export function createDressShopApp(opts?: { onWarn?: (m: string) => void }): DressShopApp {
  const graph = dressShopGraph();
  const session = graph.createSession({ node: 'home', state: { ...initialProjection }, onWarn: opts?.onWarn });

  // ── the app's private state (superset of the projection) ─────────────────
  let results = [] as typeof DRESSES;
  let cart: string[] = [];
  let orders: { id: string; status: string }[] = [];
  let selected = '';
  let nextOrder = 1;

  const report = (delta: Record<string, unknown>) => session.updateState(delta);

  // ── the app's EXISTING handlers, registered by reference ─────────────────
  const handlers: Record<string, (payload?: unknown) => void> = {
    'browse-dresses': () => goto('catalog'),
    'search-dresses': (payload) => {
      const { query } = payload as { query: string };
      results = searchDresses(query);
      report({ resultIds: results.map((d) => d.id), resultCount: results.length });
    },
    'filter-by-color': (payload) => {
      const { color } = payload as { color: string };
      results = filterByColor(results, color);
      report({ resultIds: results.map((d) => d.id), resultCount: results.length, activeColor: color });
    },
    'view-dress': (payload) => {
      const { dressId } = payload as { dressId: string };
      selected = dressId;
      report({ selectedDressId: dressId });
      goto('product');
    },
    'add-to-cart': () => {
      cart = [...cart, selected];
      report({ cartIds: [...cart], cartCount: cart.length });
    },
    'go-to-cart': () => goto('cart'),
    'proceed-to-checkout': () => goto('checkout'),
    'place-order': () => {
      const id = `ord-${nextOrder++}`;
      orders = [...orders, { id, status: 'processing' }];
      cart = [];
      report({ lastOrderId: id, orderCount: orders.length, cartIds: [], cartCount: 0 });
    },
    'view-orders': () => goto('orders'),
    'check-order-status': (payload) => {
      const { orderId } = payload as { orderId: string };
      const order = orders.find((o) => o.id === orderId);
      report({ orderStatus: order ? `${order.id}: ${order.status}` : `${orderId}: not found` });
    },
  };

  let mountedPage: string | null = null;

  function goto(page: string): void {
    if (mountedPage) session.unregisterGroup(`page:${mountedPage}`);
    const tools = Object.fromEntries(
      (PAGE_GROUPS[page] ?? []).map((id) => [id, handlers[id]]),
    );
    if (Object.keys(tools).length > 0) session.registerTools({ group: `page:${page}`, tools });
    mountedPage = page;
    session.sync(page); // no-op when the settle already moved the cursor there
  }

  goto('home');

  return {
    session,
    goto,
    appState: () => ({
      results: results.map((d) => d.id),
      cart: [...cart],
      orders: orders.map((o) => ({ ...o })),
      selected,
    }),
  };
}
