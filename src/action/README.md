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
| `lifecycle.ts` | a declared state chart + its enforcing mover | Node/React/the browser PUBLISH their phase names — we adopt that and refuse the scheduler half: the chart owns WHETHER, the host owns WHEN; a terminal with an outgoing edge is refused at declaration |
| `declared-context.ts` | composed unit: declared outcome context (`declareContext`) | "what the person set with a control, still standing" is outcome context the library records — so the library folds it, AT SETTLEMENT, instead of every app walking its own index |
| `describe-thrown.ts` | words for a thrown value, never a second throw | the fold (a reader's skip reason) and the walk (a step's refusal) both record what app code threw as text, where a throw of their own would escape; `String()` itself throws on a null-prototype object, a hostile `toString`, a revoked Proxy — one owner, so a fix lands for both |
| `request.ts` | the HITL request desk (`requestInput`) | the OFFERED-SET LAW: an answer outside the offered list refuses naming the list and the request STAYS OPEN; a request ends by answer, decline, withdrawal, or explicit authority — never by inference from silence |

Laws every file upholds (the design doc `docs/design/action-binding-protocol.md` carries the full argument):

- **No recovered control identity.** Definition, binding, offer, transition are typed fields; nothing may `split`/`slice`/suffix-match an id. The dot in `orders.archive` has no semantics.
- **One definition, many bindings** — and a connection never holds "the current transition". A stored current lets a second press settle the first record.
- **First terminal wins, and the loser is KEPT** (`lateSettlements`) — quoted, never adopted, never reopening a terminal.
- **Absence is established, never assumed.** A detach does not prove abandonment; `abandoned` needs an explicit authority.

Laws added in 2.6.0 (design: `docs/design/2026-09-30-action-gaps.md`):

- **Who invoked it is declared, never inferred.** `invokedBy` on a connection is checked against `principal.mayInvoke` at connect; every snapshot carries `attribution` (port or `invokedBy` → `'caller-asserted'`, neither → `'unknown'`). `humanReporting` says who REPORTS, not who called.
- **Invocation order is a fact.** `transitions(query)` lists oldest INVOCATION first; `history: { keep }` releases only fully settled rows, oldest first, inside `TransitionLedger`.
- **An effect can be proven by a governed value.** `settle.evidence: { kind }` is evidence-bearing, governed at connect, and when the mounted catalog gives that kind a schema, the evidence VALUE is schema-checked over the RECORDED snapshot at settle (a failing value does not spend the terminal). With no schema for the kind, only the kind is governed — the value itself is not checked. Either way the governed value is DETACHED first, once (`declarations.ts · detachGovernedValue`: `structuredClone`, then the snapshot), so the recorded bytes are the checked bytes — a class instance, Map or Date the app still holds cannot change the record afterwards; a value that cannot be detached (a function inside, a Proxy, a host object) is refused without spending the terminal. Evidence of an action with no `settle.evidence` keeps the quoting snapshot (opaque values by identity). It is not `produces` — that is the handler's return, which a walk carries.
- **A verdict on the return is authored, never inferred.** `settle.onReturn` runs through the one settle funnel; a synchronous return settles before `invoke()` returns for definitions that declare it. There is no shorthand that turns a return into evidence.
- **A declared context claims its callables.** A context admits rows by the identity of the callables it was declared with, and a runtime connects one callable per id — so another callable taking a declared id would make the context certain never to fold. That is REFUSED at the moment it becomes certain (`declared-context.ts · DeclaredContexts.claimOn`): at the other callable's connect (`connection-builder.ts · buildConnection`, before anything registers) or at a declaration naming a different callable than a live context or connection holds. Refused, not a counted 'dead' state: a context that can never fold serves `[]`, which reads exactly like "nothing set yet" — the structural-impossibility precedent is the release that can never verify, refused at declaration. `retire()` frees the id.
- **Context is folded at settlement, never post-processed.** `declareContext` = newest INVOKED verified value per key, minus any a later verified release named; history eviction cannot change an entry; a reader that throws is a counted skip — whatever it throws, even a value `String()` cannot print (`describe-thrown.ts · describeThrown`), so a sibling context still folds and `settle()` still returns; `TransitionLedger · #announceVerified` contains each listener as the second guard.

```ts
const refetch = defineAction('data-panel.refetch-time-range', {
  does: 'Re-run the open series over the time range the person set',
  invocation: 'scalar',
  settle: {
    evidence: { kind: 'data-panel.dataset-version' },           // the proof is a new dataset
    onReturn: (o) => o.status === 'performed' && o.produced.status === 'refetched'
      ? { status: 'verified', evidence: o.produced.dataset }
      : { status: 'refused', reason: o.status === 'failed' ? String(o.error) : o.produced.reason },
  },
  mutate: (input: RefetchInput) => refetchOnServer(input),
});
connectAction(runtime, refetch, { node: 'data-panel', coverage: 'verifiable', invokedBy: 'user' });
const ranges = runtime.declareContext({
  id: 'data-panel.time-ranges', from: [refetch], fold: 'latest-per-key',
  key: (v) => (v as DatasetVersion).rootRef, identity: (v) => (v as DatasetVersion).ref,
  releasedBy: { action: releaseRange, identity: (e) => e as string },
});
ranges.entries(); // [{ key, identity, value, transition, binding, attribution, … }], oldest invocation first
```

Tests: `test/action-*.test.ts` (definition, connection, contracts, host adapter, runtime invoke, walk, kinds, channels, race, types, transition attribution, transitions listing, settle evidence, settle on return, declared context) — plus the dependency-free Angular lifecycle proof, which is the template for proving any framework skin.
