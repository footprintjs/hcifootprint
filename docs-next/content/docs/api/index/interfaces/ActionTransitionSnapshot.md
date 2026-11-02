---
title: ActionTransitionSnapshot
---

# Interface: ActionTransitionSnapshot

Defined in: [src/action/types.ts:689](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L689)

## Properties

### attribution

> `readonly` **attribution**: [`Attribution`](/api/index/interfaces/Attribution)

Defined in: [src/action/types.ts:726](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L726)

Who this invocation is filed under, and what that claim is worth. Present
on every snapshot — "nobody claimed it" is information. A principal port
or a connection's `invokedBy` gives `'caller-asserted'` (the library
watched the call come through its own door; who stood behind it is the
integrator's word); neither gives basis and principal `'unknown'`.

***

### authority?

> `readonly` `optional` **authority?**: [`ActionAbandonmentAuthority`](/api/index/type-aliases/ActionAbandonmentAuthority)

Defined in: [src/action/types.ts:713](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L713)

***

### captureFailure?

> `readonly` `optional` **captureFailure?**: `"produced"` \| `"error"`

Defined in: [src/action/types.ts:707](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L707)

This historical field could not be captured and is omitted. The actual
capture error is routed to `onInvocationError`; application status and the
original `whenInvoked` outcome are unchanged. No mutable fallback is stored.

***

### coverage

> `readonly` **coverage**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/types.ts:692](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L692)

***

### effectStatus

> `readonly` **effectStatus**: `"refused"` \| `"verified"` \| `"abandoned"` \| `"unverified"`

Defined in: [src/action/types.ts:694](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L694)

***

### error?

> `readonly` `optional` **error?**: `unknown`

Defined in: [src/action/types.ts:701](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L701)

Plain data is captured like `produced`; opaque errors retain identity.

***

### evidence?

> `readonly` `optional` **evidence?**: `unknown`

Defined in: [src/action/types.ts:708](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L708)

***

### evidenceKind?

> `readonly` `optional` **evidenceKind?**: `string`

Defined in: [src/action/types.ts:711](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L711)

Present exactly when the definition declared `settle.evidence` and the
 effect verified: the governed kind `evidence` is a value of.

***

### input

> `readonly` **input**: [`ActionInvocationInput`](/api/index/type-aliases/ActionInvocationInput)

Defined in: [src/action/types.ts:691](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L691)

***

### invocationStatus

> `readonly` **invocationStatus**: `"performed"` \| `"failed"` \| `"refused"` \| `"pending"`

Defined in: [src/action/types.ts:693](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L693)

***

### lateSettlements?

> `readonly` `optional` **lateSettlements?**: readonly [`ActionLateSettlement`](/api/index/interfaces/ActionLateSettlement)[]

Defined in: [src/action/types.ts:718](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L718)

Settlements that arrived after the terminal, in arrival order. Absent
 when none did — an empty list would claim "we watched and none came",
 which this snapshot cannot know.

***

### produced?

> `readonly` `optional` **produced?**: `unknown`

Defined in: [src/action/types.ts:699](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L699)

Plain records/arrays captured at completion; opaque values retain identity.
Execution's original value remains on `whenInvoked`, not this historical view.

***

### progress?

> `readonly` `optional` **progress?**: [`ActionProgressSnapshot`](/api/index/type-aliases/ActionProgressSnapshot)

Defined in: [src/action/types.ts:714](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L714)

***

### reason?

> `readonly` `optional` **reason?**: `unknown`

Defined in: [src/action/types.ts:712](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L712)

***

### ref

> `readonly` **ref**: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)

Defined in: [src/action/types.ts:690](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L690)
