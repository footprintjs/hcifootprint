/**
 * THE ROUTE TABLE — this app's own truth about where its pages live.
 *
 * One owner, three readers, zero copies:
 *   • the app's router navigates by these strings (app/router.ts),
 *   • fromRoutes() reads the same object into page nodes (app/graph.ts),
 *   • matchRoute() reads a URL back to a page id using the routes those page
 *     nodes carry (app/wizard.ts).
 *
 * That is the whole point of a source: the table stays the single owner of its
 * truth, and the graph READS it instead of holding a second hand-typed copy
 * that drifts the moment someone edits one of them.
 *
 * Page names are the keys, spelled out. fromRoutes refuses to derive a name
 * from '/orders/:id' — deriving one would be a guess, and the library does not
 * guess. `as const` is load-bearing: it carries the literal keys through
 * fromRoutes' `const` type parameter so a source-contributed page is a REAL
 * typed node path on the compiled graph (a typo in registerToolGroup stays a
 * compile error).
 */
export const ROUTES = {
  welcome: { route: '/', does: 'The signup landing step' },
  profile: { route: '/profile', does: 'Name and role' },
  plan: { route: '/plan', does: 'Pick a subscription plan' },
  review: { route: '/review', does: 'Check the details before creating the account' },
  done: { route: '/done', does: 'The account exists' },
} as const;

/** Page ids as the route table spells them — the app's own vocabulary. */
export type WizardPageId = keyof typeof ROUTES;

/** Declaration order, for the stepper. Object key order IS the wizard order. */
export const PAGE_ORDER = Object.keys(ROUTES) as WizardPageId[];
