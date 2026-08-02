# graph/sources — the graph grows from what the app already has

**Job:** turn the descriptions an app already owns — a route table, a router's
own route tree, a set of journeys, a live action store — into graph input, so
nobody re-types them into the definition (glue that drifts every time either
side edits).

**Depends on:** `graph/guards` + `graph/route-match` (shared authoring law);
type-only on `tree/` and `traverse/`.
**Used by:** `tree/appmap` (mergeSources pre-pass + live-source attach). The
factories never import appmap and appmap never value-imports the factories —
a bundler includes only the sources a consumer actually called.

## The four doors

| factory | contributes | when |
|---|---|---|
| `fromRoutes(app.routes)` | pages — the spine (plus link actions, if `crossLinks` asked) | build (folded before the walk) |
| `fromReactRouter(app.routes)` | the same spine, read from a nested route TREE | build (folded before the walk) |
| `fromJourneys(app.journeys)` | journeys — the overlay | build (compiled by the existing journeys pass) |
| `fromLiveStore(app.actionStore)` | live bindings per node | attach (every `createSession()`); release via `detachSources()` |

Two doors, one source kind: `fromReactRouter` returns the same `RoutesSource`
`fromRoutes` does, so the merge, `crossLinks`, the url gesture and `matchRoute`
all needed no changes to serve it.

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

## What a live row may DECLARE (not only bind)

`LiveAction extends RegisteredActionDef`, so a published row carries the whole
authoring vocabulary — `enabledWhen`, `blockedBecause`, `writes`, `goTo`,
`confirm`, `input`, `verify` — and an action a store INTRODUCES gets all of it
end to end (guard evidence, `unblockedBy`, the typed refusal). Written down
here because it was true and stated nowhere: integrations wired `enabled: false`
by hand for months while the declarative door stood open. The carve-out is the
merge order itself — attach last and only BIND — so a row whose id the graph
already declares binds its handler and keeps the DECLARATION's own
`enabledWhen`; declaring from a store is how an app describes an action the
graph does not have.

One field is a live bit the reconcile tracks by VALUE: a changed
`blockedBecause` SENTENCE releases the registration and declares it again (a
declaration is not a wire — it moves by being declared), while a reader form is
never re-declared, because it is already called fresh at every row assembly.

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

## A name is TRANSCRIBED, never guessed (`fromReactRouter`)

`fromRoutes` reads a FLAT table whose keys ARE the page names. A router's own
config is neither flat nor named: addresses compose through children, and no
name is written anywhere. `fromReactRouter` reads that tree — duck-typed
(`RouteObjectLike` is declared here; no router is imported, which is why this
needs no subpath of its own), pages only, `path` / `index` / `children` /
`handle.hcifootprint.{name,does}` and nothing else.

The naming line is narrower than "never derive". A fully-static address is
TRANSCRIBED — `/projects/new` → `projects-new`, every byte from the app's own
route, joined with one authored `-` (not on the segment law's reserved list, and
`segmentFault` is still asked rather than assumed). The moment there is nothing
to transcribe the derivation STOPS: a `:param`, a `*`, an optional `?`, the
root's zero segments, or a segment carrying a reserved character. Those refuse,
naming the path and the same two doors every time — `nameOf` at the call, or
`handle: { hcifootprint: { name } }` on the route the app owns.

The root refuses on purpose. Transcription has zero bytes to work with there, so
any name for it (`home`, `dashboard`, `landing`) would be a word the LIBRARY
chose — the one thing this factory does not do. One line at the call fixes it.

Composition rules, all three the router's own: a child path extends its parent's
address unless it starts with `/` (absolute — it replaces the prefix); a route
with no path of its own is a LAYOUT and contributes no page (declaring
`handle.hcifootprint` on one is refused — a page is an address); an index route
renders at its parent's address, so two routes at ONE address are ONE page (the
fold), and `path: ''` folds identically. Names are unique: two addresses arriving
at one id refuse naming both, never last-wins.

What it costs: page ids are derived at RUNTIME, so a graph whose spine comes from
here has `string` node paths instead of a literal union. `fromRoutes` stays the
door for a spine you want typed.

## Leaf modules by construction

Each factory is its own module with at most the shared authoring guards (plus,
for `fromReactRouter`, the matcher's segment law) as value imports;
`fromLiveStore` has ZERO value imports — it drives the session
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
