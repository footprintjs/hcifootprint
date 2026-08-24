---
title: ActionTransitionSnapshot
---

# Interface: ActionTransitionSnapshot

Defined in: [src/action/types.ts:609](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L609)

## Properties

### authority?

> `readonly` `optional` **authority?**: [`ActionAbandonmentAuthority`](/api/index/type-aliases/ActionAbandonmentAuthority)

Defined in: [src/action/types.ts:619](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L619)

***

### coverage

> `readonly` **coverage**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/types.ts:612](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L612)

***

### effectStatus

> `readonly` **effectStatus**: `"verified"` \| `"refused"` \| `"abandoned"` \| `"unverified"`

Defined in: [src/action/types.ts:614](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L614)

***

### error?

> `readonly` `optional` **error?**: `unknown`

Defined in: [src/action/types.ts:616](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L616)

***

### evidence?

> `readonly` `optional` **evidence?**: `unknown`

Defined in: [src/action/types.ts:617](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L617)

***

### input

> `readonly` **input**: [`ActionInvocationInput`](/api/index/type-aliases/ActionInvocationInput)

Defined in: [src/action/types.ts:611](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L611)

***

### invocationStatus

> `readonly` **invocationStatus**: `"refused"` \| `"performed"` \| `"failed"` \| `"pending"`

Defined in: [src/action/types.ts:613](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L613)

***

### produced?

> `readonly` `optional` **produced?**: `unknown`

Defined in: [src/action/types.ts:615](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L615)

***

### progress?

> `readonly` `optional` **progress?**: [`ActionProgressSnapshot`](/api/index/type-aliases/ActionProgressSnapshot)

Defined in: [src/action/types.ts:620](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L620)

***

### reason?

> `readonly` `optional` **reason?**: `unknown`

Defined in: [src/action/types.ts:618](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L618)

***

### ref

> `readonly` **ref**: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)

Defined in: [src/action/types.ts:610](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L610)
