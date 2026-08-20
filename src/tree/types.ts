/**
 * Navigation-graph authoring types — the semantic container tree a consumer
 * already holds in their head: pages → areas / tabs / modals → actions.
 *
 * The dual identity: the consumer authors a NAVIGATION graph in their own
 * vocabulary; the agent consumes the derived JOURNEY graph. `does:` is one
 * authored string with two readers — the consumer's intent label IS the
 * agent's tool description (firewall by construction: it is a source-code
 * literal, never runtime text).
 *
 * Exactly THREE authored semantics exist — everything else is descriptive:
 * - `modals`  — overlay masking (a shown modal suppresses sibling actions;
 *               `blocks: false` opts a popover out). Modals are NEVER assumed
 *               active: closed until registered/shown.
 * - `tabs`    — an exclusivity PRIOR ("at most one child shown"). NOT a
 *               statechart: no transitions, no initial, no history.
 * - `repeats` — a template node with runtime instance keys (one parameterized
 *               action for N cards, never N actions).
 */
import type { WhereFilter } from 'footprintjs';
import type {
  Binding,
  BlockedBecause,
  CanonicalRole,
  ConcurrencyPolicy,
  FreshnessPolicy,
  HumanDecides,
  NavigationGraphSpec,
  Observability,
  PrincipalPolicy,
  VerifyContract,
} from '../atom/types.js';
// Type-only cycle with graph/sources/types.ts (it names PageNodeDef/JourneyDef,
// we name GraphSource) — erased at build, so no runtime cycle exists.
import type { GraphSource } from '../graph/sources/types.js';
import type { InteractionSession, InteractionSessionOptions } from '../traverse/nav-session.js';

// ---------------------------------------------------------------------------
// Authoring (what buildNavigationGraph() accepts)
// ---------------------------------------------------------------------------

