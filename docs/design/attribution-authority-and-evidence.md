# Who did it, who may do it, and how anyone would know

Status: LAW. Not a dated decision record; this note states rules every later build has to keep. It
governs `TransitionRecord.attribution`, `SessionOptions.attributionPolicy`, `ActionDef.principalPolicy`
/ `SessionOptions.enforcePrincipalPolicy`, `ActionDef.observability` / `SessionOptions.effectPolicy` /
`Session.observeEffect`, and anything built like them later. It is the companion to
[freshness-and-single-flight.md](freshness-and-single-flight.md), which shipped in the same release
and argues the same case about a different fact.

## Why these three, and why together

The same measurement motivates all of it:

> In **20 of 33** residual-harm rows of a preregistered campaign, the decisive warning was on the
> exact control at the exact turn and the model fired anyway.

**A warning can be ignored. A required protocol step cannot be skipped silently.**

Freshness answers *was the world still the one you planned in*. These three answer the questions a
reader of the log asks next, and each one used to be answerable only by guessing:

| question | the disclosure | the enforcement (opt-in) |
| --- | --- | --- |
| who did it, and how do we know | `TransitionRecord.attribution` | `attributionPolicy: 'strict'` |
| who is allowed to | `AvailableEdge.mayInvoke` / `decisionOwner` | `enforcePrincipalPolicy: true` |
| how would anyone see it happened | `ActionDef.observability` | `effectPolicy: { highEffectRequiresVerify: true }` |

The column split is the design. **The left column is always on and refuses nothing. The right column
is off until an integrator turns it on, and turning it off again restores byte-identical behaviour.**
Enforcement that arrives unrequested is a breaking change dressed as a safety feature.

## The boundary, restated for this build

The library owns MECHANISM and HONESTY. The app owns MEANING.

- The library can see which rung of its own ladder associated a state delta with a fire. Mechanism.
- Whether an agent *ought* to be allowed to move money is meaning, so `mayInvoke` is a declaration the
  app writes and never something the library infers from `highEffect`, from a role, or from a name.
- The library can see that nobody reported an effect. It cannot see whether the effect happened, so
  `observability` is declared and never derived from a `writes` list.

## Rule 1 — every transition says WHICH RUNG filed it

`updateState()` has always associated a delta with a fire through a ladder. Every rung used to write
the same shape of row, so a reader holding the log could not tell an observation from a guess.

Now every transition carries `attribution: { principal, basis, certainty }`. The basis set is
**closed and total**, and the certainty is read from a table (`CERTAINTY_OF`, traverse/attribution.ts)
rather than passed in — a rung cannot mint a grade for itself.

| basis | how the association was made | certainty |
| --- | --- | --- |
| `caller-asserted` | a fire came through `fire()` and named its principal | observed |
| `named-by-report` | `updateState({ transitionId })` — the app named the fire | observed |
| `handler-window` | the report arrived from inside that fire's own handler call | observed |
| `direct-call` | the app called its own `contextful` wrapped function | observed |
| `declared-stimulus` | the caller said the world moved (`stimulus` / `principal`) | observed |
| `external-report` | `observeEffect(transitionId, …)` — a source outside this client, named by the app | observed |
| `sensed-click` | an anchor saw a trusted click; WHICH action is a guess | inferred |
| `signature-match` | the delta matched one action's declared writes — a shape, not an identity | inferred |
| `queue-order` | the oldest pending fire, in arrival order | inferred |
| `unknown` | nobody named anything and nothing matched | unknown |

**`certainty` grades the ASSOCIATION between this record and the motion — never an identity, and
never a value.** `'caller-asserted'` is `observed` because this library watched the call come through
its own door; who was on the other side is the caller's word, which is what ASSERTED is doing in the
name. Provenance here is accountability for cooperating agents, not a security boundary.

`'external-report'` is graded the same way and for the same reason: the app named the transition
through this library's own door, so the association was observed. What the outside source *said* is
not what this axis measures — that claim is recorded as a report on
`TransitionRecord.observations`, and no word in the table is allowed to launder it into a verdict.
Grading it `inferred` would be the same conflation from the other side: it would use the association
axis to express a doubt about the effect.

### The fold rule — certainty only ever goes down

A fire is stamped when it happens and settled later by a report, so two rungs touch one row. What it
says afterwards is **the weakest link in that chain**:

1. A weaker rung always wins. A fire closed by FIFO is an inferred row whatever door it came through.
2. A stronger rung never wins. A fire whose ACTION an anchor guessed stays inferred however precisely
   the app then names the row. *An upgrade path is a laundering path.*
