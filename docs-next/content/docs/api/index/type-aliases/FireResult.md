---
title: FireResult
---

# Type Alias: FireResult

> **FireResult** = \{ `alreadyTrue?`: `FilterCondition`[]; `effectStatus`: [`EffectStatus`](/api/index/type-aliases/EffectStatus); `executed?`: `false`; `materialized?`: `false`; `ok`: `true`; `repeated?`: \{ `personActedSince`: \{ `basis`: [`AttributionBasis`](/api/index/type-aliases/AttributionBasis); `transitionId`: `string`; \}; `priorTransitionId`: `string`; \}; `settlement`: `"settled"` \| `"awaiting-state"`; `transition`: [`TransitionRecord`](/api/index/interfaces/TransitionRecord); `version`: `number`; `whenSettled`: `Promise`\<[`FireSettlement`](/api/index/interfaces/FireSettlement)\>; \} \| \{ `available`: `string`[]; `ok`: `false`; `reason`: `"UNKNOWN_AFFORDANCE"`; \} \| \{ `ok`: `false`; `reason`: `"STALE_CURSOR"`; `version`: `number`; \} \| \{ `node`: `string`; `ok`: `false`; `reason`: `"NOT_ON_NODE"`; \} \| \{ `evidence`: `FilterCondition`[]; `ok`: `false`; `reason`: `"GUARD_FAILED"`; \} \| \{ `issues`: `string`; `ok`: `false`; `reason`: `"PAYLOAD_INVALID"`; \} \| \{ `ok`: `false`; `overlay`: `string`; `reason`: `"BLOCKED_BY_OVERLAY"`; \} \| \{ `node`: `string`; `ok`: `false`; `reason`: `"NODE_NOT_VISIBLE"`; \} \| \{ `node`: `string`; `ok`: `false`; `reason`: `"STILL_MOUNTING"`; \} \| \{ `instances`: `string`[]; `instancesTotal`: `number`; `ok`: `false`; `reason`: `"INSTANCE_REQUIRED"`; \} \| \{ `instances`: `string`[]; `instancesTotal`: `number`; `ok`: `false`; `reason`: `"INSTANCE_UNKNOWN"`; `verdict`: `"never-existed"` \| `"unsupported"`; \} \| \{ `affordanceId`: `string`; `evidence?`: `FilterCondition`[]; `ok`: `false`; `reason`: `"TOOL_DISABLED"`; \} \| \{ `affordanceId`: `string`; `gesture?`: [`Binding`](/api/index/type-aliases/Binding); `ok`: `false`; `reason`: `"NOT_MATERIALIZED"`; \} \| \{ `affordanceId`: `string`; `askId?`: `string`; `ok`: `false`; `reason`: `"APPROVAL_REQUIRED"`; \} \| \{ `affordanceId`: `string`; `askId`: `string`; `ok`: `false`; `reason`: `"APPROVAL_SPENT"`; \} \| \{ `affordanceId`: `string`; `askId`: `string`; `differs`: `"action"` \| `"input"` \| `"instance"` \| `"both"` \| `"cannot-judge"`; `ok`: `false`; `reason`: `"APPROVAL_MISMATCH"`; \} \| \{ `affordanceId`: `string`; `askId`: `string`; `ok`: `false`; `reason`: `"APPROVAL_STALE"`; \} \| \{ `affordanceId`: `string`; `askId`: `string`; `ok`: `false`; `reason`: `"APPROVAL_DECLINED"`; \} \| \{ `affordanceId`: `string`; `askId`: `string`; `ok`: `false`; `reason`: `"APPROVAL_REVOKED"`; \} \| \{ `affordanceId`: `string`; `ok`: `false`; `reason`: `"OFFER_REQUIRED"`; \} \| \{ `affordanceId`: `string`; `offeredFor?`: `string`; `offerId`: `string`; `ok`: `false`; `reason`: `"OFFER_NOT_ON_RECORD"`; `why`: `"unknown"` \| `"evicted"` \| `"other-action"`; \} \| \{ `affordanceId`: `string`; `moved`: [`FreshnessMovement`](/api/index/interfaces/FreshnessMovement)[]; `offerId`: `string`; `ok`: `false`; `reason`: `"WORLD_MOVED"`; \} \| \{ `acknowledgementId?`: `string`; `affordanceId`: `string`; `moved`: [`FreshnessMovement`](/api/index/interfaces/FreshnessMovement)[]; `offerId`: `string`; `ok`: `false`; `reason`: `"ACKNOWLEDGEMENT_REQUIRED"`; `why?`: `"evicted"`; \} \| \{ `acknowledgementId`: `string`; `affordanceId`: `string`; `moved`: [`FreshnessMovement`](/api/index/interfaces/FreshnessMovement)[]; `offerId`: `string`; `ok`: `false`; `reason`: `"ACKNOWLEDGEMENT_STALE"`; \} \| \{ `affordanceId`: `string`; `howToSettle`: `string`; `ok`: `false`; `pendingTransitionId`: `string`; `reason`: `"PRIOR_FIRE_PENDING"`; `scope`: `"action"` \| `"instance"` \| `"payload"`; \} \| \{ `affordanceId`: `string`; `howToRepeat`: `string`; `ok`: `false`; `priorTransitionId`: `string`; `reason`: `"DUPLICATE_EXECUTION"`; `scope`: `"action"` \| `"instance"` \| `"payload"`; \} \| \{ `affordanceId`: `string`; `attempted`: [`Principal`](/api/index/type-aliases/Principal); `ok`: `false`; `reason`: `"PRINCIPAL_NOT_ALLOWED"`; `required`: [`ActorKind`](/api/index/type-aliases/ActorKind)[]; \} \| \{ `affordanceId`: `string`; `needs`: `"observability"` \| `"postcondition"`; `observability?`: [`Observability`](/api/index/type-aliases/Observability); `ok`: `false`; `reason`: `"EFFECT_NOT_VERIFIABLE"`; \}

