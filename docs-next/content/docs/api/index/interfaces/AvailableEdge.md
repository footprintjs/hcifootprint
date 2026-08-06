---
title: AvailableEdge
---

# Interface: AvailableEdge

Defined in: [src/atom/types.ts:1505](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1505)

## Properties

### activation?

> `optional` **activation?**: [`ActivationLevel`](/api/index/type-aliases/ActivationLevel)

Defined in: [src/atom/types.ts:1643](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1643)

Evidence level behind "this node is active" (see ActivationLevel).

***

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:1506](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1506)

***

### binding?

> `optional` **binding?**: [`Binding`](/api/index/type-aliases/Binding)

Defined in: [src/atom/types.ts:1636](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1636)

***

### blockedBecause?

> `optional` **blockedBecause?**: [`BlockedBecause`](/api/index/interfaces/BlockedBecause)

Defined in: [src/atom/types.ts:1683](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1683)

WHY THE APP SAYS IT IS OFF, and who clears it — the app's own sentence
beside the state, present ONLY while this row carries `enabled: false`.

PRESENCE-ONLY, AND ONLY WHILE BLOCKED. A live control carries no blocked
sentence, however the app declared one: the question does not arise, and
answering it anyway would leave a reader with a reason for a door that is
open. The same presence law the served row's `unblockedBy` keeps, for the
same reason — an app that declares nothing serves rows byte-identical to
the ones it served before this field existed.

DATA, NOT A SENTENCE OF OURS. `says` is the app's runtime-adjacent text and
it never enters an authored `why` — the refusal's own words are unchanged
and still forbid inventing a cause; this rides beside them. `clearedBy`
reaches the reader verbatim, because it is the half that decides the next
move: wait, interrupt a person, or report a validation problem.

READ LATE where the app declared a reader. A function form is called at the
moment this row is assembled — never cached — so two reads a turn apart can
honestly say two different things. A reader that throws, or answers a shape
this library cannot read as a reason, serves NO KEY plus one dev warning:
absence, exactly as [AvailableEdge.holds](/api/index/interfaces/AvailableEdge#holds) does, and for the same
reason — a plausible wrong reason is worse than none.

***

### busy?

> `optional` **busy?**: `string`

Defined in: [src/atom/types.ts:1768](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1768)

THE THIRD STATE — the app says this control is WORKING RIGHT NOW, and the
value is the app's own label for it ('Saving…', 'Placing your order').

A control has three states a person can see and an agent could not: it is
clickable, it is switched off, or it is mid-flight — the spinner in the
button. Only the first two had a wire, so working looked exactly like broken
from here, and the two moves an agent makes about broken (re-fire it, or tell
the human it failed) are the two worst moves about working.

PRESENCE IS THE WHOLE CLAIM, like every other stamp on this row. A key means
the app said so. NO KEY MEANS THE LIBRARY DOES NOT KNOW — never "not busy":
an app that never wired this says nothing about any of its controls, and a
cheerful `busy: false` on all of them would be a claim about every session
that was never asked.

A STRING, AND ONLY A STRING. There is deliberately no boolean form: a flag
would leave the meaning to whoever renders it, and the serving layer would
have to author a sentence about a state only the app can describe — which is
the exact conflation this field exists to end. The label is the app's word,
carried as DATA, and it never enters an authored sentence, the facts block,
or `groundTruth()`.

THREE WIRES, mirroring `enabled`'s, so an app says it wherever it already
knows it: `busy:` at registration, `handle.setBusy(actionId, label)`, and a
live store's `LiveAction.busy`. There is deliberately NO declarative
`busyWhen` — a condition can prove a state, but it cannot author a label, and
a library-written label is a library-written meaning. Nothing is read off the
DOM either: no `aria-busy`, no spinner-hunting, the same sensor law `holds`
keeps for the same reason.

IT DOES NOT GATE THE FIRE. Busy is what the app SAID, not a door the app
shut: a control that is busy and not disabled still fires, because the
library never invents a gate an app did not declare. An app that means "and
do not let anyone press it" already has the wire that says so — disable it,
and the fire is refused as `TOOL_DISABLED` exactly as before.

THERE IS NO TIMER ON IT, EVER. Nothing in this library expires a busy label,
because a clock is not evidence (docs/design/answer-grammar.md, rule 2): a
long wait proves that waiting happened and nothing whatever about the work.
A busy that outlives anyone's patience is answered by the row still saying
busy and `did_it_work` still saying still-pending — and that pair is the
truth. THE CEILING BELONGS TO THE CALLER: stop waiting whenever you like, and
report UNFINISHED. Never done, never failed.

CAPPED, NOT REDACTED, and that is a stance rather than an oversight. The
label is authored-style app text, so it crosses under the same 200-character
law an app's error text crosses under (`src/serve/error-text.ts`) — but it is
a bare string, and a redaction path names a field INSIDE a value, so there is
nothing here for `redactedFields` to name (the same honest limit `holds`
already documents above). Write labels a stranger may read: never interpolate
a secret, a customer's name, or the payload into one.

***

### decisionOwner?

> `optional` **decisionOwner?**: `"agent"` \| `"human"` \| `"either"`

Defined in: [src/atom/types.ts:1810](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1810)

WHOSE CHOICE THIS IS, as `principalPolicy.decisionOwner` declared it. Never a
permission, in any session: see [PrincipalPolicy](/api/index/interfaces/PrincipalPolicy). Served beside
`mayInvoke` and deliberately not folded into it.

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:1507](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1507)