3. Among equals, the settlement's rung is the more specific fact and takes the field
   (`named-by-report` over `caller-asserted`; `external-report` over `caller-asserted`). Nothing is
   lost — the two are the same certainty — and the row gains the one thing a reader cannot get
   anywhere else: how the motion on it was placed.

A report that lands on a record **already at rest** folds nothing. It closed no question, so it must
not describe itself as having; it is appended as a new observation beside a receipt that is never
rewritten.

## Rule 2 — strict turns off the guesses, and the trade is stated

`attributionPolicy: 'strict'` turns off exactly two rungs, and nothing else moves:

- **`queue-order` is never used.** Arrival order is not evidence of anything.
- **`signature-match` must be UNAMBIGUOUS.** The default asks "do exactly one pending fire's declared
  writes all appear in this delta?". Strict asks a second question the default never does: *could
  anything else have produced this?* A second pending fire whose writes merely OVERLAP the delta is a
  plausible source too (an app is entitled to report its writes in pieces), so strict requires the
  delta to touch exactly one candidate at all.

**The trade, said plainly, because it is the whole reason this is opt-in:** an unplaceable delta is
recorded as an `'unknown'` stimulus and the fire STAYS PENDING rather than being falsely closed. A
fire that never gets its report then waits forever — visibly, in `session.pending()` and
`session.awaitingSettlement()` — instead of quietly borrowing somebody else's report. Apps whose
state taps pass `transitionId` lose nothing at all.

The STAMP is unaffected by the switch. Every transition carries its attribution in both modes,
because disclosure is never a policy.

### Refused alternatives

- **Refuse the guessy rungs by default.** That is a behaviour change for every existing consumer, and
  the honest form of "we are less sure than you thought" is a stamp, not a refusal somebody did not
  ask for.
- **A confidence number.** A score invites arithmetic across rungs that have no common unit, and it
  would let a caller threshold their way back to the guess. Three words, ordered, is the whole
  vocabulary the fold rule needs.
- **Upgrade certainty when a later rung is stronger.** This is the one rule with a named failure: an
  observed report would otherwise turn a guessed action into a fact.

## Rule 3 — three concepts, three fields, never one union

`PrincipalPolicy` holds three facts that are constantly mistaken for one:

1. **ACTOR IDENTITY** — `mayInvoke: ActorKind[]`. The one half enforcement gates.
2. **DECISION OWNERSHIP** — `decisionOwner: 'human' | 'agent' | 'either'`. Disclosure, and provably
   absent from every verdict: an owner is not a permission. Making "this is the customer's choice"
   silently mean "the agent is forbidden" would be a refusal nobody wrote. An app that wants
   ownership enforced writes `mayInvoke: ['human']` and means it.
3. **CONSENT STATUS** — `requiresHumanApproval: true`. Held to the same gate
   `SessionOptions.requireHumanApproval` applies to high-effect actions, and it mints **no new refusal
   word**: the `APPROVAL_*` set is unchanged.

`humanDecides` stays exactly what it was — disclosure, never enforcement. This is its enforceable
neighbour, not its replacement.

### Two vocabularies, and one bridge

A record FILES an act under a `Principal` (`'user'`). A policy NAMES a kind of actor (`'human'`).
They answer different questions — one is a row's provenance, one is a rule about the world — so they
keep different words, and `actorKindOf` / `principalOfActor` are the only bridge.

`mayInvoke: ['user']` is refused **loudly at both authoring doors**, with the correction in hand.
Ignoring it would silently lock a person out of their own control.

`'unknown'` is not an `ActorKind`, because you cannot grant a permission to nobody. A fire whose
principal this library never learned is refused by any declared list — the fail-closed direction.

`mayInvoke: []` is refused at authoring rather than judged at runtime: an action nobody may ever
perform is an action not to declare.

### What enforcement does not touch

The gate reads `opts.invoke !== false`. **The app self-reporting motion it already performed is
reality arriving, and refusing reality is not something a library gets to do.**

A port carries a principal (`serveToAgent(session, { source })`, default `'agent'`), which is what
makes a refusal answerable: the same graph served through a human-bound port is not gated. That is
also the sharp edge — a model handed a port built with `source: 'user'` has the gate disarmed, and
the library warns once, loudly, through the host's own sink when a session that enforces is served
through a port its policy exempts.

## Rule 4 — how would anyone see it, and the answer that is not one

`observability` is the app saying, once, next to the action, which channel an effect can be seen
through. Five words:

| word | what it claims | satisfies `highEffectRequiresVerify` |
| --- | --- | --- |
| `postcondition` | the app declared a `verify` contract — a real check | yes |
| `navigation` | the effect IS page motion, to the declared destination | yes |
| `external` | it happens where this client cannot see, and the app will report it | yes |
| `state-delta` | the declared `writes` appear in a reported delta | **no** |
| `unobservable` | the app says nobody can tell from here | **no** |

