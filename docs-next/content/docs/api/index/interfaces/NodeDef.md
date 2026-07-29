---
title: NodeDef
---

# Interface: NodeDef

Defined in: [src/tree/types.ts:82](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L82)

A container node: areas coexist (AND), tabs exclude (at most one shown), modals overlay.

## Extended by

- [`ModalDef`](/api/index/interfaces/ModalDef)
- [`PageNodeDef`](/api/index/interfaces/PageNodeDef)

## Properties

### areas?

> `optional` **areas?**: `Record`\<`string`, `NodeDef`\>

Defined in: [src/tree/types.ts:87](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L87)

***

### does?

> `optional` **does?**: `string`

Defined in: [src/tree/types.ts:84](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L84)

Optional authored description of the container itself.

***

### instances?

> `optional` **instances?**: (`state`) => `string`[]

Defined in: [src/tree/types.ts:98](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L98)

L2 existence source for a repeats container: the COMPLETE instance set,
from projected state (order #57 exists while scrolled out of view).
Without it, served instance lists fall back to the mounted window —
honestly marked enumeration:'mounted-window'.

#### Parameters

##### state

`Record`\<`string`, `unknown`\>

#### Returns

`string`[]

***

### modals?

> `optional` **modals?**: `Record`\<`string`, [`ModalDef`](/api/index/interfaces/ModalDef)\>

Defined in: [src/tree/types.ts:89](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L89)

***

### repeats?

> `optional` **repeats?**: `boolean`

Defined in: [src/tree/types.ts:91](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L91)

Template container: instances carry runtime keys (order cards, product tiles).

***

### tabs?

> `optional` **tabs?**: `Record`\<`string`, `NodeDef`\>

Defined in: [src/tree/types.ts:88](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L88)

***

### tools?

> `optional` **tools?**: `Record`\<`string`, [`ToolDef`](/api/index/interfaces/ToolDef)\>

Defined in: [src/tree/types.ts:99](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L99)

***

### when?

> `optional` **when?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:86](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L86)

Container guard: every descendant tool's guard is AND-narrowed by this.
