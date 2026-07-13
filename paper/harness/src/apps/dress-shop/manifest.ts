/**
 * The DECLARED action manifest — the authored facts the flat (WebMCP-style)
 * and perception substrates are allowed to know.
 *
 * flat: one always-visible tool per row (exactly what a WebMCP adopter would
 * register, with the same authored descriptions the map uses — not a strawman).
 * perception: `control` is the accessible name a page dump shows and the
 * generic act tool targets.
 *
 * Deliberately ABSENT: guards, effects, skills, position. Those are the map
 * substrate's advantage under test.
 */
export interface DeclaredAction {
  id: string;
  description: string;
  /** Pages whose rendered UI shows this control (mirrors PAGE_GROUPS). */
  pages: string[];
  /** Accessible name of the control (from the graph's ARIA binding). */
  control: string;
  role: 'button' | 'link' | 'searchbox' | 'combobox';
  /** JSON-schema properties for payload-bearing actions. */
  input?: { name: string; description: string }[];
  highEffect?: boolean;
}

export const DECLARED_ACTIONS: DeclaredAction[] = [
  { id: 'browse-dresses', description: 'Browse the dress catalog', pages: ['home'], control: 'Shop dresses', role: 'link' },
  {
    id: 'search-dresses', description: 'Search dresses by name or color', pages: ['catalog'],
    control: 'Search', role: 'searchbox', input: [{ name: 'query', description: 'search text, e.g. "silk" or "red"' }],
  },
  {
    id: 'filter-by-color', description: 'Filter the current results by color', pages: ['catalog'],
    control: 'Color', role: 'combobox', input: [{ name: 'color', description: 'a color, e.g. "red"' }],
  },
  {
    id: 'view-dress', description: 'Open one dress from the results', pages: ['catalog'],
    control: 'View dress', role: 'link', input: [{ name: 'dressId', description: 'the dress id, e.g. "d3"' }],
  },
  { id: 'add-to-cart', description: 'Add the open dress to the cart', pages: ['product'], control: 'Add to cart', role: 'button' },
  { id: 'go-to-cart', description: 'Open the shopping cart', pages: ['catalog', 'product'], control: 'Cart', role: 'link' },
  { id: 'proceed-to-checkout', description: 'Proceed to checkout', pages: ['cart'], control: 'Checkout', role: 'button' },
  {
    id: 'place-order', description: 'Place the order for everything in the cart', pages: ['checkout'],
    control: 'Place order', role: 'button', highEffect: true,
  },
  { id: 'view-orders', description: 'Open your past orders', pages: ['home', 'catalog', 'cart', 'checkout'], control: 'My orders', role: 'link' },
  {
    id: 'check-order-status', description: 'Look up the status of one order', pages: ['orders'],
    control: 'Check status', role: 'button', input: [{ name: 'orderId', description: 'the order id, e.g. "ord-1"' }],
  },
];

export const byControl = new Map(DECLARED_ACTIONS.map((a) => [a.control.toLowerCase(), a]));
export const byId = new Map(DECLARED_ACTIONS.map((a) => [a.id, a]));
