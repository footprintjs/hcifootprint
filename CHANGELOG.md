# Changelog

## [Unreleased]

The graph now GROWS from what the app already has. An app owns descriptions of
itself — a route table, a set of journeys — and until now each had to be
re-typed by hand into the definition, where the copy drifts the moment either
side edits. `buildNavigationGraph` accepts growable **sources**, and the graph
reads the owner's truth instead of copying it.

### Added (static graph sources)
- `fromRoutes(table)` — the app's route table becomes the page SPINE. Page
  names are explicit (the table's keys — this library does not guess a name
  from `/orders/:id`); a route contributes a page, never an action. Seeded
  pages are found again by `matchRoute` for the URLs their routes describe,
  because both sides share one segment law.
- `fromJourneys(journeys)` — the app's journeys become skills, in SkillDef2's
  own vocabulary (`does`/`steps`/`when`). A journey's meaning is judged by the
  compiler's existing skills pass: unknown or ambiguous steps die in the
  builder's existing voice.
- `sources` on `NavigationGraphDef`, folded in BEFORE the compiler's walk
  under ONE documented merge order: **"Pages first (routes then hand-authored,
  hand-authored wins), journeys overlay second and may only add, live actions
  attach last and only bind — nothing later in the order may remove anything
  earlier."** Hand-authored wins per page id with one courtesy — a
  hand page missing `route` inherits the source's route; the same page
  declaring two DIFFERENT routes is refused loudly (drift made visible), with
  route equality judged by the matcher's own segment reading, never string
  bytes. A hand-authored skill wins over a same-id journey silently
  (deterministic and documented). Two sources of the same kind colliding on an
  id are refused loudly — ambiguous authorship.
- Typed node paths now include routes-source pages: `registerToolGroup('home')`
  compiles when `home` came from `fromRoutes`, and a typo is still a compile
  error.
- `pages` is now OPTIONAL on `NavigationGraphDef` — a sources-only def (the
  headline use case) no longer needs a `pages: {}` incantation to satisfy the
  type. Nothing runtime changed: the build-time refusal always judged the
  EFFECTIVE graph, so a def with neither pages nor sources still dies loudly
  with "has no pages", and the typed-path guardrail still holds for
  sources-only defs (the routes-source pages are the typed paths; a typo is
  still a compile error).

Non-breaking by construction: a def without `sources` takes the identity path
and compiles bit-for-bit as before; `fromRoutes`/`fromJourneys` are leaf
modules, so importing one never drags session machinery into a bundle.

### Added (typed actuation on the edge)
- The `Binding` union gains its two missing gestures — the full set now covers
  what a routed web app actually performs: **url | click (element) | tab |
  programmatic**. `{ kind: 'url', href }` is a literal address the app's own
  router can be handed; `{ kind: 'tab', target }` is a tab switch to a sibling
  node path — its own gesture, descriptive in v1 (materialises only via a
  registered handler, NEVER moves the page cursor, and `fire()` never writes
  the PresenceIndex: the app reports the flip through the existing
  `show()`/`setVisible()` wire).
- A paramful url href (`/orders/:id`) is refused loudly at ALL THREE authoring
  doors (the compiler, mount-declared tools, and the fluent
  `skillGraph().affordance()`): a `:param` segment can never materialise,
  because this library does not guess params. Judged by the matcher's own
  segment law, so authoring, routing and materialisation can never disagree.
- `SessionOptions.navigate` — hand the session your router's OWN navigation
  (`(href) => router.push(href)`); presence of the option is the opt-in. An
  edge whose gesture yields a literal href — an explicit url binding, else the
  fully-literal route of the page named by `goTo`/`navigatesTo` — now
  materialises through it: no more fake do-nothing handlers registered purely
  to get navigations past NOT_MATERIALIZED. Registered handlers still win; the
  synthesized navigation rides the same invocation machinery (resolve →
  `effectStatus: 'performed'`; throw → `'refused'` with the honest rollback
  and cursor walk-back); `toNode` stays a claim until `sync()` confirms.
  `available()`'s `materialized` stamp mirrors the same widened question.
