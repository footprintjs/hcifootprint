---
title: ActionTransitionSnapshot
---

# Interface: ActionTransitionSnapshot

Defined in: [src/action/types.ts:628](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L628)

## Properties

### authority?

> `readonly` `optional` **authority?**: [`ActionAbandonmentAuthority`](/api/index/type-aliases/ActionAbandonmentAuthority)

Defined in: [src/action/types.ts:638](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L638)

***

### coverage

> `readonly` **coverage**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/types.ts:631](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L631)

***

### effectStatus

> `readonly` **effectStatus**: `"verified"` \| `"refused"` \| `"abandoned"` \| `"unverified"`

Defined in: [src/action/types.ts:633](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L633)

***

### error?

> `readonly` `optional` **error?**: `unknown`

Defined in: [src/action/types.ts:635](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L635)

***

### evidence?

> `readonly` `optional` **evidence?**: `unknown`

Defined in: [src/action/types.ts:636](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L636)

***

### input

> `readonly` **input**: [`ActionInvocationInput`](/api/index/type-aliases/ActionInvocationInput)

Defined in: [src/action/types.ts:630](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L630)

***

### invocationStatus

> `readonly` **invocationStatus**: `"refused"` \| `"performed"` \| `"failed"` \| `"pending"`

Defined in: [src/action/types.ts:632](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L632)

***

### lateSettlements?

> `readonly` `optional` **lateSettlements?**: readonly [`ActionLateSettlement`](/api/index/interfaces/ActionLateSettlement)[]

Defined in: [src/action/types.ts:643](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L643)

Settlements that arrived after the terminal, in arrival order. Absent
 when none did — an empty list would claim "we watched and none came",
 which this snapshot cannot know.

***

### produced?

> `readonly` `optional` **produced?**: `unknown`

Defined in: [src/action/types.ts:634](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L634)

***

### progress?

> `readonly` `optional` **progress?**: [`ActionProgressSnapshot`](/api/index/type-aliases/ActionProgressSnapshot)

Defined in: [src/action/types.ts:639](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L639)

***

### reason?

> `readonly` `optional` **reason?**: `unknown`

Defined in: [src/action/types.ts:637](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L637)

***

### ref

> `readonly` **ref**: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)

Defined in: [src/action/types.ts:629](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L629)
