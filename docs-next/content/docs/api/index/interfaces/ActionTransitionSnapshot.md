---
title: ActionTransitionSnapshot
---

# Interface: ActionTransitionSnapshot

Defined in: [src/action/types.ts:689](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L689)

## Properties

### attribution

> `readonly` **attribution**: [`Attribution`](/api/index/interfaces/Attribution)

Defined in: [src/action/types.ts:715](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L715)

Who this invocation is filed under, and what that claim is worth. Present
on every snapshot — "nobody claimed it" is information. A principal port
or a connection's `invokedBy` gives `'caller-asserted'` (the library
watched the call come through its own door; who stood behind it is the
integrator's word); neither gives basis and principal `'unknown'`.

***

### authority?

> `readonly` `optional` **authority?**: [`ActionAbandonmentAuthority`](/api/index/type-aliases/ActionAbandonmentAuthority)

Defined in: [src/action/types.ts:702](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L702)

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

Defined in: [src/action/types.ts:696](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L696)

***

### evidence?

> `readonly` `optional` **evidence?**: `unknown`

Defined in: [src/action/types.ts:697](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L697)

***

### evidenceKind?

> `readonly` `optional` **evidenceKind?**: `string`

Defined in: [src/action/types.ts:700](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L700)

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

Defined in: [src/action/types.ts:707](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L707)

Settlements that arrived after the terminal, in arrival order. Absent
 when none did — an empty list would claim "we watched and none came",
 which this snapshot cannot know.

***

### produced?

> `readonly` `optional` **produced?**: `unknown`

Defined in: [src/action/types.ts:695](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L695)

***

### progress?

> `readonly` `optional` **progress?**: [`ActionProgressSnapshot`](/api/index/type-aliases/ActionProgressSnapshot)

Defined in: [src/action/types.ts:703](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L703)

***

### reason?

> `readonly` `optional` **reason?**: `unknown`

Defined in: [src/action/types.ts:701](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L701)

***

### ref

> `readonly` **ref**: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)

Defined in: [src/action/types.ts:690](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L690)
