---
title: ActionTransitionQuery
---

# Interface: ActionTransitionQuery

Defined in: [src/action/types.ts:816](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L816)

Which transitions to list — every filter optional, all of them ANDed.
`definition` takes the two forms `offers()` accepts; `binding` matches the
exact ref object; `instance` compares the opaque string, never parses it.

## Properties

### binding?

> `readonly` `optional` **binding?**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`string`\>

Defined in: [src/action/types.ts:818](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L818)

***

### definition?

> `readonly` `optional` **definition?**: [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`string`\> \| [`DefinedAction`](/api/index/type-aliases/DefinedAction)\<(...`args`) => `any`, `string`, [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)\>

Defined in: [src/action/types.ts:817](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L817)

***

### effectStatus?

> `readonly` `optional` **effectStatus?**: `"refused"` \| `"verified"` \| `"abandoned"` \| `"unverified"` \| readonly (`"refused"` \| `"verified"` \| `"abandoned"` \| `"unverified"`)[]

Defined in: [src/action/types.ts:823](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L823)

***

### instance?

> `readonly` `optional` **instance?**: `string`

Defined in: [src/action/types.ts:819](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L819)

***

### invocationStatus?

> `readonly` `optional` **invocationStatus?**: `"performed"` \| `"failed"` \| `"refused"` \| `"pending"` \| readonly (`"performed"` \| `"failed"` \| `"refused"` \| `"pending"`)[]

Defined in: [src/action/types.ts:820](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L820)
