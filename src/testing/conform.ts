/**
 * conformSource — A SOURCE ADAPTER CANNOT SILENTLY DROP A DECLARABLE FIELD.
 *
 * A graph source threads somebody else's declaration through copy points.
 * `fromRoutes` reads a route table, `fromJourneys` a journey list, `fromLiveStore`
 * an action store — and every one of them copies a declared field from the app's
 * shape into the library's, by hand, one field at a time. So does every source an
 * app writes for itself, which is the door this exists for.
 *
 * A DROPPED FIELD DOES NOT ERROR. It compiles, it serves, and it looks like a
 * working integration: the app declares `verify`, the agent never sees it, and
 * nothing anywhere says so. Reported from the field — one integration's seam was
 * found dropping FOUR declared fields silently, and one of those had already been
 * fixed at one copy point and was still being dropped at the next, because a fix
 * at one seam proves nothing about the one after it. That is the bug class this
 * makes structurally impossible for any source that runs it.
 *
 * THE MANIFEST IS THE POINT. {@link DECLARABLE_ACTION_FIELDS} is the canonical
 * list of everything an action declaration may carry, and it is COMPILE-LOCKED:
 * add a field to `ActionDef` — or to either of its two extension points, the
 * root-level multi-attach `on` and the mount-time `handler` — without listing it
 * here, and the build stops NAMING the field. A manifest that can drift is a
 * manifest that will, and a conformance checker reading a stale manifest is the
 * same silence one level up.
 *
 * TWO SEAMS, because a field can survive one and die at the next:
 * - `'compile'` — did the declaration reach the compiled record the graph holds
 *   for this action (its affordance)?
 * - `'serve'` — does an agent-visible surface carry it: the row the real
 *   `whats_here` port answers with, and the `available()` edge behind it?
 *
 * A dropped field is reported ONCE, at the seam that lost it. A declaration that
 * never compiled cannot reach a served row either, and saying so twice would send
 * the reader to two places for one fix.
 *
 * WHAT THIS DOES NOT TEST: the library's own presence laws. `blockedBecause` is
 * served only while a control is off, `enabledWhen` reaches a reader as one
 * `enabled: false` stamp and nowhere else, `humanDecides` rides as a bare `true`.
 * The fixture puts every field in the state the library PROMISES to serve it in
 * and then asks one question — did the ADAPTER's threading survive. Whether the
 * law itself is right is what the rest of the suite is for. Where a law couples
 * two fields (a blocked sentence needs a switched-off row) the coupling is stated
 * at the field, and a source that drops one honestly loses both.
 *
 * WHAT A FIELD/SEAM PAIR WITH NOTHING TO READ COSTS: a sentence. Every excluded
 * pair carries its reason in `report.excluded`, because a checker whose pass is
 * partly vacuous and does not say which part is the exact silence it exists to
 * end.
 *
 * ```ts
 * import { expectConformance } from 'hcifootprint/testing';
 *
 * // Hand it the one-line FACTORY: the helper supplies the declaration, then goes
 * // looking for it. A finished source is a snapshot with no input door, so it
 * // could only ever be asked the narrower question (see SourceUnderTest).
 * expectConformance((fixture) => fromLiveStore(fixture.store));
 * ```
 */
import { serveToAgent } from '../serve/modes.js';
import { buildNavigationGraph } from '../tree/appmap.js';
import type {
  Affordance,
  AvailableEdge,
  AvailableJourney,
  Effect,
  Journey,
  NavigationGraphSpec,
} from '../atom/types.js';
import type { ActionDef, JourneyDef, NavigationGraphDef, PageNodeDef } from '../tree/types.js';
import type { InteractionSession, RegisteredActionDef } from '../traverse/nav-session.js';
import type {
  GraphSource,
  JourneysSource,
  LiveAction,
  LiveActionStore,
  LiveSource,
  RoutesSource,
} from '../graph/sources/types.js';
// Type-only, for the page manifest's compile lock below: `typeof fromRoutes` names
// the route table's REAL shape, so that manifest tracks the factory instead of a
// hand copy of it. Erased at build — this drags no module in.
import type { fromRoutes } from '../graph/sources/from-routes.js';
// Same rule, for the second door into the same source kind: the fixture hands a
// route TREE to fromReactRouter, and this names its shape without importing it.
import type { RouteObjectLike } from '../graph/sources/from-react-router.js';

