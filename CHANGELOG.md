# Changelog

## [1.7.0] - 2026-08-06

**A stamp that goes quiet while the thing it describes is still true is not a disclosure. It is a
disclosure that expired.**

Two halves of one gap, shipped together because either one alone is silent.

### `staleWrites` — someone has written what you are about to write

`staleReads` intersects the keys committed since your last look with what a control's outcome
DEPENDS ON. A control that simply *overwrites* a key correctly declares no read of it — so the
stamp is silent, by construction, on exactly the controls whose repeat does the most damage.

Measured off a real campaign: a person held a room between two turns. The control that holds a room
declares as its `writes` exactly the two keys that person moved. It was served with nothing on it,
twice, while the same reply's brief named those keys as changed — and a second room was booked.

```jsonc
// whats_here, the turn after a person used the same control
{"action":"board.hold-room","does":"Put a hold on a room for those nights",
 "staleWrites":["itinerary.roomHeld","itinerary.roomBookings"]}
```

`writes ∩ keysChangedSince` — the one intersection nobody was computing, from two facts the library
already held. Under every law the read side lives under: **key names only**, **declared by the app,
never inferred**, **presence-only** (an app that declares no writes serves byte-identical rows), and
**it refuses nothing**. It says a key this control declares it writes has moved. It does not say who
moved it, that your write would be wrong, or that this is a repeat.

