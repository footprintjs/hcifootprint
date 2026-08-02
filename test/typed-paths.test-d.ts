/**
 * Type-level checks for buildNavigationGraph's typed node paths, and for the
 * authoring types' NAMES. This file is NOT run — it must COMPILE (a bad path
 * must be a type error). `npm run typecheck` covers it. @ts-expect-error
 * asserts the error exists.
 */
import { buildNavigationGraph, fromRoutes } from '../src/index.js';
import type { JourneyDef } from '../src/index.js';

const graph = buildNavigationGraph('shop', {
  pages: {
    catalog: {
      areas: { 'filter-rail': { actions: { 'set-color': { does: 'Filter by color' } } } },
      actions: { 'add-to-cart': { does: 'Add' } },
    },
    checkout: {
      modals: { 'confirm-order': { actions: { 'place-order': { does: 'Place', confirm: true } } } },
    },
  },
});

const session = graph.createSession();

// Real paths compile:
session.registerActions('catalog');
session.registerActions('catalog.filter-rail');
session.registerActions('checkout.confirm-order');
session.setVisible('checkout.confirm-order', true);
session.show('catalog');

// A typo is a COMPILE error — the whole point of the guardrail:
// @ts-expect-error 'catalog.filter-rai' is not a declared node path
session.registerActions('catalog.filter-rai');
// @ts-expect-error 'ghost' is not a page
session.setVisible('ghost', true);

// -- routes-source pages are REAL typed node paths --------------------------
// fromRoutes carries its table's literal keys through `const` inference so a
// source-contributed page passes the same guardrail hand-authored pages do.
const sourced = buildNavigationGraph('shop-sourced', {
  pages: { catalog: { actions: { 'add-to-cart': { does: 'Add' } } } },
  sources: [fromRoutes({ home: '/', orders: '/orders/:id' })],
});
const sourcedSession = sourced.createSession();

// Hand-authored and source-contributed pages both compile:
sourcedSession.registerActions('catalog');
sourcedSession.registerActions('home');
sourcedSession.registerActions('orders');
sourcedSession.show('orders');

// And a typo is still a COMPILE error, not a silent runtime no-op:
// @ts-expect-error 'oders' is neither a declared page nor a source page
sourcedSession.registerActions('oders');

// -- a sources-only def: `pages` may be OMITTED entirely ---------------------
// Two mutation proofs ride the typecheck gate here: against required `pages`
// this def literal fails to compile at all, and against a NodePathsOf whose
// no-pages arm falls back to `string` the @ts-expect-error below is UNUSED
// (the fallback absorbs the routes-source paths and disarms the guardrail) —
// either regression fails `npm run typecheck`.
const sourcesOnly = buildNavigationGraph('shop-sources-only', {
  sources: [fromRoutes({ home: '/', cart: '/cart' })],
});
const sourcesOnlySession = sourcesOnly.createSession();

// The routes-source pages are the ONLY typed paths, and they compile:
sourcesOnlySession.registerActions('home');
sourcesOnlySession.show('cart');

// @ts-expect-error 'hom' is not a page any source declared
sourcesOnlySession.registerActions('hom');

// -- JourneyDef — ONE name, and it is the name you author with ----------------
// This block used to prove that the number-suffixed `SkillDef2` still compiled
// as a deprecated alias of `JourneyDef`. At 1.0 there is no alias to prove: the
// old name is DELETED, and test/one-word-journey.test-d.ts is where that
// absence is asserted. What is left here is the half that is still a claim —
// the type a `journeys:` block accepts is the exported one, so a consumer can
// build a journey in a variable and hand it in.
const journey: JourneyDef = { does: 'Buy a dress end to end', steps: ['add-to-cart'] };

buildNavigationGraph('shop-journeys', {
  pages: { catalog: { actions: { 'add-to-cart': { does: 'Add' } } } },
  journeys: { purchase: journey },
});

// @ts-expect-error a journey's `does` is REQUIRED — the planner-facing sentence
const noDoes: JourneyDef = { steps: ['add-to-cart'] };
void noDoes;

/**
 * WRITING DOWN WHAT YOU WERE HANDED MUST NEVER REQUIRE A DEPENDENCY YOU DID NOT
 * CHOOSE. `CommitBundle` and `MCPToolDescription` are re-exported for what this
 * package RETURNS; `WhereFilter` is the same rule on the input side — it is the
 * shape of every `when:` and `enabledWhen:`, half of `VerifyContract`, and the
 * type of `Journey.precondition`. A consumer factoring a guard into a helper
 * has to be able to name it from here.
 */
import type {
  CommitBundle,
  MCPToolDescription,
  VerifyContract,
  WhereFilter,
} from '../src/index.js';

const reusableGuard: WhereFilter = { 'cart.items': { gt: 0 } };
// It really is the guard type the authoring keys take…
const guarded: JourneyDef = { does: 'Check out', steps: [], when: reusableGuard };
// …and really is one half of the exported contract union.
const contract: VerifyContract = reusableGuard;
declare const bundles: CommitBundle[];
declare const tools: MCPToolDescription[];
void guarded;
void contract;
void bundles;
void tools;

/**
 * THE TESTING ENTRY'S GENERICS CARRY DEFAULTS, like every generic on the main
 * entry (`InteractionSession<Paths extends string = string>`, `NavigationGraph
 * <Paths = string>`, `RoutesSource<PageIds = string>`). Without one, writing
 * down what `testApp()` handed you — `let app: TestApp` — is a TS2314 rather
 * than the obvious thing, and a consumer annotating a variable in a test should
 * not have to restate a state type the call already inferred.
 */
import type {
  Resolver,
  ResolverContext,
  ResolverOutcome,
  TestApp,
  TestAppOptions,
} from '../src/testing/index.js';

declare const bareApp: TestApp;
declare const bareOptions: TestAppOptions;
declare const bareResolver: Resolver;
declare const bareContext: ResolverContext;
declare const bareOutcome: ResolverOutcome;
void bareApp;
void bareOptions;
void bareResolver;
void bareContext;
void bareOutcome;
