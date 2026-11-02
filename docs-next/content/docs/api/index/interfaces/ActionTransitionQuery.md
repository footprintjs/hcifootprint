---
title: ActionTransitionQuery
---

# Interface: ActionTransitionQuery

Defined in: [src/action/types.ts:827](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L827)

Which transitions to list — every filter optional, all of them ANDed.
`definition` takes the two forms `offers()` accepts; `binding` matches the
exact ref object; `instance` compares the opaque string, never parses it.

## Properties

### binding?

> `readonly` `optional` **binding?**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`string`\>

Defined in: [src/action/types.ts:829](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L829)

***

### definition?

> `readonly` `optional` **definition?**: [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`string`\> \| [`DefinedAction`](/api/index/type-aliases/DefinedAction)\<(...`args`) => `any`, `string`, [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)\>

Defined in: [src/action/types.ts:828](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L828)

***

### effectStatus?

> `readonly` `optional` **effectStatus?**: `"refused"` \| `"verified"` \| `"abandoned"` \| `"unverified"` \| readonly (`"refused"` \| `"verified"` \| `"abandoned"` \| `"unverified"`)[]

Defined in: [src/action/types.ts:834](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L834)

***

### instance?

> `readonly` `optional` **instance?**: `string`

Defined in: [src/action/types.ts:830](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L830)

***

### invocationStatus?

> `readonly` `optional` **invocationStatus?**: `"performed"` \| `"failed"` \| `"refused"` \| `"pending"` \| readonly (`"performed"` \| `"failed"` \| `"refused"` \| `"pending"`)[]

Defined in: [src/action/types.ts:831](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L831)