Defined in: [src/atom/types.ts:2080](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2080)

What became of one fire — the success arm, or one typed refusal.

The REFUSAL SET GROWS, and a consumer should be written for that. 0.6.0 added
`NOT_MATERIALIZED`; this release adds the five `APPROVAL_*` words, because the
library can now refuse a high-effect fire no human approved. What never
happens is a reason CHANGING meaning: every value keeps exactly what it had,
and a new one is always a new fact, never an old one relabelled. So read the
reasons you know (`if (!fired.ok && fired.reason === 'GUARD_FAILED') …`) and
let the rest fall through as "refused, and here is the word" — an exhaustive
`never` check over today's set is the one consumer shape a future reason will
stop compiling, and adding the case is the whole fix.

## Union Members

### Type Literal

\{ `alreadyTrue?`: `FilterCondition`[]; `effectStatus`: [`EffectStatus`](/api/index/type-aliases/EffectStatus); `executed?`: `false`; `materialized?`: `false`; `ok`: `true`; `repeated?`: \{ `personActedSince`: \{ `basis`: [`AttributionBasis`](/api/index/type-aliases/AttributionBasis); `transitionId`: `string`; \}; `priorTransitionId`: `string`; \}; `settlement`: `"settled"` \| `"awaiting-state"`; `transition`: [`TransitionRecord`](/api/index/interfaces/TransitionRecord); `version`: `number`; `whenSettled`: `Promise`\<[`FireSettlement`](/api/index/interfaces/FireSettlement)\>; \}

#### alreadyTrue?

> `optional` **alreadyTrue?**: `FilterCondition`[]

THE EFFECT WAS ALREADY TRUE — the conditions of this action's own
declarative verify contract that already held when it fired, present
only then and absent on every ordinary fire.

An effect that is already true is not a pending one. When an action's
declarative verify contract covers every key it declares it writes and
already holds at fire time, the fire never waits for a state report that
nothing will send — it settles on its own handler and answers
`alreadyTrue`.

