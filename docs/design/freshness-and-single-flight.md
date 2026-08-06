# The tier above disclosure — offers, freshness, and one occurrence at a time

Status: LAW. Not a dated decision record; this note states rules every later build has to keep. It
governs `AvailableEdge.offerRef`, `FireOptions.offerId` / `acknowledgementId`, `ActionDef.freshness`,
`SessionOptions.freshness`, `ActionDef.concurrency`, and anything built like them later. It is the
sequel to [staleness-is-carried.md](staleness-is-carried.md), which stops one step short of this one
on purpose.

## Why there is a tier above disclosure at all

The read side shipped, was served on the exact control the harm rows fired, kept its negative control
silent — and the measured number did not move by one row. Then the write side shipped, and the
carrying rule with it. The number that matters is the one that motivated all of this:

> In **20 of 33** residual-harm rows, the decisive warning was on the exact control at the exact turn
> and the model fired anyway.

**A warning can be ignored. A required protocol step cannot be skipped silently.** That sentence is
the whole of the argument, and it is also the whole of the limit: what this build adds is a way for
an *integrator* to say that a fact must be answered for. It does not add an opinion about when it
should be.

## The boundary, restated for this build

The library owns MECHANISM and HONESTY. The app owns MEANING.

- The library can see that a key a control declares it reads was committed since that control's row
  was served. That is mechanism.
- Whether that makes firing wrong is meaning — it depends on the key, the app and the moment, none of
  which this library can see.

So the RESPONSE is a declaration (`'disclose' | 'require-ack' | 'refuse'`), and the library never
picks one. Every axis unanswered is `'disclose'`, which is byte-for-byte what shipped before.

## Rule 1 — an offer is a CITATION, and it is nothing else

`available()` stamps every served row with an `offerRef`; `fire()` may cite `{ offerId }`.

**What it is:** a pointer to a record this session wrote, printed on the row the model reads.
**What it is not:** a secret, a capability, a nonce, or a token. Holding one authorizes nothing.
Every gate — guard, payload, disabled, materialisation, human approval — runs exactly as it did.