- The words got honest too: a NOT_MATERIALIZED refusal now carries the
  declared `gesture` ("this is a click on the checkout button", not "nothing
  is bound"), and gap-ledger rows for `fire-rejected`/`unmaterialized-fire`
  carry `gestureKind` — the demand backlog says WHICH wiring is missing (a
  click handler vs a navigate fn), token-lean.

### Added (live graph source)
- `fromLiveStore(store)` — the third source: the app's live action store
  (subscribe + read-current, the shape React itself blesses) drives the
  existing declare-then-bind wire per session. Reconciled by identity key
  `node.name`(+instance): new registers, gone releases, an `enabled` flip
  flows to TOOL_DISABLED, and an UNCHANGED action is never re-registered — a
  chatty store causes zero warnings and zero phantom structure bumps. An
  action for an already-declared tool BINDS silently (attach last, only bind);
  a genuinely new one mount-declares. Zero value imports — a static-graph
  consumer never bundles it (proven by the new tree-shake test).
- `InteractionSession.detachSources()` (idempotent) releases everything the
  graph's live sources attached; the direct door
  `fromLiveStore(store).attach(session)` returns its own detach.

### Changed (behavior change, pre-1.0 minor — the never-trap invariant)
- **`commitSkill()` gains one typed refusal, after its existing four:
  `ENTRY_NOT_MATERIALIZED`.** An AGENT commit (the default source) outside a
  tour session is refused when the skill's ENTRY step could not act AT ALL
  right now — no registered handler under any key (instance-keyed wiring on a
  repeats container counts: the fire that follows carries the instance) and no
  navigate-derived gesture — the frame that could never act is never opened,
  so a planner is never invited into a narrowed room where the first promised
  thing does nothing. Same treatment 0.3.0 gave NOT_MATERIALIZED:
  fail-closed, typed, and one gap row (`rejectionReason:
  'ENTRY_NOT_MATERIALIZED'` with the entry step, the new `skillId`, and
  `gestureKind`) — no transition, no commit bundle, because nothing touched
  state. **Upgrade note:** if your agent flow commits skills before the app's
  handlers mount, either register the entry step's handler first (the same
  wiring 0.3.0 asked of fires), pass the new `navigate` option when the entry
  is a pure navigation, commit with `source: 'user'` for human-driven flows,
  or create the session with `allowUnmaterializedFires` for touring. User
  commits, tours, registered-but-disabled entries (retriable), and every
  already-wired flow behave exactly as before.

### Fixed (review fix-back, before release)
- **The commit gate no longer falsely refuses an instance-wired entry.** As
  first written the gate asked `handlerFor` with no instance, so a skill whose
  entry is a repeats-container tool wired ONLY per card
  (`'cancel-order[o-123]'`) was refused `ENTRY_NOT_MATERIALIZED` while the
  very same entry fired `ok: true` with the instance key — an uncommittable
  but fully agent-drivable skill, with a refusal reason that was factually
  false. The gate's question is now `couldMaterialise` — "could the entry act
  AT ALL right now, for any caller" — which counts instance-keyed wiring; an
  entry with no wiring under ANY key is still refused, and a sibling tool's
  instance keys never open a different entry's gate.
- **The fluent door joins the url build gate.** `skillGraph().affordance()`
  accepted a paramful url binding the other two authoring doors refuse
  loudly, silently authoring a permanently-dead edge (runtime honesty held —
  agent fires answered NOT_MATERIALIZED — but the promised build error never
  came). Same `checkLiteralHref` law, same words, third door.
- **`fromLiveStore` reconcile failures no longer break the app's own store.**
  A bad action arriving in a LATER store emission threw out of our subscribe
  callback INTO the app's notify loop, aborting its iteration over its other
  subscribers. Post-attach reconciles are now isolated (recorder rule): a
  failure warns through the session's own `onWarn` sink (console for the
  direct `attach` door) and leaves bindings as-is until the store's next
  emission, which simply retries. The FIRST read at attach stays LOUD — an
  invalid action is an authoring error and dies at `createSession` — but the
  loud throw now cleans up after itself: the subscription is released and any
  bindings registered before the bad action are unregistered, so a failed
  attach leaks nothing. (`LiveSource.attach` gains an optional second `warn`
  parameter; one-parameter implementations still satisfy the shape.)

### Added (the docs site)
- A documentation site at `https://footprintjs.github.io/hcifootprint/docs/` —
  a nested Fumadocs app (`docs-next/`) assembled UNDER the storydeck home into
  the one Pages artifact (the home's bytes are untouched; the deploy only ADDS
  `docs/`). Guides cover the graph, sources + the merge order, actuation and
  the never-trap invariant, guards, skills, presence, live bindings, serving
  (Mode B, MCP, receipts), the 0.4.0 fire() honesty wave
  (`effectStatus`/`whenSettled`/input contracts), the tree-shaking story with
  the pinned probe numbers, and the demos.