// ---------------------------------------------------------------------------
// The manifest — compile-locked so it cannot drift
// ---------------------------------------------------------------------------

/**
 * Everything an action declaration may carry: `ActionDef` PLUS its two extension
 * points — the root-level multi-attach `on` (a graph definition's own `actions:`
 * block) and the mount-time `handler` (`RegisteredActionDef`). Derived from both
 * rather than re-typed, so a field added at either door lands here by itself.
 */
export type FullActionDef = RegisteredActionDef & Partial<NonNullable<NavigationGraphDef['actions']>[string]>;

/**
 * THE CANONICAL DECLARABLE-FIELD MANIFEST — every field a source must thread, in
 * one list, so "did you carry all of it?" becomes a question with an answer.
 *
 * The lock below is what makes it trustworthy: this list cannot fall behind
 * {@link FullActionDef} without the build failing and naming the missing field.
 */
export const DECLARABLE_ACTION_FIELDS = [
  'does',
  'binding',
  'when',
  'enabledWhen',
  'blockedBecause',
  'writes',
  'reads',
  'goTo',
  'confirm',
  'input',
  'verify',
  'humanDecides',
  'role',
  'on',
  'handler',
] as const satisfies readonly (keyof FullActionDef)[];

/** One field name from {@link DECLARABLE_ACTION_FIELDS}. */
export type DeclarableActionField = (typeof DECLARABLE_ACTION_FIELDS)[number];

/**
 * THE COMPILE LOCK. A field on `ActionDef` (or on either extension point) that the
 * manifest does not list makes `Unlisted` a real union, and this assignment stops
 * the build with the field's own name in the error:
 *
 *   Type 'true' is not assignable to type
 *   '["field missing from DECLARABLE_ACTION_FIELDS", "myNewField"]'
 *
 * A type-level check rather than a runtime one, because the failure has to land on
 * the author who added the field, at build — not on a consumer at run time.
 */
type Unlisted = Exclude<keyof FullActionDef, DeclarableActionField>;
/** The lock is the TYPE; the value exists only so the compiler has to check it. */
const MANIFEST_COMPLETE: Unlisted extends never
  ? true
  : ['field missing from DECLARABLE_ACTION_FIELDS', Unlisted] = true;
void MANIFEST_COMPLETE;

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

/** Where a declaration is read: the compiled affordance, or an agent-visible surface. */
export type ConformanceSeam = 'compile' | 'serve';

export interface ConformanceReport {
  /**
   * Every declared field the source did not thread through, named with the seam
   * that lost it. Empty is the whole pass condition.
   */
  dropped: { field: string; seam: ConformanceSeam }[];
  /** The field/seam pairs this run actually put to the test — the pass's denominator. */
  checked: { field: string; seam: ConformanceSeam }[];
  /**
   * The field/seam pairs there was nothing to read at, each with the stated
   * reason. A pass is never silent about the part of itself that was vacuous.
   */
  excluded: { field: string; seam: ConformanceSeam; because: string }[];
}

// ---------------------------------------------------------------------------
// The fixture — one distinguishable sentinel per field, in the state the library
// promises to serve it in
// ---------------------------------------------------------------------------

/**
 * The declaration `conformSource` feeds through a source, plus a ready-made input
 * per source kind. Handed to the BUILDER form, which is how a source under test
 * receives a declaration the helper already knows by heart.
 */
export interface ConformanceFixture {
  /** The page the fixture action lives on. */
  page: string;
  /** A second page, so the fixture's `goTo` names a destination that really exists. */
  destination: string;
  /** The fixture action's leaf name. */
  name: string;
  /** The fixture action's qualified id on the compiled graph (`page.name`). */
  actionId: string;
  /** Every declarable field, populated with a distinguishable sentinel. */
  action: FullActionDef;
  /** A live action store publishing exactly the fixture action — for a live source. */
  store: LiveActionStore;
  /** A route table naming both fixture pages — for a routes source. */
  routes: Record<string, { route: string; does: string }>;
  /**
   * The same two pages as a nested route TREE — for a route-tree source
   * (`fromReactRouter`). DERIVED from {@link ConformanceFixture.routes} rather
   * than written out again, so the two inputs cannot describe different pages:
   * each route carries its label in the handle and lets the factory transcribe
   * the page name from the address, which is exactly the round-trip the routes
   * seam then reads back.
   */
  routeObjects: readonly RouteObjectLike[];
  /** A journey list whose one journey steps through the fixture action — for a journeys source. */
  journeys: Record<string, JourneyDef>;
  /** The journey id in {@link ConformanceFixture.journeys}. */
  journeyId: string;
  /**
   * The projected state that puts every field where the library promises to serve
   * it: the guard PASSES (so the row is offered at all) and `enabledWhen` FAILS
   * (so the row is switched off, the only condition under which a blocked sentence
   * is ever served).
   */
  state: Record<string, unknown>;
}

