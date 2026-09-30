# Action gaps — six asks from a real binding, five changes

Status: **DESIGN, not built.** Written 2026-09-30 against 2.5.0 (`origin/main` b14cea2). Every
"today" claim below was read off the code; every "proposed" shape is additive and lands in a 2.x
minor. Decisions the owner must make are marked **YOUR CALL**.

## Where the asks came from

A real application bound an interactive chart and table through the Action Binding Protocol
(2.5.0): ten definitions, one live binding per (action, artifact), every interaction through
`connection.invoke`, every effect settled by an `onInvocation` observer. Two of the ten are a
time control: `refetch-time-range` re-runs a backend tool over a range the person set and
**mints a new dataset**; `release-time-range` stops that range riding the next question. The app
wrote six things by hand around the library. Each is below, with the question this document
answers for it: is it a gap in the protocol, or the app's own concern?

| # | the ask, in the app's words | verdict | the change | step |
|---|---|---|---|---|
| 1 | "an effect that is a backend re-run producing a NEW resource cannot be declared" | **real gap** — nothing but `writes`/`goTo`/`verify`/`observability` counts as evidence-bearing, so the app declared a fake state key (`writes: ['panel.dataset']`) to be allowed to say `verified` | `settle.evidence: { kind }` — the effect is proven by a value of a governed kind, and that declaration is evidence-bearing | 3 |
| 2 | "evidence is untyped and not governed by a kind" | **real gap, half of it** — the runtime half (governance + a check) is ours; the static-type half is deferred | the same `settle.evidence.kind`: connect-time governance, settle-time schema check, the kind stamped on the record | 3 |
| 3 | "no way to LIST transitions; the app keeps its own index and guards its trimming" | **real gap** — the ledger owns every row and serves them only one ref at a time | `runtime.transitions(query?)` + optional `history: { keep }` | 2 |
| 4 | "a settled transition cannot be exported as declared context for the next turn" | **real gap** — this library is a context engine, and "what the person set with a control" is outcome context it records but cannot serve | `runtime.declareContext({ id, from, key, identity, fold: 'latest-per-key', releasedBy })` → a handle whose `entries()` is folded at settlement time | 5 |
| 5 | "transitions carry no source/actor" | **real gap, already named** — `action-binding-protocol.md` § Human reporting ownership deferred exactly this "explicit provenance rail" | `ConnectActionOptions.invokedBy: Principal` + `ActionTransitionSnapshot.attribution: Attribution` (the 1.7.0 type, reused) | 1 |
| 6 | "no declarative 'settle when the action returns'; even a synchronous action settles a microtask later" | **real gap** — every connection hand-writes the same observer, and the verdict it writes is data about the definition, not the binding | `settle.onReturn: (outcome) => ActionEffectSettlementInput \| undefined` | 4 |

**Pairs that are one idea.** 1 + 2 are one clause (`settle.evidence`): "the effect is proven by a
value of this governed kind" is both "an effect can produce a resource" and "evidence is governed".
5 + 4 share provenance: a context entry says who set it by carrying the transition's
`attribution`, so 5 lands first and 4 reads it. 3 and 4 share the ledger's invocation order, which
becomes a queryable fact in step 2 and the fold's meaning of "latest" in step 5.

---

## The vocabulary already here (read before any name below)

The asks used the app's words. Most have a house word already, and the design uses it:

| the app said | the library already says | where |
|---|---|---|
| `produces` (inside `settle`) | `produces` exists at the TOP level and means **what the handler returns** — the walk carries exactly that value (`walk.ts`, `ActionPlanStep.carry`). It is not the effect's evidence. | `types.ts` · `ActionDefinitionCommonContract.produces` |
| `actor: 'human'` | `Principal = 'user' \| 'agent' \| 'system' \| 'unknown'` | `atom/types.ts` |
| `source`, "inferred" | `Attribution { principal, basis, certainty }` + the closed `CERTAINTY_OF` table | `atom/types.ts`, `traverse/attribution.ts` |
| `via: 'control'` | the transition's `binding` (`node` + `instance`) IS the control | `ActionBindingRef` |
| a typed kind | `declareKinds` + `KindCatalog.describe(kind).schema` | `kinds.ts` |
| checking a value against a schema | the input-validation resolver (self-validating `.safeParse/.parse`, or `inputSchemaAdapter`) under `contractActivation` | `input-validation.ts`, `authoring.ts` |
| "the newest per view" | nothing — genuinely new | — |