/** An action on a node. Only `does` is required — details may materialize at mount. */
export interface ActionDef {
  /** AUTHORED intent, one string two readers (consumer label = agent tool description). */
  does: string;
  /** How to reach it on screen (optional — L0b actuation; handlers don't need it). */
  binding?: Binding;
  /** Availability guard over projected state (AND-composed with every ancestor `when`). */
  when?: WhereFilter;
  /**
   * Is this control currently CLICKABLE? Declarative disabledness — a different
   * question from `when`, which decides whether the control is here at all. A
   * failed `when` HIDES the action; a false `enabledWhen` SERVES it as a greyed
   * button (`enabled: false` on the edge) and refuses a fire as TOOL_DISABLED.
   *
   * Declare it from the same expression that renders `<button disabled={…}>` and
   * an agent stops discovering the answer by clicking. Keys it cannot evaluate
   * never disable anything — the library does not guess a control greyed out.
   *
   * NOT composed with ancestor `when`s: this is the control's own state, not
   * its position in the tree.
   */
  enabledWhen?: WhereFilter;
  /**
   * YOUR OWN REASON THIS CONTROL IS OFF, and who clears it — served only while
   * the control is off, and only ever as data.
   *
   * `enabledWhen` proves a control is greyed and hands the reader the conjuncts
   * that failed; that is EVIDENCE, and it is derived. This is the other half:
   * the sentence your component already knows ("waiting for the upload to
   * finish") and the one fact no evidence carries — WHO can clear it. See
   * {@link BlockedBecause}.
   *
   * ```ts
   * next: {
   *   does: 'Continue to review',
   *   blockedBecause: { says: 'Waiting for the receipt to finish uploading', clearedBy: 'app' },
   * }
   * ```
   *
   * The FUNCTION form is for a reason that changes while the page is open. It
   * is a READER, declared like `holds`: it runs at the moment a row is
   * assembled, never cached, and returning `undefined` says nothing at all.
   * Keep it a read — it runs on a hot path, and a reader that throws costs the
   * row its sentence and nothing else.
   *
   * ```ts
   * blockedBecause: () => (upload.pending
   *   ? { says: `Uploading ${upload.name}…`, clearedBy: 'app' }
   *   : undefined),
   * ```
   *
   * It never disables anything: declaring it on a control nothing has switched
   * off changes not one byte of what is served. Say WHY here; say WHETHER with
   * `enabledWhen`, `enabled:`, `setEnabled`, or a live store row.
   */
  blockedBecause?: BlockedBecause | (() => BlockedBecause | undefined);
  /** State keys this action claims to change. */
  writes?: string[];
  /**
   * State keys this action's OUTCOME DEPENDS ON — the read side of `writes`,
   * and the one an app is asked for so a reader can be told that something it
   * depends on moved.
   *
   * ```ts
   * settle: { does: 'Settle the claim', writes: ['purse.left'], reads: ['claim.total'] },
   * ```
   *
   * Not `when`: that decides whether the control is HERE. This says what the
   * outcome is computed FROM. Declared, never inferred — see {@link Effect.reads}
   * for the law and for what the serving layer does with it.
   */
  reads?: string[];
  /** Page this action claims to navigate to (a top-level page id). */
  goTo?: string;
  /** Requires explicit confirmation (the high-effect gate). */
  confirm?: boolean;
  /**
   * Payload contract: Zod, JSON Schema, any `.safeParse`/`.parse` validator —
   * or the literal `'none'`, meaning "this control takes NO input". A caller
   * that sends one anyway is refused with the shape it sent, and a blank
   * payload is erased before it can reach the handler and override the app's
   * own defaults.
   *
   * OMITTING `input` says something different: the library does not know the
   * shape, so it advertises nothing rather than inventing an empty contract.
   */
  input?: unknown;
  /**
   * The app's OWN check that firing this really did something — evaluated once,
   * at settlement, and the only thing that can turn a handler that merely RAN
   * into an honest refusal. Either a filter over projected state
   * (`{ 'wizard.recipe': { ne: '' } }`) or a synchronous predicate whose closure
   * may read whatever the app can see, the DOM included.
   */
  verify?: VerifyContract;
  /**
   * THIS CHOICE IS THE PERSON'S TO MAKE — not a gate on the agent acting, but a
   * statement that the decision itself belongs to a human.
   *
   * `confirm` asks whether the agent may ACT after a human's yes. This says the
   * agent's correct move is to PRESENT options and stop: the human answers
   * through this control in the app, and the flow moves because the world moved.
   *
   * ```ts
   * 'choose-shipping-speed': {
   *   does: 'Choose a shipping speed',
   *   writes: ['checkout.shipping'],
   *   humanDecides: {
   *     about: 'which shipping speed',
   *     doneWhen: { 'checkout.shipping': { ne: '' } },
   *   },
   * }
   * ```
   *
   * It is a fact about the CONTROL, declared once and inherited by every journey
   * that names it — a per-journey split would let two lists disagree about one
   * control's owner. It is DISCLOSURE: nothing is refused, and no refusal word
   * exists for it. See {@link HumanDecides}.
   */
  humanDecides?: HumanDecides;
  /**
   * WHO MAY PERFORM THIS, WHOSE CHOICE IT IS, AND WHETHER A RECORDED YES IS
   * NEEDED — three separate facts, three fields, never one word.
   *
   * `humanDecides` above is disclosure and stays disclosure. This is its
   * enforceable neighbour, and it enforces NOTHING until the session is created
   * with `enforcePrincipalPolicy: true` — declaring it changes not one byte
   * otherwise.
   *
   * ```ts
   * 'transfer-funds': {
   *   does: 'Transfer the balance',
   *   confirm: true,
   *   principalPolicy: { mayInvoke: ['human'], requiresHumanApproval: true },
   * }
   * ```
   *
   * Note the vocabulary: a policy names an ACTOR (`'human'`), while a record
   * files an act under a principal (`'user'`). Writing `mayInvoke: ['user']` is
   * refused at this door with the correction, rather than silently locking a
   * person out of their own control. See {@link PrincipalPolicy}.
   */
  principalPolicy?: PrincipalPolicy;
  /**
   * HOW WOULD ANYONE SEE THAT THIS HAPPENED — `'state-delta'`,
   * `'postcondition'`, `'navigation'`, `'external'` or `'unobservable'`.
   *
   * Declared, never inferred, and it refuses nothing on its own. A session
   * created with `effectPolicy: { highEffectRequiresVerify: true }` reads it and
   * refuses a high-effect action whose effect nobody could check — where
   * `'state-delta'` deliberately does NOT count, because key presence is not
   * value correctness. See {@link Observability}.
   *
   * Two coherence rules are refused HERE, at authoring, whether or not any
   * session enforces anything: `'postcondition'` needs a `verify`, and
   * `'navigation'` needs a `goTo`.
   */
  observability?: Observability;
  /**
   * WHAT THIS CONTROL DOES WHEN SOMETHING IT WAS OFFERED UNDER HAS SINCE MOVED
   * — declared per axis, and `'disclose'` (today's behaviour) wherever you say
   * nothing.
   *
   * ```ts
   * 'settle-claim': {
   *   does: 'Settle the claim',
   *   reads: ['claim.total'], writes: ['purse.left'],
   *   freshness: { readChanges: 'require-ack', writeChanges: 'refuse' },
   * }
   * ```
   *
   * It is the enforceable sibling of the `staleReads` / `staleWrites` stamps,
   * which say the same thing and refuse nothing. Declaring it overrides the
   * session default AXIS BY AXIS, and an enforcing axis makes one new demand of
   * the caller: cite the offer you planned against
   * ({@link FireOptions.offerId}). See {@link FreshnessPolicy}.
   */
  freshness?: FreshnessPolicy;
  /**
   * MAY A SECOND FIRE OVERLAP AN UNRESOLVED FIRST? Default `'parallel'` — what
   * every release before this one did.
   *
   * ```ts
   * 'pay-invoice': {
   *   does: 'Pay the invoice', confirm: true, writes: ['invoice.paid'],
   *   concurrency: { mode: 'single-flight', scope: 'payload' },
   * }
   * ```
   *
   * Under `'single-flight'` a fire made while a prior occurrence is still
   * unresolved is refused `PRIOR_FIRE_PENDING`, carrying that fire's id and the
   * doors that can settle it. It clears on settlement and on nothing else — no
   * timeout, no second look, and not the caller reporting it done. See
   * {@link ConcurrencyPolicy}.
   */
  concurrency?: ConcurrencyPolicy;
  role?: CanonicalRole;
}