const DEFAULT_PAGE = 'conformance';
const GRAPH_ID = 'source-conformance';
/**
 * The one no-op this module needs, in two places that both want nothing to
 * happen: the fixture's handler (conformance never FIRES the action — the field
 * only has to be threaded and mounted) and the session's warning sink (a
 * conformance run must not write to somebody's console about a fixture they never
 * wrote).
 */
const noop = (): undefined => undefined;
/** The key the fixture's `when` and the fixture journey's precondition both read. */
const GUARD_KEY = 'conformance.here';
/** The key `enabledWhen` reads — seeded false, so the fixture row is switched off. */
const ENABLED_KEY = 'conformance.enabled';

/**
 * The second page's own segment. One constant, three readings: the flat table's
 * route (`/page/elsewhere`), the route tree's relative `path`, and the page NAME
 * a route-tree source transcribes from that address (`page-elsewhere`) — so the
 * two inputs cannot come to describe different pages.
 */
const LEAF = 'elsewhere';

function makeFixture(page: string): ConformanceFixture {
  const destination = `${page}-${LEAF}`;
  const name = 'conformance-action';
  const journeyId = 'conformance-journey';
  const action: FullActionDef = {
    does: 'Conformance fixture: an action carrying every declarable field',
    // A programmatic gesture — a real binding with nothing for an authoring gate
    // to refuse, so a dropped `binding` is the only way this can go missing.
    binding: { kind: 'programmatic', provider: 'conformance-fixture' },
    when: { [GUARD_KEY]: { eq: true } },
    enabledWhen: { [ENABLED_KEY]: { eq: true } },
    blockedBecause: {
      says: 'The conformance fixture holds this control off on purpose',
      clearedBy: 'app',
    },
    writes: ['conformance.written'],
    reads: ['conformance.read'],
    goTo: destination,
    confirm: true,
    input: { type: 'object', properties: { note: { type: 'string' } } },
    verify: { 'conformance.written': { eq: true } },
    humanDecides: {
      about: 'the conformance fixture decision',
      doneWhen: { 'conformance.decided': { eq: true } },
    },
    role: 'submit',
    on: [page],
    handler: noop,
  };
  // The live row carries the declaration MINUS `on`: a live action names one
  // `node`, and the compiled affordance's `on` is derived from that node's page.
  const { on: _on, ...forLiveStore } = action;
  const liveAction: LiveAction = { node: page, name, ...forLiveStore };
  const routes = {
    [page]: { route: `/${page}`, does: 'The conformance fixture page' },
    [destination]: { route: `/${page}/${LEAF}`, does: 'The conformance fixture destination' },
  };
  return {
    page,
    destination,
    name,
    actionId: `${page}.${name}`,
    action,
    store: {
      subscribe: () => () => undefined,
      actions: () => [liveAction],
    },
    routes,
    // The same two pages, nested: the child's address composes through the
    // parent's, and each page NAMES ITSELF by transcription from that address —
    // the route-tree door's own contract, exercised rather than described.
    routeObjects: [
      {
        path: routes[page].route,
        handle: { hcifootprint: { does: routes[page].does } },
        children: [{ path: LEAF, handle: { hcifootprint: { does: routes[destination].does } } }],
      },
    ],
    journeys: {
      [journeyId]: {
        does: 'Conformance fixture: a journey carrying every declarable field',
        steps: [name],
        when: { [GUARD_KEY]: { eq: true } },
      },
    },
    journeyId,
    state: {
      [GUARD_KEY]: true,
      [ENABLED_KEY]: false,
      'conformance.written': false,
      'conformance.decided': false,
    },
  };
}

/** The fixture action as a plain `ActionDef` — what a graph definition's `actions:` block accepts. */
function actionForDef(fixture: ConformanceFixture): ActionDef {
  const { on: _on, handler: _handler, ...def } = fixture.action;
  return def;
}

// ---------------------------------------------------------------------------
// Reading a value at a seam
// ---------------------------------------------------------------------------