- Anti-drift, wired as gates rather than promised: the API reference is
  GENERATED from all four public entry points (`.`, `./mcp`, `./testing`,
  `./testing/lint`) on every build and freshness-checked in CI
  (`check:api` — regen + `git diff --exit-code`); guide snippets are
  twoslash-compiled against the built library types; every internal link and
  the README's absolute site links are checked by
  `scripts/check-doc-links.mjs --strict` in CI AND inside `npm test`
  (`test/docs/`). `/llms.txt`, `/llms-full.txt` and per-page `/llms.mdx/*`
  are generated from the same corpus, so they can't drift. `docs/design/d23-graph-sources.md`
  joins the design lineage.

## [0.4.0] - 2026-07-29

`fire()` now tells you what actually happened. Three workarounds the Hodgkin FE POC team
had to write against 0.3.0 are deletable in this release:

1. **The settlement timing guess** — the `setTimeout`/poll wrapper that existed because
   `fire()` returned `settlement: 'settled'` before the deferred handler had run. Read
   `effectStatus` for what is known at return time, and `await whenSettled` for the rest.
2. **The throw-adapter** — the wrapper that re-threw a handler's returned `{ok: false, error}`
   so the library would stop recording a failure as a successful transition. A returned
   failure is now a failure.
3. **The payload guessing** — the hand-maintained copy of each action's input shape, kept
   because a `do_action` caller could only learn the contract by guessing wrong once, and
   because a declared plain JSON Schema was never enforced. Every served action row now
   carries `expects`, and a wrong payload is refused with a message that teaches the shape.

### Changed (behavior change, pre-1.0 minor)
- **A handler that reports failure by RETURNING `{ok: false}` now takes the throw's path.**
  Previously it was recorded as a SUCCESSFUL transition carrying its own failure object as
  planner-visible `produced` data. The outcome now flips to rejected/rolled-back, a claimed
  navigation walks home, and the failure becomes the settlement's reason. The test is narrow
  on purpose (own property, strict `=== false`), so a `fetch` Response — whose `ok` is a
  prototype getter — stays data, as do `{ok: true}` and error-only objects. Warnings read
  `"returned failure:"` vs `"threw:"` so a log can tell a protocol refusal from an exception.
- **A plain JSON Schema is now enforced at fire time** (`checkPayloadShape`, default `true`).
  Before, only zod-style `.safeParse`/`.parse` validators ever ran, so an action declaring
  `{value: string}` accepted `{name: 'add milk'}` and the handler destructured `undefined`.
  This is the promise Mode B already published — "a wrong input returns a structured error
  RESULT carrying what was expected" — which a plain JSON Schema could not keep while nothing
  enforced it. The checker is teachable, not complete: required keys, declared primitive
  types, closed objects, one level of nesting. `$ref`/`allOf`/`anyOf`/`oneOf`/`enum`/`format`/
  `pattern` it declines to judge and passes, the stance `guardUnevaluated` already takes on an
  unevaluable key — a wrong REJECTION blocks an action the app would have accepted, and the
  caller has no appeal. The gate is SOURCE-BLIND on purpose: a record-only `invoke: false`
  sensor fire and the app's own `'user'`/`'system'` fires answer for the payload too (that is
  where zod already sat in 0.3.0). `checkPayloadShape: false` restores the 0.3.0 pass-through
  byte for byte.
- **Upgrade note.** `PAYLOAD_INVALID` `'fire-rejected'` gap rows are now REACHABLE for plain
  JSON Schema — same `GapRecord` shape, more rows. Transition records, the commit log and
  `SessionEvents` are byte-identical, and `fire()` is still synchronous with every existing
  field meaning what it did.

### Added (fire() says what it knows, and hands over a promise for what it does not)
- `FireResult.effectStatus` — the INVOCATION axis, read at return time. Structurally never
  `'performed'` there (the handler is always deferred): `'pending'` when something will run,
  `'unobservable'` when nothing is bound. Deliberately separate from `effectVerified` (the
  STATE axis) — a tapless handler completes `'performed'` with `effectVerified`
  `'unobservable'`, and a handler can fail AFTER its real state report landed. Both truths are
  carried; neither is averaged.
- `FireResult.whenSettled` — resolves ONCE with the final truth (`FireSettlement`: status,
  outcome, a transition snapshot, error/produced) and NEVER rejects, because fire-and-forget is
  the dominant call pattern and an orphaned rejecting promise would be noise no 0.3.0 consumer
  opted into. A fire the app never reports on stays unresolved — the honest mirror of
  `pending()`.