**`state-delta` is refused deliberately, and it is the point of the whole feature.**
`effectVerified` checks that the declared write KEYS appeared in the settled delta. Key presence is
not value correctness: a handler that wrote `orderId: null` satisfies it exactly as one that wrote a
real order does. The comfortable version of this feature is the one that accepts key presence and
calls it verification.

`unobservable` is refused because a high-effect action nobody can check is exactly what the policy
exists to stop. Both are perfectly legal declarations — they are simply not answers to *how would you
verify it*.

`navigation` is corroborated by a later `sync()` (`TransitionRecord.arrival`), and corroboration is
**not causal proof**. It is on the yes side because the app named a destination the library can watch
for, not because arriving proves the action caused it.

The refusal (`EFFECT_NOT_VERIFIABLE`) names which half is missing — `needs: 'observability'` when the
app said nothing, `needs: 'postcondition'` when it said something that is not a check — and the
served sentence tells a model plainly that nothing it can send will satisfy it. The audience is the
developer.

## Rule 5 — what is recorded is the REPORT, never the fact

`observeEffect(transitionId, { source, status, evidenceRef? })` is the other half of
`observability: 'external'`. A payment clears at a processor, a job finishes on a queue, a letter is
posted; the browser sees none of it, so before this door the honest answer was `'unobservable'`
forever — the library declining to guess while the app held the answer with nowhere to put it.

**The row says that a source the app named said this happened, with a REFERENCE to evidence this
library never fetches, dereferences or interprets.** Nothing here is proof the effect occurred, and
no sentence anywhere in this library says it is.

- **First report settles; every report is kept.** The first one answers the fire's open question
  exactly as a state report or a handler completing would. A later one — a reversal, a second source
  — is APPENDED to `TransitionRecord.observations` and `settled: false` says the receipt it did not
  rewrite.
- **It does not move state.** The delta is `updateState`'s job. An effect nobody here can see is
  exactly the effect whose state consequences this library has no business inventing, so a settled
  fire's `effectVerified` stays honestly `'unobservable'`.
- **It still asks the app's own `verify` contract.** A report from outside is not a licence to skip
  the app's own check.
- **It is a fourth door onto settlement.** A single-flight hold clears on it, and
  `PRIOR_FIRE_PENDING.howToSettle` names it — a sentence that listed three doors would send an
  integrator holding a webhook looking for a handler that was never going to resolve.
- **A report about a row nobody fired is refused** (`NOT_A_FIRE`), for `settlementOf`'s own reason: an
  answer filed against a row that can never have a settlement is a lie in waiting.

### And the served answer says who answered

`effectStatus: 'performed'` is the same word for a handler this library watched run and for a
sentence somebody handed in about a processor it cannot see. `effectVerified: 'unobservable'` is a
partial disclosure — it says nobody checked the WRITES, not that the verdict itself came from
outside. So `did_it_work` (and `port.settledAnswer`) serve the distinction:

```json
{ "effectStatus": "performed",
  "settledBy": "external-report",
  "reportedBy": "ops-desk",
  "evidenceOnRecord": true,
  "settledByMeans": "The word above came from OUTSIDE this client: …" }
```

Names and presence only. **The `evidenceRef` itself never crosses** — this library does not follow
it, so quoting it would dress a pointer up as a check. The app holds it; a caller that wants it holds
the session (`session.observationsOf(transitionId)`).

## What none of this says

- **No value crosses.** Action ids, actor kinds, key names, one app-authored source label under the
  same 200-character cap every app string crosses under.
- **An acknowledgement, an approval and a report are all ACTS, never understandings.** Every one of
  them proves that a protocol step was performed. None of them is evidence that anybody read a value,
  weighed a risk or comprehended a consequence, and no field on any row claims otherwise.
- **A refusal is the app's declared response to a mechanical fact**, not the library's opinion about
  the plan.
- **Nothing here is on by default.** A session and a graph that declare none of these policies serve
  byte-identical rows and refuse byte-identical fires. The three additive disclosures (the
  `attribution` stamp, the `mayInvoke` / `decisionOwner` echo on a served row, the `observations`
  trail) add facts and take nothing away.

## A carried-forward wart, recorded rather than quietly kept

`EffectStatus` contains `'refused'`, which also reads as an authority word elsewhere in this library.
It is knowingly carried forward: renaming it is a breaking change to a field every consumer branches
on, for a collision that has never produced a wrong answer. `ExternalObservation.status` mirrors the
same two words **on purpose** — they are the two answers a settlement has, and a third vocabulary for
the same fork would be worse than the echo. Recorded here so the next reader does not reopen it as an
oversight.