/** One served row, read as data — the port answers with plain objects. */
type ServedRow = Record<string, unknown>;

interface ActionProbe {
  affordance: Affordance;
  edge: AvailableEdge;
  row: ServedRow;
}

interface JourneyProbe {
  compiled: Journey;
  served: AvailableJourney;
  expected: JourneyDef;
  /** The step id the fixture journey's suffix resolves to. */
  stepId: string;
}

interface PageProbe {
  compiled: { route?: string; description?: string };
  expected: PageNodeDef;
}

/** A seam either has a reader, or a stated reason there is nothing to read there. */
type SeamCheck<P> = ((probe: P) => boolean) | { because: string };

interface FieldChecks<P> {
  compile: SeamCheck<P>;
  serve: SeamCheck<P>;
}

/**
 * Structural equality by bytes. Every value compared here is either a
 * structuredClone of the declaration or a detached render of it, so key order is
 * preserved and a string compare is exact — and an absent value never matches a
 * present one, which is the whole question being asked.
 */
function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** An affordance's effect, or an empty one — `writes` and `goTo` share that field. */
function effectOf(affordance: Affordance): Effect {
  return affordance.effect ?? {};
}

/**
 * The session's MERGED spec — the compiled record it holds for every action, the
 * ones a live source declared at mount included.
 *
 * `Session.spec` is protected on purpose: what a consumer reads is the SERVED
 * projection, never the raw spec. Reading the compiled record is this helper's
 * entire job at the compile seam, and there is no other door to it — a live
 * source's declaration lands on a session-private overlay by design, so the
 * graph's own spec does not hold it. The reach is stated here rather than hidden,
 * and it stays inside the library that owns the class.
 */
function mergedSpec(session: InteractionSession): NavigationGraphSpec {
  return (session as unknown as { spec: NavigationGraphSpec }).spec;
}

/**
 * Run one field table against one probe, folding the three lists.
 *
 * `probe === null` means no agent-visible declaration exists to read AT ALL — the
 * source contributed nothing the graph compiled, or contributed something nothing
 * is served. Every field it was meant to carry is dropped at both seams: one
 * answer, rather than fourteen guesses about which copy point lost it.
 */
function diff<P>(
  checks: Record<string, FieldChecks<P>>,
  probe: P | null,
  prefix: string,
  report: ConformanceReport,
): void {
  for (const field of Object.keys(checks)) {
    const name = `${prefix}${field}`;
    // ONE ROW PER DROPPED FIELD, at the seam that LOST it. A declaration that
    // never reached the compiled record cannot reach a served row either, and
    // reporting that twice would put the reader in two places at once — the fix
    // is at the first seam, so that is the one the report names.
    let lost: ConformanceSeam | null = null;
    for (const seam of ['compile', 'serve'] as const) {
      const check = checks[field][seam];
      if (typeof check !== 'function') {
        report.excluded.push({ field: name, seam, because: check.because });
        continue;
      }
      report.checked.push({ field: name, seam });
      if (lost !== null) continue;
      if (probe === null) {
        lost = seam;
        continue;
      }
      if (!check(probe)) lost = seam;
    }
    if (lost !== null) report.dropped.push({ field: name, seam: lost });
  }
}

/** Every field of a manifest excluded at both seams, for one stated reason. */
function excludeAll(fields: readonly string[], because: string, report: ConformanceReport): void {
  for (const field of fields) {
    report.excluded.push({ field, seam: 'compile', because });
    report.excluded.push({ field, seam: 'serve', because });
  }
}

// ---------------------------------------------------------------------------
// The action field table — one reader, or one stated absence, per field per seam
// ---------------------------------------------------------------------------