- Mode B `do_action` results carry `effectStatus` too: the word crosses the wire, the promise
  deliberately does not.

### Added (the input contract, advertised before the fire)
- Every served action row now carries `expects` — the declared input contract, visible BEFORE
  the fire, for JSON Schema, zod and non-serializable validators alike. It already rode skill
  `readySteps` and rejections; a `do_action` caller could previously only learn the shape by
  guessing wrong once.
- The refusal teaches: `missing required 'value' — expected { value: string }, received
  { name: string }`. The rejection and the advertisement render the SAME shape string, so a
  planner correcting from either lands in the same place. Every message is built from key names
  and type names only — a payload value never enters a string bound for the model or the gap
  ledger. Key names are capped at 40 characters, so a caller-chosen 100,000-character key can
  no longer inflate `issues` on its way to the model.

### Added (the small edges — a plan you can ask about, a route read back)
- `session.trySkillPlan(id)` answers with a value where `skillPlan(id)` throws. The asymmetry
  was ours: `commitSkill()` already returned `{ok: false, reason: 'UNKNOWN_SKILL', known}` for
  the very same question, so a caller holding a model-supplied id handled it two ways — and the
  throw is the one that reaches production unhandled. `skillPlan()` keeps throwing on purpose:
  every in-library caller passes an id the spec just yielded, where an unknown one is a bug that
  should stop the program. Membership uses `Object.hasOwn`, because `skills['constructor']` is
  truthy on a plain object.
- `matchRoute(pages, path)` reads the `route` every page has always declared and nothing ever
  read back — an app whose router speaks `/orders/123` used to write that mapping a second time,
  by hand, beside a declaration that already said it. `sync()` is deliberately NOT wired to it;
  the caller composes `sync(matchRoute(graph.spec.pages, path) ?? path)`, so a path this cannot
  place stays unplaced and lands on the existing off-graph behavior. Literal segments and
  `:param` only; a syntax it does not implement MISSES rather than guessing.

### Fixed
- **A schema that allows keys by pattern is not a closed one.** `patternProperties` beside
  `additionalProperties: false` no longer causes a wrong refusal — the author's full schema
  ACCEPTS `{'x-trace': 'abc'}` where they wrote `patternProperties: {'^x-': …}`, and the checker
  read the closed rule as "only the keys in `properties`". Only THAT rule stands down: required
  keys and declared types keep being judged beside `patternProperties`.
- The `contextBrief()` empty-key line said `(nothing)`, which reads like a report the library
  lost and sends a reader hunting a bug that is not there. It now says what actually happened:
  same-value writes and undefined-valued keys net out before the commit. It deliberately names
  no dial — `commitValues` looks like the culprit and is not.
- Docs corrected where `src/traverse/README.md` and the payload-shape module header claimed
  `issues` reaches the gap ledger. It does not: `recordRejection` stores the rejection REASON
  alone. `issues` rides `FireResult` and the Mode B rejection a model reads.
- `NOT_MATERIALIZED` is pinned as KIND-AGNOSTIC. The 0.3.0 report arrived as a `goTo` tool and
  the gate can be misread as being about navigation; it is about actuation. A write-only click
  nothing is bound to is the same lie told without moving. Tests only.

Reported by the Hodgkin FE POC team.

## [0.3.0] - 2026-07-25

### Changed (D22 — an agent fire that would execute nothing is refused)
- **Behavior change (pre-1.0 minor).** An agent-sourced `fire()` of a declared-but-UNBOUND tool now
  returns the typed rejection `NOT_MATERIALIZED` instead of a success-shaped no-op (and, for a
  `goTo` tool, silently moving the cursor). Reported from a live agent: in guide mode the model was
  told `{ ok: true, settlement: 'settled' }`, reported "successfully created the project…", and the
  real app had never moved. The library now enforces its own README rule, fail-closed — the
  `guardUnevaluated` stance applied to actuation: never launder a claim as a fact.
  The app self-report tier is untouched: `source: 'user' | 'system'` and the record-only
  `invoke: false` sensor still pass (that motion really happened), and a mid-mount node still
  answers the retriable `STILL_MOUNTING`. Every port inherits the gate from the one chokepoint
  (Mode B `skillsAsTools`, the MCP server, direct `fire()`, `hcifootprint/testing`).
