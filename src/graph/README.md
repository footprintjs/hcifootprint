# graph — authoring + compile (layer 1)

**Job:** the shared authoring spine — guard/segment/route law every graph door throws through, plus `matchRoute` and the growable sources. `buildNavigationGraph()` (in `tree/`) compiles a definition into a validated, frozen, worker-transferable `NavigationGraphSpec` on top of it.

**Depends on:** `atom/` (+ footprintjs `detectSchema` for payload-schema duck-typing).
**Used by:** `traverse/` (sessions run over the compiled spec).

This layer IS the enforcement spine — every shape mistake fails LOUDLY at build time so the graph can't silently lie to a planner:

- duplicate ids · unknown page/step references · `navigatesTo` unknown page · `on: []`
- empty guard `{}` and empty operator objects (footprint's evaluator would silently ignore/never-match them)
- operator typos and denied keys (`__proto__` …) in guards AND journey preconditions
- unrecognized payload schemas · reserved id `leave-journey`

Compiled affordances are **cloned + deep-frozen** (post-build mutation of the author's objects cannot change what a session offers). `schema` is the one field kept by reference (validators hold functions); MCP emission clones it on the way out.

## route-match.ts — the authored `route`, finally read back

`PageDef.route` was authored and never read: it rode into the compiled page and nothing looked at it again, so an app whose router speaks `/orders/123` wrote the URL→page mapping a second time by hand. `matchRoute(graph.spec.pages, path)` reads it — literal segments and `:param`, trailing-slash and query/hash insensitive, most-literal-segments wins.

It stays a **separate function the caller composes**, not a behaviour inside `sync()`:

```ts
session.sync(matchRoute(graph.spec.pages, location.pathname) ?? location.pathname);
```

An unplaceable path returns `undefined` — never a nearest guess — and `sync()` records it off-graph exactly as before. Inside `sync()` that non-answer would have to be resolved silently, and a confidently wrong page is worse than an unmapped one: the cursor decides which guards run, which edges are served, and which plan the model gets.
