---
title: ActionTransitionSnapshot
---

# Interface: ActionTransitionSnapshot

Defined in: [src/action/types.ts:385](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L385)

## Properties

### coverage

> `readonly` **coverage**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/types.ts:388](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L388)

***

### effectStatus

> `readonly` **effectStatus**: `"verified"` \| `"refused"` \| `"unverified"`

Defined in: [src/action/types.ts:390](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L390)

***

### error?

> `readonly` `optional` **error?**: `unknown`

Defined in: [src/action/types.ts:392](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L392)

***

### evidence?

> `readonly` `optional` **evidence?**: `unknown`

Defined in: [src/action/types.ts:393](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L393)

***

### input

> `readonly` **input**: [`ActionInvocationInput`](/api/index/type-aliases/ActionInvocationInput)

Defined in: [src/action/types.ts:387](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L387)

***

### invocationStatus

> `readonly` **invocationStatus**: `"refused"` \| `"performed"` \| `"failed"` \| `"pending"`

Defined in: [src/action/types.ts:389](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L389)

***

### produced?

> `readonly` `optional` **produced?**: `unknown`

Defined in: [src/action/types.ts:391](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L391)

***

### reason?

> `readonly` `optional` **reason?**: `unknown`

Defined in: [src/action/types.ts:394](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L394)

***

### ref

> `readonly` **ref**: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)

Defined in: [src/action/types.ts:386](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L386)