/**
 * A container node: areas coexist (AND), tabs exclude (at most one shown),
 * modals overlay.
 *
 * THE DEEPEST-NODE RULE, said once here and repeated on each bucket below:
 * **Sync pages; observe the deeper place. `sync()` moves the walker and decides
 * what is served; `observeFocus()` says which tab or area the reader is in.
 * Declare containers, and report the deepest one on screen.** Declaring a
 * container without ever observing it gives you mount-tracking but not
 * position: the containers are real nodes, and `session.observeFocus('page.tab')`
 * is what puts the reader inside one. `sync()` cannot — actions are served from
 * the PAGE, so a cursor on a tab would be served nothing.
 */
export interface NodeDef {
  /** Optional authored description of the container itself. */
  does?: string;
  /** Container guard: every descendant action's guard is AND-narrowed by this. */
  when?: WhereFilter;
  /**
   * Sibling regions that coexist — a sidebar and a detail pane are both here.
   *
   * Declaring a container without ever observing it gives you mount-tracking
   * but not position — see the deepest-node rule on {@link NodeDef}.
   */
  areas?: Record<string, NodeDef>;
  /**
   * An exclusivity PRIOR: at most one of these is shown. Not a statechart — no
   * transitions, no initial, no history.
   *
   * Declaring a container without ever observing it gives you mount-tracking
   * but not position — see the deepest-node rule on {@link NodeDef}. Tabs are
   * where that bites hardest: the whole point of the bucket is that ONE of them
   * is where the reader is, and nothing but evidence can say which — and a
   * person clicking a tab fires nothing, so only an observation can carry it.
   * `session.show('page.tab')` says which tab is VISIBLE;
   * `session.observeFocus('page.tab')` says the reader is IN it.
   */
  tabs?: Record<string, NodeDef>;
  /**
   * Overlays. A shown blocking modal masks sibling actions (`blocks: false`
   * opts a popover out), and a modal is NEVER assumed active: closed until
   * registered or shown.
   *
   * Declaring a container without ever observing it gives you mount-tracking
   * but not position — see the deepest-node rule on {@link NodeDef}. For a
   * modal the order matters: `show()` opens it, and an `observeFocus()` naming
   * a modal nobody opened resolves to the page, because a closed modal cannot
   * hold anyone.
   */
  modals?: Record<string, ModalDef>;
  /** Template container: instances carry runtime keys (order cards, product tiles). */
  repeats?: boolean;
  /**
   * L2 existence source for a repeats container: the COMPLETE instance set,
   * from projected state (order #57 exists while scrolled out of view).
   * Without it, served instance lists fall back to the mounted window —
   * honestly marked enumeration:'mounted-window'.
   */
  instances?: (state: Record<string, unknown>) => string[];
  /** The controls on this node. */
  actions?: Record<string, ActionDef>;
}

