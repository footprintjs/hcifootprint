/**
 * The mock APPLICATION — owns its state and handlers, mounts/unmounts pages,
 * reports through the tap. Faithful copy of the reference implementation's
 * example app, plus `pageView()`: the app's own render model of the current
 * page, which the perception substrate serializes (what a DOM dump would show).
 */
import type { Session } from 'hcifootprint';
import { dressShopGraph } from './graph.js';
import { DRESSES, filterByColor, searchDresses } from './data.js';

export interface DressShopApp {
  session: Session;
  /** Simulate the user/router navigating: unmount old page group, mount new, sync the cursor. */
  goto(page: string): void;
  /** The app's own state (source of truth — the session only sees the projected keys). */
  appState(): Record<string, unknown>;
  /** The rendered content of the current page — the perception substrate's raw material. */
  pageView(): PageView;
  currentPage(): string;
}

export interface PageView {
  page: string;
  /** Visible text content, as a browser dump would carry it (names, prices — untrusted). */
  content: string[];
  /** Interactive controls rendered on this page (accessible name + role). */
  controls: { name: string; role: string }[];
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

const CONTROL_META: Record<string, { name: string; role: string }> = {
  'browse-dresses': { name: 'Shop dresses', role: 'link' },
  'search-dresses': { name: 'Search', role: 'searchbox' },
  'filter-by-color': { name: 'Color', role: 'combobox' },
  'view-dress': { name: 'View dress', role: 'link' },
  'add-to-cart': { name: 'Add to cart', role: 'button' },
  'go-to-cart': { name: 'Cart', role: 'link' },
  'proceed-to-checkout': { name: 'Checkout', role: 'button' },
  'place-order': { name: 'Place order', role: 'button' },
  'view-orders': { name: 'My orders', role: 'link' },
  'check-order-status': { name: 'Check status', role: 'button' },
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
  // Handlers RETURN what a real app's functions return (matched records, the
  // opened record, a status) — the act→data-back channel: the session captures
  // it as `produced`, and serving layers fold it into tool results. All three
  // substrates see equivalent content (map: producedFor; flat: naturalReturn;
  // perception: the page dump).
  const handlers: Record<string, (payload?: unknown) => unknown> = {
    'browse-dresses': () => goto('catalog'),
    'search-dresses': (payload) => {
      const { query } = payload as { query: string };
      results = searchDresses(query);
      report({ resultIds: results.map((d) => d.id), resultCount: results.length });
      return results.map((d) => ({ id: d.id, name: d.name, color: d.color, price: d.price }));
    },
    'filter-by-color': (payload) => {
      const { color } = payload as { color: string };
      results = filterByColor(results, color);
      report({ resultIds: results.map((d) => d.id), resultCount: results.length, activeColor: color });
      return results.map((d) => ({ id: d.id, name: d.name, color: d.color, price: d.price }));
    },
    'view-dress': (payload) => {
      const { dressId } = payload as { dressId?: string };
      const dress = DRESSES.find((d) => d.id === dressId);
      // A real app's route handler 404s an unknown id instead of opening a
      // product page for nothing (pilot run 2026-07-14 sold a [null] cart
      // when a wrong payload key slipped through — see results RUN-NOTES).
      if (!dress) return { error: `no such dress: ${String(dressId)}. Pass dressId from the search results.` };
      selected = dress.id;
      report({ selectedDressId: dress.id });
      goto('product');
      return { ...dress };
    },
    'add-to-cart': () => {
      cart = [...cart, selected];
      report({ cartIds: [...cart], cartCount: cart.length });
      return { cartCount: cart.length };
    },
    'go-to-cart': () => goto('cart'),
    'proceed-to-checkout': () => goto('checkout'),
    'place-order': () => {
      const id = `ord-${nextOrder++}`;
      orders = [...orders, { id, status: 'processing' }];
      cart = [];
      report({ lastOrderId: id, orderCount: orders.length, cartIds: [], cartCount: 0 });
      return { orderId: id };
    },
    'view-orders': () => goto('orders'),
    'check-order-status': (payload) => {
      const { orderId } = payload as { orderId: string };
      const order = orders.find((o) => o.id === orderId);
      const status = order ? `${order.id}: ${order.status}` : `${orderId}: not found`;
      report({ orderStatus: status });
      return { status };
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

  const dressLine = (d: (typeof DRESSES)[number]) => `${d.id}: "${d.name}" — ${d.color}, size ${d.size}, $${d.price}`;

  function pageView(): PageView {
    const page = mountedPage ?? 'home';
    const controls = (PAGE_GROUPS[page] ?? []).map((id) => CONTROL_META[id]);
    const content: string[] = [];
    if (page === 'home') content.push('Welcome to the dress shop.');
    if (page === 'catalog') {
      content.push(results.length === 0 ? 'No results shown. Use Search.' : `${results.length} result(s):`);
      content.push(...results.map(dressLine));
    }
    if (page === 'product') {
      const dress = DRESSES.find((d) => d.id === selected);
      content.push(dress ? `Viewing ${dressLine(dress)}` : 'No dress selected.');
    }
    if (page === 'cart') {
      content.push(`Cart (${cart.length} item(s)):`);
      content.push(...cart.map((id) => dressLine(DRESSES.find((d) => d.id === id)!)));
    }
    if (page === 'checkout') {
      const total = cart.reduce((sum, id) => sum + (DRESSES.find((d) => d.id === id)?.price ?? 0), 0);
      content.push(`Checkout — ${cart.length} item(s), total $${total}.`);
    }
    if (page === 'orders') {
      content.push(orders.length === 0 ? 'No past orders.' : 'Your orders:');
      content.push(...orders.map((o) => `${o.id} — ${o.status}`));
    }
    return { page, content, controls };
  }

  goto('home');

  return {
    session,
    goto,
    pageView,
    currentPage: () => mountedPage ?? 'home',
    appState: () => ({
      results: results.map((d) => d.id),
      cart: [...cart],
      orders: orders.map((o) => ({ ...o })),
      selected,
    }),
  };
}