***

### descriptionSource?

> `optional` **descriptionSource?**: `"declared"` \| `"registration"`

Defined in: [src/atom/types.ts:1638](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1638)

See Affordance.descriptionSource.

***

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [src/atom/types.ts:1658](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1658)

False when the app says the control is currently DISABLED (a grey button:
on screen, not clickable). Served honestly with the marker — like a human
seeing it — and firing it is a typed TOOL_DISABLED rejection.

FOUR wires land here, so an app can say it wherever it already knows it:
`enabled:` at registration, `handle.setEnabled(…)`, a live store's
`LiveAction.enabled`, and the declarative `ActionDef.enabledWhen`.

***

### enumeration?

> `optional` **enumeration?**: `"selector"` \| `"mounted-window"`

Defined in: [src/atom/types.ts:1818](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1818)

Where `instances` came from: 'selector' = the declared existence source
(complete), 'mounted-window' = only what is mounted right now (partial —
stated, not silently presented as complete).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1562](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1562)

Per-condition guard evidence (key/op/threshold/actual) — why it is passable.

***

### expects?

> `optional` **expects?**: `unknown`

Defined in: [src/atom/types.ts:1592](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1592)

What a caller must SEND, wire-shaped: zod normalized, a plain JSON Schema
detached, a non-serializable validator named in one authored sentence, and
the literal `'none'` for an action that takes no input. Absent means the
library does not know the shape — never "send nothing".

Identical to what Mode B's results have always served as `expects`, from
one shared derivation, because a consumer reading available() directly was
otherwise made to re-derive library law (which kinds serialize, which
decline) by hand. The residual asymmetry is deliberate and stated: this
surface carries BOTH the live validator and the wire contract; a served
result carries only the wire contract. A live validator never crosses the
wire — that is the firewall.

Shared and deep-frozen: one rendered contract reaches every caller, the
same stance `binding` takes above.

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:1569](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1569)

Guard keys absent from the session's state view (or holding undefined —
a value guard like `ne ''` would match undefined, so an unset value is
unevaluable, not passable) — the edge is served anyway, WITH this
marker, instead of being silently hidden (D18 fix).

***

### heldByPriorFire?

> `optional` **heldByPriorFire?**: `true`

Defined in: [src/atom/types.ts:1553](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1553)

A PRIOR FIRE OF THIS CONTROL IS UNRESOLVED AND THIS CONTROL DECLARES
`single-flight` — so a fire right now would be refused `PRIOR_FIRE_PENDING`.
Presence-only, and absent on every control that declared no
[ConcurrencyPolicy](/api/index/interfaces/ConcurrencyPolicy) (the default).

A VERDICT, where `priorFireUnsettled` on the served row is a FACT: that stamp
says a fire has not come to rest and refuses nothing, on any control; this
says this session will turn the next one away. It exists so a serving layer
can keep `fire()`'s own law — never send a human to approve an action that is
about to be refused — without re-deriving a policy it cannot see.

ONLY WHERE THE ROW CAN ANSWER FOR ITSELF: `scope: 'action'`. A narrower scope
is decided by the card or the input a FUTURE fire will carry, and one served
row stands for every mounted card — so putting a per-card verdict here would
name a card nobody asked about (the same limit `busy` states).