export interface ModalDef extends NodeDef {
  /** Default true: a shown modal masks actions outside it. `false` = popover (coexists). */
  blocks?: boolean;
}

export interface PageNodeDef extends NodeDef {
  route?: string;
}

/**
 * A named multi-step flow, in the navigation graph's authoring vocabulary.
 *
 * Named for the person WRITING it: a journey is the path someone takes through
 * the app ("sign up", "buy a dress end to end"). What the agent reads is the
 * COMPILED journey — `does` becomes its description, `when` its precondition,
 * suffix steps resolve to qualified ids — which is the dual identity this
 * whole authoring layer is built on (navigation in, journey graph out). The two
 * vocabularies keep separate names on purpose: the compiled shape is
 * {@link Journey} (`JourneySpec` before its id is attached).
 * An app that already keeps a journey list feeds it in with `fromJourneys()`.
 */
export interface JourneyDef {
  does: string;
  /**
   * Steps by qualified path ('checkout.confirm-order.place-order') or
   * unambiguous suffix ('place-order').
   *
   * THE OBJECT ELEMENT FORM — `{ step: 'place-order' }` — compiles identically
   * to the bare string and carries NOTHING beyond `step` in this release. It
   * exists because per-step conditional metadata has to have exactly ONE
   * authoring carrier: two features orbit it (a per-edge guard is designed and
   * parked), and deciding the carrier once means the next one lands as a new
   * optional field on a shape that already exists rather than as a second shape
   * competing with this one.
   *
   * `humanDecides` is deliberately NOT one of them: ownership is a fact about
   * the CONTROL, declared on `ActionDef` and inherited by every journey that
   * names it.
   */
  steps: Array<string | { step: string }>;
  when?: WhereFilter;
}

export interface NavigationGraphDef {
  does?: string;
  /**
   * Hand-authored pages. Optional since sources exist: a def whose whole
   * spine comes from `fromRoutes(...)` is the headline use case, and forcing
   * `pages: {}` on it was one line of pure boilerplate. Requiredness lives
   * where it means something — the build-time refusal judges the EFFECTIVE
   * graph (hand pages + sources folded), so a def with neither still dies
   * loudly with "has no pages".
   */
  pages?: Record<string, PageNodeDef>;
  /** Root-level multi-attach actions: offered on several PAGES at once. */
  actions?: Record<string, ActionDef & { on: string | string[] }>;
  /** Named multi-step flows: the journeys this graph can be planned over. */
  journeys?: Record<string, JourneyDef>;
  /**
   * Growable inputs the app ALREADY owns — fromRoutes(app.routes) seeds pages,
   * fromJourneys(app.journeys) seeds journeys, fromLiveStore(app.actionStore)
   * attaches live bindings per session. Static sources fold into this def
   * BEFORE the compiler's walk, under ONE documented order:
   *
   *   "Pages first (routes then hand-authored, hand-authored wins), journeys
   *    overlay second and may only add, live actions attach last and only
   *    bind — nothing later in the order may remove anything earlier. Routes
   *    may also contribute link actions; hand-authored actions win."
   *
   * Deterministic on purpose: nothing later in the order can remove anything
   * earlier, so a traveler can trust the floor under their feet. A def without
   * sources compiles exactly as before this field existed.
   */
  sources?: ReadonlyArray<GraphSource>;
}

// ---------------------------------------------------------------------------
// Typed node paths — buildNavigationGraph infers the union of every node path
// from the def literal, so a typo in registerActions('catalog.filter-rai')
// or setVisible/show is a COMPILE error, not a silent no-op.
// ---------------------------------------------------------------------------

type BucketPaths<Prefix extends string, B> = B extends Record<string, unknown>
  ? { [K in keyof B & string]: `${Prefix}.${K}` | ChildPaths<`${Prefix}.${K}`, B[K]> }[keyof B & string]
  : never;