The first row matters most. The app declared `produces: { kind: 'data-panel.dataset-version' }` on
the refetch, but its handler returns a `RefetchReply` envelope (`{ status: 'refetched', record,
presented } | { status: 'refused', reason }`), and the dataset only exists inside the verified
evidence. Under the walk's law a plan carrying that step's output would carry the envelope, not a
dataset — so the declaration is wrong today, and "put `identity` on `produces`" would have made the
library's two meanings of one word collide. The resource belongs to the **effect**, so it is
declared in `settle`, under a name that does not clash: `settle.evidence`.

---

## Step 1 — who invoked it (gap 5)

**Today.** `ActionTransitionRef.principal` is the offer's principal on a principal-port invoke and
`'unknown'` on every direct `connection.invoke` / `invokeContinuation`. The protocol doc says, on
purpose: "This phase does not mint a human principal … An integration that projects connection
ownership must not describe the resulting binding transition as human-attributed until it adds an
explicit provenance rail." The app wanted that rail and wrote `source: 'control'` into its own data.

**Proposed.**

```ts
connectAction(runtime, refetch, {
  node: 'data-panel', instance: artifact.ref,
  coverage: 'verifiable', humanReporting: 'connection',
  invokedBy: 'user',            // NEW: direct invocations of THIS connection are filed under 'user'
});

runtime.transitionFor(ref)?.attribution
// → { principal: 'user', basis: 'caller-asserted', certainty: 'observed' }
```

- `invokedBy?: Principal` on `ConnectActionOptions`. Direct doors (`invoke`, `invokeContinuation`)
  mint `ref.principal = invokedBy`; absent, today's `'unknown'` — byte-identical ref.
- The declared principal is checked against the definition's `principal.mayInvoke` **at connect**,
  through the one verdict owner (`principals.ts · verdictForPrincipal`). The contract is frozen and
  the principal is fixed, so one check at the declaration is sound; a connection that declares
  `invokedBy: 'agent'` for a user-only action refuses where the developer is looking. Without this
  check the new field would be a laundering door past `mayInvoke`.
- `ActionTransitionSnapshot.attribution: Attribution` — **present on every snapshot**, the same
  rule the session's transitions have followed since 1.7.0. Minted with `attributionOf` (certainty
  is read from the table, never passed in): port invoke and `invokedBy` → `'caller-asserted'`;
  neither → `attributionOf('unknown', 'unknown')`. `'caller-asserted'` is honest here for the
  reason the table already gives: the library watched the call come through its own door; who was
  on the other side is the integrator's word.

**Not inferred from `humanReporting: 'connection'`.** That flag says which subsystem *reports* a
human interaction for an element; it says nothing about who called `invoke()` (a timer, a test, a
replay all can). The protocol doc drew that line deliberately and this design keeps it: the
principal is declared, never read off a reporting flag.

**Not per-invocation.** A second argument to `invoke` would sit in a different position for
scalar, bound-input and inputless doors. A connection invoked by both a person and code keeps
using the principal port (`forPrincipal`) for the other caller — that door already exists and
already stamps its principal.

## Step 2 — list what the ledger holds (gap 3)

**Today.** `transitionFor(ref)` answers one ref; nothing enumerates. The app therefore keeps two
indexes of refs (its action log and its time-control log), and trimming them needs a guard so one
index does not `forgetTransition` a ref the other still reads.

**Proposed.**