***

### highEffect

> **highEffect**: `boolean`

Defined in: [src/atom/types.ts:1593](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1593)

***

### holds?

> `optional` **holds?**: `unknown`

Defined in: [src/atom/types.ts:1714](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1714)

WHAT THIS CONTROL HOLDS RIGHT NOW — the draft in the box, the option
currently selected — read at the moment the row is assembled.

A READING, NEVER A BINDING. The fire still reads its own payload at act
time: `holds` says what the control had when the row was served, and a human
typing between the two makes the row stale by design. So it is a fact about
the app's state one turn early, and firing does not send it.

TWO WIRES land here, and only where the app already holds the value in a
variable: `holds:` at registration ([RegisterActionGroupOptions](/api/index/interfaces/RegisterActionGroupOptions)), and
the sensor forwarding a declared control's `value()` getter. The sensor's
per-element declaration wins when both exist — most specific, the same
declaration-outranks rule the sensor's own two evidence levels follow.

ABSENCE IS THE DEFAULT AND IT IS HONEST. No reader declared, a reader that
answers `undefined`, a reader that throws, an action whose contract is the
author's `'none'`, a row standing for many rows of a repeats container: each
one serves NO KEY rather than a guess. Nothing is ever read off the DOM —
that is the sensor's law (`sensor/payload.ts`), and it holds here for the
same reason: a plausible-looking wrong value is the worst thing this library
can ship.

REDACTED like the payload it will become, through `redactedFields.payload`
— what a control holds IS the future fire's payload one turn early, and a
field hidden from the log that still rides the card is not hidden. Same dot
paths, same `'[REDACTED]'` marker, same honest limit: a path names a field
inside a value, so a control holding a bare string is named the same way it
is on the record, which is to say it cannot be.

***

### humanDecides?

> `optional` **humanDecides?**: `true`

Defined in: [src/atom/types.ts:1791](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1791)

THE DECISION HERE IS A PERSON'S — the app declared [HumanDecides](/api/index/interfaces/HumanDecides) on
this control, and the row says so before anything is reached for.

PRESENCE IS THE WHOLE CLAIM, like every other stamp on this row. A key means
the app declared ownership; NO KEY means no ownership was declared — never
"the agent's to make", which the library cannot know. There is deliberately
no `humanDecides: false`.