`AvailableEdge.writes` now carries the declaration to the row, as a copy — the seam the serving
layer reads it from, and the same seam `reads` has always been read at. `hcifootprint/testing`'s
drift harness follows: `writes.serve` used to be a stated absence ("there is nothing to read at this
seam") and is now a real check, so an adapter that drops a declared write is caught at both seams.

### Staleness is carried until it is answered

The window is a delta since the caller's `sinceVersion`, and that advances every time the caller
looks. So a stamp described its condition for one turn and then went quiet while the condition held
— measured: present on the turn the key moved, absent two turns later at the same version in the
same world, and the fire landed on the third.

Both stamps are now **carried** until somebody answers them. What may count as an answer is the
whole of the design, and the rule is that **the library may only record what the caller
demonstrably did**:

- **`session.acknowledgeStale(actionId, keys?)`** — the door. It records that this caller said, of
  this control, that it has dealt with these keys having moved. It does not claim the caller read
  the value, understood the consequence, or decided well; none of that is visible from here.
  `{ cleared }` is what was actually being carried, never an echo of the request.
- **The agent firing that control** — it reached for the very control the stamp was on, with the
  stamp on its row. An act, recorded. Not an understanding, and nothing here says otherwise.
- **Nothing else.** Not another look — that is the defect, not the fix, and this library never
  serves a value, so it can never conclude that a value was read. Not a *person* using the control:
  a human's use is what CREATES staleness for a machine reader, and counting it as that reader's
  answer would delete the fact at the moment it became truest. Not a refused fire: an act the app
  turned away is not an act the caller got to make.

`session.carriedStale(actionId)` answers what is outstanding — a pure question; asking is never
answering. `session.carryStale(actionId, keys)` is the record that a stamp was SERVED, called by the
layer that hands the row over, so **what is carried is what was told**: a stamp nobody was ever
shown is not a thing anybody can be asked to answer for.

The reasoning, and the acts that were considered and refused, are in
[docs/design/staleness-is-carried.md](docs/design/staleness-is-carried.md).

**The honest prior, restated:** this is expected to put a fact on the row at the decisive turn. It
is not expected to move an outcome rate by itself — the read side shipped, was served on the exact
control the harm rows fired, kept its negative control silent, and the measured number did not move
by one row. Disclosure is what a library on this side of the boundary can honestly change.

### Offers, freshness, and one occurrence at a time

**A warning can be ignored. A required protocol step cannot be skipped silently.**

The measurement that motivates all three: in **20 of 33** residual-harm rows, the decisive warning
was on the exact control at the exact turn and the model fired anyway. Disclosure has a ceiling.
These are the mechanisms that let an integrator convert what this library already knows into
something a fire has to answer for — **opt-in in the one sense that can be checked: nothing here
refuses a fire, holds a row back, or changes what a word already on a row means, unless an
integrator declared a policy.** What a consumer who declared nothing gets is strictly ADDITIVE, and
additive is not byte-identical, so the additions are listed rather than waved at.

**What DOES move for a consumer who declared nothing.** Five things. Every one is a field or a door
APPEARING; no existing field changes meaning, and nothing new is refused:

- every `available()` edge carries an `offerRef`, so anything that snapshots or compares whole edges
  sees a new key (the Mode B row a MODEL reads does not: it carries `offerId` only where a fire will
  be asked for one, so the served bytes are unchanged);
- every `TransitionRecord` carries an `attribution` stamp;
- `acknowledgeStale`'s return grew an `acknowledgementId` beside the `cleared` list;
- `Session.observeEffect` / `observationsOf` / `acknowledgementsDropped` / `offersDropped` and the
  `AttributionBasis` word `'external-report'` are new surface nothing reaches unless you call it;
- a session that calls `acknowledgeStale` more than `maxAcknowledgements` (500) times warns once and
  begins dropping its oldest receipts — the one NEW WARNING that can reach a consumer who declared no
  policy, and it can only reach one that used that door five hundred times.

The offer ledger's eviction warning is **not** in that list, deliberately: it is said only to a
session that requires a citation somewhere. That ledger fills from the read path on every session, so
warning unconditionally would tell an integrator to tune a mechanism they never switched on, about a
refusal that cannot reach them. Evictions are still COUNTED everywhere (`session.offersDropped()`).
The acknowledgement ledger is the other way round for the same reason: nothing enters it except
through an explicit call, so its warning can never arrive unrequested.

#### The offer contract — a name for the row that was served

`available()` handed back a version and `fire()` took an `expectedVersion` the caller typed in by
hand, so nothing joined a fire to the ROW it was planned against. Now every served edge carries an
**`offerRef`** (`offerId`, `actionId`, `node`, `stateVersion`, `structureVersion`), and `fire()` may
cite `{ offerId }`.

```ts
const edge = session.available().edges.find((e) => e.affordanceId === 'ledger.settle')!;
session.fire('ledger.settle', { source: 'agent', offerId: edge.offerRef!.offerId });
```

**It is a CITATION to a session record — not a secret, not a capability.** It is printed on the row
a model reads; holding one authorizes nothing, and every gate (guard, payload, disabled,
materialisation, human approval) runs exactly as it did. `session.offerFor(offerId)` reads back what
was true when the row went out: the guard keys it could evaluate, the ones it could not, and the
declared reads/writes it was already carrying an unanswered staleness for.

**Bounded, and honest about the bound.** The ledger is written from a read path, so it has a cap
(`SessionOptions.maxOffers`, default 500) and drops the oldest. An offer's id is minted from its
FACTS, so re-serving an unchanged row hands back the same id — a session that looks ten times mints
one offer per action, not ten. Evictions are counted (`session.offersDropped()`) on every session and
warn the integrator once **where citations are required** — the only place a dropped one costs
anybody anything.

A fire whose citation this session cannot answer with is refused `OFFER_NOT_ON_RECORD`, and `why`
says which of three things happened: `'evicted'` (real, and this library's own bound dropped it),
`'other-action'` (real, retained, and minted for a DIFFERENT control — `offeredFor` names it), or
`'unknown'` (no such id was ever minted here). Three words rather than one, because only the last is
the caller's mistake and telling somebody their honest citation was forged is the failure all three
exist to prevent.

#### Freshness policy — what a control does when the world moved under its row

Per action (`ActionDef.freshness`) or once for the session (`SessionOptions.freshness`), on four
axes, each answered `'disclose' | 'require-ack' | 'refuse'`:

```ts
'settle-claim': {
  does: 'Settle the claim', reads: ['claim.total'], writes: ['purse.left'],
  freshness: { readChanges: 'require-ack', writeChanges: 'refuse' },
}
```

- **`guardChanges`** — a key this control's availability was judged on has been committed since the
  offer (it still passes; a guard that stopped passing is `GUARD_FAILED`, which fires first).
- **`readChanges`** / **`writeChanges`** — a declared read/write has been committed since the offer.
- **`positionChanges`** — the cursor is on a different page, or the served surface has changed.

`'disclose'` is the default on every axis and is **exactly today's behaviour**. `'refuse'` returns a
typed `WORLD_MOVED` naming the axes and the KEYS — never a value, never a conclusion.
`'require-ack'` returns `ACKNOWLEDGEMENT_REQUIRED` until the caller performs the step. An enforcing
axis requires the fire to cite its offer (`OFFER_REQUIRED`): there is nothing to compare a fire
against without one, and judging against "now" would grade every uncited fire as fresh.

#### `acknowledgeStale` is now a referenceable transition

It writes an append-only **`StaleAcknowledgement`** (`acknowledgementId`, `actionId`, `offerId`,
`principal`, `keys`, `acknowledgedAtStateVersion`, `timestamp`), readable through
`session.acknowledgements()`, and hands the id back beside the `cleared` list it always returned.

```ts
const { acknowledgementId } = session.acknowledgeStale('ledger.settle', ['claim.total'], { offerId });
session.fire('ledger.settle', { source: 'agent', offerId, acknowledgementId });
```

**Said plainly, because the name invites the bigger claim: this records that a protocol step was
PERFORMED.** It is not evidence that a model read a value, understood a consequence, or decided
well — this library never serves a value, so it cannot know any of that, and no field on the row
says otherwise. A row stops authorizing the moment `stateVersion` moves again
(`ACKNOWLEDGEMENT_STALE`); it is never edited or rewritten, and stays on the ledger as what it was.

**Bounded, and honest about the bound**, because that loop writes one row per turn and an unbounded
receipt trail is a session-lifetime leak on exactly the protocol this feature asks for. The ledger
keeps the most recent `SessionOptions.maxAcknowledgements` (default 500) and drops the oldest whole —
never editing or retracting one. Evictions are counted (`session.acknowledgementsDropped()`), warned
once, and a fire citing a dropped receipt is refused `ACKNOWLEDGEMENT_REQUIRED` with `why: 'evicted'`
and a sentence that says so: a step this caller really did perform, dropped by this library's own
limit, is never reported as a pointer they made up.

#### Single-flight — the mechanism the repeated-payment row demanded

```ts
'pay-invoice': {
  does: 'Pay the invoice', confirm: true, writes: ['invoice.paid'],
  concurrency: { mode: 'single-flight', scope: 'payload' },
}
```

Default is `'parallel'` — what every release before this one did. Under `'single-flight'`, a fire
made while a prior occurrence is unresolved is refused `PRIOR_FIRE_PENDING`, carrying that fire's
`pendingTransitionId` and the doors that can settle it. `scope` is `'action'` (default), `'instance'`
(one per repeats card) or `'payload'` (one per identical input, compared over the same canonical
rendering the approval gate uses — an input this library cannot render faithfully is treated as the
SAME one, because an unprovable difference is not a difference here).

**It clears on real settlement and on nothing else.** Not a timeout — a clock is not evidence, and
"it has been a while" is evidence neither of done nor of failed. Not another look. Not the caller
reporting the first one finished. **Four doors settle a fire, and `howToSettle` names all four:** the
handler resolving or throwing, the app's state report landing, `reject()`, and — for an effect this
client cannot see — `session.observeEffect(transitionId, …)`. And it never refuses reality: the app
self-reporting motion it already performed (`invoke: false`) is not this session firing twice.

Both new gates sit after every capability refusal and **before the human-approval gate**, under that
gate's own law — nobody is sent to approve an action this session is about to turn away. The served
row carries the verdict too (`heldByPriorFire`), so Mode B stops asking a person to confirm a fire it
will refuse as a repeat.

#### Also

- `TransitionRecord.offerId` records the citation a fire made, whether or not anything enforces —
  the join from the transition log to the offer record and on to any acknowledgement of it.
- `AvailableEdge.mustCiteOffer` / `heldByPriorFire` are presence-only and absent by default, so a
  session that declares neither policy serves rows that gained nothing but the `offerRef` listed
  above. The Mode B row carries an `offerId` only where a fire will be asked for one.
- Both authoring doors — `buildNavigationGraph` and mount-declared actions — refuse an unknown
  freshness axis, an unknown answer, an unknown concurrency mode or scope, and a `scope` under
  `mode: 'parallel'` (which scopes nothing). An enforcement rule that is silently ignored is the one
  failure mode a safety feature must not have.

### A warning can be ignored. A required step cannot be skipped silently.

**Disclosure has a measured ceiling.** In a preregistered campaign, 20 of 33 residual-harm rows had
the decisive warning on the exact control at the exact turn — and the model fired anyway. Everything
below turns something this library already KNEW into something an integrator can enforce. Every one
of them is off by default, and the default half of each test file exists to prove that a session
which declared nothing refuses exactly what it refused before — the additions it does get are the
five listed at the top of this release, and they only ever ADD a field.

#### Attribution — every transition says which rung filed it, and what that is worth

`updateState()` has always placed a state delta on a fire through a ladder: an explicit
`transitionId`, a report from inside the handler's own call, the app's own wrapped function, a unique
effect signature, the oldest pending fire, an explicit stimulus, and a floor that names nobody. Every
rung wrote the same shape of row — so a settlement computed from ARRIVAL ORDER and one the app
NAMED were, on the wire, the same fact.

Every transition now carries an **`attribution`**: `{ principal, basis, certainty }`, over a closed
ten-word `AttributionBasis` and a table that is total by construction.

```jsonc
// the same fire, closed two different ways
{"basis":"named-by-report","certainty":"observed","principal":"agent"}
{"basis":"queue-order",    "certainty":"inferred","principal":"agent"}
```

`certainty` grades **the association** — never an identity and never a value. `'caller-asserted'` is
`'observed'` because this library watched the call come through its own door; who was behind it is
the caller's word, which is what ASSERTED is doing in the name. A fire's stamp folds with its
settlement's under one rule: **the weakest link wins, and among equals the settlement's own rung
takes the field.** So a fire closed by FIFO reads inferred whatever door it came through, and an
anchor's guessed action stays inferred however precisely the app names the row afterwards. On a
stimulus nobody attributed, `cause.principal` keeps its honest `'system'` default and
`attribution.principal` says `'unknown'` — the old bytes untouched, the true thing in the new field.

#### `attributionPolicy: 'strict'` — the fire stays unresolved rather than falsely closed

Opt-in. It turns off exactly the two rungs that are guesses: **no FIFO settlement** (arrival order is
not evidence), and **a signature association only when nothing else pending could even partly
explain the delta**. An unplaceable report becomes an `'unknown'` stimulus, the motion is still
recorded, and the fire stays visibly pending (`session.pending()`, `awaitingSettlement()`). That is
the trade, and it is why it is opt-in: an app whose tap passes `transitionId` loses nothing at all.

#### `principalPolicy` — who may act, whose choice it is, whether a yes is required

Three facts, three fields, and this library will not fold them into one word:

```ts
'transfer-funds': {
  does: 'Transfer the balance', confirm: true,
  principalPolicy: { mayInvoke: ['human'], decisionOwner: 'human', requiresHumanApproval: true },
}
```

- **`mayInvoke`** (actor identity) is the only half enforcement gates. With
  `SessionOptions.enforcePrincipalPolicy`, a fire from any other principal returns a typed
  `PRINCIPAL_NOT_ALLOWED` **naming the kinds required** — an agent told only "no" tries again; an
  agent told "a human must do this" hands it over.
- **`decisionOwner`** (decision ownership) is disclosure and is **never** read by enforcement. An
  owner is not a permission: making "this is the customer's choice" silently mean "the agent is
  forbidden" would be a refusal nobody wrote. Say `mayInvoke: ['human']` and mean it.
- **`requiresHumanApproval`** (consent status) widens the EXISTING approval gate to an action that is
  not `confirm: true`. It mints no new refusal word, and it never arms the gate by itself — a
  per-action switch that did would refuse fires through a port whose own reading of "is this session
  gated?" is false, and the refusal could never be answered.

A policy names an ACTOR (`'human'`); a record files an act under a PRINCIPAL (`'user'`). Writing
`mayInvoke: ['user']` is refused at both authoring doors with the correction, rather than silently
locking a person out of their own control. `AvailableEdge.mayInvoke` / `decisionOwner` and the Mode B
row carry the declaration whether or not this session enforces it.

#### Principal-bound ports — say who you are once, at the boundary

`session.asAgent()`, `asHuman()`, `asSystem()` carry `fire`, `sync` and `reportGap` with the
principal already on them. It is **the same assertion, not a stronger one**: a port fire stamps
`'caller-asserted'` exactly as `fire({ source })` does, because recording ergonomics as evidence
would launder convenience into proof. `fire({ source })` stays fully supported. No human-side
authority door (`approveAsk`, `alwaysApprove`, `revokeAsk`, `declineConfirm`) is on a port, ever —
and neither is `updateState`, whose `principal` means "this motion was world-initiated" and would
turn every port report into a stimulus that closes nothing.

#### `observability` + `effectPolicy` — how would anyone SEE that this happened

`ActionDef.observability` is the app's own answer: `'state-delta' | 'postcondition' | 'navigation' |
'external' | 'unobservable'`. Declared, never inferred. With
`SessionOptions.effectPolicy: { highEffectRequiresVerify: true }`, a high-effect action whose effect
nobody could check is refused `EFFECT_NOT_VERIFIABLE` before it runs, with `needs` naming the missing
half.

**`'state-delta'` deliberately does not satisfy it.** `effectVerified` checks that the declared write
KEYS appeared; key presence is not value correctness, and a handler that wrote `orderId: null`
satisfies it exactly as a real order does. Nothing here claims otherwise — which is why the strongest
requirement the policy can make is a postcondition the app itself declared. Two coherence rules are
refused at authoring, enforcement or not: `'postcondition'` needs a `verify`, `'navigation'` needs a
`goTo`.

#### `session.observeEffect()` — the door for what this client cannot see

```ts
session.observeEffect(transitionId, { source: 'stripe-webhook', status: 'performed', evidenceRef: 'evt_1P2x' });
```

A payment clears at a processor, a job finishes on a queue. The browser sees none of it, so the
honest answer used to be `'unobservable'` for ever. **What is recorded is the REPORT, never the
fact**: a source the app named, a status, and a REFERENCE this library never fetches, dereferences or
interprets. The first report settles the fire exactly as a state report would; a later one is
APPENDED to `TransitionRecord.observations` and answers `settled: false` — the receipt taken at rest
is never rewritten. It writes no state: an effect nobody here can see is exactly the effect whose
state consequences this library has no business inventing, so `effectVerified` stays honestly
`'unobservable'` and the app's own `verify` still governs.

**And the served answer says who answered.** `effectStatus: 'performed'` is the same word for a
handler this library watched run and for a sentence handed in about a processor it cannot see, so
`did_it_work` (and `port.settledAnswer`) now carry `settledBy: 'external-report'`, `reportedBy` (the
source the app named), `evidenceOnRecord` when a reference exists, and one authored
`settledByMeans` sentence saying a report is not proof. **The `evidenceRef` itself never crosses** —
this library does not follow it, so quoting it would dress a pointer up as a check. A settlement
nobody reported on serves exactly the bytes it always did.

Closing a fire this way also folds `basis: 'external-report'` onto the row (certainty `'observed'` —
it grades the ASSOCIATION, which the app named through this library's own door, and never the claim
the outside source made). A report landing on a record ALREADY at rest folds nothing: it closed no
question, so it must not describe itself as having.

#### Also

- `hcifootprint/testing`'s drift harness follows: `principalPolicy` and `observability` join
  `DECLARABLE_ACTION_FIELDS`, so a source adapter that drops either is named at the seam that lost
  it. The conformance fixture declares `observability: 'external'` on purpose — a coupled word would
  turn "this source drops `verify`" into a compiler throw, and a checker that crashes on the defect
  it exists to report names nothing.
- `FireResult['reason']` and `GapRecord['rejectionReason']` grew by exactly `PRINCIPAL_NOT_ALLOWED`
  and `EFFECT_NOT_VERIFIABLE`, in lockstep, and no existing word changed meaning. Route the first to
  your audit sink (a security row, not missing capability); the second is an app's missing
  declaration, and belongs to whoever owns the graph.
- **Knowingly carried forward, so the next reader does not reopen it as an oversight:**
  `EffectStatus` still contains `'refused'`, which also reads as an authority word elsewhere.
  Renaming it is a breaking change to a field every consumer branches on, for a collision that has
  never produced a wrong answer. `ExternalObservation.status` mirrors the same two words **on
  purpose** — they are the two answers a settlement has, and a third vocabulary for one fork would be
  worse than the echo.
- The whole law, including the alternatives that were considered and refused, is in
  [docs/design/attribution-authority-and-evidence.md](docs/design/attribution-authority-and-evidence.md),
  with the reader-facing page at `docs-next` → Actions → *Who did it, who may, and how you would
  know*.

## [1.6.0] - 2026-08-06

**A UI action already knows almost everything about itself. Nothing was writing it down.**

An app registers a handler so an agent can call it, and declares an anchor so an agent can find
the control. Both of those are one-directional today: the handler runs when the agent fires, the
anchor is a locator the agent aims at. Meanwhile the same button is being clicked by a person all
day, through the app's own `onClick`, and none of it reaches the record — the guard that was open
at that moment, what came back, what happened on screen a beat later, or that it happened at all.

### `contextful(fn, opts?)` — turn a UI action into a contextful action

```ts
import { contextful } from 'hcifootprint';

const addToCart = contextful(shop.add, {
  watch: true,                      // listen at the anchor while this action runs
  anchor: () => buttonRef.current,  // a getter: nothing reads the DOM until the session attaches
  include: ['qty'],                 // the VALUE allowlist — nothing else ever carries values
  redact: app.redactor,             // your policy, the last word on every value that survives it
});

session.registerActions('catalog', { handlers: { 'add-to-cart': addToCart } });
// the agent's door:  session.fire('catalog.add-to-cart', { source: 'agent' })
// the human's door:  <button ref={buttonRef} onClick={() => addToCart({ qty: 2 })}>
```

Both doors now land in one **capture envelope**, on `TransitionRecord.captured`:

- **before** — the cursor, and the guard READ-KEYS with how each one read (`held: true | false |
  'unevaluated'`). Names and outcomes; the values stay in your app.
- **after** — how it came to rest: `effectStatus`, `outcome`, and how long it took.
- **failure** — the error's CLASS, always. Its message only if you allowlist `ERROR_MESSAGE`,
  because messages carry app data.
- **sensed** — what the anchor saw while the action was in flight: an event trail
  (`{ type, targetRole, targetTag, at }`), a count of DOM changes, and — only when your own
  declared `expect` matched one — `effect: { status: 'observed' }`.

**The sentence this is for: the anchor is bidirectional.** The same declaration that lets an agent
actuate a control lets the library listen at it. One declaration, two directions.

### The human's call settles exactly like the agent's

A direct call is recorded **record-only** (`invoke: false` — the browser has already run your code,
and a fire that also invoked would run one click twice) and then the settlement waits for *your*
function: it goes through the same completion and failure paths an agent's fire does, verify
contract and all. So a person's click on a no-writes action now reads `effectStatus: 'performed'`
instead of `'unobservable'`, and an async handler holds its own row open until it resolves.

**Severable, in the strong sense.** Delete the wrapper and the app behaves identically: every
argument is forwarded, the return value comes back untouched, a throw is rethrown unchanged — and a
fire the graph REFUSES still runs your function (the refusal is on the ledger; your button is not
the library's to break). A wrapped handler no session registered is a plain call.

### `contextful.sense(anchor)` — the rung below a registered handler

For an app with no handler to wrap: the anchor alone is enough to see that a person acted.

```ts
const release = session.sense('catalog.add-to-cart', contextful.sense(() => buttonRef.current));
```

A **trusted** click inside it opens a record-only fire stamped `cause.inferred` — a listener saw a
click and nothing more, and the record says so. An `element.click()` from an agent is not a person
and is never recorded as one.

### Four laws, each with a test named after it

1. **Boundary.** Key names and event types by default; a value crosses only through `include`, and
   only after your `redact` has seen it. A redactor that throws fails CLOSED. A direct call's
   argument is recorded as its **allowlist projection**, never raw — and a direct call's return
   value is not captured at all: it came back to your code, not to an agent that asked for it.
2. **Two-string firewall.** Everything captured is DATA channel. No captured string is ever composed
   into agent-facing prose — not `contextBrief()`, not `groundTruth()`, not a tool description. A
   `role` attribute containing "IGNORE PREVIOUS INSTRUCTIONS" rides the record and reaches no prompt.
3. **Sensing is evidence, not proof.** Listener-derived causality is stamped `association:
   'inferred'` and carries the correlation rule ON the record: *an event or change delivered between
   the fire and the end of the task it came to rest in.* Anything outside that window is **stimulus**
   — delivered to your `onStimulus`, never filed as part of the action.
4. **The blind spot stays honest.** An anchor may say `effect: 'observed'` only when your own
   declared expectation matched an observed change, and the predicate is handed name-class facts
   (`kind`, `attribute`, `targetRole`, `targetTag`, `at`) — never an element and never a value. The
   settlement's own `effectStatus` is NOT upgraded: a receipt taken at rest is never rewritten, and
   value-CORRECTNESS remains out of scope and a reported limitation.

### Budgets, said out loud

A virtualized list under an anchor can produce thousands of changes for one action. Per invocation
window: **50 changes examined** (past that, `changesDropped: n`), **200 events retained** (past that,
`eventsDropped: n`), and a trail longer than **20** rides `by-reference` — the record says
`{ shape: 'by-reference', count }` and `session.sensedTrail(transitionId)` hands over the whole
thing (the newest 20 oversized trails are kept). Honest degradation, never silence.

### SSR, StrictMode, and the DOM it never reaches for

The anchor port is declared structurally (`src/contextful/anchor-port.ts`) exactly as the sensor's
is, so `contextful()` at module scope on a server touches nothing: the getter runs when the session
attaches, and the observer is reached through the element you handed in. Anchors are refcounted per
(action, element), so a React StrictMode double mount attaches **one** listener set and the first
unmount does not silence the survivor.

New exports on the root entry: `contextful`, `ERROR_MESSAGE`, and the types `ActionCapture`,
`ActionExpectation`, `CaptureBefore`, `CaptureAfter`, `CaptureFailure`, `ContextfulOptions`,
`DirectPrincipal`, `GuardRead`, `SenseDeclaration`, `SensedChange`, `SensedEffect`, `SensedEvent`,
`SensedSummary`, `SensedTrail`, `AnchorElement`, `AnchorSource`, `AnchorDocument`, `AnchorView`.
New session doors: `session.sense(actionId, declaration)` and `session.sensedTrail(transitionId)`.
Nothing existing changed shape: a plain handler records exactly what it always did.

---

**A benchmark pointed a token counter at the serving layer, and three things it found were ours.**

Measured on a synthetic 60-page app declaring 57 journeys, served through `serveToAgent`. Not
opinions about scale — bytes, from the port's own output.

### `whats_here` lists the journeys you can START from here

The reply used to carry every journey the app DECLARES, wherever its first step lives. On that app
the `journeys` array grew **382 → 8,651 bytes** across the axis while the rest of the position block
did not move at all: 100% of the growth, served every turn, describing flows that cannot be started
from where the model is. It now lists the ones whose first step is available here — the same
on-demand rule this port already applied one level down, where steps arrive only after a journey is
entered.

The signal is `AvailableJourney.entryAvailable`, which the session already computed and the serve
layer dropped. **Not** `preconditionPassed`: at that cursor 56 of the 57 journeys passed their
precondition (one declaring none passes trivially) and 2 had an available entry.

An omission is disclosed on the row that omits it, so the reply carries **`journeysElsewhere: n`**
and one sentence saying the list is scoped to a position — not to permission, and not to the whole
app — plus the way through (`routeTo` names the declared hops to the page a journey starts on). A
silently shortened list is a worse failure than a long one. The journey you are currently INSIDE is
always listed, whatever its entry says: a flow that vanishes from the list reads as a flow that
ended. `session.availableJourneys()` still answers for every declared journey — this scopes what the
model is SERVED.

### `serveToAgent(session, { journeyTools: 'single' })` — one journey tool instead of N

Opt-in, and the default is unchanged byte for byte. Today one tool is minted per declared journey;
at 57 journeys that array was **79,199 bytes, 85% of it two authored constants repeated 57 times** —
a byte-identical step schema and the same usage sentence. The per-journey information content is the
authored `does`: 21–121 bytes of a ~1,331-byte marginal cost.

With `'single'` there is one `<graph>.journey` tool taking `journey: '<id from whats_here>'`
alongside the arguments it already took — the shape `do_action` has always had for actions. Journey
discovery moves to the result channel, which is where this port already puts steps. The array stops
depending on how many journeys an app declares, so it is byte-stable across apps and not merely
across turns.

**What is not known, and why it is opt-in:** whether a model SELECTS as well from one generic tool
plus a list as it does from N named, described tools is **unmeasured**. That is a tool-selection
quality question, not a byte-count one, and it is being measured on a task grid before any default
moves. Switching modes is breaking for a host matching on `<graph>.journey.<id>` names — those names
are answered `UNKNOWN_TOOL` with the list that does exist, never routed silently.

### A warning when nothing holds a high-effect agent fire

An expert integrator put the human in the loop where it was easiest to see — `confirmHighEffect` on
one serving port, an approvals set inside one chatbot — and a second consumer holding the SAME
session placed a real order with no card raised and no record that an approval had been skipped.
Both gates were properties of a DOOR. The session-level gate (`requireHumanApproval`) does travel,
and it was simply never declared.

So on the FIRST high-effect fire from principal `'agent'` with no `askId` on its record, on a session
that never mentioned `requireHumanApproval`, the session says so once through its own `onWarn` sink —
naming the action, the option, and the fact that this one executed with nothing holding it.

Not a refusal, not a new field, not a changed default. The audit trail already existed (a high-effect
`'agent'` fire with no `askId` is exactly "an agent did this and nobody approved it"); what was
missing was anyone telling the integrator they were in that state. It stays quiet for a fire the app
reports about itself (`'user'`/`'system'`, `invoke: false`), for a fire a human answered, under
enforcement — and for an app that wrote `requireHumanApproval: false`, which is a policy stated
rather than a policy never considered.

### `revokeAsk(askId, { by })` — the ask book's third word

**A person could not take back a yes they had already given.** `declineAsk` refuses an answered
card ("a decision is never overwritten" — right, and staying that way), so the ordinary human act
of changing one's mind before the thing happened had no door: a withdrawal was caught only by an
app's own rules and was invisible on the served surface, which kept holding — and honouring — a
permission its own person had taken back.

`revokeAsk` withdraws an approved, **unspent** yes. Append-only, like everything in the journal:
the `'approved'` receipt is never rewritten; the withdrawal is a NEW `'revoked'` row referencing
the askId (principal, timestamp, `by`), and the ask book carries the fact as data
(`AskStatus.revoked: true`, beside the `answer` it does not touch).

The gate's law grows one word: a usable yes is now *answered-yes AND not revoked AND not spent*. A
fire that presents a withdrawn pointer refuses **`APPROVAL_REVOKED`** through every door — the raw
`fire()`, the serving port (which never presents a revoked pointer as usable, so the refusal
teaches the specific word instead of a blank `APPROVAL_REQUIRED`), and a flat session.
`did_it_work` answers the card `'approval-withdrawn'` (paused, not failed — and never "go and
perform it", which the gate would refuse forever), and `groundTruth()`'s FACTS block says "The
human withdrew their approval" instead of "Approved by the human, not yet done".

The boundaries are typed refusals, not throws: an unanswered card refuses `REVOKE_UNANSWERED`
(decline is the right verb, and the refusal says so); a spent yes refuses `ASK_ALREADY_SPENT`
(revoking cannot un-fire the past — the `'used'` row stays the honest record); a declined or
already-revoked card refuses `ASK_ALREADY_ANSWERED`. And only the human side revokes: the door
stamps `principal: 'user'` like its siblings, and an honest relay that names any other principal
is refused `WRONG_PRINCIPAL` — an agent must never be able to withdraw a human's decision, in
either direction.

### `reads` — the read side of an effect, and the staleness stamp it makes possible

**An app could say what a control CHANGES and never what it is ABOUT.** So a session that knew a
key had just been written could not say which of the controls it was offering that change was
about. Measured on a real campaign against a live model: the surface disclosed `user push changed:
claim.total` in one field and offered `ledger.settle-claim` in the next, and the reader joined the
two by eye — which is to say it did not. Every substrate lost that scenario; the one that
disclosed the most lost it too. The missing piece was vocabulary, not disclosure.

`Effect.reads` / `ActionDef.reads` is a list of state key NAMES an action's outcome depends on —
declared beside `writes`, in the same shape, under the same law. **Not the guard**: guard keys are
the precondition read set (whether the control is on offer at all) and are already served as
`evidence`. These are the keys the outcome is computed FROM — a "settle the claim" button guarded
on `claim.stage` may compute its amount from `claim.total`, and only the app knows that.

The library then makes the join it could not make before. A `whats_here` row carries
**`staleReads`**: the declared reads ∩ the keys committed since the caller's `sinceVersion`, from
`session.keysChangedSince(sinceVersion)` — one derivation, lifted out of `contextBrief` so the
prose and the data can never disagree about a key. Presence-only, names only, and it **refuses
nothing**: the stamp says a key you depend on was written in this window, never that the value
differs, never that firing would be wrong. An app that declares no `reads` serves byte-identical
rows; a declared read nothing has written serves no key (`staleReads: []` would be manufactured
reassurance on every row of every reply). `ConfirmWillDo.reads` puts the same claim on the card the
**person** reads, because approving "settle for the amount on the claim" is approving a lookup.

**Declared, never inferred** — not scanned out of a handler, not promoted from a guard, not guessed
from a write. Which keys matter is meaning, and meaning stays on the app's side of the seam. A
version that inferred would score better on the family that motivated this, and is refused.

### `settleWith` — the settlement pointer, as something a machine can route on

**A pending fire's instructions named the door out in prose, and a projection cannot route on a
sentence.** The `pending` arm has always answered with `howToSettle`: call `did_it_work` with this
transitionId, and do not perform the action again. The door is real and this port publishes it
unconditionally — but a consumer that re-serves this surface into an action space of its own reads
the tool ARRAY, wires what it finds, and silently drops a door mentioned only inside a string. The
failure then surfaces nowhere near the drop: an agent holding an unsettled high-effect fire, told
not to repeat it and given no way to settle it, repeats it several turns later. That was measured,
19 rows of it, and it is a drop the library could not otherwise see happening to it.

The prose stays byte-for-byte what it was, and **`settleWith: { tool, arg }`** rides beside it on
the same `pending` arm: the tool name this port publishes, and the property its schema requires.
Nothing new is computed — the id to put in it is the `transitionId` already on that result. A
consumer that wires it can settle; one that cannot now has a field to fail on.

### `priorFireUnsettled` — the fact under "do not perform the action again"

**The advice lived for exactly one result.** The next `whats_here` served the control back looking
like a fresh one, with nothing on the row recording that a fire of it was still out there — though
the session was holding the latch the whole time. So a repeated high-effect fire two turns later
was, from the row's side, indistinguishable from a first.

A `whats_here` row now carries **`priorFireUnsettled: '<transitionId>'`** when this session holds
an open latch for that action — the most recent one, since that is the fire a reader is asking
about. **It refuses nothing**, and that is the design: refusing a repeat would be this library
deciding that repeating is wrong, and there are legitimate retries — a genuinely lost fire is one,
and only the caller can tell. State the fact, name the id so the settlement door can be asked,
leave the decision. The stance `enabled: false`, `humanDecides` and `busy` already take on that
same row.

## [1.5.0] - 2026-08-02

**A route table with names in it is a thing somebody typed twice. The router already has the
tree; it just never says what anything is called.**

`fromRoutes` reads a FLAT table whose keys ARE the page names — which is exactly right when you
are writing the table for this library, and exactly wrong when the app already has a router. A
real route config is nested (addresses compose through `children`), it has index routes and
layout routes, and nowhere in it does anybody write down what a screen is *called*. So an app
with a router had to hand-copy its own tree into a flat table, invent names on the way, and keep
the copy in step forever. That copy is the duplication graph sources exist to delete, and it
drifts the first time somebody adds a route.

### `fromReactRouter(routes, opts?)` — the tree itself becomes the spine

```ts
import { buildNavigationGraph, fromReactRouter } from 'hcifootprint';

buildNavigationGraph('app', {
  sources: [
    fromReactRouter(routes, {
      nameOf: (route, path) => (path === '/' ? 'home' : undefined),
    }),
  ],
});
// → home, projects, projects-new — two names transcribed, one told
```

It returns the same `RoutesSource` `fromRoutes` does, so **nothing downstream changed**: the
merge order, `crossLinks`, the url gesture, `matchRoute` and the compiler all serve it exactly
as they serve a route table. New exports on the root entry: `fromReactRouter` and the types
`RouteObjectLike`, `ReactRouterOptions`.

### A name is TRANSCRIBED, never guessed — and that line is narrower than "never derive"

`fromRoutes`' law still holds word for word: *auto-deriving a name from `/orders/:id` would be a
guess, and this library does not guess.* What a fully-static address gets here is not a guess
but a **transcription**: every byte of `/projects/new` → `projects-new` came out of the app's
own route, in order, with one authored `-` between segments (not on the segment law's reserved
list — and `segmentFault` is still *asked*, never assumed). Nothing is inferred, nothing is
prettified, the same input always gives the same name.

The moment there is nothing to transcribe, the derivation **stops**: a `:param`, a `*`, an
optional `?`, a segment carrying a reserved character — and **the root**, whose zero segments
mean any name for it (`home`, `dashboard`, `landing`) would be a word *the library* chose rather
than one your app wrote. Each of those refuses, naming the path and then the same two doors in
byte-identical words: `nameOf` at the call, or `handle: { hcifootprint: { name } }` on the route
you already own. A reader learns the refusal once.

### The router's own rules, read the router's own way

- A child path **extends** its parent's address — unless it starts with `/`, which every router
  reads as absolute, so it *replaces* the prefix rather than doubling it.
- A route with no `path` of its own is a **LAYOUT, not a place**: it contributes no page and
  only passes the address down. Declaring `handle.hcifootprint` on one is refused — a page is an
  address, and a layout has none.
- An **index route folds into its parent**: two routes at one address are one page, and the
  index child's `name`/`does` land on the page the parent contributed (`path: ''` folds
  identically). Two folded routes declaring *different* names refuse — one place, one name.
- Two different addresses arriving at one page id refuse, **naming both paths**. Never
  last-wins: a silently replaced page is a place an agent can never be told about.

### Pages only — and it says the key's name out loud

A route contributes a **page, never a control**. `handle.hcifootprint` declares exactly `name`
and `does`; `actions`, `tools`, `skills`, anything else is refused **by name**, with the
sentence that says where controls do belong. A route handle is free-form and nothing typechecks
it, so that refusal is the only thing standing between a declared control and a silent
disappearance — the same law `fromRoutes` and the `tools:`/`skills:` rename state at their own
doors.

### It imports nothing from any router

`RouteObjectLike` is a **structural type declared by this package**, so a v6-shaped config, a
v7-shaped one and a hand-rolled table all walk, and the package gains no dependency and needs no
subpath of its own (the `./react` subpath exists because React is a real peer import; this is
not). `element`, `Component`, `lazy`, `loader` and `errorElement` are never *read* — not ignored
after reading, never touched, which is pinned by walking a route table whose framework fields
are throwing getters.

### Born conformant

1.4.0's `conformSource` pins this source on the day it ships: the fixture grew a
`routeObjects` input (the same two pages as a nested tree, derived from the flat table so the
two cannot describe different pages), the page vocabulary round-trips through the real compiler,
and every action field is excluded **with the reason stated** — now naming both doors into the
routes kind rather than one.

### What it costs, said out loud

Page ids are derived at **runtime**, so a graph whose spine comes from here has `string` node
paths instead of the literal union `fromRoutes` carries. There is no literal in the call to read
names from, and minting one at the type level would encode the transcription twice and drift.
`fromRoutes` remains the door for a spine you want typed.

### The second-adapter rule

React Router earned this adapter the way anything gets built here: a real consumer had the
duplication, in production, and the shape of the hole came from their tree. **The next adapter
is earned the same way.** A `fromNextRouter`, a `fromTanStackRouter`, a `fromVueRouter` are not
owed by symmetry — this library does not ship an adapter for a router nobody has brought it yet,
because an adapter written against a guess is a guess with a version number. Until then the two
existing doors cover it: `fromRoutes` for a table you write, and `fromReactRouter` for any
nested `{ path, index, children, handle }` tree, which is duck-typed and therefore not actually
React-Router-only.

Additive: nothing that compiled at 1.4.0 compiles differently, and `fromRoutes` is byte-for-byte
unchanged in behaviour (its `crossLinks` refusals moved into the shared authoring guard so both
doors ask the same question in the same words).

## [1.4.0] - 2026-08-02

**A dropped field does not error. The app declares it, the agent never sees it, and nothing anywhere
says so.**

A graph source threads somebody else's declaration through copy points. `fromRoutes` reads a route
table, `fromJourneys` a journey list, `fromLiveStore` an action store — and every one of them copies
a declared field from the app's shape into the library's, by hand, one field at a time. So does every
source an app writes for its own store, which is the door this release is really for.

Reported from the field: one integration's seam was found dropping **four** declared fields
silently. Not one of them raised anything. The graph compiled, the rows served, the app looked
integrated — and the model was planning against a control whose `verify` contract, whose reason for
being off, and whose input shape had all quietly not made the trip. Worse, one of the four had
already been fixed at one copy point and was **still** being dropped at the next, because a fix at
one seam proves nothing about the seam after it.

That is a bug class, not a bug. This release makes it structurally impossible for any source that
runs one line.

### `conformSource()` — feed a full declaration through, name what did not come out

```ts
import { expectConformance } from 'hcifootprint/testing';

expectConformance((fixture) => fromLiveStore(fixture.store));
// throws: dropped 2 declared field(s) — 'verify' (compile), 'blockedBecause' (serve).
```

`conformSource(factory, opts?)` returns a `ConformanceReport`; `expectConformance` is the same run as
a gate and throws naming **every** dropped field, never the first one. A report that named one of
four would teach exactly the lesson the original bug already taught.

**You hand it a one-line factory, not a finished source, and the asymmetry is the whole method.** A
source is a snapshot: it read the app's truth once and closed over it, and it has no input door
afterwards. So "did you carry every field?" is a question a finished source cannot be asked — the
helper has to be the one holding the declaration. Taking a value instead would have answered a
narrower question while looking like it answered this one: a source that publishes no `verify` and a
source that dropped one are the same bytes, so a report over a value would have called the bug a
pass. The door is not offered. The factory receives a `ConformanceFixture` — a fully-populated action
plus a ready-made input per kind (`fixture.store`, `fixture.routes`, `fixture.journeys`).

### `DECLARABLE_ACTION_FIELDS` — the manifest, compile-locked

The canonical list of everything an action declaration may carry: `ActionDef` **plus its two
extension points**, the root-level multi-attach `on` and the mount-time `handler` (together, the new
exported type `FullActionDef`). Both extensions are in the manifest deliberately — a checker that
knew only about bare `ActionDef` would have been blind to two of the three doors a declaration
arrives through.

It cannot fall behind. Add a field at either door without listing it and the **build stops**, with
the new field's own name in the error text. A manifest that can drift is a manifest that will, and a
conformance checker reading a stale manifest is the same silence one level up.

### Two seams, and one row per dropped field

- `'compile'` — did the declaration reach the compiled record the graph holds for this action?
- `'serve'` — does an agent-visible surface carry it: the row `whats_here` answers with, and the
  `available()` edge behind it?

Two, because the field evidence had a field surviving one and dying at the next. Each dropped field
is reported **once**, at the seam that lost it: a declaration that never compiled cannot reach a row
either, and saying so twice would send a reader to two places for one fix.

### The pass is never vacuous, and says which part of it is

`report.excluded` names every field/seam pair there was **nothing to read at**, each with its reason
in words. Five today: an action's `writes` and its `verify` never ride a served row, `on` is the
root-attach extension no first-party source contributes, and a `handler` never crosses the wire (the
row discloses only that one is mounted). `report.checked` is the pass's denominator. A checker whose
pass is partly empty and does not say which part is the exact failure it was built to end.

Conformance tests the **adapter's threading**, not the library's presence laws. `blockedBecause` is
served only while a control is off; `enabledWhen` reaches a reader as one `enabled: false` stamp. The
fixture puts every field in the state the library PROMISES to serve it in and then asks one question.
Where a law couples two fields — a blocked sentence needs a switched-off row — the coupling is stated
at the field, and a source that drops one honestly loses both.

### All three first-party sources are pinned by it

`fromJourneys` and `fromLiveStore` round-trip their declarable subsets losslessly, as law-tests.
`fromRoutes` carries no action declaration at all, and **that refusal is its conformance**: an
action-shaped key is refused BY NAME rather than read-and-discarded, which is the same silence one
door down. Its own vocabulary (a page's `route` and `does`) round-trips under `page.*`, as
`fromJourneys`'s does under `journey.*`.

New exports on `hcifootprint/testing`: `conformSource`, `expectConformance`,
`DECLARABLE_ACTION_FIELDS`, and the types `ConformanceReport`, `ConformanceFixture`,
`ConformanceOptions`, `ConformanceSeam`, `DeclarableActionField`, `FullActionDef`,
`SourceUnderTest`. Additive: nothing that compiled at 1.3.0 compiles differently. The engine-free
`hcifootprint/testing/lint` entry is untouched — conformance drives the real compiler and the real
serving port, so it lives in the full entry where the harness already does.

## [1.3.0] - 2026-08-02

**Some choices are the person's to make. The library had a word for "may the agent act" and no word
at all for that.**

`requireHumanApproval` answers one question: a human's recorded yes unlocks one fire. It says
nothing about the other way a person is inside a flow. Which plan. Which shipping speed. Whether to
sell at all. The agent's correct move there is to present the options and stop; the human answers
through the app's own control, and the flow moves because the world moved.

With no word for it, a model met a choice control like any other and fired it — or, told not to in
prose, invented its own vocabulary for the pause. And every near word this library already had
describes something the **system** holds: a card, a gate, a greyed button. Here the system holds
nothing. There is no card, no `askId`, no refusal. So borrowing one of those words would have taught
a model to go looking for a card that does not exist.

Designed in Round A and written down before a line was built —
[`docs/design/human-decisions.md`](docs/design/human-decisions.md), sixteen decisions with their
rejected alternatives recorded so the next build does not re-litigate them — and built here exactly
as papered. The shape of the hole came from field use across the wave.

### `humanDecides` — declared on the control the person answers through

```ts
'choose-shipping-speed': {
  does: 'Choose a shipping speed',
  writes: ['checkout.shipping'],
  humanDecides: {
    about: 'which shipping speed',                   // app DATA — never spoken
    doneWhen: { 'checkout.shipping': { ne: '' } },   // the app's own "it has been decided"
  },
}
```

Authored on `ActionDef` at both its doors and compiled verbatim onto the affordance — `enabledWhen`'s
exact path, because a second path would be a second thing to keep true. New exported type
`HumanDecides`. Both fields are optional, and **omitting `doneWhen` is legal and exact**: ownership
is declared while the app gave the library no way to know when the decision lands, so `made` stays
`'unknown'` forever. `doneWhen: {}` is a different thing and dies at build — footprint's evaluator
never matches an empty filter, so it could never hold. `about` is capped at 200 characters and
refused loudly when over, in the same sentence at both doors.

It is a fact about the **control**, inherited by every journey that names it. A per-journey split
would let two lists disagree about one control's owner.

### `decisions()` — and the one guess this library must be structurally incapable of

`session.decisions()` is the sibling of `asks()`: that one answers *is anything waiting on a
person?*, this one answers *is anything a person's to decide?*. Graph-wide, read at the moment you
ask, one `DecisionStatus` row per declaring control.

`made` has **three** answers and they are three different things — `true`, `false`, and `'unknown'`
for a condition nobody could evaluate or one that was never declared. **`'unknown'` is never
collapsed into "not yet".** That is the `guardUnevaluated` asymmetry at the decision grain: a filter
half-read is a filter unread, so `false` is reserved for a condition the library actually evaluated.

`madeBy` is the part worth reading twice. It rides beside `made: true` only, and it is minted from
exactly the identity-bearing rungs of `updateState`'s ladder — a delta naming a fired transition,
the handler's own call window, an attributed `updateState(delta, { principal })`. **Every matching
rung CLEARS it**: FIFO settlement can mis-attribute predictably, the single-cover arm is a signature
match, inference is a guess the record already flags. A computed join never attributes a human
decision.

What that buys, each of it pinned by an attack test:

- **An unattributed flip serves `made: true` with `madeBy` absent.** The decision is visibly made
  and nobody is named. Silence cuts both ways — the library does not say the human did it, and does
  not say they didn't.
- **A chat-typed "done" cannot launder into attribution.** No Mode B tool reaches `updateState`, and
  every fire through the port carries the port's own principal. `'user'` enters the book only
  through the app's own doors.
- **A stale stamp never survives an unattributed touch.** A person picks `standard`; an unattributed
  delta later rewrites the key to `express` while the condition still holds; the entry clears. The
  alternative attributes a value to somebody who never chose it.
- **Nothing fires on `made: true`.** It is a state reading, not a command. A library that acted on
  it would have turned a disclosure into a trigger — and a mis-attributed delta would then perform
  actions rather than merely mislabel them.

### `journeyStanding()` — where one chain stands, as a pure fold

`journeyPlan` answers *what may I fire next*. The question a reader actually has between turns is
*whose turn is it, and is this thing moving*. `session.journeyStanding(id)` answers it with one word
and the facts behind it (new exported type `JourneyStanding`): `'done'`, `'in-progress'`,
`'awaiting-human'`, `'with-the-human'`, `'blocked'`, `'failed'`, `'declined'`.

No state, no cache, no timer, never fires — a fold over the plan, the ask book, the decisions book,
retained settlements and frame history, computed fresh on every call. It throws on an unknown id
through `journeyPlan`'s own refusal, so the two cannot answer differently.

**`'failed'` is never minted from a pause.** Not from `needs-confirm`, not from a relayed decline,
not from any `APPROVAL_*` refusal, not from `GUARD_FAILED`, `TOOL_DISABLED` or `NOT_MATERIALIZED`. A
refusal is not an execution: nothing ran, so nothing failed. It requires a fire that actually came
to rest badly, and the evidence carries a **pointer** to it — the receipt stays `did_it_work`'s to
serve, once.

### The ready bucket splits three ways

A step listed under `readySteps` **is an instruction to fire it**. That is the whole argument. Two
kinds of step are not the model's to perform, so a journey result now separates them:

```jsonc
{ "standing": "with-the-human", "judgment": "navigate-or-wait",
  "withTheHuman": [{ "step": "checkout.choose-shipping-speed", "made": false, "about": "which shipping speed" }],
  "withTheHumanMeans": "These steps are the human’s to decide, not yours to perform. …",
  "readySteps": [] }
```

`awaitingHuman` carries `{ askId, step }`; `withTheHuman` carries `{ step, made, about? }`. An open
card WINS while it is open — a card is the sharper referent — and ownership governs again once none
is. A `made: true` row **stays listed**: the step is still theirs, and the row itself is the
resumption cue. A decision that is blocked or off-page is not the person's turn yet and stays in
`laterSteps` carrying the same `humanDecides: true` stamp, so every rendering of a step tells one
story. `withTheHumanMeans` — one authored constant, the `stillWorkingMeans` pattern — rides exactly
when the list is non-empty.

The same word reaches both Mode B doors from the **same call**: `whats_here`'s journey rows and the
journey tool's result both carry `standing`, never a second derivation, so they cannot disagree
about one chain. It sits beside `judgment` because the two answer different questions — *what is my
move this turn* and *where does this chain stand*.

And the facts block prints one authored line per such control offered here and not known made:

> `A decision is with the human: checkout.choose-shipping-speed — the agent presents options and does not make it.`

The line asserts **ownership only**, which is why `false` and `'unknown'` print the same true
sentence and nothing collapses. `about` never enters it — it is the app's runtime text, and this is
the one block a model is told to weigh above its own account.

### The word, and why it is not `awaiting-human`

`'with-the-human'` is plain possession in ordinary speech ("it's with legal now"), and it says
exactly what is true: the flow is in a person's hands. `'awaiting-human'` stays what it has always
been — the word whose referent is an ask CARD. `docs/design/answer-grammar.md` gains the row.

Rejected, recorded so the next build does not re-open them: `human-deciding` (describes an activity
nobody can observe), `needs-human` (reads as approval), `human-owned` (describes the declaration,
not the standing).

### Enforcement is FORBIDDEN in v1 — and that is the design, not the backlog

**Nothing here refuses a fire.** An agent fire of a `humanDecides` control succeeds for every
principal, and the violation is disclosed three ways instead: `madeBy: 'agent'` in the book, the
fire in the transitions log, and the stamp on the row the model read before it fired.

The reason is arithmetic. Enforcement mints refusal words, and `FireResult['reason']` and
`GapRecord['rejectionReason']` grow only in lockstep — which this wave forbade itself. Whether a
session option in the `requireHumanApproval` family should refuse such fires, with its own typed
reason added to BOTH unions, a gap-ledger triage note and an answer-grammar entry, is written down
as an open item in the design note rather than half-built here.

### Also in this release

- **`JourneyDef.steps` takes the object element `{ step: '<name>' }`**, compiling identically to the
  bare name and carrying nothing else. Per-step conditional metadata has to have exactly ONE
  authoring carrier; deciding it once means the next such feature is a field on a shape that exists
  rather than a second shape competing with this one.
- **`humanDecides.doneWhen` keys join `requiredStateKeys()`** — that list exists precisely to tell an
  app which keys make its own declarations decidable, and an unseeded one leaves `made` at
  `'unknown'` forever.
- **`JourneyPlanStep` gains the presence stamp**, so the serving layer reads ownership off the plan
  instead of re-deriving it per rendering.

### Compatibility

- **Purely additive.** No published name is renamed or removed — the 1.0 freeze holds. An app that
  declares nothing gets `decisions() === []`, no new key on any row or plan step, no new list in a
  frame result, and no new line in the facts block. Pinned by its own suite.
- **No published union grew.** `FireResult['reason']` and `GapRecord['rejectionReason']` are
  byte-identical, and so are `EffectStatus`, `Settlement`, `StepStatus`, `FrameStatus`, `GapReason`
  and `Binding['kind']`. The standing strings live on the new `JourneyStanding` type alone. All of
  it is pinned at COMPILE time, so a union that grows stops the build.
- **The served tool array is untouched.** No new tool, no schema property; disclosure rides the
  result channel. The Mode B cache law holds, and is pinned by comparing a declaring graph's tools
  against an identical graph without the declaration.
- **One unconditionally-new field**, named rather than hidden: `standing`, on the two doors that
  serve a journey. It is a word about a chain, never a claim about a declaration nobody made.
- **No clock touches any of it.** Nothing expires a decision, nothing flips `made` by time, and an
  injected clock advanced a year changes no reading, no list and no standing.

## [1.2.0] - 2026-08-02

**"It's off" is a state. "Why" is a sentence only the app can write — and "who clears it" is the one
fact that decides the next turn.**

A switched-off control has been served honestly for several releases: `enabled: false` on the row, a
typed retriable `TOOL_DISABLED` at the reach, the failing `enabledWhen` conjuncts as evidence, and
`unblockedBy` naming the actions the app claims would free it. Every one of those is **derived** — the
library reading declarations the app made for other reasons.

None of them is the sentence the component doing the greying already knows. *"Waiting for the upload
to finish."* *"This order is already cancelled."* *"The amount is above your limit."* And none of them
answers the question a reader actually has to answer before it can take a turn: **who clears this?**
Because the moves are not interchangeable. If the app clears it, the agent waits. If a person clears
it, the agent has to interrupt them — the one move it will not make from a sentence alone. If what was
supplied is simply wrong, waiting is the worst possible choice.

So there was a hole, and a hole in an answer is where a guess goes. A production integration carried a
hand-rolled equivalent of this field for months because the library offered nowhere to put it; three
live incidents are why `clearedBy` is three words rather than free text.

### `blockedBecause` — the app's own reason, and who clears it

```ts
next: {
  does: 'Continue to review',
  blockedBecause: { says: 'Waiting for the receipt to finish uploading', clearedBy: 'app' },
}
```

Declarable on `ActionDef` — in the graph, at the mount door, and therefore on a live store's rows —
with a new exported type, `BlockedBecause`. `clearedBy` is `'app'` (wait), `'user'` (interrupt the
person) or `'invalid'` (report a validation problem). There is no fourth word, because there is no
fourth move, and a fourth is refused at both authoring doors in the same sentence.

**Four laws hold it in place.**

- **Presence-only, and only while blocked.** The row carries it only where it also carries
  `enabled: false`. A live control has no blocked sentence however the app declared one — a reason for
  an open door tells a reader to wait for something that already happened, which is the same law
  `unblockedBy` keeps on the same row. **An app that declares nothing serves byte-identical rows.**
- **Rides beside, never inside.** The authored refusal sentence is unchanged to the byte — including
  *"nothing here knows what would change it"*, which is a claim about what THIS LIBRARY knows and
  stays true beside anything the app says. The app's words arrive as a **data** field next to it.
  App text entering an authored channel is the injection this library exists to refuse.
- **Read late, never cached.** The function form (`blockedBecause: () => …`) is called at the moment a
  row is assembled, so a reason that changes while the page is open is honestly two different
  sentences two reads apart. It is declared and disciplined exactly like `holds`.
- **Absence over a guess.** A reader that returns `undefined` says nothing. A reader that throws, or
  answers a shape this library cannot read as a reason, serves **no key** plus one dev warning per
  action — and `whats_here` still answers. A plausible wrong reason is the worst thing this surface
  could ship.

One reading is asked in three places — both authoring doors and row assembly — from one function, so a
reader is refused for exactly what the compiler would have refused, and the two cannot drift.

### The disable that explains nothing now says so, once

The other half, and the half that makes the first one findable. Switch a control off imperatively —
`handle.setEnabled(id, false)`, or a live store row — while it declares **neither** `enabledWhen` nor
`blockedBecause`, and one dev warning names both doors:

> `'checkout.next'` was switched off with nothing declared about why — no enabledWhen and no
> blockedBecause — so a caller that reaches for it is refused with the state and no evidence at all:
> told no, and taught nothing. Declare enabledWhen for derived evidence, or blockedBecause for your
> own sentence.

Once per action for the session's life, at the one choke point every imperative switch-off passes
through, and never for a control that declares either field. Nothing is served differently: this is a
developer warning about a declaration that is missing, which is precisely why the integration above
never found the door — both cures already existed and neither was discoverable from the call that
shuts the door.

### A live store may DECLARE, not only bind — written down at last

No code changed for this one, and that is the finding. A live store's rows have supported
`enabledWhen` end to end for releases — declare it on a row that introduces a new action and the guard
evidence, the typed refusal and `unblockedBy` all flow — and the word appeared **nowhere** in the
live-store guide or the module's own README. Teams wired `enabled: false` by hand for months while the
declarative door stood open. It is now stated plainly, with the carve-out that follows from the merge
order: live actions attach last and only **bind**, so a row whose id the graph already declares keeps
the declaration's own `enabledWhen`. Declaring from a store is how you describe an action the graph
does not have.

A months-old field gap that was pure findability. Worth saying out loud: documentation was the whole
fix, and not writing it was the whole bug.

### Compatibility

- **Purely additive.** No published name is renamed or removed — the 1.0 freeze holds. `blockedBecause`
  is optional at every door and absent from every row that does not declare it.
- **No published union grew.** `FireResult['reason']` and `GapRecord['rejectionReason']` are
  byte-identical — a control the app explains is still `TOOL_DISABLED`, because a new refusal word for
  a control that was already refused would mint a class no app asked for. So are `EffectStatus`,
  `Settlement`, `StepStatus`, `FrameStatus`, `GapReason` and `Binding['kind']`.
- **The served tool array is untouched.** A row is a RESULT; `toMCPTools()` renders the same bytes
  whether or not a single action declares a reason.
- **The refusal's authored sentences are byte-identical to 1.1.0**, both of them, and pinned as such.
- **One new behaviour with no declaration at all**: the dev warning above, on an imperative switch-off
  where nothing is declared. It writes to the existing `onWarn` sink, changes nothing that is served,
  and stops for good the moment either field is declared.

## [1.1.0] - 2026-08-02

**A name is evidence captured at its moment.**

Every history render in this library answered "is this a real action?" the same way: it looked the id
up in the graph **as it stands when you read**. That is a different question from the one history
asks, and it gets a different answer the instant a component unmounts.

So a compose pane mount-declares `send`, an agent fires it, the pane unmounts — and `groundTruth()`
then called a genuinely-fired action **"(an action this app does not have)"**. The one block a model
is told to trust above its own account was calling the app a liar about the app's own record, which
is the precise inverse of what that block is for. `contextBrief()` had it worse: its narrative line
never went through the label guard at all. It printed the raw id and read the description out of the
current graph, so after the same unmount the app's own sentence rendered as an empty string, and its
pending line printed raw ids too. Two lines that had quietly opted out of the discipline every other
line here keeps.

**How it was found.** By running the code — a cross-review with a production integration's reviewing
agent, which executed the mount → fire → unmount sequence against this source rather than reasoning
about it. Worth saying plainly: **an earlier diagnosis of ours was wrong.** We had it filed as a
visibility problem in the label check — that the guard was refusing to name things it should have
named. It was not. The guard was doing exactly what it said; what was missing was the *evidence* it
was asking for, and the second defect was a line that skipped the guard entirely and had never been
looked at. A diagnosis that survives only because nobody ran it is not a diagnosis.

### The fix: capture, never look up

When the session mints a row for an action the graph has **at that moment**, it freezes that
affordance's authored `does` onto the row right then. Renders prefer the row's own evidence: a row
carrying a captured `does` was declared when it happened, and that is proof enough to print the name
— no later lookup can take it back. A row that captured nothing falls through to the graph lookup and
then to the constant, byte-identical to before, which is exactly an id nobody ever authored.

The new optional field is called `does` — the same word an app declares it with — and it sits beside
the `affordanceId` it belongs to on `TransitionRecord.cause`, `PendingInfo`, `WorkRow`, `AskStatus`
and the `fire-rejected` rows of `GapRecord`.

**Three laws hold it in place.**

- **Presence-only.** Absent means *this row's action was not declared at that moment* — which is the
  honest answer for a fire of a name a model invented, and the reason that name can never reach an
  authored sentence: with nothing captured, every render still falls to the constant. A
  `TOOL_DISABLED` refusal of a real control captures its name; an `UNKNOWN_AFFORDANCE` refusal
  captures nothing.
- **From the graph and nowhere else.** Never from a fire's arguments, never from a payload, never
  from a caller's string. This is the authored channel, and caller text entering it is the injection
  the constant exists to refuse.
- **Never retroactive.** A row is not rewritten when the action mounts later, and a row keeps the
  sentence the app was showing **then** — re-mount the same id with new wording and history still
  quotes the words that were on screen when it happened.

### Also in this release

- **The brief line stops bypassing the guard.** Its id now goes through the same door every other
  name here uses, and its description comes off the row. Post-unmount it carries both the real id and
  the app's own sentence.
- **Two coverage exemptions deleted.** They asserted that a fired row's description is always in the
  graph "because the spec always has its description" — the falsehood this release is about. The one
  that replaces them makes a claim about the ROW rather than about the graph, which is the whole
  change in one comment.
- **A stale 0.11.0 note corrected in place.** Its *Compatibility* list still described `HumanDecides`,
  `DecisionStatus` and `SkillStanding` as shipped-but-unexported declarations, three paragraphs after
  the same section correctly said they were removed before release. The bullet now says what is true;
  the history stays.

### Compatibility

- **Purely additive.** No published name is renamed or removed — the 1.0 freeze holds. Every new
  field is optional, and absent wherever nothing was captured.
- **No published union grew.** `FireResult['reason']`, `GapRecord['rejectionReason']`, `EffectStatus`,
  `Settlement`, `StepStatus`, `FrameStatus`, `GapReason` and `Binding['kind']` are byte-identical.
- **The served tool array is untouched.** A history row is a RESULT; `toMCPTools()` renders the same
  bytes whether or not the session holds captured rows, and an unmounted action still leaves the tool
  list the moment it unmounts — history simply keeps being able to name it.
- **What a reader sees changes only where it was wrong.** A mounted action's lines read exactly as
  before; the change is visible only after the thing that declared it is gone.

## [1.0.1] - 2026-08-02

**A claim of ours, measured instead of asserted.**

The README told every reader — and every visitor to the npm page — that dumping a DOM into a prompt
costs "~100k tokens". Nobody here had measured that. It was industry folklore sitting in our own front
door, which is precisely the class of claim this library exists to stop an app from making.

So it is measured now. A real browser against the built onboarding-wizard demo, `document.body
.innerHTML` captured as a versioned fixture, both sides tokenized with a real tokenizer: **the DOM is
2,027 tokens and what this library sends for the same page is 332** — 6.1× less per turn, at 41.5
tokens per available action. The folklore was off by roughly fifty times for an app that size.

The benchmark ships in the repo (`npm run bench:tokens`) and refuses two things on purpose: it does
not call the difference *compression* (the two sides do not carry the same information — a DOM is what
a browser needs to paint, a row is what an agent needs to act), and it does not extrapolate. It states
plainly that this is one page of one small app whose DOM is dominated by its shell, that this repo
therefore cannot show the ratio climbing with page size, and that the claim worth testing — served
cost tracks *action count* while DOM tracks *visual complexity* — is for a reader to run against their
own app.

No library code changed: `dist` is byte-identical to 1.0.0.

## [1.0.0] - 2026-08-02

**The names are frozen.** That is what 1.0 means here, and it is very nearly the whole of what it
means: from this release the words in the public surface are *the* words, and changing one of them is a
major version with a migration note rather than a Tuesday. Everything else below is the price of
freezing them honestly, paid once.

Two words were wrong, and a name you are stuck with is worth one last break.

**"Skill" is not ours any more.** When this library started, a skill was a named multi-step flow and
the word was free. It is not free now: the agent ecosystem has settled "skill" on a packaged capability
an agent loads, and a library that keeps a private meaning for a word everyone else uses differently
spends every conversation explaining which one it meant. What this library actually describes is a
**journey** — the path a person takes through an app. That is the word the app team already says out
loud, and it collides with nothing.

**"Tool" was doing two jobs.** It named what you AUTHOR (a button on a page) and what is SERVED (an
entry in a model's tool array). Those are different things, read by different people, and one word for
both is how a reader ends up believing the tool array grows when a component mounts. Now each word has
exactly one job: **you author ACTIONS, you name JOURNEYS, and a TOOL is what is served to a model.**
`toMCPTools`, `edgesToMCPTools` and `MCPToolDescription` keep the word, because on that side of the
line it is the correct one.

### A clean break — the old names are DELETED, not deprecated

There is no alias layer, and one is not coming. A deprecated alias is a second name for one thing: both
names get read, both get copied into new code, and the library spends its life teaching the word it
just asked you to stop using. The pre-1.0 window is the only hour in which that break is cheap, and
this is the last of it.

`SkillDef2` is the whole argument in one symbol. It existed because a name was wrong and the fix was
postponed — and a number-suffixed public name is not a thing this library ships. Renaming it and
deleting the old one is the fix; carrying both was the bug.

**And every refusal teaches.** The renamed authoring keys are refused BY NAME, never ignored. A
definition that still says `tools:` or `skills:` fails to COMPILE, because the types no longer carry
those keys; a definition that reaches the runtime anyway — plain JS, a JSON blob, a cast — throws a
`GraphValidationError` that names the key to write instead (`src/tree/authoring-keys.ts`). Reading only
the new key would have compiled a silently EMPTY graph out of a definition full of controls and handed
a planner an app with nothing in it. A rename a reader can act on beats a graph that quietly lost half
its meaning. Both sentences are AUTHORED CONSTANTS — no id, no path, no count — so nothing a definition
contains can reach a message through them.

### The complete rename

Nothing below changes behaviour. Every row is the same mechanism under the word it should have had.

**Authoring — what you write in `buildNavigationGraph(id, def)`**

| 0.11 | 1.0 |
|---|---|
| `tools: { … }` on any node | `actions: { … }` |
| root-level `tools: { … , on }` (multi-attach) | `actions: { … , on }` |
| `skills: { … }` | `journeys: { … }` |
| `ToolDef` | `ActionDef` |
| `SkillDef2` | `JourneyDef` (its real name since 0.6.0) |
| `NavigationGraph.toolNodes` | `NavigationGraph.actionNodes` |
| `SkillGraphSpec` | `NavigationGraphSpec` |
| `SkillGraphValidationError` | `GraphValidationError` |

**The session — mounting, and the journey doors**

| 0.11 | 1.0 |
|---|---|
| `registerToolGroup(path, opts)` | `registerActions(path, opts)` |
| `registerTool(path, id, def)` | `registerAction(path, id, def)` |
| `RegisterToolGroupOptions` / its `tools:` field | `RegisterActionGroupOptions` / its `actions:` field |
| `RegisteredToolDef` | `RegisteredActionDef` |
| `ToolGroup` / `ToolGroupHandle` / `ToolHandle` | `ActionGroup` / `ActionGroupHandle` / `ActionHandle` |
| `ToolHandle.toolId`, `setEnabled(toolId, …)`, `setBusy(toolId, …)` | `.actionId`, `setEnabled(actionId, …)`, `setBusy(actionId, …)` |
| `ToolRegistry` / `ToolHandler` | `ActionRegistry` / `ActionHandler` |
| `registerTools()` / `RegisterToolsOptions` / `RegisteredTools` (flat `Session`) | `registerHandlers()` / `RegisterHandlersOptions` / `RegisteredHandlers` |
| `availableSkills()` | `availableJourneys()` |
| `commitSkill()` / `leaveSkill()` / `skillFrame()` | `commitJourney()` / `leaveJourney()` / `journeyFrame()` |
| `skillPlan()` / `trySkillPlan()` | `journeyPlan()` / `tryJourneyPlan()` |
| `Skill` / `SkillDef` | `Journey` / `JourneySpec` |
| `SkillFrame` / `SkillPlan` / `SkillPlanStep` | `JourneyFrame` / `JourneyPlan` / `JourneyPlanStep` |
| `AvailableSkill` | `AvailableJourney` |
| `CommitSkillResult` / `TrySkillPlanResult` | `CommitJourneyResult` / `TryJourneyPlanResult` |
| `frame.skillId`, `plan.skillId`, `FRAME_ALREADY_OPEN.skillId` | `.journeyId` |
| `GapRecord.availableSkills` / `GapRecord.skillId` | `.availableJourneys` / `.journeyId` |
| reason `'UNKNOWN_SKILL'` | `'UNKNOWN_JOURNEY'` |
| `GapReason` `'no-skill-matched'` | `'no-journey-matched'` |

**The serve layer — what a model is handed**

| 0.11 | 1.0 |
|---|---|
| `skillsAsTools(session, opts?)` | `serveToAgent(session, opts?)` |
| `SkillToolsOptions` / `SkillCallArgs` | `JourneyToolsOptions` / `JourneyCallArgs` |
| `SkillToolsPort` / `SkillToolsPortWithSettlement` | `JourneyToolsPort` / `JourneyToolsPortWithSettlement` |
| `leaveSkillTool(spec, id)` | `leaveJourneyTool(spec, id)` |
| tool name `<graph>.skill.<id>` | `<graph>.journey.<id>` |
| tool name `<graph>.leave-skill` | `<graph>.leave-journey` |
| reserved affordance id `'leave-skill'` (the synthetic escape served while a frame is open) | `'leave-journey'` |
| result field `skill:` (the journey a call is about) | `journey:` |
| `whats_here` list `skills: [{ skill, does, feasible, … }]` | `journeys: [{ journey, does, feasible, … }]` |

**React, and the testing subpath**

| 0.11 | 1.0 |
|---|---|
| `useWorking({ tools })` | `useWorking({ actions })` |
| `SkillHealth` / `GraphHealth.skills` | `JourneyHealth` / `GraphHealth.journeys` |
| `LintFinding.skill` | `LintFinding.journey` |
| lint codes `'uncompletable-skill'`, `'skill-step-order'`, `'skill-step-cycle'` | `'uncompletable-journey'`, `'journey-step-order'`, `'journey-step-cycle'` |
| `testApp(...).agent.skill(id, args)` | `.agent.journey(id, args)` |
| `expectSkillCompleted(id)` | `expectJourneyCompleted(id)` |

**The `protected` seams on `Session`** — small, and named here because they are the one part of the
rename a compiler will not catch for you. A subclass overriding one of these keeps compiling under
the old name; it is simply never called again, which is worse than an error. If you extend `Session`
(the flat door — `InteractionSession` extends it the same way), grep your subclass for these four.

| 0.11 | 1.0 |
|---|---|
| `protected setToolEnabled(id, enabled)` | `setActionEnabled(id, enabled)` |
| `protected setToolBusy(id, busy)` | `setActionBusy(id, busy)` |
| `protected isToolDisabled(id)` | `isActionDisabled(id)` |
| `protected makeToolGroup(...)` | `makeActionGroup(...)` |

`hcifootprint/sensor` is untouched: it speaks about elements and controls, and never had either word in
its surface.

### Deleted

- **The v1 fluent builder, whole**: `skillGraph()`, `SkillGraphBuilder`, the `SkillGraph` type and
  `AffordanceDef` (its authoring shape) — `src/graph/builder.ts`, 239 lines, gone. It has been legacy
  sugar since the navigation graph became the canonical door, and shipping two authoring surfaces past
  1.0 would have frozen both.
  `buildNavigationGraph(id, def)` is the one door: it is the same graph plus the container tree, typed
  node paths, and mount-time declaration. `SkillGraphValidationError` was its export of a class that
  lives in `graph/guards.ts`; that class is now `GraphValidationError`, exported from the module that
  owns it, and it is what every authoring door — the compiler, every source factory, the renamed-key
  refusal — throws.
- **`SkillDef2`**, the deprecated alias of `JourneyDef`.

### Migration, in one pass

Six substitutions and a compile. There is no behaviour to re-test: every row above is the same
mechanism under a different word, and the compiler finds the ones you miss.

1. **The two authoring keys.** In every graph definition: `tools:` → `actions:`, `skills:` →
   `journeys:`. Nothing inside either object changes. If you miss one, the compiler says so, and a
   definition built at runtime is refused by name.
2. **Mounting.** `registerToolGroup(` → `registerActions(`, `registerTool(` → `registerAction(`, and
   the `tools:` option inside them → `actions:`. Handles keep their shape; only `toolId` → `actionId`.
   On the flat `Session`, `registerTools(` → `registerHandlers(`.
3. **Journeys.** `availableSkills` → `availableJourneys`, `commitSkill` → `commitJourney`, `leaveSkill`
   → `leaveJourney`, `skillFrame` → `journeyFrame`, `skillPlan` → `journeyPlan`, `trySkillPlan` →
   `tryJourneyPlan`; on any result you destructure, `skillId` → `journeyId`.
4. **Serving.** `skillsAsTools(` → `serveToAgent(`. If your host pins tool names, `<graph>.skill.<id>`
   → `<graph>.journey.<id>` — and a conversation carried across the upgrade sees a changed tool array,
   so start a fresh one rather than pretending the cache is still warm.
5. **Types.** Anywhere you wrote a type down: `Skill*` → `Journey*`, `Tool*` → `Action*`, per the tables
   above. `SkillGraphSpec` → `NavigationGraphSpec`.
6. **Exhaustive switches and string values.** Six literals changed spelling, and no union grew or
   shrank: the refusal reason `'UNKNOWN_SKILL'` → `'UNKNOWN_JOURNEY'`; the gap reason
   `'no-skill-matched'` → `'no-journey-matched'`; the lint codes `'uncompletable-skill'`,
   `'skill-step-order'`, `'skill-step-cycle'` → their `journey-` spellings; and the reserved
   affordance id `'leave-skill'` → `'leave-journey'` (if you happened to author an action by that
   name, the name that is now refused is the new one).

If you built the graph with `skillGraph()`, that is the one migration with real work in it: rewrite the
definition as a single object literal for `buildNavigationGraph`. Each `.page(id, …)` becomes an entry
under `pages:`, each `.affordance(id, { on, description, guard, effect })` becomes an entry in that
page's `actions:` (`description` → `does`, `guard` → `when`, `effect.writes` → `writes`,
`effect.navigatesTo` → `goTo`), each `.skill(...)` becomes an entry under `journeys:`, and the
`.build()` call goes away — `buildNavigationGraph` validates and freezes in the one call.

### The graph already knew

Three questions answered by joining declarations that were always there. They ship in the release that
freezes the names because each is a **derivation** and none of them enlarges the promise: nothing new
to declare, nothing that can drift, nothing an app has to opt into.

#### What would free this control

A production integration's agent met a greyed **Continue**, was told only that it was greyed, fired it
again to find out what would change, and then reported the app broken. An upload was running.

`enabled: false` says a control is off; it never said what would turn it on, and a hole in an answer is
where a guess goes. A switched-off row now carries **`unblockedBy`** — the actions whose declared
`writes` touch a key this control is **actually** waiting on, each with the keys.

**Nobody declares this.** Both halves already exist for their own reasons (`writes` powers
verification, the conditions power availability), so the dependency is **derived, never authored**, and
cannot drift from the graph. The rule is not new either — the step-dependency rule (`step-deps.ts`) has
computed exactly it for a journey's steps since journeys existed; this widens the scope to any declared
action, and the conditions it reads to `enabledWhen` as well as `guard`, because a *greyed* control is
usually held by the second, and a version reading only the first would stay silent in exactly the case
that matters.

**"Actually waiting on" is the load-bearing half, and it means live state rather than the
declaration.** A control is offered at all only once its `guard` HOLDS, so on every row a reader can
see, the guard's keys name conditions that are currently TRUE — and the actions that write those keys
are the ones that would *destroy* the condition the control is standing on. Worse, of all the writers
in an app, those are `logout`, `discard the draft`, `delete the account`: a guard is how an app says
"you may do this because you are signed in / a draft exists". So the keys are the conjuncts that did
NOT hold, evaluated against state. A condition the library could not read is not among them either —
unknowable is absence here as everywhere.

Each entry says whether that action is **`inFlight`** — from two observed signals only: a fire awaiting
its report, or the app's own `busy` label. Absent when neither holds; never `inFlight: false`, which
would claim to know a control is idle. New read: **`session.whatUnblocks(actionId)`**, returning
`DependencyEdge[]`; on the wire it is `unblockedBy` on the served row, and only on a row the app has
actually switched off — a live control needs no answer to "what would free it".

**It reaches the journey surface too**, which is the one `mcpServer` wraps. A step whose control the
app has switched off is no longer listed among `readySteps`: it cannot be fired, and the instruction
beside that list names it, so advertising it built a re-fire loop out of two true sentences — the exact
loop this feature exists to end. It moves to `laterSteps` carrying **both** facts side by side, the
plan's `status` and the live `enabled: false`, plus its own `unblockedBy` and `busy`. The plan's word
is not overwritten: "the declared graph is satisfied and the app switched the control off" and "the
graph does not allow it yet" are different diagnoses that demand different moves.

#### How to reach a page

**`session.howToReach(pageId)`** walks the fewest declared hops from the cursor, each naming the action
whose claim makes it. `[]` means you are already there; `null` means **nobody declares a route** — not
"it cannot be reached". Pages declare no edges to one another and should not: an action that declares
where it goes *is* the edge, and a second copy would drift. New exported type: **`RouteStep`**.

A page id **nobody declared** is refused by name, with the known pages listed — the one thing `null`
must never mean. Answered as honest absence, a typo or a renamed page would report "this app declares
no way there", turning the caller's mistake into a finding about the app; and an under-declared graph
is precisely what a reader of this method is hunting for. Every sibling read (`explain`, `journeyPlan`)
already refuses an unknown id this way.

A route is **not a plan** — fewest hops is arithmetic, and a preferred order toward a goal is a journey,
which you declare. A route is **not a permission** — a hop whose guard is closed is still reported as
declared, because `goTo` is a claim about where an action goes. Whether a hop is open is answered where
it is known: on the row for the action you are about to reach for. For pages this session has never
visited it is **not guessed**, because the state on a screen nobody has looked at is not a thing this
library can see.

### Two more names, and one small addition

- `GraphValidationError` is now the single type every authoring refusal arrives as, from every door —
  the compiler's walk, each source factory, and the renamed-key refusal above. One name for one thing.
- `CommitBundle` and `MCPToolDescription` are re-exported from the root. They are footprintjs types
  that this package's own signatures RETURN (`commitLog()`, `toMCPTools()`), and writing down what you
  were handed should never require importing from a dependency you did not choose.
- **`WhereFilter` is re-exported** for the same reason on the input side: it is the shape of every
  `when:` and `enabledWhen:` an app authors, half of the exported `VerifyContract`, and the type of
  `Journey.precondition`. Factoring a guard into a helper required importing it from footprintjs.
- **`registerHandlers(...)` returns `setBusy` as well as `setEnabled`.** A control is clickable,
  switched off or WORKING; two of the three had a wire on that handle and the third did not. Scoped
  and refused identically — a group governs only what it mounted — and it also unblocks the React
  binding, which takes handles by their `setBusy`.
- **`fromRoutes` refuses any key a route table does not declare**, by name, instead of dropping it. A
  route contributes a PAGE, never a control; the type already says so, but this factory exists for the
  table that is not an authored literal — a JSON blob, a generated module, a cast — and silently
  discarding `actions:` (or the renamed `tools:`) there produced the exact silently-empty graph the
  renamed-key refusal was written to make impossible.
- The `TOOL_DISABLED` refusal's evidence sentence now names `unblockedBy` as something `whats_here` may
  also carry. The sentence beside it still says nothing here knows what would change the control, and
  that stays exactly true: `unblockedBy` is derived from conjuncts that failed, so it can only ever
  appear on a control whose app DID declare a condition — the one case the evidence clause is served
  for.
- The `hcifootprint/testing` generics (`TestApp`, `TestAppOptions`, `Resolver`, `ResolverContext`,
  `ResolverOutcome`) carry defaults, like every generic on the main entry. Writing `let app: TestApp`
  was a compile error.

### What 1.0 covers

The promise is over the whole surface, not the new part of it. The mechanisms an integration leans on
hardest were shipped before this release and are frozen by it, in the words the tables above give them:
the four ways a control says it is switched off and the refusal that names the state without inventing
a cause (0.10.0); `busy`, the third state, in the app's own words, with no `busyWhen` and no clock that
expires it (0.10.0); the settled answer served through both a promise and a result, from one shared
builder, so a fold and a later poll cannot teach two different things (0.10.0); the consent invariant —
a `transitionId` is minted only by an executed fire, which is why an awaited call is structurally
incapable of blocking on a person (0.10.0); and the approval gate in which a human's yes is a POINTER
to a decision the app recorded, never a boolean the agent asserts (0.7.0).

### What 1.0 does NOT include — and why that is safe

Three things are designed on paper and deliberately not built. Each is **additive**: it adds a field an
app may declare and a key a result may carry, and adds nothing to any published union. So 1.1 can ship
any of them without touching a name this release just froze, and an app that declares none of them
cannot tell the difference.

- **`humanDecides`** — the word for a choice that is the *person's* to make, where the library holds
  nothing: no card, no gate, no refusal, just a flow in someone's hands
  ([`docs/design/human-decisions.md`](docs/design/human-decisions.md)). Every near word we have —
  `awaiting-human`, blocked, disabled — describes something the SYSTEM holds, which is why none of them
  was quietly reused for it.
- **`blockedBecause`** — the app's own sentence for *why* a control is blocked and *who* clears it
  ([`docs/design/context-engine-api.md`](docs/design/context-engine-api.md)). `unblockedBy` above
  answers the derivable half honestly; the authored half is gated on the field evidence that would say
  what it must carry.
- **Conditional destinations** — `goTo` growing a second, condition-bearing form
  ([`docs/design/conditional-destinations.md`](docs/design/conditional-destinations.md)). This one
  changes what an app DECLARES and touches an existing law (arrival corroborates against one target),
  which is exactly why it got a design round instead of a release.

Shipping a name badly is the expensive mistake; shipping it late is not. Waiting costs a minor version.

### Compatibility

**This is the breaking release, and the renames are the whole of the break.** No mechanism changed
behaviour, no union grew or shrank, and no result gained or lost a field except the two additive reads
above. The six string literals that changed spelling are named in the migration; the authored
sentences that carry them changed only where the word inside them did.

One behaviour is genuinely new, and it exists to make the break loud: an old authoring key now THROWS
where 0.11 would have read it. That is deliberate — silence there would have compiled an empty graph.

The new reads are additive and presence-only: `unblockedBy` appears only on a row the app switched off
and only where a declaration answers, `inFlight` only where a fire or a `busy` label proves it, and
`howToReach` is a read nobody has to call. An app that declares nothing new sees nothing new.

117 test files, 1902 tests, and 100% coverage on all four metrics (statements 3639/3639, branches
2922/2922, functions 686/686, lines 3109/3109).

### The route reaches the agent

`whats_here` takes an optional `routeTo`: name a page and the reply carries the declared hops from
here, each naming the action whose claim makes it. Of the three contexts this library serves — the
map, the traversal, the actions — traversal was the thin one: a model was told where it *is* and had
no way to ask how to get somewhere.

It is **not** a sixth tool. The fixed tool array is a contract whose bytes are identical for every
caller on every turn, so the answer rides a call the model already makes; a pinned test proves naming
a destination changes none of those bytes. The route's laws travel onto the wire unchanged: fewest
hops is arithmetic and not a recommendation, a declared hop is not a promise that it is open, and
"nobody declares a way there" is said as exactly that rather than as "impossible".


## [0.11.0] - 2026-08-01

**A refusal that names the wall must also name the door** — the sentence this release is measured by.

The fifth field wave arrived as a list of asks, and the adoption ledger's headline is worth saying
plainly, and respectfully: **most of what it asked for had already shipped.** The confirm gate. The
async completion wire. The busy label. The navigation claim. Every one of them was in the library
already, and every one of them was met by a team that could not find it — one of them firing its own
`confirm: true` in a loop against a gate working exactly as designed.

That is not a reading failure on their side. **A mechanism a reader cannot find is a mechanism this
library has not finished shipping**, and the channels that reach an integrator — a dev warning, a
refusal's own sentence, a page in the docs — are library surface like any other. So this release is
mostly findability, and the three code changes in it are all the same shape: **a place where the
library knew something and did not say it.**

Entirely **additive**. **No union grew** — not `FireResult.reason` (nor its lockstep twin
`GapRecord.rejectionReason`), not `EffectStatus`, `Settlement`, `StepStatus`, `FrameStatus`,
`GapReason`, nor the `Binding` kinds. No new tool, no schema change, no runtime text on any authored
sentence. 30 new tests (1660 → 1690).

Each item below says what the report asked for, what shipped instead where the two differ, and why.
Reports are unnamed by house rule; the intake is [`LIBRARY_ASK.md`](LIBRARY_ASK.md).

### The greyed button hands over its proof

**The failure.** `TOOL_DISABLED` shipped in 0.10.0 with `retriable: true` and one authored sentence
that refuses to invent a cause. That sentence is right, and for the one wire that *had* declared a
cause it was leaving the proof on the floor: `enabledWhen` is machine-evaluated to decide the refusal
and the failing half was thrown away, so the reader who cannot see the screen was handed a
**conclusion it could not name a field for**. A hole in an answer is where a guess goes, and a relay
put one there.

**Shipped.** The conjuncts that did **not** hold ride the refusal as `evidence`, in the shape
`GUARD_FAILED` already serves — and the gap-ledger row carries the same evidence, so triage sees what
the agent saw. Nothing new is computed: the gate had already computed it.

**What shipped instead, and why.** Three rules, each a test. **Only the failing conjuncts** — the ones
that held are not why the control is off. **Absent for the imperative wires** — `enabled:`,
`setEnabled(false)` and a live store row declare no conditions, so nothing is named and nothing is
invented. **Not a promise** — meeting the condition may still leave the control off through one of
those wires, and the appended sentence says so rather than starting a retry loop against a door that
never opens. The 0.10.0 sentence is **appended to, never replaced**: it stays true of every
switched-off control, and it is the one that forbids inventing a cause.
→ [Guards](https://footprintjs.github.io/hcifootprint/docs/actions/guards#enabledwhen--the-other-question)

### A navigating STEP says where it goes

**The failure.** 0.9.0 put `goesTo` on the `whats_here` action row, because a navigation declares no
`writes` and an agent watching the control it clicked reads a working link as a dead one. Inside a
skill frame, `readySteps` **is** the whole surface a planner has — and it did not carry the claim. One
edge, two readers, and only one of them told: the same failure, one surface further in.

**Shipped.** `goesTo` on a frame's `readySteps` rows, under the same key and the same rule — from the
declared `goTo`, absent when the app declared no destination, never inferred.

### The gate names the door as well as the wall

**The failure.** A production integration turned `requireHumanApproval` on and could not get past it.
Its own code fired with `confirm: true`; the gate refused, correctly — that boolean is *the agent's
claim*, not a person's answer — and the retry fired the same call again. It read as the library
refusing to work. **Nothing was missing from the mechanism:** `confirmAsk()` → `approveAsk(askId,
{ by })` / `declineAsk` → `fire({ askId })` shipped whole in 0.7.0, and the refusal was already in both
ledgers. What was missing was in the one channel that reaches an app team — the dev warning named the
**gate** and not the **door**.

**Shipped.** The warning appends an authored sentence naming `session.confirmAsk()` and the two calls
after it. **No wire changed and no result grew**: the reader who needed this is the integrator, and a
warning is where the library talks to them.

**What shipped instead, and why.** The appended half is an **authored constant** — interpolation-free,
byte-identical whatever the app calls its actions — while the half it joins names the action and the
reason word on purpose. It is the same three calls in every app, so it is the same bytes in every app,
and a hostile action description can never turn a console message into an instruction.
→ [Confirms &amp; receipts](https://footprintjs.github.io/hcifootprint/docs/actions/receipts#requirehumanapproval--make-approve-enforceable)

### The row has no `kind` — and now there is a page that says why

**The ask.** *Put a `kind` on every served row — `navigating`, `guarded`, `high-effect`, `busy`,
`disabled` — so a consumer can branch on one field instead of reading several optional stamps.* Real,
and from a team rendering the action list by hand.

**Declined, and what shipped instead.** The kinds **compose**: a Pay button can sit behind a guard,
charge a card, go to a receipt page and be mid-charge all at once, and an enum has to pick one exactly
when all four are true. **The kind of an edge is the set of declarations it carries** — and that set is
already on the row. The second reason is the deeper one: every stamp traces to one thing the app said,
which is what lets its evidence answer *that* claim. A `kind` would be this library's own word about
someone else's edge, and the question a reader may always ask here — *who said this?* — would have no
answer.

The table was still owed. It shipped as a **reading guide**: every stamp, the declaration behind it,
and what would prove it, in one page — with a test that walks a real served row and fails naming any
stamp the guide does not carry.
→ [What kind of edge am I holding?](https://footprintjs.github.io/hcifootprint/docs/actions/reading-an-action-row)

### A destination the app mints

**The failure.** *Place order* creates order `8fa2` and goes to `/orders/8fa2` — an address that does
not exist until the handler runs. The library refuses every attempt to declare it in advance, and a
team read those refusals as *this library cannot describe my app*. Both exits cost them the thing they
were protecting: dropping the destination hands an agent a working link that looks dead, and inventing
a literal (`'/orders/new'`) navigates somewhere real and wrong, which **nothing here can catch**.

**Shipped.** The cookbook, as the four declarations it actually is: a page **kind** (`route:
'/orders/:id'`), a claim by **name** (`goTo`), an `element` gesture through your own handler, and the
minted id travelling back as data (`producedFor`). Corroboration needs no special case —
`sync(matchRoute(…) ?? path)` places `/orders/8fa2` on the page by the route it declared.

**And the anti-pattern, named.** A minted destination is never a `url` binding and never a
`crossLink`: both refuse it by name rather than letting a half-address through as something that looks
wired, because **a half-address is not an address**. Both refusals are quoted in the page and pinned by
a test against what the library throws.
→ [A destination the app mints](https://footprintjs.github.io/hcifootprint/docs/traversal/minted-destinations)

### Going async — the recipe under the reference

**The failure.** The async story was documented in full and adopted in part. A team rebuilt the missing
half by hand — a transition listener and a four-second stopwatch — and shipped an answer that
**guessed** whenever the id it was handed was wrong. Every signal it was reconstructing was already a
line in its own control flow.

**Shipped.** A recipe page: four moves in the order most apps need them — return the promise (it *is*
the settlement), name the fire (`{ transitionId }` on the state rail), say you are working
(`setBusy` in a `try/finally`, `useWorking`, or a live store's `busy`), ask later (`did_it_work`) —
with a *what not to build* table naming each reflex and the door it already has. The reasoning stays
where it was; this is the page you read first.
→ [Going async](https://footprintjs.github.io/hcifootprint/docs/actions/going-async)

### Waiting on a person is a different waiting

**Shipped.** The waiting page's table gains its fifth row. Everything else on it is *the app has not
finished*; a person is not the app, and the difference is not a nicety — **nothing was fired**, so no
settlement is coming and no ceiling helps. `did_it_work` answers from the ask book when handed an
`askId`, and the authored sentence a caller receives is now quoted where the question is asked.

### Decision ownership — designed, not built

**The hole.** `requireHumanApproval` answers *may the agent act*. It says nothing about the other way a
person is inside a flow: **some choices are the person's to make** — which plan, which shipping speed,
whether to sell at all — and the agent's correct move there is to present options and stop. Every near
word the library has (`awaiting-human`, blocked, disabled) describes something the **system** holds: a
card, a gate, a grey button. Here the system holds nothing.

**What shipped: a design note, and nothing else.** The two concepts are named apart, and neither ever
borrows the other's words — one vocabulary for both would teach a model that presenting options is a
form of asking permission. The resumption law is written down: a maker is named **only** by the
identity-bearing rungs of the attribution ladder, and absent everywhere else — never inferred, never
defaulted, never `'user'` unless a door that carries identity said so. And nothing would fire by itself.

**No API shipped — not even a type.** There is no `humanDecides`, no `session.decisions()`, no
`session.skillStanding()`, no frame list and no facts line. An earlier cut of this release carried the
*types* ahead of the runtime; they were removed before release, because a field an author can declare
and the library silently ignores is the very failure this wave was reported to us for. The design is
settled and the implementation is a later release.

**Why disclosure rather than a gate, decided in advance.** Enforcement mints refusal words, and
`FireResult.reason` and `GapRecord.rejectionReason` grow only in lockstep — the cost that keeps a
refusal word expensive. An agent that fills the decision anyway will be **disclosed as the agent**,
which is a posture that survives.
→ [the design note](docs/design/human-decisions.md)

### Compatibility

- **No published union grew.** `FireResult['reason']`, `GapRecord['rejectionReason']`, `EffectStatus`,
  `Settlement`, `StepStatus`, `FrameStatus`, `GapReason` and `Binding['kind']` are byte-identical.
- **`TOOL_DISABLED` gained an optional `evidence` field.** Every existing arm reads exactly as before;
  the key is absent wherever the app declared no condition.
- **`readySteps` rows gained an optional `goesTo`.** Absent when the app declared no destination.
- **One dev warning got longer.** Text on the `onWarn` channel, appended to what it already said.
- **No new types at all.** `HumanDecides`, `DecisionStatus` and `SkillStanding` are **not in this
  release** — not exported, not declared, not present. An earlier cut of these notes described them as
  unexported declarations that ship without a runtime; that cut was written before they were removed
  (see *Decision ownership — designed, not built* above), and the sentence outlived the code it
  described. Corrected here rather than quietly dropped, because a changelog that edits away what it
  once said is no more checkable than the API it is documenting.

## [0.10.0] - 2026-07-31

**Working is not broken, and a clock is not a verdict** — the sentence this release is measured by.

A production integration reported an agent that poked a working control in a loop. The app had put
the button into its saving state, exactly as it does for a person; the row a model reads had no word
for that; so the one reader who cannot see a spinner met a mid-flight control the way it meets a
broken one — and did the two things you do about broken. It fired again. Then it told the human the
app had failed.

Underneath were four questions with no honest answer available, all of them about the same window:
**the app is doing something, and nothing a reader could see said so.** Is this control switched
off? Is it working right now? Is my app still finishing after the receipt was written? And can I
just have the answer in the turn I asked? Four surfaces answer them now, and **not one of them is a
timer**: nothing in this library expires a busy label, ages out a work row, or turns a long wait into
a fate. A fifth thing ships beside them and is deliberately not a surface — a React hook that is a
lifecycle over two of them, and can never say anything they could not.

Entirely **additive**, and it holds the line 0.8.0 started and 0.9.0 kept: **no existing union
grows** — no new `FireResult` reason (nor its lockstep twin `GapRecord.rejectionReason`), no new
`EffectStatus`, no new `Settlement`, no new judgment word (spelled out under *Compatibility*).
204 new tests (1456 → 1660).

Each item below says what the report asked for, what shipped instead where the two differ, and why.
Reports are unnamed by house rule; the intake is [`LIBRARY_ASK.md`](LIBRARY_ASK.md).

### The greyed button reaches the model — and the refusal stops being a hole

**The failure.** A disabled control was a fact the library had held since 0.5 and served to
in-process callers only. Over the wire the agent met it by *firing* it, and got a bare typed refusal:
`TOOL_DISABLED`, and nothing else. A relay filled the silence in itself — it told its human *"a
required field is probably empty"*, which nothing in the app had ever said — and then tried again. A
guess wearing the shape of a diagnosis is the one failure this library exists to make impossible, and
an answer with a hole in it is where the guess goes.

**Shipped.** `enabled: false` on the `whats_here` action row, from all four wires that already say it
(registration, the group handle, a live store row, a declared `enabledWhen`), so disabledness is
disclosed **before** anything is reached for. **Presence-only**, like every other stamp on that row:
a clickable control carries no key, because `enabled: true` on some rows would make its absence on
the rest read as *nobody knows*. Reach for it anyway and the refusal now carries **`retriable:
true`** — a state can change — beside one authored sentence that names what IS true (the app switched
it off), says out loud what is **not** known (why), and names the move worth a turn.

**What shipped instead, and why.** No cause, ever. The obvious "helpful" version explains *why* a
control is off, and this library does not know: `enabledWhen` can say which condition failed, four
other wires can say nothing at all, and one sentence covering both would be a diagnosis on the days
the app never declared one. So the sentence refuses to supply a reason and tells the reader not to
invent one — and it is an authored constant, byte-identical across two apps, so no runtime text can
ride it. → [Guards](https://footprintjs.github.io/hcifootprint/docs/actions/guards)

### `busy` — the third state, in the app's own words

**The ask.** *Tell the agent the control is working right now, so it stops re-firing it.*

**Shipped.** `AvailableEdge.busy` on the served row and on the `whats_here` row: the app's own label
(`'Saving your draft…'`), through the same three wires `enabled` has — `busy:` at registration,
`handle.setBusy(toolId, label)`, and a live store's `LiveAction.busy`, reconciled on the emission the
app already sends when the spinner comes up. A flip is world motion (version bump + the structure
fingerprint), so a plan made against the old row is caught as stale; saying the same thing twice is
not motion, rewording it is.

**What shipped instead, and why — four refusals, and each one is the feature.**

- **A label, never a flag.** There is deliberately no boolean form. A flag says *something is
  happening* and leaves the meaning to whoever renders it, which would put the serving layer in the
  business of authoring a sentence about a state only the app can describe. A boolean, a number, an
  empty string: refused at all three doors with one warning per action, and the row keeps saying
  nothing rather than saying a guess. A refused label never clears a standing one — `undefined` is
  the clear, and nothing else is.
- **No `busyWhen`.** A condition can prove a **state**; it cannot write **prose**. `enabledWhen`
  needs no words, so it has a declarative form; this one would have to invent them.
- **No `TOOL_BUSY`, and nothing is gated.** Busy is what the app *said*, not a door the app *shut*: a
  busy control that is not disabled still fires, because the library never invents a gate an app did
  not declare. An app that means *and nobody may press it* disables the control, and the existing
  refusal answers. A refusal on a control that is **also** busy carries the label as data and the
  busy sentence **beside** the refusal's own — alongside, never over, and it says out loud that it is
  not the cause of the refusal it sits next to.
- **Nothing is read off the screen**, and there is **no timer**. No `aria-busy`, no spinner-hunting —
  the sensor's own law. And nothing expires a label: a busy that outlives anyone's patience is
  answered by the row still saying busy and `did_it_work` still saying `still-pending`, which is the
  truth. The ceiling belongs to the caller, and a caller who stops waiting reports **unfinished** —
  never done, never failed. →
  [When a control is busy](https://footprintjs.github.io/hcifootprint/docs/actions/when-a-control-is-busy)

### The app says what it is **still** working on

**The failure.** A fire comes to rest when the app reports its delta — and the app may keep working
long after: the upload continues, the job runs on, the save's spinner outlives its receipt. Every
*what is still live?* door answered **nothing** about that window: `pending()` had settled the
record, the settlement latch had been dropped, and the ask book was never about fires. So a model
polled `did_it_work`, got a settled receipt, and told the person it was done — about work that was
still running. A confident emptiness is the answer this library keeps closing.

**Shipped.** A work ledger the app writes: `session.beginWork(label?, { transitionId? })` hands back
a `WorkHandle`, `work.done()` closes it, and `session.openWork()` is the third live door beside
`pending()` and `awaitingSettlement()`. Binding is decided at call time from three homes — the
`transitionId` you name, the fire whose handler you are inside (before its first `await`), or
**unbound** at principal `'system'` with one dev warning per callsite, because work never runs
silently and a row that claimed a fire nobody named would claim a relationship nothing can check.
`did_it_work` gains **`stillWorking: true`** with an authored sentence, on the `still-pending` arm and
**beside** the settlement receipt exactly as `outcomeNow` does. The facts block gains one line for
bound rows (the action's own name, registry-derived) and one authored constant for unbound work.

**What shipped instead, and why.**

- **`done()` settles nothing** — not even `done(error)`, which is recorded on the work row only. The
  failure spine stays the three doors it has always been: a handler throw, a returned `{ok: false}`,
  `reject()`. A `done()` that resolved a settlement latch would fork first-settlement-wins — two
  independent things racing to write one receipt — and let an app's note about its own bookkeeping
  arrive first and *become* the library's verdict on an action.
- **No recency arm, and no FIFO arm.** A work row is opened by app code that either knows its fire or
  does not; a guess would be right exactly when nothing was racing, and unfalsifiable precisely when
  the timing is interesting. Unbound is the honest floor, and it is loud.
- **No new judgment word**, because the fate already has one: `stillWorking` rides the arms that say
  it correctly rather than minting a second word for the same thing.
- **No timer, and the leak is documented rather than fixed by one.** Nothing expires a row — *it has
  been a while* is neither done nor failed — so an un-closed handle keeps answering *still working*
  and stays visible in `openWork()` for the session's life, by design. Pair it like a lock
  (`beginWork` in the `try`, `done()` in the `finally`).
- **It is not world motion.** Opening or closing work bumps no version and changes no served row: a
  plan made before the app started working is not stale, and bookkeeping must never refuse a fire. →
  [When the app is still working](https://footprintjs.github.io/hcifootprint/docs/actions/when-the-app-is-still-working)

### Waiting for the app — one settled answer, served through two doors

**The ask, as specified.** *Let the tool call wait*: `awaitSettlement: true` and `timeoutMs` as
arguments on `do_action`, so a caller could ask for the final truth in the turn it fired.

**Why the shape was refused — three settled designs, named plainly.**

1. **The fixed tool array.** Mode B's whole design is a tool set whose bytes never change, which is
   what keeps a host's prompt cache warm and removes `list_changed` churn. Two new properties on
   `do_action`'s input schema change those bytes for **every** caller, every turn, including the ones
   that never wanted the feature.
2. **`call()` is synchronous by contract.** The port hands back a result, not a promise — that is
   what lets a relay, a test double or a hand-rolled facade implement `SkillToolsPort` at all. An
   argument that only means something if the port awaits would make the contract a lie for every
   implementation that cannot.
3. **The ceiling is a fact about the waiter, never about the work.** A model-chosen minutes-long wait
   is worse than useless here: this server sends no progress notifications, so a long ceiling buys no
   patience from the host — the **client** gives up first and reports an error about an action that
   may well have succeeded. A clock may decide how long to wait; it may never decide what the answer
   is.

**The honest core shipped**, in three parts. `port.settledAnswer(transitionId)` is the settled truth
as a **result** rather than a promise — the same builder `did_it_work` answers from, minus that
tool's envelope — and `mcpServer`'s fold now spreads it. Before this the fold hand-patched three
fields it picked out by name, so a remote agent learned strictly **less** from a folded result than
the same agent learned one poll later: no `outcome`, no `verifyHeld`, no `writesObserved`, no
`arrival`, and no marker at all on a fire nothing in the app had executed — which reads as *it
worked*. Where the two overlap the settled facts win (`'pending'` was true at return time and is not
true now); everything the builder does not serve is left exactly as the port built it, and the one
fire-time word the settled facts supersede — `settlement` — is dropped rather than left contradicting
them. Three answers, and they are three different things: the facts for a fire at rest, `undefined`
while it is still in flight, and a synchronous **throw** on the ids no honest answer exists for —
one no settlement can ever exist for, and one that names both a fire and a human's open card
(`AMBIGUOUS_ID`, which `did_it_work` has always refused). Silence on either reads as *not finished*,
which is how a wrong id becomes a confident wrong answer.

The second part is documentation of a contract that already held and had never been written down in
one place: **your handler's promise is the completion signal.** Hand `registerToolGroup` the function
your app already calls and return its promise (`save: (payload) => saveDraft.mutateAsync(payload)`);
throw or return `{ok: false}` to fail. The third is the work ledger above, for the work that outlives
the fire. →
[Waiting for the app](https://footprintjs.github.io/hcifootprint/docs/actions/waiting-for-the-app)

### `useWorking` — the busy flag a component already has, on the ledger

**The ask, in two tiers.** *Give React a hook so an app never writes the `try`/`finally` by hand* —
and, as tier two, *let the falling edge settle the transition too*, so one flag could report the
whole outcome.

**Shipped — tier one, reshaped.** `hcifootprint/react` gains a second hook.
`useWorking({ busy, label, error?, tools?, session, transitionId? })` takes the boolean a component
**already** renders its own spinner from and turns its two edges into the two calls the core has
always had: rising, one `beginWork(label)` plus the label on every control handed to `tools`;
falling, `done(error)` — the error read **by presence at fall time**, because completion and outcome
arrive together — and the label taken back. Every rise is its own row (a flag that flaps three times
writes three rows; nothing is reused and nothing is deduped by recency), and StrictMode's
double-invoke is **one** piece of work: the edge detector is a ref, which survives the simulated
remount, so the row is re-adopted rather than opened twice.

**Tier two stays declined, and the hook is built so it cannot be smuggled in.** The two doors it
drives settle nothing — `done(error)` is recorded on the work row and reaches no door that answers
how a *fire* came to rest — so no arrangement of this hook can report that something worked. That is
structural rather than a rule: the session type it accepts is `Pick<Session, 'beginWork' | 'warn'>`,
a scan pins that the folder names no settlement door, and the refusal is asserted again from the
hook's own side. The failure spine stays a handler throw, a returned `{ ok: false }`, or `reject()`
(the standing declined entry, `done(error) settles the transition`).

**Each field is read at its own edge, and that is the whole timing contract.** The `transitionId` is
read where the row **opens** — the core decides where work lands at call time and never revisits a
correlation — and the `error` where it **closes**, the commit that knows how it ended. So an id that
arrives one commit late (the ordinary shape: a mutation's `isPending` flips before the function that
fires has run) does **not** move the row it missed. It is refused **out loud** — one dev warning per
component, carrying none of the app's own text, naming when the id has to be in hand — rather than
dropped in silence, because a row that merely looks right while an input the app plainly meant went
nowhere is the failure a passing suite hides. `null` is read as **absent** beside `undefined`, since
that is how React's own data layers spell *nothing went wrong* (`mutation.error` is `null` on every
clean settle) and the hook's headline example passes exactly that field; nothing else is normalized.

**What shipped instead, and why — the unmount asymmetry.** A component going away is **not** the work
ending, so the row **stays open**: closing it would mint a verdict out of silence, which is the one
move this library exists to refuse, and no timer will ever end it either. The busy label **is**
cleared, because a label is a claim about a *control* and the thing that was keeping it true has
gone. What is unknown stays open; what was claimed is taken back — one principle, two subjects,
opposite answers — with one dev warning saying so, carrying none of the app's own text.

**And the core stayed framework-free, which is the point.** The hook is a lifecycle over five plain
lines — `beginWork` / `setBusy` where the flag goes up, `done()` / `setBusy(undefined)` where it
comes down — and `test/work-framework-interface.test.ts` drives exactly those lines with no framework
loaded at all. So an Angular or Vue port is those five lines in that framework's own three moments,
and nothing in the core has to move for one to exist: `hcifootprint/react` imports **types** from the
core and nothing else, pinned at 2,399 B with no session, no sensor and no engine in the bundle. →
[Waiting for the app](https://footprintjs.github.io/hcifootprint/docs/actions/waiting-for-the-app) ·
[The React binding](https://footprintjs.github.io/hcifootprint/docs/actions/react-binding)

### Two laws written down, and a FIFO pin

`docs/design/answer-grammar.md` gains four sections — the two features above, plus two rules that
were true in the code and nowhere in prose:

- **What mints a `transitionId`** (the consent invariant): only an executed fire. No paused or
  refused result ever carries one — which is exactly what makes the served await *structurally
  incapable* of blocking on a person: a needs-confirm returns at once with the ceiling untouched. A
  test now sweeps every arm the port can produce without firing.
- **How completion is correlated:** by **call path**, never by recency. The handler rail carries its
  own identity; the state rail is told one — `updateState(delta, { transitionId })`, the
  recommendation and the only exact form. Bare FIFO is **oldest**-first, stated rather than
  incidental: it can mis-attribute, but predictably, and `effectVerified: false` is the designed
  detector. Recency would be worse than wrong — right exactly when FIFO is right too, and silently
  wrong whenever the timing is interesting. The order is now pinned by a test, so an optimization to
  *the latest one* fails loudly. The precise write-match arm is scoped where the code scopes it: it
  runs only when **every** outstanding fire's handler is still in flight. Mix the queue — one fire
  awaiting a report, one handler still running — and bare FIFO answers first, whatever keys the delta
  carries. Two fires in the air is exactly when the id is worth passing.

### Compatibility

**No existing union grows in this release** — a third release holding the line. Every new word lives
on a new optional field or a new optional member:

- `AvailableEdge.busy`, `LiveAction.busy`, `RegisterToolGroupOptions.busy` and `Registration.busy`
  are new **optional** fields; `WorkHandle`, `WorkRow` and `BeginWorkOptions` are new interfaces;
  `Session.beginWork` / `openWork` and `ToolGroup.setBusy` / `ToolHandle.setBusy` are new members.
- **`hcifootprint/react` serves four runtime exports instead of three** — `useWorking` is added and
  nothing else changed, alongside the new types `WorkingSpec`, `BusyControl` and `WorkingSession`.
  The peer range is still `*` and the subpath's real floor is still React 18, so an app that never
  imports the subpath is untouched. No core signature moved for it: the hook calls `beginWork`,
  `done` and `setBusy` exactly as an app already could.
- `FireResult.reason` and `GapRecord.rejectionReason` are **unchanged** — no `TOOL_BUSY`, because
  busy gates nothing. `EffectStatus`, `Settlement` and `GapReason` are unchanged; `stillWorking` is a
  result-level fact riding existing arms, not a new judgment. An exhaustive `never` check written
  against 0.9.0's types still compiles.
- **`ToolGroup.setBusy` and `ToolHandle.setBusy` are REQUIRED members**, and that is deliberate: both
  handles are **minted by the library** and never implemented by a consumer (`registerToolGroup` /
  `registerTool` hand them to you), so every handle in existence can say the third state rather than
  some of them. The published interfaces a consumer *does* implement grew optional members only —
  `SkillToolsPort.settledAnswer` is optional there and required on
  `SkillToolsPortWithSettlement`, which is what `skillsAsTools` returns, so a hand-written port or
  test double written against 0.9.0 still compiles.
- **No tool schema structure changed.** No new tool, no new property, no change to `required` — the
  Mode B array stays byte-identical every turn and the prompt cache stays warm. `awaitSettlement`,
  `timeoutMs` and `settleWithin` appear in no tool's bytes, pinned by a test.
- **The MCP fold now carries more fields**: a folded result that used to carry `effectStatus` /
  `data` / `error` now carries whatever `did_it_work` would say about the same id (`outcome`,
  `outcomeNow`, `effectVerified`, `writesObserved`, `verifyHeld`, `arrival`, `arrivalMeans`,
  `materialized` + `why`, `toNode`, `stillWorking` + `stillWorkingMeans`, and — only when the app has
  since moved the outcome — the `howToAct` that says to go and look). `ok` / `did` / `transitionId`
  are untouched, a missed ceiling still mints nothing at all, and there is still no way to turn the
  fold off.
- **The fold also DROPS one fire-time word**: `settlement`. It answers *does a commit bundle exist
  **yet**?* — a question whose whole meaning is "as of return time" — so on a folded payload it stood
  saying `'awaiting-state'` beside `writesObserved: true`, a fact read from the very bundle it said
  did not exist. Nothing is minted in its place; `did_it_work` has never carried the word either, so
  the two doors still agree. A result the fold did not touch (missed ceiling, nothing fired) keeps it
  exactly as before. If you branch on `settlement` over MCP, read `outcome` / `effectStatus` instead.
- **Three behavioural deltas nobody opts into**, all of them the honesty fixes above rather than new
  features, and all three visible to a 0.9.0 consumer that declares nothing new:
  1. a `whats_here` row for a control the app has switched off now carries `enabled: false`, and the
     `TOOL_DISABLED` refusal carries `retriable: true` and an authored `why`;
  2. a high-effect control that is **switched off** is refused rather than turned into a human's
     confirm card — `fire()`'s own order (capability before authority) now holds on the port's
     confirm arms too, so nobody is asked to approve something nobody can do;
  3. `port.settledAnswer` refuses — by the throw it already documented — an id this session minted
     for both a fire and a human's card, which `did_it_work` has always refused as `AMBIGUOUS_ID`.
     Over MCP the fold honours that refusal silently: the fire's own result stands untouched.
- Beyond those three, nothing changes unless you ask: absent a `busy` wire and absent a `beginWork`
  call, every served row, record and facts block is exactly 0.9.0's.

## [0.9.0] - 2026-07-31

**Everything the person on the page already knew, and the agent had to infer** — the sentence
this release is measured by. A production integration reported four walls in one wave, and they
turned out to be one wall seen from four sides: the app knew a fact, a human reading the screen
or the approval card had it, and the row a model reads did not. Five surfaces answer them — the
navigation ask needed two halves, the claim before the fire and the observation after — and where
the app declared nothing, every one of them answers with **absence** rather than a guess.

Entirely **additive**, and it holds 0.8.0's line: **no existing union grows** (spelled out under
*Compatibility*). 120 new tests (1336 → 1456).

Each item below says what the report asked for, what shipped instead where the two differ, and
why. Reports are unnamed by house rule; the intake is [`LIBRARY_ASK.md`](LIBRARY_ASK.md).

### A pause is not a failure

**The failure.** An agent hit the `needs-confirm` gate, read `ok: false` as *the app broke*, told
the person so, and went looking for another route. Nothing had happened and nothing was wrong: a
person had the question. `ok: false` is a true fact about the **call**, and the payload said
neither of the two things a reader needed — that **nothing was done**, and that the missing piece
is **a person, not a fix**.

**Shipped.** Every `needs-confirm` result now carries **`performed: false`** plus one authored
sentence saying so — the machine-readable half and the model-readable half of the same fact. All
three arms carry it: `do_action`, a skill step, and the enforced `APPROVAL_REQUIRED` refusal
(which keeps its own sentence, because it already says both halves and adds the one thing only it
knows). A low-effect action is untouched: this is the **pause** marker, not a new field on
everything.

**`did_it_work` now takes an `askId`** in the same `transitionId` property and answers from the
**ask book** — `'awaiting-human'`, `'approved-not-yet-done'`, `'approval-no-longer-valid'`,
`'declined'` — and, once the yes has been spent, forwards to the fire it authorized and answers with that fire's settlement. Before
this, a paused action's id was answered `UNKNOWN_TRANSITION` beside two lists that *structurally
could not contain it* (an ask is not a fire and never joins `pending()`), so the one question with
an answer available got the one word that says there isn't one. The refusal arm now names a third
list, `awaitingHuman`. New read: **`session.asks()`** → `AskStatus[]`, structural facts only.

**What shipped instead, and why.** The obvious shape was a new word — `'awaiting'` — on
`EffectStatus` or `Settlement`. It was refused: nothing fired, so there is no transition and
nothing that came to rest, and putting a word for *no transition exists* inside the vocabulary for
*how a transition came to rest* is a category error the type would then teach to everyone. It is a
result-level `judgment` string instead. Likewise no second tool argument: one property carries two
id families, because a grown schema changes the tool array's bytes for every caller and the port
can tell the two apart itself. The ask book is a library read rather than something a serving layer
derives, because deriving those fates from journal rows means re-implementing the gate's law beside
the gate — and a disagreement there reads to a model as *the human already answered*.

**Two refusals rather than a confident answer.** A yes the app's own `requireHumanApproval` policy
has aged out (`expiresAfterMs`, `refuseWhenWorldMoved`) reads `'approval-no-longer-valid'` and asks
for a fresh decision, because the gate will refuse a fire on it and refuse it identically forever —
telling the model to perform it would be an instruction into a loop. `AskStatus.stale` carries the
same reading for any caller, computed through the gate's own function so the two can never disagree.
And an id that names **both** a transition and a card — possible when an app names an action `ask`,
since transition ids and approval cards share the `<name>#<n>` grammar — is refused `AMBIGUOUS_ID`
naming both, rather than answered about either; the library also warns the app team at mint time,
since renaming the action is the cure.

Over MCP a pause is **never `isError`**: that flag stays reserved for a tool that does not exist
and for an unexpected throw. → [A pause is not a failure](https://footprintjs.github.io/hcifootprint/docs/actions/paused-not-failed)

### `goesTo` — the destination the human's receipt always showed

**The failure.** A navigating action declares no `writes`, so from the side of the control an
agent just fired, success and failure look identical — nothing changed, the button is still there,
the state report says what it said before. The only evidence is **page motion**. The human already
had the fact that would have said so: a confirm receipt has disclosed `willDo.navigatesTo` since
0.3.0. The agent's own action row did not. One fact, two readers, one of them told.

**Shipped.** `AvailableEdge.navigatesTo` on the served row, `goesTo` on the `whats_here` wire row —
straight from the declared `goTo`, **absent** when the app declared no destination, never inferred
from a binding or a route, and served whether or not anything is wired to make it true. A claim,
said as one. → [Navigation claims](https://footprintjs.github.io/hcifootprint/docs/traversal/navigation-claims)

### `arrival` — a claim, and whether anything corroborated it

**The ask.** Having been told where an action goes, the natural next question is *did it get
there?*

**Shipped instead: corroboration, and no verdict.** `TransitionRecord.arrival` has exactly two
values, ever. `'claimed'` is stamped when the navigation claim is written — the app said it
navigates and nothing has observed it arrive. `'observed'` means a later `sync()` landed on the
page that claim named. `did_it_work` serves both beside the settlement with an authored
`arrivalMeans` sentence, so an action can read `performed` with `arrival` still `'claimed'` — and
that pair is the truth.

**Why there is no third value.** There is no word for *did not arrive*, because nothing here can
tell one from a later legitimate hop: a sync somewhere else, or no sync at all, leaves `'claimed'`
standing forever, a session with no sync channel observes nothing by construction, and **a clock is
not evidence**. `'observed'` is corroboration and not proof of cause either — the sync row that
produced it still carries `unverifiedEdge: true`, because the cursor moved without passing a guard
and nothing in this library can see the app's router.

The match law is narrow on purpose: exact page id, or `matchRoute` over the **whole** route table
for a raw pathname — never string similarity, and never the claimed page's own route alone (a claim
on `/orders/:id` would otherwise swallow an observation of `/orders/new` that a more literal route
describes exactly). The window is one claim wide, **opens where the fire is recorded** and closes on
the next fire or the next observation — fire order on both ends, so a settlement that lands late
can neither re-open a window its own closers already shut nor take one from a newer fire. An
observation that lands while the fire is still in flight (the ordinary case: routers move before
promises resolve) corroborates it, and the claim stamped at settle does not overwrite that.

Nothing already written is rewritten: the settlement receipt taken at rest still says `'claimed'`,
`toNodeClaimed` is never flipped back, and the join bumps **no version** — it does re-emit the
record on `'transition'`, which is one extra event per corroborated fire for a consumer that
counts them. Every gesture that declares `navigatesTo` gets an `arrival`, **including `tab`**: a
tab-bound edge that declares a destination moves the page cursor exactly like any other declared
hop, so excluding it would leave a hop nothing could ever corroborate. A fire under
`allowUnmaterializedFires` says `'claimed'` and can never say more — nothing executed it, so there
is nothing for an observation to be evidence of, and `did_it_work` now carries that fire's
`materialized: false` onto the poll as well.

**The adoption step is one line**, and it is the same line that keeps `youAreOn` honest:
`session.sync(matchRoute(graph.spec.pages, location.pathname) ?? location.pathname)`.

### `holds` — what the control is holding right now

**The failure.** A model could see that an action takes a value, and could see the app's committed
state, and could not see the one thing a person looking at the screen sees for free: the draft
already in the box. So it asked the human to retype what they were looking at, or it invented a
value and fired.

**Shipped.** `AvailableEdge.holds` on the served row (`holds` on the `whats_here` row), through two
wires and only where the app already holds the value in a variable: `holds:` at
`registerToolGroup`, and the human sensor forwarding a declared control's existing `value()`
getter. One declaration, two readers of it — the payload of a gesture that happened, and the row
describing a control nobody has used yet. The per-element declaration outranks the registration
reader, and readers are released with the handlers or the declaration they came with.

**What shipped instead, and why.** A **reading, never a binding**: the fire still reads its own
payload at act time, so `holds` is a fact about the app one turn early and firing does not send it.
Read **late**, at row assembly, so it is never a cached first read. And **absence is the default**:
no reader declared, a reader answering `undefined`, a reader that throws, an action whose contract
is the author's `'none'`, a row standing for many rows of a `repeats` container — each serves **no
key**, never `null` and never a guess. So does a value this library cannot carry as data — a Map, a
Set, a Date, whose bounded copy comes out `{}` and would say *the box is empty* about a box that is
full — and so does a value whose own property getter throws (a revoked proxy, a component
mid-teardown): reading the value is part of the read, and one app object must never be able to take
down `available()` and, through the gap context, every refused fire with it. Each of those warns
**once per action**, because this path runs on every served row. There is no fallback to the app's
state and nothing is ever read off the DOM: a plausible-looking wrong value is indistinguishable, on
a row a model reads, from a right one. A `repeats` row holds nothing this library can name in v1,
and says why once.

**Redaction point 4 of 4.** What a control holds **is** the next fire's payload one turn early, so
`redactedFields.payload` governs it too — same list, same dot paths, same `'[REDACTED]'` marker.
Without that, a field hidden from the log and from the approval card would simply ride out in the
clear a turn sooner, on the row a model reads *before* it fires anything. The consent gate is
untouched: it still compares a fire against the faithful detached copy, never a rendering.
→ [What a control holds](https://footprintjs.github.io/hcifootprint/docs/actions/what-a-control-holds)

### The live-source invalidation contract

**The failure.** A store whose actions are derived from the router has **no change of its own to
announce** when the page changes: the route moved, the store's state did not, so nothing emits.
The surface after a navigation was therefore whatever the last emission left behind — the previous
page's actions, served confidently as the actions available here.

**Shipped.** The contract, stated so an app can hold up its end: *your store must emit whenever the
action surface changes; **navigation is covered for you***. `fromLiveStore` re-reads on every page
change the app reports through `sync()`, via the new optional `LiveBindingPort.whenPageChanges`
(and `Session.whenPageChanges(fn)` directly). Optional and **severable**: a hand-rolled port
without it keeps exactly the old store-emissions-only behaviour.

**Three hard edges.** Only an **observed** page change re-reads, never a claimed one — a claim moves
the cursor before the app's own handler has run, so a read there describes the page the app has not
left yet and could release the very handler the fire is one statement away from invoking. A
re-read that changes nothing is **free** — the identity ledger re-registers nothing, so it is a diff
and no world motion. And **nothing re-reads at report time**: `whats_here`, the facts block and
`available()` must never mutate the structure they are in the middle of serving.

**A failed read now says so.** A later read runs on somebody else's stack — the app's notify loop,
or the session mid-hop — so it still warns rather than throws. But the bindings left on offer are
from *before* the failure, and serving them silently presents a stale list as current fact, so it
also files **one gap row per failure streak**, cleared by the next read that works. The row's
`request` is an **authored** sentence naming the consequence, never the store's own error text —
that is your runtime string. And the row is marked `actionsMayBeStale`, which is what carries it
past the app's triage ledger into the **facts block a model reads**, as a line this library
authors: *the app could not re-read its own list of actions here*. Without that half the disclosure
reached a developer's console and the reader about to act on the list was served it as current fact
with nothing said. It is the one `'reported'` row the facts block admits, and the only one that
should ever ask for that channel.
→ [The invalidation contract](https://footprintjs.github.io/hcifootprint/docs/actions/live-bindings#when-it-re-reads--the-invalidation-contract)

### Compatibility

**No existing union grows in this release** — the discipline 0.8.0 started, held for a second
release. Every new word lives on a **new optional field** or in a result-level `judgment` string
that no published union describes:

- `TransitionRecord.arrival`, `AvailableEdge.navigatesTo` / `.holds` and
  `ReportGapOptions.actionsMayBeStale` (copied onto `GapRecord`) are new optional fields;
  `AskStatus` is a new interface, `.stale` included; `RegisterToolGroupOptions.holds`,
  `LiveBindingPort.whenPageChanges`, `LiveBindingPort.reportGap` and `SensorSession.declareHolds`
  are new **optional** members, so a hand-built port that does not implement them still compiles
  and still works.
- `'awaiting-human'`, `'approved-not-yet-done'` and `'declined'` are **not** added to
  `EffectStatus` or `Settlement`; the failed-read gap row uses the existing `reason: 'other'`
  rather than growing `GapReason`. An exhaustive `never` check written against 0.8.0's types still
  compiles.
- No new `exports` entry, no new dependency, no new peer. **No tool schema STRUCTURE changed**:
  `did_it_work` takes the `askId` in the property it already had — no new property, no type change,
  no change to `required` — so the Mode B array stays byte-identical every turn and the prompt cache
  stays warm. Two *descriptions* were edited and they are what a caller diffing tool definitions
  across versions will see: the tool's own, and `transitionId`'s inside the input schema, each
  naming the second id family.
- One capture-path fix rides along, and it is a fix rather than a choice: a **bigint** in a value
  this library bounds (`holds`, a handler's `produced`) now crosses as its decimal digits. It
  survives `structuredClone` — the usual wire bar here — and then throws in `JSON.stringify`, which
  is how every MCP result crosses, so one app value of that type used to cost the caller the whole
  answer.
- Nothing changes unless you ask: absent a `holds` reader, absent a `whenPageChanges` subscription
  and absent a declared `goTo`, the served rows and records are exactly 0.8.0's. The two deltas
  that do not need asking for: every `needs-confirm` result gains `performed` / `why` (the point of
  the release), and an `on('transition')` listener sees one extra event per fire whose edge declares
  `goTo` — the join that turns `arrival` `'observed'` re-emits the record, with nothing else about
  it changed and no version bump.

## [0.8.0] - 2026-07-30

**The human's journey lands on the same ledger as the agent's, without boilerplate** — the
sentence this release is measured by. 0.7.0 made an approval something the library can prove;
0.8.0 makes a *person's own actions* something it records, and gives the data those actions
carry a place to be hidden — hidden in the **renderings**, never in the detached copies
0.7.0's gate compares against, so an enforced approval still proves the real values.
Entirely **additive**: two new subpaths and one new opt-in option,
no existing specifier changes meaning and no existing union grows (spelled out under
*Compatibility* below).

### The four rules, stated as the contract they are

These are not style notes. They came out of a production integration that shipped the wrong
version of this and had to unship it — so each is now a rule the library **holds**, rather
than a thing every next consumer rediscovers at their own cost. (Reports are unnamed here by
house rule; see [`LIBRARY_ASK.md`](LIBRARY_ASK.md).)

1. **The app DECLARES a value. The library never reads the DOM for one.** The first cut
   interrogated the element for a value the app already held in a variable, and a component
   library's combobox — which keeps its value in state and its input's `value` empty —
   reported **empty**. Not an error: a plausible value, on the ledger, indistinguishable from
   a right one. So a payload rides a fire only from `ControlDeclaration.value()`, and the
   members a scraper would need (`checked`, `form`, `children`, a per-control `name`) are
   **absent from the element port** — an absent surface rather than a rule to remember.
2. **The sensor is record-only, through one canonical door.** Every fire it makes is
   `RecordOnlyFire` — `invoke` pinned to `false` in the type system, so an executing sensor is
   *inexpressible* rather than discouraged. The browser already ran the app's handler; the
   sensor writes the row. Two doors means one human act executed twice, which is exactly what a
   hand-written shim gets wrong on the call site everyone forgets. `hcifootprint/react`
   inherits this rather than re-deciding it, and it stays on the record-only side: the hook
   never calls `fire()` and never runs a handler, so adopting it deletes **reporting** code and
   leaves behaviour untouched. Registering the handler is deliberately *not* folded in —
   `registerToolGroup` is already the library's one mount door and it is framework-free, and a
   skin that re-derived the engine's own edge id would be silently wrong for a root tool.
3. **The agent's own synthetic clicks are never recorded as human acts.** A dispatched
   `click()` from a tool call would otherwise land as `principal: 'user'` — the ledger's single
   worst lie, because it fabricates a person. `isTrusted` is read, and a decline **names the
   edge it declined**, so a team can delete their own filter and watch this one catch the same
   events instead of trusting it blind.
4. **Value-report cadence is a library policy, not a consumer's rediscovery.** "When is a
   typed value the act?" was being re-answered per integration, wrongly and differently each
   time. It is now one dial with a stated default: `'commit'` — commit-on-blur, and exactly
   ONE `change` listener, because the browser already fires `change` when the human finishes
   and adding a `blur` listener beside it *would be* the double-row bug — or `{ debounceMs }`,
   or `'per-keystroke'`. Per watcher, overridable per
   control, and a debounced cadence with no clock is **refused** (`cadence-unavailable`) rather
   than quietly downgraded.

### `redactedFields` — the redaction `redactedKeys` never did

`redactedKeys` was consulted for **state keys** and nowhere else. So the data a transition
carries rode out untouched: a handler's return value reached the model through
`producedFor()`, the settlement and the wire; `TransitionRecord.payload` reached every
export door; and 0.7.0's `willUse.input` put the fire's input on the receipts a model
relays and into the exported confirm journal. The library documented the gap in its own
voice — *"redactedKeys governs state keys, never payloads"* — and it matters more the
moment an app returns real data through a handler.

**New, opt-in:** `createSession({ redactedFields: { payload: […], produced: […] } })`.
Dot paths (footprintjs's own `RedactionPolicy.fields` grammar), applied at the three points
where a value lands on something a caller can reach: the record's `payload`, the record's
`produced`, and the receipts' `willUse.input`. A named field that is present arrives as the
literal `'[REDACTED]'` — exported as `REDACTED`, the same marker a redacted state key
already shows in guard evidence.

- **Aimed per channel, on purpose.** `payload` governs every rendering of what a fire
  carries — the record *and* the approval card, because a field hidden from the log that
  still rides the card is not hidden. `produced` governs what a handler returns. Two lists
  rather than one, so "hide the token the API returned" can never quietly blank the amount
  on somebody's confirm card.
- **The consent gate is untouched, and it is tested.** The ask binds to a faithful detached
  copy (`bound-input.ts`) and the gate compares the fire against *that*, never against the
  rendered receipts — so an approved fire still crosses, a laundered one is still
  `APPROVAL_MISMATCH`, and a marker cannot turn a mismatch into a match.
- **A marker, never a drop.** An absent or `undefined` field stays absent (marking it would
  announce a secret that was never sent); `null` is marked; a value the library cannot read
  faithfully — a `Map`, a class instance — is hidden **whole** rather than reached into.
- **The human and the model are not separable here**, said plainly in the docs: one receipts
  pack goes to one caller, and over Mode B that caller is the model. Aim `payload` at fields
  a person does not need in order to judge the action.
- **Nothing changes unless you ask.** Absent, 0.7.0 behaviour is byte-identical — including
  the payload's reference identity on the record — pinned by its own describe block.

### `hcifootprint/sensor` — every real human click on the ledger, with no shim

An agent's actions land on the ledger by themselves. A **person's** did not, unless the app
wrote a `humanFire` call per control — one integration counted 53 lines of shim across 21 call
sites, each one a place to forget `invoke: false` and run the click twice.

**New subpath, zero dependencies, no framework required:** `watchPage(session, { root })`
attaches one delegated capture-phase listener set to the page. The watch-list **is**
`session.available().edges` and the `binding` each one carries — no selector map, no id
registry, no instrumentation config, ever. It reaches the engine through a type-only port, so
importing it drags no session machinery and no footprintjs (11.9 KB minified, pinned in
`test/treeshake.test.ts`).

- **The app declares the value; the sensor never reads one.** The DOM is a *rendering* of the
  app's state, not the state — scraping it fails silently, differently per component library,
  and as a plausible-looking value, which is indistinguishable from a right one once it is on
  the ledger. So a payload rides a fire only from `ControlDeclaration.value()`, and otherwise
  there is **no `payload` key at all** — never `payload: undefined`, never `{}`, never `''`,
  which is the shape that once overrode an app's own authored default. The members a scraper
  would need (`checked`, `form`, `children`, a per-control `name`) are absent from the element
  port: an absent surface rather than a rule to remember. A declared value is still validated
  by the app's own schema at the door, because that gate is source-blind.
- **Two evidence levels, and the order is the design.** DECLARED (`attach()` — object identity,
  may carry a value and an instance) beats RECOGNISED (role + accessible name against the
  graph's own locators, which may never carry a value). Unique → reported; two or more →
  refused, never picked.
- **A control can say a gesture is not the act yet** — `ControlDeclaration.commits`, asked at
  the moment of the gesture. It exists because of the confirm button, where the obvious move is
  wrong: an app that stops handing the element over while it is unarmed does not stop the
  report, it only moves the answer to the RECOGNISED level, which reads the button's *resting*
  label — the action's own locator — and records a delete that never happened. `false` is
  **silence**, and since a declaration outranks a name match on the same element it closes both
  levels at once. That is a per-element, per-moment stand-down; `reportedElsewhere` is per-edge
  and page-wide and could never say it.
- **Record-only in the type system.** `RecordOnlyFire` pins `invoke` to `false`, so an
  executing fire is *inexpressible* rather than discouraged. No engine change was needed.
- **One human act, one row** — three collisions, three named answers: `reportedElsewhere` for
  an app that still reports some edges itself (read once, both levels, `blocked: 'door'` in
  coverage); silence for a known control reached at a moment that is not its own (Enter on a
  button, whose real moment is the click the browser generates next); and a one-task turn
  window for a duplicate delivery of one act.
- **The agent's own clicks are not human acts.** `isTrusted` is read, and the decline **names
  the edge it declined** so a team can delete their own filter and watch this one catch the
  same events. The comment on `defaultTrust` names the seam where a future one-door `perform()`
  makes the whole class unreachable rather than merely detectable.
- **Cadence is a library policy:** `'commit'` (the default — one `change` listener, no `blur`
  beside it), `{ debounceMs }` (coalesced, last value wins, read late so nothing is buffered),
  or `'per-keystroke'`. Per watcher, overridable per control. The clock comes from the root's
  own view or `options.timers`, and a debounced cadence with no clock is **refused**
  (`cadence-unavailable`), never quietly downgraded.
- **Honest, or silent.** Eight typed report arms, none of which writes a guessed row, plus
  `coverage()` — one row per served edge, watching or unwatched with the sentence saying why
  and which of three walls it hit (`gesture`, `payload`, `door`).
- **SSR-safe by compiler.** `root` is required and the port is structural; a probe compiles the
  real `HTMLElement`/`Document`/`ShadowRoot`/`Window` against it, and a sibling probe proves
  `lib: ["ES2022"]` still refuses a browser global.

Purely additive: a new `exports` entry, no existing specifier changes meaning. 251 new tests
(1032 → 1283), each behaviour with its own mutation proof.

### `hcifootprint/react` — the sensor, one hook per control

The sensor needs no framework, and that stays true. This is the **skin** that makes it
disappear into a component: `useControl({ edge, value })` returns a ref callback, you put it
on the element, and the report call leaves your `onClick` for good.

```tsx
const ref = useControl({ edge: 'compose.send', value: () => draft });
return <button ref={ref} onClick={send}>Send</button>;
```

- **The value your component already holds.** The sensor never reads a value off the DOM, so a
  value-bearing control stays honestly unwatched until an app declares one — and a component
  is exactly the thing holding it in a variable. The getter is written inline, so its identity
  changes on every render while the control does not: the hook keeps the **newest committed**
  getter and re-declares nothing, so what lands on the ledger is what was on screen when the
  human acted. The `edge`, the `instance`, the cadence **window** and whether each getter
  exists at all are the control's *identity* — change one of those and it is re-declared.
- **"Committed" is the load-bearing word, and it is why the latest-ref is an effect.** React
  may begin a render, yield, and throw it away: while a `startTransition` re-render is in
  flight the screen still shows the previous commit, so a ref written from the render body
  holds a getter nobody has seen — and a click landing in that window makes the sensor's
  payload disagree with the app's own handler about what the human just did. The write is an
  insertion effect, which runs in the mutation phase: after a render actually commits, and
  **before** React attaches the ref that reads it — a layout effect runs after that ref and
  would attach the previous render's `edge` instead. It is also the only one of the three that
  is silent on a server.
- **A two-step control keeps its declaration and answers `commits`.** Withholding the ref while
  a confirm button is unarmed is not the way to withhold the press: see the sensor entry above.
- **A skin, not a second brain.** Recognition, payload legality, cadence and one-act-one-row
  are all still the core's. The subpath is 597 B, reaches the sensor through types alone, and
  a boundary scan pins the properties it keeps by absence: it never names `fire`, never names
  `invoke`, and `src/react` is the only folder in the package that resolves `react`.
- **An optional peer that can refuse nobody.** The subpath is the only folder that resolves
  `react`, an ordinary static import with no dynamic-specifier hatch, so a consumer who never
  writes `from 'hcifootprint/react'` never resolves it. The declared range is `*`, and that is
  the honest one: `optional` means "need not be installed", never "version ignored when
  present", so a floor written there is a rule about the consumer's **whole tree** — and
  hcifootprint does not need react at all. Measured in a clean room, `>=18` turned
  `npm install hcifootprint` into an `ERESOLVE` failure for a React 17 app that never imports
  the subpath. The subpath's floor is real and is React 18 (`useInsertionEffect`), enforced by
  the import itself, where it can only reach someone who actually imports it.
- **The first commit has no surface, and that is ordinary.** `watchPage` needs a browser root,
  so an app builds the watcher in an effect and effects run *after* the refs beneath them.
  `useControl` returns a ref that does nothing while the watcher is `null` and attaches itself
  when one arrives — which also covers server rendering, and a component used with no provider
  above it renders perfectly and reports nothing. StrictMode's setup → cleanup → setup nets to
  one declaration and one listener set.
- **Adopted in `demos/live-desk`**, which deleted seven of its nine hand-written report calls
  and the refusal plumbing with them. The three it keeps are the ones that must refuse
  **before** they act — a tab flip no DOM listener can honestly claim, and the desk's one
  guarded action — and those edges are named in `reportedElsewhere`, so one human act still
  writes one row. The desk's Clear-archive confirmation is the two-step case, and it keeps its
  declaration through both presses with `commits: () => armed`. The sensor deletes the
  *wiring*, never the pre-refusal, and the demo shows both side by side rather than papering
  over the difference.

Purely additive: a new `exports` entry and an optional peer. 43 new tests (1293 → 1336),
each behaviour with its own mutation proof.

### What the sensor cannot know — in the docs, and here

A recording surface that overstates itself is worse than none, so the limits are stated at the
same volume as the feature. Restated from
[the sensor guide](https://footprintjs.github.io/hcifootprint/docs/actions/human-sensor):

- **It does not perform anything, ever**, and it **does not read values**.
- **It cannot refuse.** It listens in the capture phase — before your handler, but still after
  the human clicked — so it records what happened and cannot stop it. A hand-written wrapper
  reports *before*, so a guard that does not hold blocks the act; here a guard that does not
  hold shows up as a refusal **on the row** rather than as an act that was prevented. If you
  need refuse-before-perform, that belongs to a wrapper door, and the choice is yours to make
  rather than ours to hide — which is why `demos/live-desk` keeps the three of its nine report
  calls that must refuse before they act.
- **It does not write visibility.** `PresenceIndex` is already the presence sensor and its own
  law applies here too: no amount of mount-counting can see CSS, so visibility stays an
  explicit signal.
- **One watcher per shadow root, and this one is a real blind spot.** The DOM *retargets* a
  composed event that crosses a shadow boundary: a listener on `document.body` reads
  `event.target` as the **host**, never the control inside it, so the sensor computes the
  host's role and name and recognises nothing. (`change` does not compose at all, so it never
  crosses.) Nothing is mis-attributed — a host presenting no role is silence, exactly as
  clicking prose is — but nothing is reported either, and **`coverage()` cannot see that wall
  to name it**: coverage speaks about your *graph*, and a locator is never claimed to resolve
  to a real element. Hand the shadow root itself in.
- **`watchLocation` is off by default**, because page ids are author-chosen names and not URL
  paths: handing `location.pathname` to `sync()` unasked moves the cursor to a page that does
  not exist, `available()` then honestly serves nothing, and the whole agent surface goes quiet.

### Docs, and the intake that produced them

- **A worked example per capability**, not one tour: [the human
  sensor](https://footprintjs.github.io/hcifootprint/docs/actions/human-sensor) and [the React
  binding](https://footprintjs.github.io/hcifootprint/docs/actions/react-binding), plus the
  redaction section on [receipts](https://footprintjs.github.io/hcifootprint/docs/actions/receipts).
  Every snippet twoslash-compiles against the built types in CI, so a renamed API fails the
  build rather than the reader.
- **[A read is an action](https://footprintjs.github.io/hcifootprint/docs/actions/reading-data)** —
  the question every integration eventually asks (*how does the agent get my app's data?*) now
  has a page instead of a chat answer. There is no *declare your data* surface, on purpose:
  declare a tool whose handler **returns** it, and the read inherits the guard, the input
  contract, the settlement and the ledger row that every action already has.
- **`LIBRARY_ASK.md`** — the standing intake. Four of this library's releases came out of
  somebody wiring a real app, hitting a wall, and the wall turning out to be ours; that input
  lived in chat logs and now lives in the repo. Ask / Evidence / Workaround / Status, with two
  house rules that matter: **no consumer names**, ever, and **declined entries stay, with the
  reasoning**, so the next person to propose the same thing finds the answer rather than
  re-deriving it.
- **Site:** the header's version badge now **retires itself by measurement** rather than at a
  guessed breakpoint — it is not drawn the moment the wordmark and the badge stop fitting the
  space the nav leaves, so no version string can overflow the bar (a fixed 400px cut was right
  only for the string it was tested against: the first two-digit minor overflowed it). And
  **npm is back on the shared bar**, in the one `LINKS` array both the homepage and `/story/`
  render from, so neither page can hold a link the other lacks.

### Compatibility

**No existing union grows in this release** — worth saying precisely, because the last two
releases could not say it. 0.6.0 grew `GapRecord.kind` and 0.7.0 grew `FireResult`,
`GapRecord.rejectionReason` and `ConfirmRecord.kind`, each with the same promise attached: a
new value is a new fact and never an old one relabelled. Here the new unions
(`SensorReport`, `Cadence`, `BlockedBy`, `EdgeCoverage.status`) live entirely on **new types
in new subpaths**, which no released consumer can be switching over. An exhaustive `never`
check written against 0.7.0's types still compiles.

- `redactedFields` absent ⇒ 0.7.0 behaviour, **including the payload's reference identity on
  the record** (the redactor returns the value untouched when no paths are named), pinned by
  its own describe block.
- Two new `exports` entries (`./sensor`, `./react`) with matching `typesVersions`; no existing
  specifier changes meaning. `attw` is clean on all six entry points.
- One new **optional** peer, `react`, declared as `*` — deliberately, because `optional` means
  "need not be installed" and never "version ignored when present", so a floor written there
  is a rule about a consumer's *whole tree*. Measured in a clean room, `>=18` turned
  `npm install hcifootprint` into an `ERESOLVE` failure for a React 17 app that never imports
  the subpath. The subpath's real floor is React 18 (`useInsertionEffect`), enforced by the
  import itself, where it can only reach someone who actually imports it.

## [0.7.0] - 2026-07-30

**An approval the library cannot prove is not an approval** — the sentence this release is
measured by. A security release, entirely **opt-in**: without `requireHumanApproval` the
behaviour is byte-identical to 0.6.0 (one field excepted, named below), so a 0.6 consumer
is unaffected until they set the option.

### `requireHumanApproval` — Approve stops being something the agent can claim

A production integration reported it, and it verified at source:
`fire('p.submit', { source: 'agent', confirm: true })` executed with an EMPTY confirm
journal. `confirm: true` was the AGENT asserting that approval happened — a boolean
in the model's own tool arguments, tied to no recorded decision — so a model that
skipped the ask was indistinguishable from one that got a yes. Two structural facts
underneath it: nothing in the library could RECORD a human approval (the only writer
of an `'approved'` row was `fire()` itself, stamping the FIRING principal on the row
that claimed to authorize it), and a direct in-process `session.fire()` ignored
`confirm` entirely — a real trust boundary, documented nowhere.

**New, opt-in:** `createSession({ requireHumanApproval: true })`. A high-effect AGENT
fire is then refused unless it carries `FireOptions.askId` — a pointer to a journal row
your own Approve control recorded — or a standing grant covers it. The proof is never a
boolean the model sets; `confirm` is deliberately absent from `FireOptions` and will
stay absent.

- **The missing half of the chain**: `approveAsk(askId, { by })`, `declineAsk(...)`,
  `alwaysApprove(id, { by, instance?, expiresInMs? })`, `revokeAlwaysApprove(...)` —
  each stamping `principal: 'user'` with **no argument to override it**, each requiring
  `by`, each returning a typed `ApprovalResult` instead of throwing (they run in click
  handlers), each answering `NOT_ENFORCED` on a session without the option.
- **One yes, one fire.** An ALLOW is single-use; the spend appends its own `'used'` row
  so an auditor can count approvals against executions, and a replay is `APPROVAL_SPENT`.
- **The approval binds to the receipts.** `confirmAsk(id, { input, instance })` puts what
  will be sent on the card (`ConfirmReceipts.willUse`), and a fire carrying anything else
  is `APPROVAL_MISMATCH`. Exact structural equality, key-order-independent; anything the
  receipts cannot hold faithfully is refused rather than guessed. It binds a **detached
  copy**, so keeping your own reference and changing it after the yes is refused rather
  than compared against itself.
- **ALWAYS ALLOW is a policy row**, scoped to the action (+ optional instance) and
  deliberately not to the input — and revocable, because a durable grant with no off
  switch is a permanent hole.
- **The decline is unforgeable too**: under enforcement `declineConfirm` records a REPORT
  and closes NOTHING *whatever `principal` it is handed* (the row carries `relayed: true`),
  so nobody can manufacture a human no or bury the pending card by asking politely. A
  human's no is `declineAsk(askId, { by })` — terminal for that askId, and it outranks a
  standing grant for the action, instance and input the person was shown whether or not
  the later fire presents the pointer. A re-ask mints a new askId, so nagging is countable.
- **A port that cannot enforce does not say it does.** The gate keys on the principal, so
  `skillsAsTools(session, { source: 'user' })` is exempt by design — it now warns when it
  is built and serves the *unenforced* `confirm`/`decline` descriptions rather than telling
  a model this app refuses what it does not refuse. New: `requiresHumanApprovalFrom(principal)`,
  the honest question for a port.
- **`groundTruth()` is bounded where an agent can mint lines**: the "awaiting the human"
  cards obey the same `maxAttempts` dial as the attempts list (oldest kept, count stated),
  so a model cannot inflate the one block it is told to trust above its own account.
- Every refused crossing lands in **both** ledgers — a `'fire-rejected'` gap row (so
  `groundTruth()` says *"did NOT happen … was refused: APPROVAL_REQUIRED"*) and a
  `'refused'` confirm row. Rows are never deduplicated; only the dev warning is.

**Nothing changes without the option** — pinned by
`test/human-approval-default-unchanged.test.ts`, and checked the only way that claim can be
checked: a 0.6 consumer compiled and run against the published 0.6.0 and against this build, and
the two transcripts diffed. The served tool schema is identical byte for byte, and so is the whole
ask → `confirm: true` → `approved` chain, `whats_here`, transitions, gaps, `groundTruth()` and the
warnings. **One field is not:** confirm-journal rows now take their `timestamp` from the session's
injected `now()` instead of `Date.now()`. A session handed a clock should use it, so this stays —
but if you inject `now` and assert on `confirms()[n].timestamp`, you will see your own clock where
the wall used to be. That is the whole difference.

One further exception was found and closed before
release: the Mode B port had begun passing the model's `input` to `confirmAsk` on every
high-effect ask, so a session with the option OFF would have started carrying user payloads
in `receipts.willUse` and in the exported confirm journal. It is passed only where it binds
something now; call `confirmAsk(id, { input })` yourself if you want the card to show it
either way.

#### Note for anyone switching exhaustively on `FireResult` or `ConfirmRecord.kind`

Both unions widen. `FireResult` gains `APPROVAL_REQUIRED`, `APPROVAL_SPENT`,
`APPROVAL_MISMATCH`, `APPROVAL_STALE` and `APPROVAL_DECLINED` (and
`GapRecord.rejectionReason` the same five); `ConfirmRecord.kind` gains
`'always-approved'`, `'used'`, `'refused'` and `'revoked'`. As always, a new value is a
new fact and never an old one relabelled — read the ones you know and let the rest fall
through. A durable grant is a new KIND rather than a `scope` field on `'approved'`
precisely so an older filter cannot silently miscount it as a one-time yes. The growth
paragraph missing from `FireResult`, `GapRecord.rejectionReason` and `ConfirmRecord.kind`
is now on each type, which the 0.6.0 notes had already promised.

**Triage note:** the five `APPROVAL_*` gap rows are SECURITY rows, not missing capability.
Route them to your audit sink, never to a "what to build next" query.

**Turning it on is a two-part change,** and the second part is yours: the option makes the
gate real, and your app has to give a person a way to answer. Wire your Approve/Decline
controls to `approveAsk` / `declineAsk`. Until you do, every high-effect agent fire is
refused `APPROVAL_REQUIRED` — fail-closed on purpose.

**And the honest limits, in the docs rather than in a footnote.** The gate proves a row of
the right kind, from the right principal, for this action and this input, exists and has
not been spent. It does not prove a particular person authenticated (`by` is your string),
and it cannot verify that your app keeps `approveAsk` out of the model's reach — the option
moves approval onto a channel the model does not write *by a convention you uphold*, not by
a proof the library can offer. It keys on the PRINCIPAL, so a direct
`fire(id, { source: 'agent' })` IS gated while the app-self-report tier (`'user'`,
`'system'`, `invoke: false`) is not: hand a model a port built with `source: 'user'` and
you have disarmed this gate — the library warns and stops claiming the gate, but it cannot
stop you. See [D24](docs/design/d24-enforced-approval.md), whose *Round two*, *Round three*
and *Round four* sections record every forgery an adversarial review landed against this
feature and what each one cost to close.

**The payload the gate proved is the payload that executes.** The last pass found the other
half of the copy the ask binds to. The FIRE's payload was not copied: the gate read it, and
`fire()` returns synchronously while the handler runs on the next microtask — so a plain
`payload.total = 999999` on the following line was enough to have the gate prove `10` and the
handler receive `999999`, with the confirm journal reading ask → approved → used and
`transitions()[0].payload` reading `999999` against a card that said `10`. The gate now reads
your payload **once** and the comparison, the record and the handler all read that one
reading; a payload it cannot copy faithfully is refused `APPROVAL_MISMATCH` /`cannot-judge`,
because it cannot prove what such a value will be when the handler reads it. **The one thing
to know:** in a session with `requireHumanApproval`, a high-effect agent fire hands your
handler a structural copy rather than your object — send plain data in a high-effect payload,
not a `Map` or a class instance. Without the option nothing changes: your handler still
receives your own object, pinned by its own tests.

## [0.6.0] - 2026-07-29

**A production integration's four remaining workarounds are now deletable** — the
number this release is measured by.

1. **The settlement relay** — a transition listener keyed by `transitionId`, a
   four-second ceiling, and a rewrite on the relay's send path, all written because
   `whenSettled` is a promise and a promise cannot cross a tool boundary. The settled
   truth crosses it now: `settlementOf` / `settlementIfKnown` in process,
   `port.whenSettled` for a relay holding only the port, and a `did_it_work` tool for
   the remote agent — with a ceiling at the MCP boundary that decides how long to
   wait and never what the answer is.
2. **The ~60 lines of before/after DOM signature comparison per action** — written
   because a radio fire returned `effectStatus: 'performed'` while nothing got
   selected, and a wizard's Next returned 'performed' while the button it clicked was
   DISABLED. Declare `verify` and the app's own checks outrank a handler that merely
   returned; declare `enabledWhen` and a greyed button is served as greyed.
3. **The three hand-written nav tools attached to all 28 pages** — written because a
   route table contributed pages and ZERO actions, so an agent on a wizard page
   truthfully answered that there was no action that would take you to the Projects
   list, and looped. `fromRoutes(routes, { crossLinks: true })` turns each page into
   the one action a route can honestly describe: **go to this address**.
4. **The `value: ""` sent to click-only controls** — a uniform relay contract's empty
   string that reached the handler and OVERRODE authored defaults. `input: 'none'` at
   the authoring door, `expects: 'none'` on the wire, and a blank payload erased
   rather than obeyed.

Two failures nothing in the field had a workaround for. With nothing to check itself
against, a model narrated an entire flow — *"name set, recipe selected"* — having
called ZERO tools; its own prose had become its context. `groundTruth()` is the block
that outranks the conversation, and a refused attempt (a gap-ledger row, never a
transition) is finally visible in it. And **a room with no doors now names itself**: a
`kind: 'dead-end'` row where an agent fire of every served action would refuse
`NOT_MATERIALIZED`, recorded without anyone having to fire for the trap to exist —
while a closed guard is NOT a missing door.

**Nothing released breaks**, and the two changes that would have broken something were
caught by the final review and made additive instead of shipped.
`SkillToolsPort.whenSettled` is **optional** on the published interface — the first cut
required it, which is a compile error in code that never asked for the feature — and
the factory returns the new `SkillToolsPortWithSettlement`, where it is required, so a
caller holding the factory's port never checks for a door the library always provides.
`GapRecord.kind` gained a fourth value, `'dead-end'`, as a new FACT and never a
relabelled old one: a released consumer's filter (`kind === 'fire-rejected'`,
`rejectionReason !== undefined`) returns exactly the rows it always did. Both promises
are pinned by `test/non-breaking.test.ts`, a type test as much as a runtime one. The
one consumer shape a growing union does cost is an exhaustive `never` check over the
old set, which is why the growth is now a stated contract on the type itself — read the
kinds you know and let the rest fall through. `SkillDef2` remains as a deprecated alias
for `JourneyDef`, so 0.5.0 code keeps compiling. See the two "Note for anyone…"
sections below.

### Added (grounding — the app's own record, and the app's own checks)
- **`session.groundTruth({ sinceVersion?, maxAttempts? })` → `{ node, version, text }`,
  and `facts` on every Mode B `whats_here` result.** The authoritative block: position,
  then every ATTEMPT and how it came to rest, then any decision the human still owes and
  any fire the app has not answered — under a header telling the model it outranks
  anything said in the conversation. Reported by a production integration: with nothing
  to check itself against, the model narrated an entire flow ("name set, recipe
  selected") having called ZERO tools — its own prose had become its context.
  `contextBrief()` could not have prevented it, and the reason is structural rather than
  cosmetic: a REFUSED fire is a gap-ledger row, not a transition, so a narrative built
  from transitions can never show a failed attempt. This merges BOTH ledgers, ordered by
  cursor version (a proof, not a heuristic: a refusal never bumps the version and a
  recorded fire bumps it immediately, so every row at version V sits inside the window
  that ONE transition closed).
  Nothing is rounded up: only a committed fire whose declared effect was observed earns
  "DID happen"; a fire nobody could check says "ran, but the effect was unobservable";
  a refusal, a rollback, a tour no-op and a failed verify all say "did NOT happen"; a
  fire still out says "not yet known". With nothing attempted it states the
  anti-narration line outright — *No actions have been performed in this app this
  session.* — and behind a `sinceVersion` cursor that would be false it says the cursor's
  own truth and counts what it hid instead.
  Deliberately EXCLUDED: state values and payloads (the two-string-class invariant
  extended to history), produced data, available actions and skills (options are
  `whats_here`'s other half — facts are what happened, so the two stay non-overlapping
  and both stay lean), 'reported' gap rows and all runtime free text, and any
  interpretation. An id the graph does not have renders as a constant rather than
  echoing a model's own invention back at it, the discipline `#nodeLabel` already
  applies to off-graph page names.
- **`verify` on a tool/affordance — the app's own answer to "did that actually
  happen?"** Either a `WhereFilter` over projected state (`{ 'wizard.recipe': { ne: '' } }`)
  or a SYNCHRONOUS predicate handed a DETACHED state snapshot, whose closure may read
  whatever the app can (the DOM included). Reported by a production integration: a radio
  fire returned `effectStatus: 'performed'` while nothing got selected, and a wizard's
  next-button returned 'performed' while the button it clicked was DISABLED — the agent
  looped five times, correctly, on the information it was given. Their workaround was
  ~60 lines of before/after DOM signature comparison per action.
  Evaluated AT SETTLEMENT, at exactly the three points a fire comes to rest as a success
  (an attributed state report, a tapless handler completing, a synchronous commit whose
  handler completed). Holds → nothing changes. Fails → the settlement routes through the
  existing failure spine: `effectStatus: 'refused'` (an EXISTING word — none were
  renamed), a structured `{ reason: 'VERIFY_FAILED', explanation, evidence }` on `error`,
  a claims-only commit rolled back with the honest cursor walk-back, and an
  evidence-backed commit STANDING while the settlement still refuses — both truths
  carried, neither averaged.
  `FireSettlement` gains `verifyHeld?: boolean | 'unevaluable'`, a THIRD axis beside
  `effectStatus` (did anyone perform it) and `effectVerified` (did the declared write
  keys appear). Named for the DECLARATION that produced it, never the bare word
  "verified": an axis a reader can attribute to the wrong question is one this library
  treats as unreported. What cannot be checked never refuses: an unknown state key, or a
  predicate that threw (isolated + warned), is `'unevaluable'`. A refusal needs proof —
  one false conjunct proves a conjunction false whatever the unknown keys hold — while a
  confirmation needs everything, because a wrong rejection blocks an action the app would
  have accepted and the caller has no appeal.
- **`enabledWhen` on a tool — declarative disabledness**, distinct from `when`: a failed
  `when` HIDES the control, a false `enabledWhen` SERVES it carrying `enabled: false` (a
  greyed button an agent can see) and refuses execution fires as `TOOL_DISABLED` — the
  existing retriable arm. Declare it from the same expression that renders
  `<button disabled={…}>`. `TOOL_DISABLED` now has FOUR wires reaching one refusal:
  `enabled:` at registration, `handle.setEnabled`, a live store's `LiveAction.enabled`,
  and this. Not composed with ancestor `when`s (it is the control's own state, not its
  position in the tree), and it outranks a per-instance registration — a declaration
  greys every row of a repeats container at once. Keys it cannot evaluate never disable
  anything: the library does not guess a control shut.
- **`input: 'none'` — the action that takes NO input**, accepted at all three authoring
  doors (`skillGraph().affordance`, `buildNavigationGraph`, mount-declared tools), each
  of which read the sentinel BEFORE `detectSchema` and each of which still refuses a
  schema it cannot recognize. Reported by a production integration: a uniform
  `{ value: string, required }` relay contract forced the model to send `value: ""` to
  click-only controls, and that empty string reached the handler and OVERRODE authored
  defaults, selecting nothing.
  It compiles to an additive `Affordance.noInput` FLAG with `schema` left undefined —
  deliberately not a synthetic empty JSON Schema, so MCP's no-params arm and the fire-time
  shape gate stay byte-identical. The model is TOLD (`expects: 'none'`) before it can
  guess; a payload sent anyway is refused `PAYLOAD_INVALID` (an existing arm) carrying the
  shape it sent, so it never reaches the handler; and a BLANK payload (`undefined`, `''`,
  `{}`, an object of undefined-valued keys) is accepted and ERASED — protocol residue is
  not intent. An explicit `null` is not blank: it still answers for its shape. Exactly one
  door: schema-bearing actions are untouched (`''` is a real value there — clearing a
  field) and so are actions that declared no input at all (the library cannot know, so it
  does not guess).
- **`expects` on `available().edges` — parity with the wire.** The contract Mode B has
  always served now rides the in-process surface too, from ONE shared derivation
  (`src/traverse/expects.ts`): zod normalized, plain JSON Schema detached, a
  non-serializable validator named in one authored sentence, `'none'` for an input-less
  action. The field report is a port-direct consumer re-deriving that law by hand, and a
  law duplicated at a consumer is drift by construction. The rendered form is cached by
  schema identity and deep-frozen, because `available()` is hot — every refused fire calls
  it for the gap row's context. `schema` (the LIVE validator) is unchanged beside it: the
  residual asymmetry is stated, not hidden — `available()` serves both, a served result
  carries only `expects`, and a live validator never crosses the wire.

### Fixed
- **One name never answers two questions: the settled truth's three axes are named
  apart.** `did_it_work` served `verified` as the boolean form of `effectVerified` (the
  STATE axis) while `FireSettlement.verified` meant the `verify` contract's verdict (the
  CONTRACT axis) — and the two provably disagreed in one payload: a fire whose declared
  write really landed while the app's own check answered no came back
  `verified: true` beside an error sentence saying verification failed, in the exact
  scenario `verify` was built for. The settlement's field is now `verifyHeld`, the wire's
  boolean form is `writesObserved`, and `verifyHeld` **crosses the wire for the first
  time** — the remote agent `did_it_work` exists for was previously left inferring the
  app's own verdict from error prose. Both names were unpushed, so nothing released
  changes.
- **A self-referential input schema no longer kills `available()`.** The one-place
  `expects` derivation deep-freezes its rendered contract, and its walk had no cycle
  guard — so the ordinary JSON-Schema way to describe a tree (a node whose
  `properties.child` is the node) compiled fine and then threw
  `RangeError: Maximum call stack size exceeded` on the hot path every refused fire uses
  for its gap row. The walk now carries a `WeakSet`; the schema is still frozen all the
  way down, cycle included.
- **The compiler's empty-filter refusal names the field the author actually wrote.**
  One shared check serves `when`, `enabledWhen` and `verify`, and its sentence was
  hard-coded to `when` — so an `enabledWhen: {}` author was told to *"Omit 'when'
  entirely"*, a correction pointing at a field not in their graph. It now names the
  field and what an empty one would cost (never offered / only ever disabled / only ever
  refusing), matching what the fluent builder and the mount door already said.
- **`errorText` renders a refusal the library authored in its own words.** A structured
  `{ reason, explanation }` value — the verify contract's — used to cross a tool result as
  `'[object Object]'`, the one rendering that teaches nothing. The cap still applies: a
  structured reason is not an escape hatch.
- **`updateState` removes a pending from the queue BEFORE settling it**, on all four
  attribution arms rather than two. A settlement now asks the verify contract, and a
  refusal there re-enters the failure spine, which reads that queue to decide whether the
  effect ever landed — a record still sitting in it would be read as one that never
  settled, and the later `splice(indexOf(...))` would find it gone and cut an innocent
  neighbour out at index -1.

### Added (settlement — the final truth now crosses the wire)
- **`session.settlementOf(transitionId)` / `session.settlementIfKnown(transitionId)`.**
  `whenSettled` belongs to the one caller that called `fire()`; a promise cannot
  cross a tool boundary, so a REMOTE agent — and the relay in front of it — held
  a transitionId and had no way to learn how the action came to rest (reported by
  a production integration, whose workaround was a transition listener keyed by
  transitionId, a four-second ceiling, and a rewrite on their relay's send path;
  a consumer using the port directly could not do even that). The session now
  RETAINS every settlement it delivers, so the question can be asked at any time:
  an open fire hands back its own latch (one answer, first settlement wins, never
  rejects), a fire already at rest resolves immediately with a detached copy, and
  a fire the app never reports on stays honestly OPEN — `FireSettlement` excludes
  `'pending'` by construction, so a timed-out answer could only be a guessed
  `'unobservable'`. An unknown id, or a stimulus/sync/structure-swap row, is a
  SYNCHRONOUS throw naming the fires that are live: a promise nobody will ever
  resolve is precisely how a mistyped key becomes a confident lie four seconds
  later. `settlementIfKnown` is the same law without waiting (`undefined` while
  the question is open) — what a synchronous caller needs.
  Inferred-attribution rows retain `effectStatus: 'unobservable'`: effect-signature
  inference guesses WHO acted and the library invoked nothing, so `'performed'`
  would launder the guess. The state axis is untouched (`effectVerified: true` —
  the writes really did land).
- **`<graphId>.did_it_work` — a fifth fixed Mode B tool**, input `{ transitionId }`.
  A POLL, never a wait, so `SkillToolsPort.call` stays synchronous: **settled** →
  `{ settled: true, did, effectStatus, outcome, outcomeNow?, effectVerified,
  writesObserved?, verifyHeld?, toNode?, error?, data? }`; **still open** → `{ settled: false, judgment: 'still-pending',
  did, howToAct }` — an honest answer that also tells the model not to repeat the
  action; **unknown** → `{ ok: false, reason: 'UNKNOWN_TRANSITION', pending: [...],
  awaitingSettlement: [...] }`, the `UpdateResult` vocabulary, refusing a wrong id BY
  NAME instead of soothing it
  with a "still running" it cannot know. All THREE axes cross, each under its own name:
  `writesObserved` is the boolean form of `effectVerified`, ABSENT when the answer is not
  knowable (a model testing truthiness would read the string `'unobservable'` as an
  observed write), and `verifyHeld` carries the app's own contract verdict, absent when no
  contract was declared. Neither is called `verified` — one word for two questions printed
  `verified: true` beside an error sentence saying the app's own check had answered no. A fire
  result whose `effectStatus` is `'pending'` now carries an authored `howToSettle`
  pointer naming that tool (and only then: on a fire already at rest it would buy
  a wasted turn).
- **`SkillToolsPort.whenSettled(transitionId)`** — the port's async door, delegating
  straight to `settlementOf` with its laws intact, for the relay that holds the port
  and nothing else.
- **`mcpServer(session, { settleWithinMs })` (default 250).** The one boundary where
  waiting belongs: a `tools/call` is already an async turn. A call that FIRED
  something now races the settlement against the ceiling instead of folding after
  one macrotask — settle in time and the RESULT carries the final word
  (`effectStatus` rewritten, produced data on `data`, a failure on `error`, the
  now-stale `howToSettle` dropped); miss it and `'pending'` STANDS with `did_it_work`
  named as the next call. The ceiling decides how long to wait, never what the
  answer is. `0` is the SHORTEST ceiling, not an off switch: the timer is a
  macrotask, so a settlement already in hand — or one a handler reports in the same
  microtask turn — still wins the race and is still folded in. There is no way to
  turn the fold off, deliberately: withholding an answer the session is already
  holding would be the only dishonest move available at this boundary.
- **`session.awaitingSettlement()`** → `string[]`, the ids whose settlement question
  is still open, in fire order. It is NOT `pending()` and the difference is why it
  exists: `pending()` names fires awaiting the app's STATE report, which a fire
  declaring no `writes` never joins — it still has a handler running and a settlement
  coming. Every pending fire is awaiting a settlement; not every fire awaiting a
  settlement is pending. Asked "what is still live?", `pending()` alone answered
  "nothing" about an action that was at that moment running — which is what
  `did_it_work`'s refusal was serving, leaving the wire teaching strictly less than
  the in-process throw (which has always named the open latches). The refusal now
  carries both lists, side by side: `pending` keeps `updateState`'s exact meaning, and
  `awaitingSettlement` is the superset the question is actually about. The session's
  own refusal message is single-sourced from this door, so the sentence a caller reads
  and the list a caller can query cannot drift apart.
- **`outcomeNow` on `did_it_work`'s settled arm.** A settlement is a RECEIPT and first
  settlement wins, so the record can move afterwards — `reject()` on a committed
  transition (the server saying no after the app's optimistic report) flips it to
  `'rolled-back'`. The tool's own question is *did the app actually do it*, so serving
  the receipt alone answered "it worked" about something the app had since undone — a
  fact the session was holding right there. The later word now rides ALONGSIDE
  `outcome`, never over it, with the one instruction that resolves it (`howToAct`:
  check `whats_here`). Present only on genuine disagreement: a handler that reported
  real evidence and then failed leaves the record committed by design, so it carries
  no marker.

### Note for anyone implementing `SkillToolsPort` by hand
Nothing to do — and that took a second name. `whenSettled` is **optional** on the published
`SkillToolsPort`, so an object literal that hand-implements it (a test double, a from-scratch
relay facade) keeps compiling exactly as it did in 0.5.0; `skillsAsTools` returns the new
**`SkillToolsPortWithSettlement`**, where the member is required, so a caller holding the
factory's port never checks for a door the library always provides. The first cut of this
feature put the required member on the published interface itself, which is a compile error in
code that never asked for the feature — a strange way to ship a door nobody had yet.

### Added (reachability — a spine of places you can walk between)
- **`fromRoutes(routes, { crossLinks })`.** A route table contributed 28 pages
  and ZERO actions, so an agent on a wizard page truthfully answered "there is
  no action that would take you to the Projects list" — and looped (reported by
  a production integration, whose workaround was three hand-written nav tools
  attached to all 28 pages). `crossLinks` is the opt-in that turns pages into
  the one action a route can honestly describe: **go to this address**. Each
  becomes an ordinary root-level tool — `go-to-<pageId>`, a `url` binding
  carrying the route, `goTo` making the claim (role derives `next`) — offered on
  every page in the effective graph except its own target. Opt-in, because
  inventing 28 tools nobody asked for is the other way to be wrong. `true`
  takes every page whose route is fully literal and **filters** `:param` ones (a
  blanket ask meets the literal-address law); a named subset **refuses** an
  unknown name or a paramful route at the factory, where the author is looking.
  Hand-authored `tools` with the same id win silently (the journeys precedent).
  Nothing downstream changed: the links ride `compileTool`, `gestureHref` and
  `handlerFor` exactly as a hand-written tool does, so `navigate` materialises
  them and without it a fire refuses `NOT_MATERIALIZED` carrying
  `gestureKind: 'url'`.
- **The never-trap invariant now covers the ROOM, not just the frame:
  `kind: 'dead-end'` gap rows.** When the cursor comes to rest on a page where
  an agent fire of every served action would refuse `NOT_MATERIALIZED` — no
  actions at all, or none registered, url-materialisable or instance-wired — the
  session records one row and warns once per page, naming all three fixes
  (register a tool group, pass `navigate`, add `crossLinks`). Nobody has to fire
  for the trap to exist, so nobody has to fire for it to be recorded. It is an
  observation, not a verdict: at most one row per (page, `structureVersion`),
  written from write paths only (a `sync()` page change, a fire()-claimed
  navigation settling, the coalesced structure flush) and never from
  `available()`. Armed only where materialisation is a live question —
  something registered somewhere or a `navigate` in hand, and not a tour — so a
  graph merely being read is never called a trap.

### Note for anyone switching exhaustively on `GapRecord.kind`
`kind` gained a fourth value, `'dead-end'` (0.3.0 added the third, `'unmaterialized-fire'`).
Every shipped value keeps exactly the meaning it had, and a filter for the kinds you know
(`gap.kind === 'fire-rejected'`, `gap.rejectionReason !== undefined`) returns exactly the rows
it always did — a new kind is a new fact, never an old one relabelled. The one consumer shape
this stops compiling is an exhaustive `never` check over the old set, which is why the union's
growth is now stated on the type itself, in the README, in `llms.txt` and on Sessions: read the
kind you know and let the rest fall through as informational.

### Changed (merge order — one sentence, amended in every home)
- The documented merge order gains a clause: "…nothing later in the order may
  remove anything earlier. **Routes may also contribute link tools;
  hand-authored tools win.**"

### Changed (naming — non-breaking)
- **`SkillDef2` is now `JourneyDef`.** A number-suffixed name has no business in
  a public surface; the digit only ever existed because `SkillDef` (the v1 flat
  builder's shape, `description`/`steps`/`precondition`) had taken the obvious
  one. The two types were never the same thing: `JourneyDef` is the AUTHORED
  navigation-graph vocabulary (`does`/`steps`/`when`, steps by qualified path
  or unambiguous suffix), and it COMPILES INTO the other — `does` becomes the
  skill's description, `when` its precondition. That is this library's dual
  identity (the consumer authors navigation, the agent reads skills), so the
  authored side is now named for the person writing it: a journey is the path
  someone takes through the app, and `fromJourneys()` already spoke that word.
  `SkillDef2` remains as a deprecated type alias — 0.5.0 code keeps compiling.

### Fixed
- **Mode B's `do_action` no longer answers `UNKNOWN_ACTION` about an action the
  app plainly has.** The name is resolved against the SERVED edges, so a
  guard-closed step or a control on the next page matched nothing and came back
  as *unknown* — a contradiction to a model that read that action's own name out
  of a result one turn earlier, leaving it to report the control missing or reach
  again. The typed `reason` is untouched (0.4/0.5 consumers branch on it); what
  the refusal gained is the truth the session already held. `why` names which of
  three true things is the case — the app has it on another page, it belongs here
  but its conditions are not met, or it is declared here and not being offered —
  and the conditions arm carries `evidence` (plus `guardUnevaluated`), the same
  per-condition detail a `GUARD_FAILED` fire does. `explain()` is the door it
  answers through, so no vocabulary was invented. A name the graph really does not
  have gets no `why` at all, and an ambiguous SHORT name is still answered by the
  id list: the library does not explain something it never saw, and it does not
  resolve a guess on the caller's behalf.
  The BOUNDARY is now stated where a reader looks (Ground truth, "An attempt is a
  fire the session was asked to make"): this refusal is the port's own, no
  `fire()` runs, so it lands no gap row and no `facts` line. The ledgers hold what
  the session was asked to DO.
- **`fire(affordanceId)` no longer crashes.** A JS caller who omitted the
  options object hit a raw `TypeError` reading `opts.source` (found by a
  production integration). `opts` is now optional at RUNTIME and still required
  in TypeScript, so typed callers must keep naming the principal. An omitted
  source reads as **`'agent'`** — the assumption `commitSkill()`, `confirmAsk()`
  and `skillsAsTools()` already publish — and never as `'user'`: an
  unattributed machine action must not enter the gap ledger or the commit log
  as a human one, and defaulting to `'user'` would silently disarm the
  never-trap gate (which refuses only agent fires that could execute nothing).
  An options object built at runtime WITHOUT a `source` follows the same rule.
- `createSession()` with no options (the v1 flat graph) now refuses in this
  library's voice — `unknown starting node 'undefined'. Known pages: …` —
  instead of a `TypeError`. No default is invented: a flat graph's starting
  page is a real decision, so only the refusal's voice changed.

### Documentation (the field's questions, answered where a reader looks)
- **Two new pages.** [Ground truth](docs-next/content/docs/serve/grounding.mdx) —
  the facts block's anatomy, the grading table, what it excludes and why, how to
  inject it per turn, and the rule the field failure came down to: *never feed
  the model its own prose as history*. [Guarded journeys](docs-next/content/docs/build/guarded-journeys.mdx)
  — the wizard pattern as ONE reference implementation: guarded steps,
  `enabledWhen` greying Next, `verify` proving each step, `crossLinks` as the
  always-reachable spine, `groundTruth` read each turn. Both wired into the
  sidebar (`build` after *skills*, `serve` after *receipts*).
- **A runnable example the page is written from** — `examples/guarded-wizard`
  (`npm run example:wizard`), following the demos convention: the transcript in
  the docs is that run's output, pasted, never hand-authored. Its own suite
  proves every claim the page makes, including the control case (the same wizard
  without the spine records a dead-end row and names the three fixes).
- **Cross-links** get their own section on Graph sources: the two option shapes
  (`true` filters, a named subset refuses), the literal-address law, the merge
  **phase 2.5** fold and why the source carries the REQUEST rather than finished
  tools, and hand-authored-tools-win. The amended merge-order sentence now reads
  identically in all seven live homes that quote it.
- **The dead-end gap kind** is documented on Live bindings (the
  once-per-(node, served-structure) dedup, the warning's three named fixes, why
  a guard-closed action and an off-graph cursor are different animals), with a
  paragraph on the adoption ladder: *a page where nothing can act now says so*.
- **`verify`** is written up as "proving the click did something" — both forms,
  the exact three settlement evaluation points, and the refusal's own teaching
  sentence — beside a new **`effectStatus` × `effectVerified` pairing table**
  stating outright that no word changed meaning. `enabledWhen` gets a
  hidden-vs-greyed table on Guards, with the four disabledness wires that reach
  one `TOOL_DISABLED`.
- **The `whenSettled` wire limitation** is now stated where it bites (a promise
  cannot cross a wire) together with the four doors that answer it —
  `settlementOf` / `settlementIfKnown` / `port.whenSettled` / the `did_it_work`
  tool — plus what `mcpServer`'s `settleWithinMs` fold **rewrites at the wire**,
  field by field.
- **`input: 'none'`** gets the three-statement table on The navigation graph
  (schema / `'none'` / omitted), the blank-is-not-a-value rule and its exact
  single door, the `PAYLOAD_INVALID` teaching text, and the note that a plain
  JSON Schema is now enforced. **One `expects` law, every surface** documents the
  four renderings and states the residual `schema`/`expects` asymmetry rather
  than smoothing it over.
- **A content drift gate** (`test/docs/content-drift.test.ts`): the merge-order
  sentence must be identical in all seven homes, a quoted refusal must be the
  string the library actually emits, and every page must be in its sidebar.
  Design records under `docs/design/` are deliberately NOT gated — they are
  dated records of what a numbered design decided, not living docs.
- The demos page notes Vite's `node_modules/.vite` dep cache: after rebuilding
  the library at the repo root, clear it (or `--force`) or the dev server keeps
  serving the previous build.
- **The README's test-count badge is now checked by the suite it counts**
  (`scripts/check-test-badge.mjs`, run by npm's `posttest` hook). It had read 324
  while the suite ran 806, and two commits edited the README around it without
  noticing — a number nobody can check is a claim like any other, which is the
  one thing this library says you may not ship. `npm test` writes the run's tally
  (vitest's json reporter → `.test-tally.json`, gitignored) and the gate reads it
  back, comparing BOTH spellings (the badge URL and its alt text — the alt text is
  the version a screen reader is told). It speaks only for a whole run: fewer
  files ran than exist on disk and it says *skipped*, out loud, rather than
  failing a focused `vitest run one.test.ts`.

## [0.5.0] - 2026-07-29

**A real-world FE integration's ~350 lines of integration glue rewrites to 26 lines
on this API** — the number this release is measured by.

The graph now GROWS from what the app already has. An app owns descriptions of
itself — a route table, a set of journeys — and until now each had to be
re-typed by hand into the definition, where the copy drifts the moment either
side edits. `buildNavigationGraph` accepts growable **sources**, and the graph
reads the owner's truth instead of copying it.

One behavior change to read before upgrading: **`commitSkill()` can now refuse
`ENTRY_NOT_MATERIALIZED`** where 0.4.0 opened a skill frame whose first step could
not act. See "Changed" below for the upgrade note.

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

`fire()` now tells you what actually happened. Three workarounds a real-world FE integration
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

Reported by a real-world FE integration.

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