function actionChecks(fixture: ConformanceFixture): Record<DeclarableActionField, FieldChecks<ActionProbe>> {
  const action = fixture.action;
  return {
    does: {
      compile: (p) => p.affordance.description === action.does,
      serve: (p) => p.row['does'] === action.does,
    },
    binding: {
      compile: (p) => same(p.affordance.binding, action.binding),
      // The AGENT's row never carries a binding — that is the firewall, not a
      // drop — so the served surface read here is `available()`'s own edge, which
      // an in-process consumer reads and an actuation layer acts on.
      serve: (p) => same(p.edge.binding, action.binding),
    },
    when: {
      compile: (p) => same(p.affordance.guard, action.when),
      // A guard is not served as a filter; it is served as the EVIDENCE behind the
      // row being offered at all. A dropped guard leaves the row with no condition
      // naming this key.
      serve: (p) => p.edge.evidence.some((condition) => condition.key === GUARD_KEY),
    },
    enabledWhen: {
      compile: (p) => same(p.affordance.enabledWhen, action.enabledWhen),
      // Declarative disabledness reaches an agent as exactly one stamp. The fixture
      // state FAILS the filter, so a surviving declaration switches the row off and
      // a dropped one leaves it clickable.
      serve: (p) => p.row['enabled'] === false,
    },
    blockedBecause: {
      // PRESENCE, NOT BYTES, at this seam — and deliberately. The field has TWO
      // authored forms, an object and a reader, and an adapter is entitled to
      // hand over either; asking for bytes here would call a legal wrap a drop.
      // Nothing is lost by the looser question: the serve check below compares
      // the app's actual sentence, so a mangled reason is still caught, one seam
      // later, which is also where a reader that answers wrong shows up at all.
      compile: (p) => p.affordance.blockedBecause !== undefined,
      // COUPLED TO THE ROW BEING OFF, by the library's own presence law: a live
      // control carries no blocked sentence however the app declared one. The
      // fixture supplies that off-state through `enabledWhen`, so a source that
      // drops THAT honestly loses this too — two agent-visible facts, two rows.
      serve: (p) => same(p.row['blockedBecause'], action.blockedBecause),
    },
    writes: {
      compile: (p) => same(effectOf(p.affordance).writes, action.writes),
      serve: {
        because:
          "an action's declared writes are not stamped on a served row — they surface after the fact, at " +
          'settlement and in what-would-free-it. There is nothing to read at this seam.',
      },
    },
    reads: {
      compile: (p) => same(effectOf(p.affordance).reads, action.reads),
      // The AGENT's row carries only the DERIVED half of this declaration
      // (`staleReads`), and only once one of the named keys has actually been
      // written since the caller's last look — a fixture with no transitions in
      // it can never produce one, and asking for it here would test the
      // intersection rather than the thread. So the seam read is `available()`'s
      // own edge, which carries the declaration itself, exactly as `binding`
      // above is read there.
      serve: (p) => same(p.edge.reads, action.reads),
    },
    goTo: {
      compile: (p) => effectOf(p.affordance).navigatesTo === action.goTo,
      serve: (p) => p.row['goesTo'] === action.goTo,
    },
    confirm: {
      compile: (p) => p.affordance.highEffect === action.confirm,
      serve: (p) => p.row['highEffect'] === action.confirm,
    },
    input: {
      compile: (p) => same(p.affordance.schema, action.input),
      serve: (p) => same(p.row['expects'], action.input),
    },
    verify: {
      compile: (p) => same(p.affordance.verify, action.verify),
      serve: {
        because:
          "the app's own post-settlement check never crosses the wire — it is evaluated in-process, once, at " +
          'settlement. There is nothing to read at this seam.',
      },
    },
    humanDecides: {
      compile: (p) => same(p.affordance.humanDecides, action.humanDecides),
      // Presence is the whole claim on the row; the filter behind it never rides.
      serve: (p) => p.row['humanDecides'] === true,
    },
    role: {
      compile: (p) => p.affordance.role === action.role,
      serve: (p) => p.edge.role === action.role,
    },
    on: {
      // STATED, NOT CHECKED. `on` is the root-level multi-attach extension, and no
      // first-party source contributes root actions: a live action names one
      // `node`, and the compiled affordance's `on` is derived from that node's
      // page. A source that DOES contribute root actions has to extend this table,
      // and will find this sentence when it does.
      compile: {
        because:
          '`on` is the root-level multi-attach extension. No first-party source contributes root actions — a ' +
          "live action names one `node`, and the affordance's `on` is derived from that node's page.",
      },
      serve: {
        because:
          '`on` decides WHICH pages offer the row, never what the row says. A source that contributes root ' +
          'actions must extend this table.',
      },
    },
    handler: {
      // A bound handler lands in the registry, never on the affordance, and the
      // library's own read of that registry is the row's `materialized` stamp.
      compile: (p) => p.edge.materialized === true,
      serve: {
        because:
          'a handler never crosses the wire. The served row discloses only whether one is mounted, which is ' +
          'the compile-seam read above.',
      },
    },
  };
}

