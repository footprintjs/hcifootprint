# action — the Action Binding Protocol (2.x)

**Job:** give one action a single correlated lineage across its distributed life: declared once (`defineAction`), bound to every live control that can perform it (`connectAction`), offered under exact facts, invoked by an exact principal, settled with evidence — plus the walk (many actions, one route), the kind vocabulary, and the channel surfaces.

**Depends on:** `atom/` (Principal, PrincipalPolicy, VerifyContract), `registry/` (many-binding registration), `traverse/` (principal policy checks).
**Used by:** `react/` (one framework skin over this core — never the other way around).

The map, one file per concern:

| file | owns | the reason it exists |
|---|---|---|
| `definition.ts` | `defineAction`, the definition record | a capability declared once, callable, with its contract frozen at declaration |
| `connection.ts` | the runtime: connections, offers, invocations, settlement | *what was offered is what was invoked* — offers are revision-exact, and a stale one refuses by naming the CURRENT offer, never a dead end |
| `contracts.ts` | contract activation | strict mode rejects clauses this runtime cannot enforce, instead of carrying them as decoration |
| `coverage.ts` | the four-level trust ladder | `identity → semantic → executable → verifiable` — how much a binding is trusted to *prove* it did something; verified evidence is only accepted from `verifiable` |
| `host-adapter.ts` | the framework-neutral component adapter | resolve which live element is the target; say `absent`/`ambiguous`/`unsupported` when it cannot — it resolves, it never listens |
| `walk.ts` | L2: plans, walks, manifests | batched is not blind — every step re-derives its offer at its own turn; partial execution is a legible manifest because screen actions cannot be rolled back |
| `kinds.ts` | the governed vocabulary | two teams declaring `array` to mean different things, caught at connect time; the catalog is immutable, so it is memoized — consulted once per kind, ever |
| `channels.ts` | surfaces and the degradation record | a miss is a COUNTED fact (`channelGaps()`) — a month of degraded turns reads back as a backlog written by actual usage |
| `stored.ts` | the runtime's internal DATA shapes | data separated from logic — one shape, one owner, many operators |
| `progress-ledger.ts` | declared stages, observed and closed | owns `unreported` — declared minus observed, computed at close |
| `settlement.ts` | outcome snapshots and abandonment authority | `abandoned` needs an EXPLICIT authority; late evidence is kept and quoted |
| `input-validation.ts` | one deliberate payload, checked pre-handler | a failing payload refuses BEFORE application code runs, never after it half-ran |
| `principals.ts` | who is asking, and the verdict | computed in one place so offers and invocation re-checks cannot drift |
| `authoring.ts` | refusals at the declaration door | teaching sentences where the developer is looking |
| `binding-facts.ts` | what a binding claims right now | readers, never snapshots |
| `declarations.ts` | freeze and snapshot what was declared | a declaration is retained exactly as captured |
| `observer-capture.ts` | observer generation snapshots | capture before behavior, without changing the callback |
| `kind-governor.ts` | composed unit: kind governance state | memo, seen, ungoverned — one owner, delegated to by the runtime |
| `surface-board.ts` | composed unit: surfaces + the gap record | declarations, matching, counted misses — one story, one owner |
| `transition-ledger.ts` | composed unit: every stored transition | rows, ids, settlement — "a connection never holds the current transition" has exactly one place to be true |
| `connection-builder.ts` | the heart of connect(), behind `ConnectionCore` | the closure web shares per-connection state BY DESIGN; what separates is the unit from the runtime — the core seam lists every capability it may use, so one not listed is one provably unused |

Laws every file upholds (the design doc `docs/design/action-binding-protocol.md` carries the full argument):

- **No recovered control identity.** Definition, binding, offer, transition are typed fields; nothing may `split`/`slice`/suffix-match an id. The dot in `orders.archive` has no semantics.
- **One definition, many bindings** — and a connection never holds "the current transition". A stored current lets a second press settle the first record.
- **First terminal wins, and the loser is KEPT** (`lateSettlements`) — quoted, never adopted, never reopening a terminal.
- **Absence is established, never assumed.** A detach does not prove abandonment; `abandoned` needs an explicit authority.

Tests: `test/action-*.test.ts` (definition, connection, contracts, host adapter, runtime invoke, walk, kinds, channels, race, types) — plus the dependency-free Angular lifecycle proof, which is the template for proving any framework skin.
