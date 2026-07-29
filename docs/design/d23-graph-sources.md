# D23 — Graph sources: the graph grows from what the app already has

Status: SHIPPED (0.4.x line, after the 0.4.0 release). Lineage: d18 (navigation graph) →
d21 (confirm receipts) → d22 (materialized fires) → **d23**.

## The kernel

The kernel does not change: the app is a navigation graph, a node is the set of actions
possible there, a human and an agent are both travelers, everything is recorded per traveler,
and a path through the graph is what a session is. **What changes is where the EDGES come
from.** The app already owns three descriptions of itself — a route table, a set of journeys,
a live store of actions — and each had to be re-typed by hand into the definition, where the
copy drifts the moment either side edits. With sources, the graph reads the owner's truth
instead of copying it.

Three doors, each a plain-named factory returning a tagged value:

| factory | contributes | when |
|---|---|---|
| `fromRoutes(app.routes)` | pages — the spine | build (folded before the compiler's walk) |
| `fromJourneys(app.journeys)` | skills — the overlay | build (compiled by the existing skills pass) |
| `fromLiveStore(app.actionStore)` | live bindings per node | attach (every `createSession()`); release via `detachSources()` |

Page names are EXPLICIT (`fromRoutes` reads the table's keys) — auto-deriving a name from
`/orders/:id` would be a guess, and this library does not guess. A route contributes a PAGE,
never an action: the spine is places, not gestures.

## The merge order (documented verbatim, enforced in merge.ts)

> Pages first (routes then hand-authored, hand-authored wins), journeys overlay second and
> may only add, live actions attach last and only bind — nothing later in the order may
> remove anything earlier.

Locked refinements: hand-authored wins per page id with ONE courtesy — a hand page missing
`route` inherits the source's route (that IS the use case); the same page declaring two
DIFFERENT routes refuses loudly (two names for one URL — drift made visible), judged by the
matcher's own segment reading, never string bytes. A hand-authored skill wins over a same-id
journey silently (deterministic and documented). Two sources of the SAME kind colliding on an
id refuse loudly (ambiguous authorship). `fromJourneys` output is skills-only, so
overlay-may-only-add is structural, not policed.

## Typed actuation on the edge

The `Binding` union gained its two missing gestures — the full set now covers what a routed
web app actually performs: **url | click (element) | tab | programmatic**.

- `{ kind: 'url', href }` — a literal address the app's own router can be handed. A paramful
  href (`/orders/:id`) is refused loudly at ALL THREE authoring doors (compiler,
  mount-declared tools, fluent builder) — a `:param` segment can never materialise, because
  the library never guesses params. Judged by the route matcher's own segment law, so
  authoring, routing and materialisation can never disagree.
- `{ kind: 'tab', target }` — **the tab-semantics decision (locked):** a tab switch is its
  own gesture, descriptive in v1. It materialises only via a registered handler, it NEVER
  moves the page cursor (flipping a tab is not going somewhere), and `fire()` never writes
  the PresenceIndex — after the app's handler flips tabs, the app (or the fromLiveStore
  wiring) reports the flip through the existing `show()`/`setVisible()` visibility wire.

Materialisation stays ONE question, answered where it always was (the `handlerFor` seam):
(a) a registry handler wins, byte-identical; (b) else, with `SessionOptions.navigate`
present, an edge whose gesture yields a literal href — an explicit url binding, else the
fully-literal route of the page named by its goTo — synthesizes `() => navigate(href)`;
(c) else undefined → agent fires refuse NOT_MATERIALIZED exactly as before. The synthesized
navigation rides the same invocation machinery (resolve → `effectStatus: 'performed'`; throw
→ `'refused'` with rollback + cursor walk-back); `toNode` stays a claim until `sync()`
confirms. click/tab/programmatic never synthesize — they change only WORDS: the
NOT_MATERIALIZED refusal carries the declared `gesture`, and gap rows carry `gestureKind`
(a kind string, never the binding object — token-lean).

## The never-trap invariant

> Page actions are always reachable regardless of skill state, and a skill whose first step
> cannot materialise is never constructed [build] nor committed to [runtime].

Three gates: **build** refuses what can NEVER materialise (paramful url hrefs; a skill whose
entry gesture is such a url) while what cannot materialise YET keeps compiling (handlers
arrive at mount — the d18 spine-tool contract); **commit** — `commitSkill()` gains ONE typed
refusal after its existing four, `ENTRY_NOT_MATERIALIZED`, firing iff the resolved principal
is agent, the session is not a tour, and the entry step could not act AT ALL right now (the
same widened handlerFor question — one code path, never a second lookup; instance-keyed
wiring counts). One gap row (`rejectionReason: 'ENTRY_NOT_MATERIALIZED'`, affordanceId =
entry step, `skillId`, `gestureKind`), NO transition, NO commit bundle — nothing touched
state. **serve** — unchanged: the merge order structurally cannot remove page actions, and
the leave-skill escape stays guaranteed for frames that do open.

This is the one approved pre-1.0 behavior widening of the wave — CHANGELOG upgrade note,
same treatment 0.3.0 gave NOT_MATERIALIZED.

## The tree-shake geometry (measured, then pinned)

Each factory is its own leaf module. `fromRoutes`/`fromJourneys` value-import only the shared
authoring guards (`graph/guards`, `graph/route-match`); `fromLiveStore` has ZERO value
imports — it drives the session instance it is handed through the type-only
`LiveBindingPort`. The compiler consumes sources structurally (`import type` at the merge
point) and never value-imports the factories; the factories never import the compiler.

Probe numbers (packaging recon on the shipped package; regression-pinned in
`test/treeshake.test.ts`):

- `matchRoute` alone: **510 B** minified (339 B gzip; 719 B under rollup) — pinned ≤ 1 KB.
- The source trio (`fromRoutes` + `fromJourneys` + `fromLiveStore`): **2,342 B** on the day
  the ceilings were pinned — pinned ≤ 15 KB, with an allowlist (`dist/index.js` +
  `dist/graph/**` only) and named forbidden prefixes (`dist/traverse/`, `dist/tree/`,
  `dist/serve/`, `dist/presence/`, `dist/registry/`, `node_modules/footprintjs`).
- `sideEffects: false` is load-bearing, not decorative: the same matchRoute probe measures
  **11,337 B** with annotations ignored — esbuild's purity analysis alone cannot drop the
  re-export graph.
- For scale: `buildNavigationGraph` (full session machinery) ≈ 85 KB minified / ≈ 26 KB gzip
  (esbuild), ≈ 115 KB (rollup/vite). The leaf geometry exists so a static-graph consumer
  never pays it.

## What each addition does to the trace

`fromRoutes`/`fromJourneys`/merge: build-time only — zero new rows, bundles or events.
`fromLiveStore`: rides `registerToolGroup`, so mounts land exactly like hand-written ones
(structure-axis bumps, fingerprint coalescing, dormancy telemetry unchanged). url fires via
`navigate`: the trace of a handler-backed fire, exactly — one TransitionRecord + one
CommitBundle; `toNodeClaimed` stays the claim; `sync()` confirms. `ENTRY_NOT_MATERIALIZED`:
exactly one gap row per refusal, and the existing four commitSkill refusals stay un-ledgered
(protocol events, not capability gaps).