The identity rule: **an offer's id is minted from its FACTS.** Serving the same action again under an
unchanged world hands back the same id, so two records can never disagree about one id and one id can
never quietly come to mean something else. It is also what keeps a read path (`available()` runs on
every look, every served reply and every refused fire's gap row) from growing an unbounded ledger.

## Rule 2 — a bound that can expire a citation must say so

The ledger is capped (`maxOffers`, default 500) and drops the oldest. Because that means a valid
citation can stop resolving, every consequence of the bound is stated rather than absorbed:

| what happens | what the library does |
| --- | --- |
| the cap is reached | `session.offersDropped()` counts it — on every session, silently |
| …and this session requires a citation somewhere | the integrator is warned once, naming `maxOffers` |
| a fire cites a dropped id | `OFFER_NOT_ON_RECORD` with `why: 'evicted'` |
| a fire cites a RETAINED id minted for another control | `OFFER_NOT_ON_RECORD` with `why: 'other-action'`, and `offeredFor` names it |
| a fire cites an id we never minted | `OFFER_NOT_ON_RECORD` with `why: 'unknown'` |

**The three `why` words are kept apart deliberately, and only the last is the caller's mistake.**
Collapsing any of them into `'unknown'` would let this library's own limit — or a row it is holding
one control over — be reported as a caller's forged citation.

**The warning is ADDRESSED, not broadcast.** Every session fills this ledger, because every served
row carries its offer. A dropped citation only ever COSTS anybody anything where a citation is
required, so that is the only place the sentence is said: warning a session that opted into nothing
would tell an integrator to tune a mechanism they never switched on, about a refusal that cannot
reach them. The audience test is read live at eviction time, so a session that starts enforcing later
(a mount-declared action bringing a freshness policy) still hears about a ledger that filled before
it did.

## Rule 3 — enforcement requires the citation

An enforcing axis refuses a fire that cites no offer (`OFFER_REQUIRED`). This is not a second hidden
policy; it is the only honest reading of the first one. Freshness compares *what was true when you
were offered this row* against *now*, and a fire naming no row leaves the left-hand side undefined.
Judging against "now" instead would grade every uncited fire as fresh, which makes the policy
something a caller opts out of by saying less.

## Rule 4 — an acknowledgement is an ACT, never an understanding

`acknowledgeStale` writes an append-only `StaleAcknowledgement` and hands back its id. Say the limit
out loud, everywhere the name appears:

> It records that this caller, at this state version, named this action (and optionally these keys)
> through this door. It is **not** evidence that a model read a value, understood a consequence,
> weighed a risk, or decided well.

This library never serves a value, so it cannot know that a value was read. The strongest true
statement available is that a protocol step was performed, and that is the only statement made.

Two consequences follow:

- **It is invalidated when the world moves again.** The row stamps `acknowledgedAtStateVersion`; once
  `stateVersion` moves past it, it authorizes nothing (`ACKNOWLEDGEMENT_STALE`). A step performed
  against different facts is not a step performed against these.
- **The row is never edited or rewritten.** It stops authorizing; it stays on the ledger as what it
  always was. Receipts are append-only.

**And the ledger is bounded, under Rule 2's law.** The `require-ack` → acknowledge → refire loop
writes one row per turn, so an unbounded trail is a session-lifetime leak on exactly the protocol
this build asks callers to run. `maxAcknowledgements` (default 500) keeps the most recent and drops
the oldest WHOLE — dropping a row is not editing one, and the distinction is the whole of why this is
allowed. Every consequence is said rather than absorbed: `session.acknowledgementsDropped()` counts,
the integrator is warned once, and a fire citing a dropped receipt is refused with `why: 'evicted'`
and a sentence that puts the blame where it belongs. A caller who performed the step and cited the id
we handed back must never be told they made it up.

One deliberate difference from Rule 2: **this warning is broadcast, not addressed.** The offer ledger
fills from a read path, so its sentence could reach a session that switched nothing on. Nothing
enters this ledger except through an explicit `acknowledgeStale` call, so a session that fills it
made five hundred calls of its own, and a fact about a door you used is never noise.

**Coverage:** a row that named keys covers exactly those names. A row that named NO keys covers
everything for its action — the caller made the larger statement, not the smaller one.

## Rule 5 — single-flight clears on settlement, and on nothing else

`concurrency: { mode: 'single-flight', scope }` refuses a fire made while a prior occurrence is
unresolved, returning that fire's `pendingTransitionId` and the doors that can settle it. **All
four of them:** a sentence that named three would send an integrator holding a webhook looking for a
handler that was never going to resolve, and the whole argument for a required protocol step over a
warning is that the sentence telling you how to satisfy it is true.

"Unresolved" means exactly one thing: **this session is still holding that fire's settlement question
open.** What may clear it:

| act | why it counts |
| --- | --- |
| the handler resolving or throwing | the session watched it finish |
| the app's state report landing (`updateState` with the `transitionId`) | the app reported reality |
| `reject(transitionId)` | the app said it did not happen |
| `observeEffect(transitionId, …)` | a source outside this client reported, and the app handed the report in |

What may never clear it: a **timeout** (a clock is not evidence; *it has been a while* is evidence
neither of done nor of failed), another **look**, a **question** about it, or the **caller reporting**
that the first one finished — a caller's word about somebody else's handler is precisely the
assertion this library exists to stop laundering.

**Scope declines toward refuse.** Under `scope: 'payload'` a second fire is let through only when the
two inputs are PROVABLY different, over the same canonical rendering the approval gate uses. An input
this library cannot render faithfully is treated as the SAME one: on a repeat-suppression boundary an
unprovable difference is not a difference. (Same stance as `traverse/same-input.ts`, same reason —
which mistake is unrecoverable. A false block costs one settlement wait; a false pass is the second
payment.)

**It never refuses reality.** The gate applies to fires that would EXECUTE through this session. The
app self-reporting motion it already performed (`invoke: false`, the record-only DOM sensor) passes
untouched — refusing that would be the library denying something that already happened.

## Rule 6 — where the gates sit

Ordered inside `fire()`, and the order is an argument:

```
… guard → payload → disabled → materialisation →  PRIOR_FIRE_PENDING → freshness → human approval → run
```

- **After every capability refusal**, so a control that is guard-closed, mis-shaped, greyed out or
  wired to nothing still says the word that was already true.
- **Before the human-approval gate**, under that gate's own law: never send a person to approve an
  action this session is about to turn away. A person asked to authorize a payment that is then
  refused as a repeat has been asked for nothing.

The serving layer keeps the same law: `AvailableEdge.heldByPriorFire` is a VERDICT the session
computes (`priorFireUnsettled` beside it is a FACT that refuses nothing), so Mode B stops summoning a
human for a fire it will refuse. It is stamped only for `scope: 'action'` — a narrower scope belongs
to the card or the input a future fire names, and one served row stands for every mounted card.

## What none of this says

- **No value crosses.** Key names, page ids, version numbers and session-local ids. Nothing on this
  path holds, compares or serves a value.
- **It does not say WHO moved the key.** Only that a key this control declares was committed since
  the row went out. If your own earlier fire wrote it, that is still a key that moved.
- **A refusal is not a judgement about the plan.** It is the app's declared response to a mechanical
  fact. The library refuses because it was told to, and says exactly what it was told about.
- **Nothing here is on by default.** A session and a graph that declare neither policy serve
  byte-identical rows and refuse byte-identical fires. Enforcement that arrives unrequested is a
  breaking change dressed as a safety feature.

## The honest prior

Disclosure's ceiling is measured. This tier is *expected* to change the outcome where an integrator
turns it on, because a refused fire did not happen — that much is arithmetic rather than persuasion.
What is NOT claimed is that any app should turn it on, or on which axis: the same measurement that
motivates the mechanism says nothing about which controls deserve it, and that judgement stays on the
app's side of the boundary where it has always been.