```ts
runtime.transitions({ definition: refetch, instance: artifact.ref, effectStatus: 'verified' });
// → readonly ActionTransitionSnapshot[], oldest invocation first

createActionRuntime({ kinds, history: { keep: 200 } });
```

- `transitions(query?: ActionTransitionQuery)`, filters ANDed, all optional: `definition`
  (`DefinedAction` or `ActionDefinitionRef` — the two forms `offers()` already accepts), `binding`
  (`ActionBindingRef`), `instance` (exact string equality — the opaque value is compared, never
  parsed), `invocationStatus`, `effectStatus` (one status or a list). Order is **invocation
  order** — the ledger's insertion order, which is the order transitions are minted — and that
  order becomes a documented fact because step 5's "latest" means it.
- `history?: { keep: number }` on `ActionRuntimeOptions`. Absent: today's unbounded history.
  Present: when a transition becomes fully settled (both rails terminal — the rule
  `forgetTransition` already enforces), the oldest fully settled rows beyond `keep` are released.
  A pending row is never counted and never released. The rule lives in `TransitionLedger`, the one
  owner of "what may be forgotten", instead of in every app's trim loop.

**What "retention that knows a transition is still referenced" became.** The app's second index
existed because its context needed old transitions. Step 5 folds context **at settlement time**
(footprintjs's law: collect during traversal, never post-process), so a declared context never
reads history and eviction cannot change it. The remaining reference — an app's own display line
per transition — keys by the ref object (`WeakMap<ActionTransitionRef, …>`; refs are frozen
identities), which the platform collects for free. No reference counting, no pins: the design
removes the reason to hold a ref instead of adding a way to count holders.

## Step 3 — the effect is proven by a governed value (gaps 1 + 2)

**Today.** `verified` needs an evidence-bearing clause: non-empty `writes`, `goTo`, `verify`, or an
observable `observability`. An effect whose proof is a *new thing* (a dataset, a receipt, a
created record) has none of those, so the app named a state key that does not exist. Evidence is
`unknown`, recorded as given, governed by nothing.

**Proposed.**

```ts
const refetch = defineAction('data-panel.refetch-time-range', {
  does: 'Re-run the open time series’ tool over the time range the person set, and open the new dataset',
  invocation: 'scalar',
  settle: { evidence: { kind: 'data-panel.dataset-version' } },   // NEW; no fake `writes`
  needs: { window: { kind: 'data-panel.time-window' } },
  mutate: (input: RefetchInput) => refetchOnServer(input),         // returns the reply envelope
});
```

- `settle.evidence?: { readonly kind: string }` — "a verified settlement's evidence is a value of
  this kind". It is an **evidence-bearing clause** (`authoring.ts · hasEvidenceBearingSettlement`
  gains one line), so `verified` is admitted without a pretend state key. The coverage gate is
  untouched: still only from `verifiable`.
- **Governed at connect.** The kind joins `needs`/`produces` in the runtime's `kindsSeen`: unknown
  to a mounted catalog → the connect refuses; no catalog → reported in `kindGovernance().ungoverned`.
  Same law, one more declaration site.
- **Checked at settle.** When the catalog's record for the kind carries a `schema`, the verified
  evidence is validated through the input-validation resolver (self-validating, or the runtime's
  `inputSchemaAdapter`) — resolved once at connect, run in `TransitionLedger.settle` beside the two
  existing verified gates. A failing value refuses the `settle()` call with a teaching error and
  does **not** consume the terminal, exactly like the coverage gate. A schema this runtime cannot
  enforce is rejected at connect under `require-active` and carried under `disclosure` — the
  `inputSchema` precedent, word for word. No schema: the kind name is governed and the value is
  recorded as given.
- **Stamped.** `ActionTransitionSnapshot.evidenceKind?: string` and the verified arm of
  `ActionEffectSettlement` gain `evidenceKind` — present exactly when the definition declared
  `settle.evidence` and the effect verified. The value stays in `evidence`; nothing is copied into
  a `{ kind, value }` wrapper, because one fact must not have two places.
