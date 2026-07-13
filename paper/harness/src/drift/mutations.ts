/**
 * Mutation operators — each injects exactly ONE realistic drift fault, the
 * kind a normal commit introduces: a guard edited against a renamed store
 * key, a page whose entry link was dropped, a handler that stopped writing
 * what the graph declares. `expectedLayer` is the PREREGISTERED prediction
 * of which harness layer catches it (see PREREGISTRATION.md); the scorer
 * records what actually happened. `expected-miss` mutants pin the harness's
 * documented boundaries — right-key/wrong-value blindness and journey
 * coverage — as measured facts rather than footnotes.
 */
import type { Resolver } from 'hcifootprint/testing';
import type { ShopSpec, ShopState } from './shop.js';

export type ExpectedLayer =
  | 'compile'
  | 'static'
  | 'static-advisory'
  | 'behavioral-report'
  | 'behavioral-journey'
  | 'expected-miss';

export interface Mutant {
  id: string;
  /** The drift family, for the per-class recall rollup. */
  family: 'guard' | 'page' | 'skill' | 'effect' | 'handler' | 'nav';
  /** What a teammate's commit did to the app/graph. */
  story: string;
  expectedLayer: ExpectedLayer;
  /** Transform the spec (graph-side drift) — receives a deep clone. */
  mutateSpec?: (spec: ShopSpec) => void;
  /** Transform the resolvers (app-side drift) — receives a fresh map. */
  mutateResolvers?: (resolvers: Record<string, Resolver<ShopState>>) => void;
}

export const MUTANTS: Mutant[] = [
  // ── graph-side drift: the declaration went stale ──────────────────────────
  {
    id: 'M01-guard-dangling-key',
    family: 'guard',
    story: 'The store renamed resultCount but the graph guard still reads the old key.',
    expectedLayer: 'static',
    mutateSpec: (spec) => {
      spec.pages.catalog.tools['filter-by-color'].when = { inventoryReady: { eq: true } };
    },
  },
  {
    id: 'M02-guard-unsatisfiable',
    family: 'guard',
    story: 'A merge mangled the guard into a condition no state can satisfy.',
    expectedLayer: 'static',
    mutateSpec: (spec) => {
      spec.pages.catalog.tools['view-dress'].when = { resultCount: { gt: 5, lt: 3 } };
    },
  },
  {
    id: 'M03-page-unreachable',
    family: 'page',
    story: 'A redesign repointed the "My orders" link home; nothing reaches orders anymore.',
    expectedLayer: 'static',
    mutateSpec: (spec) => {
      spec.tools['view-orders'].goTo = 'home';
    },
  },
  {
    id: 'M04-skill-uncompletable',
    family: 'skill',
    story: 'place-order stopped declaring orderCount; the track-order skill can never unlock.',
    // PREDICTED static — MEASURED missed (first run, 2026-07-13): a stale
    // declared-write list is invisible when (a) the key sits in initialState,
    // so key-level lint counts it producible, and (b) the app still writes it,
    // and extra undeclared writes are not flagged at settlement. A DISCOVERED
    // harness boundary — feeds the paper's limitations and a candidate library
    // improvement (advisory on undeclared extra writes).
    expectedLayer: 'static',
    mutateSpec: (spec) => {
      spec.pages.checkout.tools['place-order'].writes = ['lastOrderId', 'cartIds', 'cartCount'];
    },
  },
  {
    id: 'M05-write-unconsumed',
    family: 'effect',
    story: 'Search grew a telemetry write nothing in the graph consumes (leftover claim).',
    expectedLayer: 'static-advisory',
    mutateSpec: (spec) => {
      spec.pages.catalog.tools['search-dresses'].writes = ['resultIds', 'resultCount', 'searchTelemetry'];
    },
  },
  {
    id: 'M06-skill-step-unknown',
    family: 'skill',
    story: 'The purchase flow references a coupon step that was deleted from the app.',
    expectedLayer: 'compile',
    mutateSpec: (spec) => {
      spec.skills.purchase.steps = ['add-to-cart', 'apply-coupon', 'proceed-to-checkout', 'place-order'];
    },
  },

  // ── app-side drift: the handlers changed under a true declaration ─────────
  {
    id: 'M07-handler-wrong-write',
    family: 'handler',
    story: 'add-to-cart now updates a renamed basket key; the declared cart keys never move.',
    expectedLayer: 'behavioral-report',
    mutateResolvers: (resolvers) => {
      resolvers['add-to-cart'] = () => ({ patch: { basketCount: 1 } });
    },
  },
  {
    id: 'M08-handler-no-op',
    family: 'handler',
    story: 'A refactor left search wired to a stub that changes nothing.',
    expectedLayer: 'behavioral-report',
    mutateResolvers: (resolvers) => {
      resolvers['search-dresses'] = () => undefined;
    },
  },
  {
    id: 'M09-handler-missing',
    family: 'handler',
    story: 'The add-to-cart handler was deleted; the button is declared but dead.',
    expectedLayer: 'behavioral-journey',
    mutateResolvers: (resolvers) => {
      delete resolvers['add-to-cart'];
    },
  },
  {
    id: 'M10-handler-wrong-nav',
    family: 'nav',
    story: 'view-dress now routes to the cart (an A/B experiment); the graph claims product.',
    expectedLayer: 'behavioral-journey',
    mutateResolvers: (resolvers) => {
      resolvers['view-dress'] = (payload) => {
        const { dressId } = (payload ?? {}) as { dressId?: string };
        return { patch: { selectedDressId: dressId ?? '' }, goTo: 'cart' };
      };
    },
  },
  {
    id: 'M11-handler-partial-write',
    family: 'handler',
    story: 'place-order stopped clearing the cart; it still writes the order keys.',
    expectedLayer: 'behavioral-report',
    mutateResolvers: (resolvers) => {
      resolvers['place-order'] = (_payload, { state }) => ({
        patch: { lastOrderId: `ord-${state.orderCount + 1}`, orderCount: state.orderCount + 1 },
      });
    },
  },

  // ── the preregistered honest misses (documented boundaries, measured) ─────
  {
    id: 'M12-handler-wrong-value',
    family: 'handler',
    story: 'add-to-cart writes the right keys with the wrong dress id (right-key/wrong-value).',
    // effectVerified checks key PRESENCE only — report() stays clean by design;
    // only a journey that asserts VALUES catches it.
    expectedLayer: 'behavioral-journey',
    mutateResolvers: (resolvers) => {
      resolvers['add-to-cart'] = (_payload, { state }) => ({
        patch: { cartIds: [...state.cartIds, 'd999'], cartCount: state.cartCount + 1 },
      });
    },
  },
  {
    id: 'M13-guard-weakened',
    family: 'guard',
    story: 'place-order lost its cart guard; the graph now OFFERS ordering an empty cart.',
    // The happy-path journey never tries the empty-cart order; static lint sees
    // nothing wrong with a missing guard. Preregistered MISS: drift detection
    // is bounded by journey coverage — this is the number that keeps us honest.
    expectedLayer: 'expected-miss',
    mutateSpec: (spec) => {
      delete spec.pages.checkout.tools['place-order'].when;
    },
  },
];