The row does NOT re-serve `doneWhen` (a served row carries verdicts and
stamps, not filters — the same reason `enabledWhen` itself never rides here)
and does not carry `about`: the decision surfaces do
([Session.decisions](/api/index/classes/Session#decisions), the `withTheHuman` list), and an action row stays
lean.

IT GATES NOTHING, and that has not changed: a fire of this control is not
refused, in v1 or after it. The ENFORCEABLE neighbour is a different
declaration with a different name — `principalPolicy.mayInvoke`, switched on
by [SessionOptions.enforcePrincipalPolicy](/api/index/interfaces/SessionOptions#enforceprincipalpolicy) — precisely so that an app
saying "this choice is the customer's" never silently becomes "the agent is
forbidden". Two facts, two fields, two words.

***

### instances?

> `optional` **instances?**: `string`[]

Defined in: [src/atom/types.ts:1812](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1812)

Live instance keys for a repeats-container tool (runtime DATA, never schema).

***

### materialized?

> `optional` **materialized?**: `boolean`

Defined in: [src/atom/types.ts:1560](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1560)

Present only when the session has live registrations: true = a handler is
mounted right now (fireable-with-execution), false = declared here but
nothing registered it (plannable; firing records but nothing executes —
on the current page this doubles as live binding-drift telemetry).

***

### mayInvoke?

> `optional` **mayInvoke?**: [`ActorKind`](/api/index/type-aliases/ActorKind)[]

Defined in: [src/atom/types.ts:1804](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1804)

WHO THE APP SAYS MAY PERFORM THIS — a copy of `principalPolicy.mayInvoke`,
served before anything is reached for.

DISCLOSURE ON EVERY SESSION, enforcement only where the integrator turned it
on: the row says the same thing either way, because what the app declared is
true whether or not this session refuses on it. A caller that reads it and
stops has saved itself a refusal; a caller that ignores it meets
`PRINCIPAL_NOT_ALLOWED` if enforcement is on, and is recorded acting outside
a declared policy if it is not. Presence-only — an app that declares nothing
serves the row it always served.

***

### mustCiteOffer?

> `optional` **mustCiteOffer?**: `true`

Defined in: [src/atom/types.ts:1535](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1535)

A FIRE OF THIS ROW MUST CITE ITS OFFER — presence-only, and absent on every
session that enforces no freshness axis (which is the default, so an app that
declares nothing serves byte-identical rows).

The derived half of [FreshnessPolicy](/api/index/interfaces/FreshnessPolicy): the serving layer cannot resolve
a per-action policy against a session default, and two layers deriving it
separately could disagree about one control. So the session answers once,
here, and a projection just reads it — which is also how the Mode B row knows
whether to spend tokens carrying an `offerId` at all.

***

### navigatesTo?

> `optional` **navigatesTo?**: `string`

Defined in: [src/atom/types.ts:1606](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1606)

The page this edge CLAIMS it will move you to (from `effect.navigatesTo`),
BEFORE anything is fired. Absent when the app declared none — never a
guessed destination.

A CLAIM about the app's handler, exactly as [ConfirmWillDo.navigatesTo](/api/index/interfaces/ConfirmWillDo#navigatesto)
is on the receipt a human reads. The human already had this fact at decision
time and the agent did not, which left the agent unable to know that this
edge's success evidence is PAGE MOTION rather than an element surviving:
a navigation declares no writes, so "nothing changed here" is what success
looks like from the element's side.

***

### node?

> `optional` **node?**: `string`

Defined in: [src/atom/types.ts:1641](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1641)

Owning node path in the navigation tree (e.g. 'catalog.filter-rail').

***

### offerRef?

> `optional` **offerRef?**: [`OfferRef`](/api/index/interfaces/OfferRef)

Defined in: [src/atom/types.ts:1523](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1523)

THE NAME OF THIS ROW, so a fire can cite it (`fire(id, { offerId })`).

On every row `available()` serves, whatever the session declares: an offer
is IDENTITY, not enforcement, so an app can join a fire to the row it was
planned against without turning any refusal on. Optional on the type because
a hand-built row (a test double, a relay facade) is still a valid
`AvailableEdge` — it simply names no offer.

What IS opt-in is what a stale citation COSTS — see [FreshnessPolicy](/api/index/interfaces/FreshnessPolicy).
The Mode B row stays byte-identical until a policy enforces something,
because a model that can never be asked for a citation should not be paying
tokens to carry one.

***

### presence?

> `optional` **presence?**: `"unknown"`

Defined in: [src/atom/types.ts:1648](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1648)

'unknown' when several exclusive-tab siblings are mounted and no
visibility wire exists — a flagged union, never a guessed winner.

***

### reads?

> `optional` **reads?**: `string`[]

Defined in: [src/atom/types.ts:1618](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1618)

The state keys this edge CLAIMS its outcome depends on (from
`effect.reads`), BEFORE anything is fired — the read side of the same
declaration `navigatesTo` and `writes` are the other two thirds of.

Here because it is the only place the serving layer can read it: the row is
the whole of what `available()` tells a projection about an edge, and the
`staleReads` stamp a served row carries is this list intersected with the
keys committed since the caller last looked. Absent when the app declared
none, and never inferred from a guard, a handler or a write.

***

### role

> **role**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

Defined in: [src/atom/types.ts:1508](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1508)

***

### schema?

> `optional` **schema?**: `unknown`

Defined in: [src/atom/types.ts:1574](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1574)

The LIVE validator, exactly as authored — an in-process convenience, and
the reason `expects` exists beside it. Absent when nothing was declared.

***

### writes?

> `optional` **writes?**: `string`[]

Defined in: [src/atom/types.ts:1635](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1635)

The state keys this edge CLAIMS it will change (from `effect.writes`),
BEFORE anything is fired — the third of the three, and the last one this
row was missing.

Here for the same reason `reads` is: the row is the whole of what
`available()` tells a projection about an edge, and a projection that
cannot see the declared writes cannot stamp `staleWrites` — *someone has
written what you are about to write, since you last looked*. That fact was
unreachable while the write side stopped at the spec: a control that
overwrites a key correctly declares no `reads` of it, so the read-side
stamp is silent by construction on exactly the controls whose repeat does
the most damage.

A COPY, never the frozen spec array, and absent when the app declared none.
