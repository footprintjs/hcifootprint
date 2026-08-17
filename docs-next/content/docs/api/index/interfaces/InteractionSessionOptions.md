---
title: InteractionSessionOptions
---

# Interface: InteractionSessionOptions

Defined in: [src/traverse/nav-session.ts:56](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L56)

## Extends

- `Omit`\<[`SessionOptions`](/api/index/interfaces/SessionOptions), `"node"`\>

## Properties

### allowUnmaterializedFires?

> `optional` **allowUnmaterializedFires?**: `boolean`

Defined in: [src/atom/types.ts:952](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L952)

Let AGENT fires of declared-but-unbound tools proceed as honest no-ops
(executed: false, materialized: false on the result) instead of the
default NOT_MATERIALIZED rejection. For guide/tour/plan flows — the
Phase-0 rung walking the graph without touching the app. Navigation
claims still move the cursor (that is the tour); re-sync() before
trusting position. Default false (fail-closed).

#### Inherited from

[`SessionOptions`](/api/index/interfaces/SessionOptions).[`allowUnmaterializedFires`](/api/index/interfaces/SessionOptions#allowunmaterializedfires)

***

### attributionPolicy?

> `optional` **attributionPolicy?**: [`AttributionPolicy`](/api/index/type-aliases/AttributionPolicy)

Defined in: [src/atom/types.ts:1084](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1084)

HOW HARD THIS SESSION IS ALLOWED TO GUESS when a state report does not say
which fire it is about. Default `'default'` — today's ladder, byte for byte.

`'strict'` turns off the two rungs that are guesses:
- FIFO (`'queue-order'`) is never used. Arrival order is not evidence.
- a signature match must be UNAMBIGUOUS — nothing else pending may even
  partly explain the delta (traverse/attribution.ts, THE SIGNATURE RULE).

An unplaceable delta is then recorded as an `'unknown'` stimulus and the
fire STAYS PENDING rather than being falsely closed. That is the trade, and
it is the whole reason this is opt-in: a fire that never gets its report
waits forever, visibly ([Session.pending](/api/index/classes/Session#pending),
[Session.awaitingSettlement](/api/index/classes/Session#awaitingsettlement)), instead of quietly borrowing somebody
else's report. Apps whose taps pass `transitionId` lose nothing at all.

The STAMP is not affected by this option: every transition carries its
[Attribution](/api/index/interfaces/Attribution) in both modes, because disclosure is never a policy.

#### Inherited from

[`SessionOptions`](/api/index/interfaces/SessionOptions).[`attributionPolicy`](/api/index/interfaces/SessionOptions#attributionpolicy)

***

### captureProduced?

> `optional` **captureProduced?**: `boolean`

Defined in: [src/atom/types.ts:943](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L943)

Capture each handler's RETURN value onto its transition (sanitized+capped)
as the "act → get data back" channel — TransitionRecord.produced. Default
true. Set false to opt a session out entirely (handlers whose returns are
internal and should never reach the agent).

#### Inherited from

[`SessionOptions`](/api/index/interfaces/SessionOptions).[`captureProduced`](/api/index/interfaces/SessionOptions#captureproduced)

***

### checkPayloadShape?

> `optional` **checkPayloadShape?**: `boolean`

Defined in: [src/atom/types.ts:967](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L967)

Check a plain JSON-Schema declaration against the payload at fire time.
STRUCTURAL only — required keys, declared primitive types, closed objects —
and never a full JSON-Schema validator: anything it cannot judge it passes
(the name says exactly what it does, because claiming more would be a lie
a caller only discovers in production).

Default true. Declaring a schema is already the author's opt-in signal, and
Mode B's published contract has always promised that "a wrong input returns
a structured error RESULT carrying what was expected" (serve/modes.ts) — a
promise a plain JSON Schema could not keep while nothing enforced it. Set
false for the 0.3.0 pass-through. Zod and other parseable validators run
either way; this flag governs only the plain-JSON-Schema branch.

#### Inherited from

[`SessionOptions`](/api/index/interfaces/SessionOptions).[`checkPayloadShape`](/api/index/interfaces/SessionOptions#checkpayloadshape)

***

### commitValues?

> `optional` **commitValues?**: `"full"` \| `"delta"`

Defined in: [src/atom/types.ts:934](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L934)

Commit-log value encoding (footprintjs dial). Default 'delta'.

#### Inherited from

[`SessionOptions`](/api/index/interfaces/SessionOptions).[`commitValues`](/api/index/interfaces/SessionOptions#commitvalues)

***

### dormantGraceMs?

> `optional` **dormantGraceMs?**: `number`

Defined in: [src/traverse/nav-session.ts:65](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L65)

How long a registration outside the router-confirmed page may persist
before drift telemetry fires (a dev warning + one sensor-drift gap row).
Registrations in that window are DORMANT: held, not offered, activated
instantly if the router then confirms their page. Default 3000ms.

***

### effectPolicy?

> `optional` **effectPolicy?**: [`EffectPolicy`](/api/index/interfaces/EffectPolicy)

Defined in: [src/atom/types.ts:1105](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1105)

REQUIRE THAT A HIGH-EFFECT ACTION CAN BE CHECKED. Off by default. See
[EffectPolicy](/api/index/interfaces/EffectPolicy) — and note the thing it deliberately does not do:
`'state-delta'` does not satisfy it, because key presence is not value
correctness.

#### Inherited from

[`SessionOptions`](/api/index/interfaces/SessionOptions).[`effectPolicy`](/api/index/interfaces/SessionOptions#effectpolicy)

***

### enforcePrincipalPolicy?

> `optional` **enforcePrincipalPolicy?**: `boolean`

Defined in: [src/atom/types.ts:1098](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1098)

ENFORCE what actions declare in [PrincipalPolicy](/api/index/interfaces/PrincipalPolicy). Off by default, and
with it off every such declaration is disclosure exactly as `humanDecides`
is — the same byte-identical stance every enforcement in this library takes.

On, two things become refusals: a fire from a principal outside an action's
`mayInvoke` list (`PRINCIPAL_NOT_ALLOWED`, naming the kinds required), and a
fire of an action that declared `requiresHumanApproval` with no recorded
approval to present (the existing `APPROVAL_*` words — no new vocabulary).

`decisionOwner` is NEVER enforced by this switch. An owner is not a
permission; an app that wants the agent kept out says `mayInvoke: ['human']`.

#### Inherited from

[`SessionOptions`](/api/index/interfaces/SessionOptions).[`enforcePrincipalPolicy`](/api/index/interfaces/SessionOptions#enforceprincipalpolicy)

***

### freshness?

> `optional` **freshness?**: [`FreshnessPolicy`](/api/index/interfaces/FreshnessPolicy)

Defined in: [src/atom/types.ts:1022](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1022)

THE SESSION'S DEFAULT ANSWER on each freshness axis, for every action that
does not answer for itself. Off by default in the only way that matters: an
unanswered axis is `'disclose'`, which is what every release before this one
did, so a session that omits this option serves the same bytes and refuses
the same fires it always did.

```ts
map.createSession({ node: 'ledger', state, freshness: { writeChanges: 'require-ack' } });
```

An action's own `freshness` wins AXIS BY AXIS — a session default of
`'refuse'` on writes and an action declaring `{ writeChanges: 'disclose' }`
leaves that one control disclosing while the rest refuse. See
[FreshnessPolicy](/api/index/interfaces/FreshnessPolicy), and note the one thing enforcement adds to the door:
an enforcing axis requires the fire to cite an offer
([FireOptions.offerId](/api/index/interfaces/FireOptions#offerid)).

#### Inherited from

[`SessionOptions`](/api/index/interfaces/SessionOptions).[`freshness`](/api/index/interfaces/SessionOptions#freshness)

***

### maxAcknowledgements?

> `optional` **maxAcknowledgements?**: `number`

Defined in: [src/atom/types.ts:1064](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1064)

HOW MANY ACKNOWLEDGEMENT RECEIPTS a session keeps before dropping the
oldest. Default 500.

The `ACKNOWLEDGEMENT_REQUIRED` → acknowledge → refire loop writes one row
per turn, so `session.acknowledgements()` grows for as long as a session
lives. Bounding it means a cited receipt can expire, so eviction is COUNTED
(`session.acknowledgementsDropped()`), WARNED once, and refused by its own
word (`ACKNOWLEDGEMENT_REQUIRED` with `why: 'evicted'`) rather than reported
as a pointer the caller made up.

Unlike [SessionOptions.maxOffers](/api/index/interfaces/SessionOptions#maxoffers), the warning here is said to every
session that fills it: nothing enters this ledger except through an explicit
`acknowledgeStale` call, so it can never reach somebody who switched nothing
on.

Nothing is ever edited or retracted — the cap drops the oldest rows whole,
and a retained row says exactly what it always said. Raising it costs memory
and nothing else; the rows hold action ids, key NAMES and numbers.

#### Inherited from

[`SessionOptions`](/api/index/interfaces/SessionOptions).[`maxAcknowledgements`](/api/index/interfaces/SessionOptions#maxacknowledgements)

***

### maxOffers?

> `optional` **maxOffers?**: `number`

Defined in: [src/atom/types.ts:1043](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1043)

How many [OfferRecord](/api/index/interfaces/OfferRecord)s this session retains before dropping the
oldest. Default 500.

The ledger is bounded because it is written from a read path — `available()`
is called on every look, on every refused fire's gap row, on every served
reply — and an unbounded session-lifetime map fed from a read path is a leak
with a friendly name. Bounding it means a citation can expire, so eviction is
COUNTED (`session.offersDropped()`), WARNED once, and refused by its own word
(`OFFER_NOT_ON_RECORD` with `why: 'evicted'`) rather than reported as an id
that never existed.

The COUNT is kept on every session; the WARNING is said only to a session
that requires a citation somewhere ([SessionOptions.freshness](/api/index/interfaces/SessionOptions#freshness), or an
action's own). Nothing expires under a session that opted into nothing, so
there is nothing there to tune.

Raising it costs memory and nothing else; the records hold key NAMES and
numbers, never a value.

#### Inherited from

[`SessionOptions`](/api/index/interfaces/SessionOptions).[`maxOffers`](/api/index/interfaces/SessionOptions#maxoffers)

***

### navigate?

> `optional` **navigate?**: (`href`) => `void` \| `Promise`\<`void`\>

Defined in: [src/atom/types.ts:979](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L979)

The caller's OWN router navigation (e.g. `(href) => router.push(href)`).
PRESENCE of this option is the opt-in: with it, an edge whose gesture
yields a literal href — an explicit `url` binding, else the fully-literal
route of the page it claims to navigate to — materialises through this
function, so a pure URL navigation no longer needs a fake do-nothing
handler to get past NOT_MATERIALIZED. Registered handlers still win, and
the synthesized navigation rides the SAME invocation machinery: resolve →
effectStatus 'performed'; throw → 'refused' with the honest rollback.
Without this option nothing changes — fail-closed, byte-identical.

#### Parameters

##### href

`string`

#### Returns

`void` \| `Promise`\<`void`\>

#### Inherited from

[`SessionOptions`](/api/index/interfaces/SessionOptions).[`navigate`](/api/index/interfaces/SessionOptions#navigate)

***

### node?

> `optional` **node?**: `string`

Defined in: [src/traverse/nav-session.ts:58](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L58)

Starting page id. Default: the first declared page.

***

### now?

> `optional` **now?**: () => `number`

Defined in: [src/traverse/nav-session.ts:72](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L72)

The clock the dormancy / overlay-grace timers read (epoch ms). Defaults to
`Date.now`. Inject a controllable clock to test time-dependent staleness
deterministically — a dormant registration, a mount-grace warning — without
real waits (hcifootprint/testing's harness wires one for you).

#### Returns

`number`

#### Overrides

[`SessionOptions`](/api/index/interfaces/SessionOptions).[`now`](/api/index/interfaces/SessionOptions#now)

***

### onWarn?

> `optional` **onWarn?**: (`message`) => `void`

Defined in: [src/atom/types.ts:936](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L936)

Dev-warning sink (StrictMode re-registrations, handler errors). Default console.warn.

#### Parameters

##### message

`string`

#### Returns

`void`

#### Inherited from

[`SessionOptions`](/api/index/interfaces/SessionOptions).[`onWarn`](/api/index/interfaces/SessionOptions#onwarn)

***

### redactedFields?

> `optional` **redactedFields?**: [`RedactedFields`](/api/index/interfaces/RedactedFields)

Defined in: [src/atom/types.ts:932](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L932)

Fields to hide INSIDE the data a transition carries — a fire's payload, a
handler's return. The sibling of `redactedKeys` (which governs state keys and
never touched a payload), aimed per channel and opt-in: absent, nothing
changes. See [RedactedFields](/api/index/interfaces/RedactedFields).

#### Inherited from

[`SessionOptions`](/api/index/interfaces/SessionOptions).[`redactedFields`](/api/index/interfaces/SessionOptions#redactedfields)

***

### redactedKeys?

> `optional` **redactedKeys?**: `string`[]

Defined in: [src/atom/types.ts:925](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L925)

Keys stored as 'REDACTED' in the commit log while live state keeps raw values.

#### Inherited from

[`SessionOptions`](/api/index/interfaces/SessionOptions).[`redactedKeys`](/api/index/interfaces/SessionOptions#redactedkeys)

***

### requireHumanApproval?

> `optional` **requireHumanApproval?**: `boolean` \| [`HumanApprovalPolicy`](/api/index/interfaces/HumanApprovalPolicy)

Defined in: [src/atom/types.ts:1003](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1003)

REQUIRE A RECORDED HUMAN APPROVAL before an agent may fire a high-effect
action. Off by default; with it on, a high-effect agent fire is refused
unless it carries [FireOptions.askId](/api/index/interfaces/FireOptions#askid) — a pointer to a confirm-journal
row a person's own Approve control recorded ([Session.approveAsk](/api/index/classes/Session#approveask)),
or a standing ALWAYS ALLOW ([Session.alwaysApprove](/api/index/classes/Session#alwaysapprove)).

WHAT IT FIXES. `confirm: true` was the AGENT asserting that a human
approved: a boolean in the model's own tool arguments, tied to nothing. A
model that never asked was indistinguishable from one that got a yes. With
this option the proof is a POINTER to a decision a person recorded, so "the
model asked politely" stops being part of the security model.

WHAT IT DOES NOT PROVE. That a particular person authenticated — `by` is a
string your host supplies — and not that your own wiring keeps the approval
door out of the model's reach. It proves that a row of the right kind, from
the right principal, for this action and this input, exists and has not
already been spent.

Pass `true` for the plain policy, or a [HumanApprovalPolicy](/api/index/interfaces/HumanApprovalPolicy) to also
refuse a yes that has gone stale. Without this option nothing changes —
fail-closed, byte-identical.

#### Inherited from

[`SessionOptions`](/api/index/interfaces/SessionOptions).[`requireHumanApproval`](/api/index/interfaces/SessionOptions#requirehumanapproval)

***

### state?

> `optional` **state?**: `Record`\<`string`, `unknown`\>

Defined in: [src/atom/types.ts:915](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L915)

Initial projected state (the lean snapshot guards read — not the whole app).

#### Inherited from

[`SessionOptions`](/api/index/interfaces/SessionOptions).[`state`](/api/index/interfaces/SessionOptions#state)

***

### stateTap?

> `optional` **stateTap?**: `boolean`

Defined in: [src/atom/types.ts:923](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L923)

Whether this session receives updateState() reports (a router/store tap).
Default: true when `state` was provided, false otherwise. Without a tap,
declared-writes fires settle on handler completion (or immediately when
nothing executes) with effectVerified 'unobservable' — instead of staying
pending forever (the D18 rung-killer fix).

#### Inherited from

[`SessionOptions`](/api/index/interfaces/SessionOptions).[`stateTap`](/api/index/interfaces/SessionOptions#statetap)