type ChildPaths<Prefix extends string, N> =
  | (N extends { areas: infer A } ? BucketPaths<Prefix, A> : never)
  | (N extends { tabs: infer T } ? BucketPaths<Prefix, T> : never)
  | (N extends { modals: infer M } ? BucketPaths<Prefix, M> : never);

/**
 * Page ids contributed by routes sources in a def literal. fromRoutes carries
 * its table's literal keys through `const` inference precisely so they can
 * surface here: a source-contributed page is a REAL node on the compiled
 * graph, so it must be a REAL typed path too — otherwise the guardrail would
 * reject at compile time what the runtime happily serves.
 */
type SourcePagePaths<S> = S extends ReadonlyArray<infer Src>
  ? Src extends { kind: 'routes'; pages: infer P }
    ? keyof P & string
    : never
  : never;

/** The union of every declared node path in a NavigationGraphDef literal — hand-authored pages and their children, plus routes-source pages. */
export type NodePathsOf<Def> =
  | (Def extends { pages: infer P }
      ? P extends Record<string, unknown>
        ? { [K in keyof P & string]: K | ChildPaths<K, P[K]> }[keyof P & string]
        : string
      : // No `pages` key at all. A sources-only LITERAL must contribute
        // nothing here — its real paths are the routes-source pages the
        // union's second arm adds; falling back to `string` would ABSORB that
        // arm and silently disarm typo-checking for exactly the def the
        // sources feature exists for. Only a def with neither key (a wide,
        // annotated type — both properties optional) keeps `string`, the
        // honest answer when no literal exists to read names from.
        Def extends { sources: ReadonlyArray<unknown> }
        ? never
        : string)
  | (Def extends { sources: infer S } ? SourcePagePaths<S> : never);

// ---------------------------------------------------------------------------
// Compiled (what buildNavigationGraph() returns — plain frozen data + index)
// ---------------------------------------------------------------------------

export type NodeKind = 'page' | 'area' | 'tab' | 'modal';

export interface MapNode {
  /** Dot path — the node's identity ('checkout.confirm-order'). */
  path: string;
  /** Last path segment. */
  id: string;
  kind: NodeKind;
  /** Parent path; null for pages. */
  parent: string | null;
  /** Owning page id (== path's first segment). */
  page: string;
  /** Child NODE paths (actions are not children — see NavigationGraph.actionNodes). */
  children: string[];
  /** True for a blocking modal (kind 'modal' with blocks !== false). */
  overlay: boolean;
  repeats: boolean;
  /** The node's OWN `when` (action guards already carry the composed chain). */
  guard?: WhereFilter;
  description?: string;
  instances?: (state: Record<string, unknown>) => string[];
}

export interface NavigationGraph<Paths extends string = string> {
  id: string;
  /**
   * The flat projection: a Session-compatible NavigationGraphSpec whose affordance
   * ids are qualified dot paths and whose guards are the composed root→leaf
   * chains. A plain Session runs on it unchanged; InteractionSession adds the tree.
   */
  spec: NavigationGraphSpec;
  /** Every node by path — pages included. */
  nodes: Record<string, MapNode>;
  /** Qualified action id → the node path(s) it lives on (root actions list their pages). */
  actionNodes: Record<string, string[]>;
  /** Create a live interaction session; `Paths` carries the typed node paths through. */
  createSession(opts?: InteractionSessionOptions): InteractionSession<Paths>;
  /**
   * The sorted, deduped set of state keys every guard in this graph reads —
   * across ALL action `when`s, container-node `when`s, and journey preconditions,
   * whether or not the node is currently mounted. Seed each of these in your
   * state projector: a guard key ABSENT from projected state is NOT treated as
   * false and hidden — it is served WITH the `guardUnevaluated` honesty marker
   * (the edge is offered, the missing condition flagged as taken-on-faith), so
   * an incompletely-seeded projector silently degrades honest availability into
   * unevaluated-guess territory. Container `when`s are included because they
   * AND-compose into every descendant action's guard (at build, and into
   * mount-declared actions at runtime), so a guard-bearing container must be
   * seeded even before an action lands under it. A projection covering this whole
   * set is what lets guards actually decide rather than defer.
   */
  requiredStateKeys(): string[];
}