- **Upgrade note.** Three public unions widen, so an exhaustive `switch` gains a case and stops
  compiling until you add it: `FireResult` rejection reasons gain `'NOT_MATERIALIZED'`, and
  `GapRecord.kind` / `GapRecord.rejectionReason` gain `'unmaterialized-fire'` / `'NOT_MATERIALIZED'`.
  Gap-stream volume changes too: `gaps()` and `onGap` now carry a row for every unbound agent fire
  that previously returned success-shaped and left no trace.

### Added (D22)
- `allowUnmaterializedFires` session option (`createSession`) — honest touring for guide/tour/plan
  flows: the no-op fire proceeds and says so. The result carries `executed: false` +
  `materialized: false`, the transition is stamped `materialized: false`, `contextBrief()` renders
  `not materialized — nothing executed`, every served edge (and Mode B `readySteps` / `whats_here`
  action) is stamped `materialized: false` before it is fired, and each no-op lands a gap-ledger row
  of the new `kind: 'unmaterialized-fire'` — the binding still to build, clustered with the rest of
  the demand backlog.
- `toNodeClaimed: true` is now disclosed on Mode B fire results whenever the cursor moved on an
  edge's declared `goTo`. The flag existed internally (on the transition, and in the context brief)
  but never rode the result, so a claimed navigation could diverge from the real app silently. Docs
  gain the consumer rule: **re-`sync()` after any claimed navigation** (a bound handler completing
  does not confirm navigation either — only `sync()` does).
- `TransitionRecord.materialized`, `FireResult.executed` / `FireResult.materialized`, the
  `NOT_MATERIALIZED` rejection reason (also on `GapRecord.rejectionReason`), and the
  `'unmaterialized-fire'` gap kind. See `docs/design/d22-materialized-fires.md`.

### Added (D21 — receipts on the high-effect ask, and decisions that leave a record)
- The `needs-confirm` result now carries `receipts` (`ConfirmReceipts`) — `willDo` (edge
  description + declared, honesty-tagged effect), `because` (the guard evidence that made the
  edge fireable — KNOWN, not scored), `youAreOn`/`version`, and `recentSteps` (the fire-journal
  tail) — assembled from what the session already knows, so an agent can SHOW the human what
  they are approving. Rides `doStep`/`doAction`/MCP as plain JSON.
- A confirm journal: `session.confirmAsk(id)`, `session.declineConfirm(id, {by?, note?})`,
  `session.confirms()`, `session.onConfirm(fn)`, and the `'confirm'` observer event — the
  auditable ask → decision → fire chain. A confirmed `fire()` auto-closes its ask as `approved`
  and stamps `TransitionRecord.askId`. Kept SEPARATE from the gap ledger (a gated action is
  consented capability, not unmet demand).
- Mode B: a `decline: true` arg on the skill-tool / `do_action` call records the human's refusal
  (returns `judgment: 'declined'`) instead of the ask dangling — symmetric with `confirm: true`,
  added to the static input schema (a one-time pre-1.0 schema bump).
- Field kinship with agentfootprint's `checkIn` evidence is deliberate (one mental model across
  both libraries); nothing is imported across — the one substantive divergence is `because`
  (KNOWN guard evidence) vs `drivers` (a scored guess). See `docs/design/d21-confirm-receipts.md`.

## [0.2.0] — 2026-07-19

First npm release (previously git-install only).

### Added
- `requiredStateKeys()` on both graph types (`SkillGraph` and `NavigationGraph`) — the
  sorted set of state keys every guard reads, so a projector can be seeded completely
  (an unseeded key is served with the `guardUnevaluated` honesty marker, not hidden).
- `whats_here { sinceVersion }` — Mode B replies can narrate only the delta since the
  model's last look; a fixed `why` tool serves the causal backward slice for a state key.
- `llms.txt` — a single, source-verified API page for agent (and human) consumers.
- README: guard-semantics section, the adoption ladder (guide mode blessed as Phase 0),
  and the Mode B settlement re-read rule.

### Fixed
- Git installs now build themselves (`prepare` script) — `npm i github:footprintjs/hcifootprint`
  ships a working `dist/`.
- `undefined` is never stored: a report entry whose value is `undefined` is dropped, and a
  declared write reported as `undefined` counts as missing; a key holding `undefined` is as
  unevaluable as an absent one.
- Subpath exports (`/mcp`, `/testing`, `/testing/lint`) resolve under node10 typing
  (`typesVersions`); attw + publint clean.
