# graph/sources — the graph grows from what the app already has

**Job:** turn the three descriptions an app already owns — a route table, a set
of journeys, a live action store — into graph input, so nobody re-types them
into the definition (glue that drifts every time either side edits).

**Depends on:** `graph/guards` + `graph/route-match` (shared authoring law);
type-only on `tree/` and `traverse/`.
**Used by:** `tree/appmap` (mergeSources pre-pass + live-source attach). The
factories never import appmap and appmap never value-imports the factories —
a bundler includes only the sources a consumer actually called.

## The three doors

| factory | contributes | when |
|---|---|---|
| `fromRoutes(app.routes)` | pages — the spine (plus link actions, if `crossLinks` asked) | build (folded before the walk) |
| `fromJourneys(app.journeys)` | journeys — the overlay | build (compiled by the existing journeys pass) |
| `fromLiveStore(app.actionStore)` | live bindings per node | attach (every `createSession()`); release via `detachSources()` |

## The documented merge order (enforced in merge.ts)

> Pages first (routes then hand-authored, hand-authored wins), journeys overlay
> second and may only add, live actions attach last and only bind — nothing
> later in the order may remove anything earlier. Routes may also contribute
> link actions; hand-authored actions win.

Stances: one courtesy (a hand page missing `route` inherits the source's);
different routes for one page refuse loudly (drift made visible); a hand journey
wins over a same-id journey silently (deterministic and documented); same-kind
id collisions refuse (ambiguous authorship); unknown/unreadable source shapes
fail closed in the library's own voice.

## When the live source re-reads (the invalidation contract)

> Your store must emit whenever the action surface changes; NAVIGATION is
> covered for you by a re-read on every page change the app reports through
> `sync()`.

A store whose actions are derived from the router has no change of its own to
announce when the page changes, so without that re-read the surface after a
navigation is whatever the last emission left behind — served as the actions
available here. `LiveBindingPort.whenPageChanges` is the door (optional and
severable: a port without it keeps store-emissions-only behaviour). It fires on
an OBSERVED page change, never on a navigation the app merely CLAIMED — a claim
moves the cursor before the app's own handler has run, so a read there describes
the page the app has not left yet. Nothing re-reads at `whats_here`/report time:
a read must never mutate the structure it is about to serve.

## Error stance of the live source (split by WHO is on the stack)

The FIRST read at attach is LOUD: an invalid action is an authoring error and
dies at `createSession` — and the loud throw cleans up after itself (the store
subscription, the page-change subscription and any bindings registered before
the bad action are released, so a failed attach leaks nothing). A LATER read
runs on somebody else's stack — the app's own notify loop, or the session
mid-hop — where a throw would abort their work; those reconciles are isolated
(recorder rule): a failure warns through the session's `onWarn` sink (console on
the direct `attach` door) and leaves bindings as-is; the next read simply
retries.

It is also DISCLOSED. Bindings from BEFORE the failure are still on offer, and
serving them with nothing said presents a stale list as current fact — so a
caught failure ALSO files one gap row (`reason: 'other'`, `principal: 'system'`,
an authored `request` naming the consequence) through
`LiveBindingPort.reportGap`. One row per failure STREAK, cleared by the next
read that works: a store that throws on every emission is one broken read, not
forty unmet demands.

## Leaf modules by construction

Each factory is its own module with at most the shared authoring guards as
value imports; `fromLiveStore` has ZERO value imports — it drives the session
instance it is handed through the type-only `LiveBindingPort` (the shape
`InteractionSession` already satisfies: registerActions + show/setVisible,
plus the two optional members `whenPageChanges` and `reportGap`).
`test/treeshake.test.ts` is the proof: importing `fromRoutes` from the barrel
bundles no session machinery and no footprintjs.

## How a routes page is REACHED

A route contributes a page, never an action. Reaching it is the `url` gesture:
an edge with no binding whose `goTo` names a page with a fully-literal route
materialises through the session's `navigate` option (see
`SessionOptions.navigate` and `handlerFor` in traverse/session.ts). Paramful
hrefs are refused at authoring — the library never guesses params.

Which leaves the question the field asked: if a table contributes 28 places and
zero gestures, what does an agent standing on one of them DO? `fromRoutes(app.routes,
{ crossLinks: true })` answers it — every page whose route is fully literal
becomes one root-level link tool (`go-to-<pageId>`, a `url` binding carrying the
route, `goTo` making the claim) offered on every other page. Opt-in, because
inventing 28 tools nobody asked for is the other way to be wrong; `true` FILTERS
param routes (a blanket ask meets the literal-address law), while a named subset
REFUSES an unknown name or a paramful one at the factory, where the author is
looking. Materialisation lives in `merge.ts` phase 2.5, not in the factory: the
link's `on` list is "every page in the EFFECTIVE graph except the target", a set
only the merge can see — so the source carries the request, not finished tools.
Nothing downstream changed: the links are ordinary root tools that ride
`compileTool`, `gestureHref` and `handlerFor` exactly as a hand-written one does.