- Late settlements are quoted, never validated — the existing law (a late claim is a quotation,
  not an acceptance).

**Why `settle.evidence`, not `produces`.** See the vocabulary table: `produces` is the handler's
return (the walk carries it), and for the refetch the return and the proof are different values.
Where they are the same value (the panel's view-state actions return the view state and settle
with it), declaring both says two true things once each.

**The static-type half is deferred** (see NOT doing). This step makes the app's cast *safe* — a
value that reached a reader as `dataset-version` was checked against that kind's schema — but does
not make it disappear.

## Step 4 — settle when the action returns (gap 6)

**Today.** Every connection wires `onInvocation` → `await whenInvoked` → `settle(verdict)`. The
verdict is a property of the **definition** (every binding of the refetch settles the same way),
yet it is written per connection. And because the runtime closes even a synchronous return through
`Promise.resolve(produced).then(…)`, a synchronous action reads `pending`/`unverified` right after
`invoke()` returns.

**Proposed.**

```ts
settle: {
  evidence: { kind: 'data-panel.dataset-version' },
  onReturn: (outcome) =>                                   // NEW
    outcome.status === 'failed'
      ? { status: 'refused', reason: String(outcome.error) }
      : outcome.produced.status === 'refetched'
        ? { status: 'verified', evidence: { presented: outcome.produced.presented, control: outcome.produced.record } }
        : { status: 'refused', reason: outcome.produced.reason },
},
```

