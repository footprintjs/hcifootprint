# graph — authoring + compile (layer 1)

**Job:** `skillGraph()` fluent builder → validated, frozen, worker-transferable `SkillGraphSpec`.

**Depends on:** `atom/` (+ footprintjs `detectSchema` for payload-schema duck-typing).
**Used by:** `traverse/` (sessions run over the compiled spec).

This layer IS the enforcement spine — every shape mistake fails LOUDLY at build() so the graph can't silently lie to a planner:

- duplicate ids · unknown page/step references · `navigatesTo` unknown page · `on: []`
- empty guard `{}` and empty operator objects (footprint's evaluator would silently ignore/never-match them)
- operator typos and denied keys (`__proto__` …) in guards AND skill preconditions
- unrecognized payload schemas · reserved id `leave-skill`

Compiled affordances are **cloned + deep-frozen** (post-build mutation of the author's objects cannot change what a session offers). `schema` is the one field kept by reference (validators hold functions); MCP emission clones it on the way out.