/** The journey vocabulary a journeys source threads — compile-locked to `JourneyDef`. */
function journeyChecks(): Record<keyof Required<JourneyDef>, FieldChecks<JourneyProbe>> {
  return {
    does: {
      compile: (p) => p.compiled.description === p.expected.does,
      serve: (p) => p.served.description === p.expected.does,
    },
    steps: {
      compile: (p) => same(p.compiled.steps, [p.stepId]),
      serve: (p) => same(p.served.steps, [p.stepId]),
    },
    when: {
      compile: (p) => same(p.compiled.precondition, p.expected.when),
      // A precondition reaches a reader as the evidence behind `feasible`, exactly
      // the way an action's guard reaches one.
      serve: (p) => p.served.evidence.some((condition) => condition.key === GUARD_KEY),
    },
  };
}

/** The route table's own keys — compile-locked to what `fromRoutes` accepts. */
type RouteTableEntry = Extract<Parameters<typeof fromRoutes>[0][string], object>;

function pageChecks(): Record<keyof Required<RouteTableEntry>, FieldChecks<PageProbe>> {
  const servedNowhere = {
    because:
      'a page is not a served row. Its route reaches an agent as a minted navigation gesture and as the ' +
      "address `sync()` matches against; a page's own `does` rides the compiled graph. There is nothing to " +
      'read at this seam.',
  };
  return {
    route: { compile: (p) => p.compiled.route === p.expected.route, serve: servedNowhere },
    does: { compile: (p) => p.compiled.description === p.expected.does, serve: servedNowhere },
  };
}

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

/**
 * The source to put under test — a ONE-LINE FACTORY, not a source value, and the
 * asymmetry is the whole method.
 *
 * A graph source is a SNAPSHOT: it read the app's truth once and closed over it,
 * and it has no input door afterwards. So "did you carry every field?" is a
 * question a finished source cannot be asked — the helper has to be the one
 * holding the declaration, hand it in, and go looking for it on the way out.
 * `(fixture) => fromLiveStore(fixture.store)` is that hand-in, and it is why a
 * field dropped ANYWHERE — inside the factory, at compile, at serve — is a field
 * this can name.
 *
 * Taking a finished value instead would answer a narrower question while looking
 * like it answered this one: a source publishing no `verify` and a source that
 * dropped one are the same bytes, so a report over a value would call the bug a
 * pass. That is the silence this whole module exists to end, so the door is not
 * offered.
 */
export type SourceUnderTest = (fixture: ConformanceFixture) => GraphSource;

export interface ConformanceOptions {
  /** The fixture page name (default `'conformance'`). Set it if your source only speaks about one page. */
  page?: string;
}

/**
 * Run a source's declarations through the real compiler and the real serving port
 * and report every field that did not come out the other side.
 *
 * @example
 * ```ts
 * const report = conformSource((fixture) => fromLiveStore(fixture.store));
 * report.dropped; // [] — every declared field survived both seams
 * ```
 */
export function conformSource(source: SourceUnderTest, opts?: ConformanceOptions): ConformanceReport {
  const fixture = makeFixture(opts?.page ?? DEFAULT_PAGE);
  const resolved = source(fixture);
  const report: ConformanceReport = { dropped: [], checked: [], excluded: [] };
  if (resolved.kind === 'live') return conformLive(resolved, fixture, report);
  if (resolved.kind === 'journeys') return conformJourneys(resolved, fixture, report);
  if (resolved.kind === 'routes') return conformRoutes(resolved, fixture, report);
  throw new Error(
    `hcifootprint/testing: conformSource does not know the source kind ` +
      `'${String((resolved as { kind: unknown }).kind)}'. A graph source is tagged 'routes', 'journeys' or 'live'.`,
  );
}

/**
 * conformSource as a gate: throws naming EVERY dropped field and the seam that
 * lost it. Nothing is summarised away — a message that named one of four would
 * teach exactly the lesson the original bug already taught.
 */
export function expectConformance(source: SourceUnderTest, opts?: ConformanceOptions): void {
  const report = conformSource(source, opts);
  if (report.dropped.length === 0) return;
  const named = report.dropped.map((row) => `'${row.field}' (${row.seam})`).join(', ');
  throw new Error(
    `hcifootprint/testing: this source dropped ${report.dropped.length} declared field(s) — ${named}. ` +
      `A dropped field does not error: the app declares it, the agent never sees it, and nothing says so. ` +
      `Carry each one through every copy point — a fix at one seam proves nothing about the next.`,
  );
}