- `settle.onReturn?: (outcome) => ActionEffectSettlementInput | undefined`, where `outcome` is the
  `performed | failed` arms of `ActionInvocationSettlement<Output>` — `Output` inferred from
  `mutate` (an annotated `mutate` is not context-sensitive, so TypeScript infers it before
  `onReturn` whatever the literal's key order; a type test pins that).
- The verdict goes through the **one** settle funnel: coverage gate, evidence-bearing gate, step
  3's kind check, first-terminal-wins. An observer's own `settle()` after it is a late settlement,
  kept and quoted. `undefined` means "the return proves nothing"; the effect stays `unverified` for
  an observer or an external report.
- **Synchronous means synchronous, for definitions that declare `onReturn`.** A non-thenable return
  closes the invocation rail and runs the verdict before `invoke()` returns, so
  `transitionFor(ref)` reads `performed`/`verified` on the next line. Definitions without `onReturn`
  keep today's microtask close (**YOUR CALL** below on making that global).
- A throwing `onReturn` is instrumentation: routed to `onInvocationError`, the effect stays
  `unverified`, the application's return value and invocation status are untouched — the observer
  law.
- Not called for a preflight refusal: the runtime already settled that effect `refused` itself.
- Refused at declaration for `invocation: 'host'` — a host continuation runs the listener, not
  `mutate`, so there is no definition-owned return to judge.

**Why this does not break "handler completion never settles".** The invariant forbids the runtime
*inferring* `verified` from a resolved promise. `onReturn` is an **authored verdict**: the developer
writes, in the definition, what in the return counts as proof — and the verdict still has to pass
every gate a hand-wired observer's would. There is deliberately no shorthand (`onReturn:
'produced'`) that turns a return into evidence without an authored sentence.

## Step 5 — declared context (gap 4, reading gap 5)

**Today.** The app computes "the ranges that ride the next question" by hand: walk its own index,
read each snapshot, keep the newest verified refetch per view (`rootRef`), drop any the person
released. That fold is the context engine's job — "what did the person set with a control, still
standing" is outcome context — and the library had the facts but no door.

**Proposed.**

```ts
const ranges = runtime.declareContext({
  id: 'data-panel.time-ranges',
  from: [refetch],                                  // must declare settle.evidence — one kind per context
  key: (value) => (value as RefetchedArtifact).control.rootRef,
  identity: (value) => (value as RefetchedArtifact).control.ref,
  fold: 'latest-per-key',
  releasedBy: { action: releaseRange, identity: (evidence) => evidence as string },
});

ranges.entries();
// → [{ context: 'data-panel.time-ranges', kind: 'data-panel.dataset-version',
//      key, identity, value, transition, binding, attribution }]   oldest invocation first
ranges.skipped();   // transitions a reader threw on or answered a non-string — counted, never dropped
ranges.retire();
```

The laws, each one a test:

1. **Declared, one live context per id** (the `declareSurface` precedent): a second live `id`
   refuses; `retire()` is idempotent and frees the id.
2. **One kind per context.** Every `from` definition must declare `settle.evidence`, all the same
   kind — the `key`/`identity` readers are written against one shape. A definition without it
   refuses at declaration with the sentence "a context folds governed evidence; declare
   `settle.evidence` on …".
3. **Only verified effects enter.** Pending, refused and abandoned transitions never do; a newer
   *pending* refetch does not displace an older verified one.
4. **"Latest" means latest invoked**, not latest settled. If an older refetch settles after a newer
   one, the newer one still stands — the person's order of intent, which is the ledger's order
   (step 2).
5. **A release names an identity.** A verified `releasedBy.action` transition removes the entry
   whose identity it names, if that entry's transition was invoked before the release. It never
   resurrects an older entry for the same key: releasing the current range leaves the key empty,
   exactly what the app's hand-written fold does.
6. **Folded at settlement, once at declaration.** Declaring folds the retained history once, in
   invocation order; afterwards every verified settlement updates the fold as it lands. Eviction
   (step 2) cannot change an entry. An entry's `transition` may later read `undefined` from
   `transitionFor` — the ref is identity, not a promise of retention.
7. **Readers are app code, isolated.** A `key`/`identity` reader that throws or answers a
   non-string skips that transition into `skipped()` with the reason (the `channelGaps()` law: a
   miss is a counted fact). The settlement itself is never affected.
8. **Who set it rides along.** `attribution` is the transition's (step 1) and `binding` is the
   control. A downstream reader writes "set by the person with the time control" from
   `attribution.principal === 'user'` + `binding.node`; the library never writes the prose.

`entries()` is data (frozen, structured-clone-safe), shaped to go straight into the next turn.
Serving it to a model — as a prompt block, an MCP resource, a `whats_here` field — is a later
serve-side adapter, not this step.

---

## Backward compatibility (2.x, one minor)

Every change is opt-in by a new declaration, with two deliberate exceptions, both additive fields:

| change | who sees it without opting in | risk |
|---|---|---|
| `invokedBy` | nobody — absent keeps `ref.principal: 'unknown'` | none |
| `snapshot.attribution` | **every snapshot reader** — a new always-present field | an exact `toEqual` on a whole snapshot fails; property reads do not. Precedent: 1.7.0 stamped every session transition the same way. In-repo pins are loosened deliberately and listed in the commit. |
| `transitions()`, `history` | nobody | none |
| `settle.evidence` | nobody — `produces` is not reinterpreted, old definitions keep their gates | none |
| `ActionInputSchemaContext.source` gains `'evidence'` | an app `inputSchemaAdapter` with an exhaustive `switch` on `source` | compile-time only, only for adapter authors; named in the CHANGELOG |
| `settle.onReturn` | nobody — the synchronous close is scoped to definitions declaring it | none |
| `declareContext` | nobody | none |

Root barrel additions (`ActionTransitionQuery`, `DeclaredContextDeclaration`,
`DeclaredContextEntry`, `DeclaredContextHandle`, `DeclaredContextSkip`) go through
`test/barrel-surface.test.ts` with the answer to "why the root, and not a subpath at 3.0?": the
whole Action Binding Protocol is served from the root until the 3.0 subpath decision, and splitting
one feature's types across two doors would be worse. Each capability adds a row to the CLAUDE.md
"it may already exist" table, keyed by the sentence a newcomer would say ("list every transition",
"say a person did it", "settle when the handler returns", "what the person set, for the next
turn").

## Build order

```
step 1  invokedBy + snapshot.attribution          (connection-builder, connection, settlement, types)
step 2  transitions() + history.keep              (transition-ledger, connection, types)
step 3  settle.evidence                           (definition, authoring, connection kindsSeen, transition-ledger, input-validation)
step 4  settle.onReturn                           (definition, connection invocation close)   ← needs 3's gate
step 5  declareContext                            (NEW declared-context.ts, connection wiring) ← needs 1, 2, 3
```

1 and 2 are independent and small; 3 before 4 so the first `onReturn` verdict already meets the
kind check; 5 last because it reads all three. One commit per step, each with its tests (a failing
test first, the correction neutralised to see it go red — the protocol doc's proof standard),
`src/action/README.md` rows for the new file and laws, and the capability-table row. Released
together as **2.6.0** once step 5 is green; the app then deletes its two indexes, its fold, its
fake `writes` key and its hand-wired settle observers, and fixes its refetch `produces` declaration.

## What this design does NOT do, and why

- **No `identity` / `supersedes` on the action.** Identity is read by exactly one consumer — the
  context's release matching — so it lives on the context declaration. `supersedes` is read by
  nobody: the fold is keyed by a declared key, and deriving a key from a parent chain would break
  the moment step 2 evicts a link (a lineage the library cannot see whole is a guess). The value
  already carries `parentRef` for any reader who wants lineage.
- **No typed kind map yet.** A static type for `evidence` needs the catalog to carry a TypeScript
  type per kind (inferring it structurally from a schema's `parse` return would work without
  importing any schema library) and `ActionRuntime` to become generic over the catalog — a change
  to the most-implemented interface in the protocol, for a benefit step 3 already half-delivers at
  runtime. A generic on `declareContext<V>()` alone would be a cast wearing a type parameter. It
  gets its own design once a second consumer wants it.
- **No `at` / clock.** The runtime has no clock today and the fold does not need one: order is
  invocation order. When something happened on a server is a value the server stamped (the app's
  `TimeControl.at` already carries it).
- **No `via`.** The transition's binding is the control. A free-form `via` string would be the app
  describing itself in a field the library cannot check.
- **No human inferred from `humanReporting`.** See step 1: reporting ownership is not identity.
- **No reference counting or pins for retention.** Folding at settlement removed the reason; a
  `WeakMap` covers display lines.
- **No folds beyond `latest-per-key`.** One consumer, one fold. `all`, `first`, a windowed fold
  wait for a consumer that needs them; `fold` is a string so they arrive additively.
- **No reinterpretation of `produces`.** The walk's carry law reads it as the handler's return;
  turning it into "the effect's evidence" would break plans silently.
- **No serving of context to a model in this packet.** `entries()` is the data; which serve surface
  presents it is a separate, smaller decision.

## YOUR CALL

1. **Synchronous close for every action, or only `onReturn` ones?** Globally, a non-thenable return
   would read `performed` on the line after `invoke()` for every existing synchronous action. More
   truthful; also a visible change to what every snapshot reader sees one microtask earlier. This
   design scopes it to `onReturn` in 2.6.0 and would make it global only at 3.0.
2. **`snapshot.attribution` always present, or only when not `'unknown'`?** Always is the session's
   rule and the honest one ("nobody claimed it" is information); absent-when-unknown avoids every
   whole-snapshot `toEqual` break. This design says always.
3. **`history.keep` default.** Unbounded (today) is the additive choice; a finite default would
   silently forget settled rows an app still reads by ref. This design keeps unbounded.

## Findings for the binding app (not library work)

- The refetch declares `produces: { kind: 'data-panel.dataset-version' }`, but its handler returns
  the reply envelope. Under the walk's carry law that declaration is wrong; after step 3 it becomes
  `settle.evidence: { kind: 'data-panel.dataset-version' }` and `produces` is either dropped or
  given the envelope's own kind.
- `settle.writes: ['panel.dataset']` names a key nothing writes; it exists only to pass the
  evidence-bearing gate and goes away with step 3.
