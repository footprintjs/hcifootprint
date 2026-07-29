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
| `fromRoutes(app.routes)` | pages — the spine | build (folded before the walk) |
| `fromJourneys(app.journeys)` | skills — the overlay | build (compiled by the existing skills pass) |
| `fromLiveStore(app.actionStore)` | live bindings per node | attach (every `createSession()`); release via `detachSources()` |

## The documented merge order (enforced in merge.ts)

> Pages first (routes then hand-authored, hand-authored wins), journeys overlay
> second and may only add, live actions attach last and only bind — nothing
> later in the order may remove anything earlier.

Stances: one courtesy (a hand page missing `route` inherits the source's);
different routes for one page refuse loudly (drift made visible); a hand skill
wins over a same-id journey silently (deterministic and documented); same-kind
id collisions refuse (ambiguous authorship); unknown/unreadable source shapes
fail closed in the library's own voice.

## Error stance of the live source (split by WHO is on the stack)

The FIRST read at attach is LOUD: an invalid action is an authoring error and
dies at `createSession` — and the loud throw cleans up after itself (the store
subscription and any bindings registered before the bad action are released,
so a failed attach leaks nothing). A LATER store emission runs inside the
app's own notify loop, where a throw would abort the app's iteration over its
other subscribers — those reconciles are isolated (recorder rule): a failure
warns through the session's `onWarn` sink (console on the direct `attach`
door) and leaves bindings as-is; the store's next emission simply retries.

## Leaf modules by construction

Each factory is its own module with at most the shared authoring guards as
value imports; `fromLiveStore` has ZERO value imports — it drives the session
instance it is handed through the type-only `LiveBindingPort` (the shape
`InteractionSession` already satisfies: registerToolGroup + show/setVisible).
`test/treeshake.test.ts` is the proof: importing `fromRoutes` from the barrel
bundles no session machinery and no footprintjs.

## How a routes page is REACHED

A route contributes a page, never an action. Reaching it is the `url` gesture:
an edge with no binding whose `goTo` names a page with a fully-literal route
materialises through the session's `navigate` option (see
`SessionOptions.navigate` and `handlerFor` in traverse/session.ts). Paramful
hrefs are refused at authoring — the library never guesses params.