// ---------------------------------------------------------------------------
// Per-kind runs
// ---------------------------------------------------------------------------

function conformLive(
  source: LiveSource,
  fixture: ConformanceFixture,
  report: ConformanceReport,
): ConformanceReport {
  const graph = buildNavigationGraph(GRAPH_ID, {
    pages: { [fixture.page]: {}, [fixture.destination]: {} },
    sources: [source],
  } satisfies NavigationGraphDef);
  // createSession is where a live source contributes at all. Its warnings are
  // swallowed: a conformance run must not write to somebody's console about a
  // fixture they never wrote.
  const session = graph.createSession({
    node: fixture.page,
    state: fixture.state,
    onWarn: noop,
  });
  try {
    // ONE question, not two. An affordance that never compiled and an affordance
    // nothing is served are the same fact to a reader — no agent can see the
    // declaration — and `available()` yields an edge only for a compiled
    // affordance, so the edge alone answers both.
    const edge = session.available().edges.find((candidate) => candidate.affordanceId === fixture.actionId);
    let probe: ActionProbe | null = null;
    if (edge !== undefined) {
      const port = serveToAgent(session, { source: 'agent' });
      const rows = port.call(toolName(session.graphId, 'whats_here'))['actions'] as ServedRow[];
      // whats_here maps every available() edge to exactly one row, and `edge` came
      // out of that same slice — so this lookup cannot miss.
      const row = rows.find((candidate) => candidate['action'] === fixture.actionId)!;
      probe = { affordance: mergedSpec(session).affordances[fixture.actionId], edge, row };
    }
    diff(actionChecks(fixture), probe, '', report);
    return report;
  } finally {
    // A source is a value; a session is a resource. Release whatever the attach
    // registered, whatever the reads above found.
    session.detachSources();
  }
}

function conformJourneys(
  source: JourneysSource,
  fixture: ConformanceFixture,
  report: ConformanceReport,
): ConformanceReport {
  excludeAll(
    DECLARABLE_ACTION_FIELDS,
    'a journeys source contributes JOURNEYS, never action declarations — there is no action declaration here ' +
      'to drop. Its own vocabulary is checked under the journey.* fields.',
    report,
  );
  const graph = buildNavigationGraph(GRAPH_ID, {
    pages: {
      [fixture.page]: { actions: { [fixture.name]: actionForDef(fixture) } },
      [fixture.destination]: {},
    },
    sources: [source],
  } satisfies NavigationGraphDef);
  const session = graph.createSession({
    node: fixture.page,
    state: fixture.state,
    onWarn: noop,
  });
  const served = session.availableJourneys().journeys.find((row) => row.id === fixture.journeyId);
  let probe: JourneyProbe | null = null;
  if (served !== undefined) {
    // availableJourneys() walks the compiled spec, so a journey it listed is a
    // journey the spec holds.
    probe = {
      compiled: graph.spec.journeys[fixture.journeyId],
      served,
      expected: fixture.journeys[fixture.journeyId],
      stepId: fixture.actionId,
    };
  }
  diff(journeyChecks(), probe, 'journey.', report);
  return report;
}

function conformRoutes(
  source: RoutesSource,
  fixture: ConformanceFixture,
  report: ConformanceReport,
): ConformanceReport {
  excludeAll(
    DECLARABLE_ACTION_FIELDS,
    'a route table contributes PAGES, never controls. fromRoutes (and fromReactRouter, the same law one door ' +
      'over) refuses an action-shaped key BY NAME rather than reading two keys and discarding the rest — that ' +
      "refusal IS this source kind's conformance, and there is no action declaration here to drop. Its own " +
      'vocabulary is checked under the page.* fields.',
    report,
  );
  const graph = buildNavigationGraph(GRAPH_ID, { sources: [source] } satisfies NavigationGraphDef);
  const compiled = graph.spec.pages[fixture.page];
  const probe: PageProbe | null =
    compiled === undefined ? null : { compiled, expected: fixture.routes[fixture.page] };
  diff(pageChecks(), probe, 'page.', report);
  return report;
}

/** The port's tool name for one generic, sanitized exactly as the real serving layer does. */
function toolName(graphId: string, generic: string): string {
  return `${graphId}.${generic}`.replace(/[^A-Za-z0-9_.-]/g, '_');
}