Read it as "nothing needed changing", never as "nothing ran": the
handler is still invoked, because deciding on the app's behalf that a
press was pointless is not something this library does. What changed is
only what the fire WAITS ON — see [TransitionRecord.alreadyTrue](/api/index/interfaces/TransitionRecord#alreadytrue),
which carries the same array, and `src/traverse/already-true.ts` for the
five conditions.

#### effectStatus

> **effectStatus**: [`EffectStatus`](/api/index/type-aliases/EffectStatus)

Whether the app's side has run — the truth AT RETURN TIME. The handler
is always deferred, so this can never be 'performed' here: a fire with
something bound to run returns 'pending', and `whenSettled` carries the
answer. `settlement` answers a different question (does a commit bundle
exist yet?) — reading it as "the app did it" was the reported bug.

#### executed?

> `optional` **executed?**: `false`

Present (false) only on an allowed unmaterialized agent fire: nothing ran.

#### materialized?

> `optional` **materialized?**: `false`

Present (false) only on an allowed unmaterialized agent fire: nothing is bound.

#### ok

> **ok**: `true`

#### repeated?

> `optional` **repeated?**: `object`

THIS FIRE IS A KNOWING SECOND OCCURRENCE of a `mode: 'once'` action —
present exactly when a settled receipt matched and a person acting on
the screen since made the repeat legitimate (see `traverse/once.ts`:
report, don't refuse). `personActedSince` carries the motion row and
its attribution BASIS, because a person the library sensed and a
person a caller asserted are not worth the same — recorded, not
verified, here as everywhere.

##### repeated.personActedSince

> **personActedSince**: `object`

##### repeated.personActedSince.basis

> **basis**: [`AttributionBasis`](/api/index/type-aliases/AttributionBasis)

##### repeated.personActedSince.transitionId

> **transitionId**: `string`

##### repeated.priorTransitionId

> **priorTransitionId**: `string`

#### settlement

> **settlement**: `"settled"` \| `"awaiting-state"`

#### transition

> **transition**: [`TransitionRecord`](/api/index/interfaces/TransitionRecord)

#### version

> **version**: `number`

#### whenSettled

> **whenSettled**: `Promise`\<[`FireSettlement`](/api/index/interfaces/FireSettlement)\>

Resolves ONCE with what actually happened. NEVER rejects: a refusal
arrives as data (`effectStatus: 'refused'`), because most callers drop
this result unread and an orphaned rejecting promise would be noise
they never opted into.

***

### Type Literal

\{ `available`: `string`[]; `ok`: `false`; `reason`: `"UNKNOWN_AFFORDANCE"`; \}

***

### Type Literal

\{ `ok`: `false`; `reason`: `"STALE_CURSOR"`; `version`: `number`; \}

***

### Type Literal

\{ `node`: `string`; `ok`: `false`; `reason`: `"NOT_ON_NODE"`; \}

***

### Type Literal

\{ `evidence`: `FilterCondition`[]; `ok`: `false`; `reason`: `"GUARD_FAILED"`; \}

***

### Type Literal

\{ `issues`: `string`; `ok`: `false`; `reason`: `"PAYLOAD_INVALID"`; \}

***

### Type Literal

\{ `ok`: `false`; `overlay`: `string`; `reason`: `"BLOCKED_BY_OVERLAY"`; \}

A shown blocking modal masks this tool's node. Close the modal first.

***

### Type Literal

\{ `node`: `string`; `ok`: `false`; `reason`: `"NODE_NOT_VISIBLE"`; \}

The tool's node carries an explicit not-visible signal (hidden tab, closed modal).

***

### Type Literal

\{ `node`: `string`; `ok`: `false`; `reason`: `"STILL_MOUNTING"`; \}

RETRIABLE: the node's mounts have not arrived yet (mid-navigation / deep link).

***

### Type Literal

\{ `instances`: `string`[]; `instancesTotal`: `number`; `ok`: `false`; `reason`: `"INSTANCE_REQUIRED"`; \}

A repeats-container tool fired with no instance key — the known keys ride along.

***

### Type Literal

\{ `instances`: `string`[]; `instancesTotal`: `number`; `ok`: `false`; `reason`: `"INSTANCE_UNKNOWN"`; `verdict`: `"never-existed"` \| `"unsupported"`; \}

The named instance is not in the compared existence set — `verdict` says how strong that absence is.

#### instances

> **instances**: `string`[]

#### instancesTotal

> **instancesTotal**: `number`

#### ok

> **ok**: `false`

#### reason

> **reason**: `"INSTANCE_UNKNOWN"`

#### verdict

> **verdict**: `"never-existed"` \| `"unsupported"`

WHICH KIND OF WRONG THIS ID IS — the honest strength of "not in the
list", decided by the COVERAGE of the list it was compared against
(the same source the served row's `enumeration` states):

- `'never-existed'` — the compared set came from the app's DECLARED
  existence source (`enumeration: 'selector'`), which enumerates
  everything that exists right now. An id absent from it does not
  exist, and the refusal may say so.
- `'unsupported'` — the compared set is only the mounted window
  (`enumeration: 'mounted-window'`): what happens to be on screen.
  Absence from a window proves nothing about the world past its edge —
  the id is not backed by anything served, and that is ALL this
  refusal knows. Never relay it as nonexistence: the row the agent
  named may be real and simply not mounted.

The render cap changes neither verdict: membership always runs against
the FULL compared set (instance #51 is real), so `instances` here may
be a 50-key slice of `instancesTotal` keys while the verdict stands on
all of them — under a capped window, an id past the cap is exactly the
case `'unsupported'` protects. And a selector that throws or answers a
non-array falls back to the mounted window, so the verdict falls back
WITH it: a nonexistence claim must never outlive its evidence.

***

### Type Literal

\{ `affordanceId`: `string`; `evidence?`: `FilterCondition`[]; `ok`: `false`; `reason`: `"TOOL_DISABLED"`; \}

RETRIABLE: the control is registered but currently greyed out (disabled).

#### affordanceId

> **affordanceId**: `string`

#### evidence?

> `optional` **evidence?**: `FilterCondition`[]

The `enabledWhen` conjuncts that did NOT hold — the machine proof of this
refusal, in the shape `GUARD_FAILED` serves. It exists so a reader can
name the FIELD instead of relaying a conclusion it cannot explain.

Present only where the app DECLARED a condition. An imperative
`setEnabled(false)` names no conditions, so this stays absent rather than
inventing one — and it is never a promise: meeting the condition may
still leave the control off through a wire that declares no reason.

#### ok

> **ok**: `false`

#### reason

> **reason**: `"TOOL_DISABLED"`

***

### Type Literal

\{ `affordanceId`: `string`; `gesture?`: [`Binding`](/api/index/type-aliases/Binding); `ok`: `false`; `reason`: `"NOT_MATERIALIZED"`; \}

Declared but nothing is bound: an agent fire would execute NOTHING (register
 a tool group, or opt the session into read-only touring via
 allowUnmaterializedFires). The app-self-report tier (source 'user'/'system'
 or invoke:false) is never gated — that motion really happened.

#### affordanceId

> **affordanceId**: `string`

#### gesture?

> `optional` **gesture?**: [`Binding`](/api/index/type-aliases/Binding)

The DECLARED gesture nothing is wired to perform — so the refusal says
"this is a click on the checkout button", not "nothing is bound".
Absent when the edge declared no binding (there the old words were
already the whole truth).

#### ok

> **ok**: `false`

#### reason

> **reason**: `"NOT_MATERIALIZED"`

***

### Type Literal

\{ `affordanceId`: `string`; `askId?`: `string`; `ok`: `false`; `reason`: `"APPROVAL_REQUIRED"`; \}

No recorded human approval authorizes this high-effect fire. `askId` echoes
 the pointer that was presented, when one was and it named nothing usable.

***

### Type Literal

\{ `affordanceId`: `string`; `askId`: `string`; `ok`: `false`; `reason`: `"APPROVAL_SPENT"`; \}

That approval was already spent by an earlier fire. One yes, one action.

***

### Type Literal

\{ `affordanceId`: `string`; `askId`: `string`; `differs`: `"action"` \| `"input"` \| `"instance"` \| `"both"` \| `"cannot-judge"`; `ok`: `false`; `reason`: `"APPROVAL_MISMATCH"`; \}

The human approved something else — `differs` names which join failed.

***

### Type Literal

\{ `affordanceId`: `string`; `askId`: `string`; `ok`: `false`; `reason`: `"APPROVAL_STALE"`; \}

The yes is older than this session's rules allow, or predates a state change.

***

### Type Literal

\{ `affordanceId`: `string`; `askId`: `string`; `ok`: `false`; `reason`: `"APPROVAL_DECLINED"`; \}

The human said no to this ask. Terminal for that askId, for the session's life.

***

### Type Literal

\{ `affordanceId`: `string`; `askId`: `string`; `ok`: `false`; `reason`: `"APPROVAL_REVOKED"`; \}

The human gave a yes and took it back before it was spent ([Session.revokeAsk](/api/index/classes/Session#revokeask)).
 The withdrawn pointer authorizes nothing; a fresh ask mints a new card.

***

### Type Literal

\{ `affordanceId`: `string`; `ok`: `false`; `reason`: `"OFFER_REQUIRED"`; \}

A freshness axis enforces, and this fire cited no offer. Look again
 (`available()` / `whats_here`) and cite the row you plan against — there is
 nothing to compare a fire to otherwise.

***

### Type Literal

\{ `affordanceId`: `string`; `offeredFor?`: `string`; `offerId`: `string`; `ok`: `false`; `reason`: `"OFFER_NOT_ON_RECORD"`; `why`: `"unknown"` \| `"evicted"` \| `"other-action"`; \}

The cited offer is not one this session can answer THIS fire with, and
 `why` says which of the three things happened. `'unknown'` — no such id was
 ever minted here; `'evicted'` — it was, and the bounded ledger has since
 dropped it; `'other-action'` — the id IS on this session's record and it
 names a DIFFERENT control, so it answers that row and not this one. Three
 words rather than one because the fixes differ and because collapsing them
 would let the library report its own bound, or its own row, as a caller's
 forged citation.

#### affordanceId

> **affordanceId**: `string`

#### offeredFor?

> `optional` **offeredFor?**: `string`

The control that offer WAS minted for — present only under
 `'other-action'`, where this session really does hold the row. An
 authored action id, never app data.

#### offerId

> **offerId**: `string`

#### ok

> **ok**: `false`

#### reason

> **reason**: `"OFFER_NOT_ON_RECORD"`

#### why

> **why**: `"unknown"` \| `"evicted"` \| `"other-action"`

***

### Type Literal

\{ `affordanceId`: `string`; `moved`: [`FreshnessMovement`](/api/index/interfaces/FreshnessMovement)[]; `offerId`: `string`; `ok`: `false`; `reason`: `"WORLD_MOVED"`; \}

Something the row was offered under has moved, and this control's policy
 says refuse. `moved` names the axes and the KEYS — never a value, never a
 conclusion. Fix by looking again and citing the fresh offer.

***

### Type Literal

\{ `acknowledgementId?`: `string`; `affordanceId`: `string`; `moved`: [`FreshnessMovement`](/api/index/interfaces/FreshnessMovement)[]; `offerId`: `string`; `ok`: `false`; `reason`: `"ACKNOWLEDGEMENT_REQUIRED"`; `why?`: `"evicted"`; \}

Something moved and this control's policy says the caller must acknowledge
 it first. `acknowledgementId` echoes the pointer that was presented, when
 one was and it named nothing usable — exactly as `APPROVAL_REQUIRED` echoes
 `askId`. Acknowledge with `session.acknowledgeStale(actionId, keys, { offerId })`
 and cite what it hands back.

#### acknowledgementId?

> `optional` **acknowledgementId?**: `string`

#### affordanceId

> **affordanceId**: `string`

#### moved

> **moved**: [`FreshnessMovement`](/api/index/interfaces/FreshnessMovement)[]

#### offerId

> **offerId**: `string`

#### ok

> **ok**: `false`

#### reason

> **reason**: `"ACKNOWLEDGEMENT_REQUIRED"`

#### why?

> `optional` **why?**: `"evicted"`

`'evicted'` — and only ever that. The receipt cited here IS one this
session wrote, and this session's own cap
([SessionOptions.maxAcknowledgements](/api/index/interfaces/SessionOptions#maxacknowledgements)) dropped it. Present only on
that one case, because it is the only one that is not the caller's
mistake: the fix is a bigger cap, or acknowledge again. Absent covers
every other unusable pointer, deliberately without a taxonomy of how.

***

### Type Literal

\{ `acknowledgementId`: `string`; `affordanceId`: `string`; `moved`: [`FreshnessMovement`](/api/index/interfaces/FreshnessMovement)[]; `offerId`: `string`; `ok`: `false`; `reason`: `"ACKNOWLEDGEMENT_STALE"`; \}

That acknowledgement was made in a world that has since moved on. A step
 performed against different facts is not a step performed against these.

***

### Type Literal

\{ `affordanceId`: `string`; `howToSettle`: `string`; `ok`: `false`; `pendingTransitionId`: `string`; `reason`: `"PRIOR_FIRE_PENDING"`; `scope`: `"action"` \| `"instance"` \| `"payload"`; \}

A prior occurrence of this control has not come to rest, and the action
 declares `concurrency: { mode: 'single-flight' }`. It clears on SETTLEMENT
 and nothing else — no timeout, no read, and not the caller reporting it
 done. `howToSettle` names the doors that can.

#### affordanceId

> **affordanceId**: `string`

#### howToSettle

> **howToSettle**: `string`

The authored sentence naming every door that can settle it.

#### ok

> **ok**: `false`

#### pendingTransitionId

> **pendingTransitionId**: `string`

The fire that is still out there — ask `session.settlementOf(id)` about it.

#### reason

> **reason**: `"PRIOR_FIRE_PENDING"`

#### scope

> **scope**: `"action"` \| `"instance"` \| `"payload"`

Which scope matched: the action, this card, or this exact input.

***

### Type Literal

\{ `affordanceId`: `string`; `howToRepeat`: `string`; `ok`: `false`; `priorTransitionId`: `string`; `reason`: `"DUPLICATE_EXECUTION"`; `scope`: `"action"` \| `"instance"` \| `"payload"`; \}

This action already EXECUTED in this session and declares
 `concurrency: { mode: 'once' }`. The receipt survives settlement; only a
 person acting on the screen after it reopens the action — and the repeat
 then fires carrying `repeated` instead of being refused. A refused first
 occurrence never minted a receipt, so a clean retry is never caught here.

#### affordanceId

> **affordanceId**: `string`

#### howToRepeat

> **howToRepeat**: `string`

The authored sentence naming the one door that reopens it.

#### ok

> **ok**: `false`

#### priorTransitionId

> **priorTransitionId**: `string`

The occurrence already on the record — ask `session.settlementOf(id)`.

#### reason

> **reason**: `"DUPLICATE_EXECUTION"`

#### scope

> **scope**: `"action"` \| `"instance"` \| `"payload"`

Which scope matched: the action, this card, or this exact input.

***

### Type Literal

\{ `affordanceId`: `string`; `attempted`: [`Principal`](/api/index/type-aliases/Principal); `ok`: `false`; `reason`: `"PRINCIPAL_NOT_ALLOWED"`; `required`: [`ActorKind`](/api/index/type-aliases/ActorKind)[]; \}

This principal may not perform this action — the app declared who may, and
 this is not one of them. `required` NAMES the kinds, because an agent told
 only "no" tries again while an agent told "a human must do this" asks the
 person. Never a retry: nothing about the world changes this one.

#### affordanceId

> **affordanceId**: `string`

#### attempted

> **attempted**: [`Principal`](/api/index/type-aliases/Principal)

The principal that tried, echoed so one row answers the whole question.

#### ok

> **ok**: `false`

#### reason

> **reason**: `"PRINCIPAL_NOT_ALLOWED"`

#### required

> **required**: [`ActorKind`](/api/index/type-aliases/ActorKind)[]

***

### Type Literal

\{ `affordanceId`: `string`; `needs`: `"observability"` \| `"postcondition"`; `observability?`: [`Observability`](/api/index/type-aliases/Observability); `ok`: `false`; `reason`: `"EFFECT_NOT_VERIFIABLE"`; \}

This session requires a high-effect action to say how its effect can be
 checked, and this one cannot. `needs` says which half is missing:
 `'observability'` — nothing was declared; `'postcondition'` — what was
 declared is not a check (key presence is not value correctness). Fixed by
 the APP, at the keyboard, not by the caller at run time.

#### affordanceId

> **affordanceId**: `string`

#### needs

> **needs**: `"observability"` \| `"postcondition"`

#### observability?

> `optional` **observability?**: [`Observability`](/api/index/type-aliases/Observability)

What the app did declare, when it declared something.

#### ok

> **ok**: `false`

#### reason

> **reason**: `"EFFECT_NOT_VERIFIABLE"`
