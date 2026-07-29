---
title: NodeDef
---

# Interface: NodeDef

Defined in: [src/tree/types.ts:51](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L51)

A container node: areas coexist (AND), tabs exclude (at most one shown), modals overlay.

## Extended by

- [`ModalDef`](/api/index/interfaces/ModalDef)
- [`PageNodeDef`](/api/index/interfaces/PageNodeDef)

## Properties

### areas?

> `optional` **areas?**: `Record`\<`string`, `NodeDef`\>

Defined in: [src/tree/types.ts:56](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L56)

***

### does?

> `optional` **does?**: `string`

Defined in: [src/tree/types.ts:53](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L53)

Optional authored description of the container itself.

***

### instances?

> `optional` **instances?**: (`state`) => `string`[]

Defined in: [src/tree/types.ts:67](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L67)

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

Defined in: [src/tree/types.ts:58](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L58)

***

### repeats?

> `optional` **repeats?**: `boolean`

Defined in: [src/tree/types.ts:60](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L60)

Template container: instances carry runtime keys (order cards, product tiles).

***

### tabs?

> `optional` **tabs?**: `Record`\<`string`, `NodeDef`\>

Defined in: [src/tree/types.ts:57](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L57)

***

### tools?

> `optional` **tools?**: `Record`\<`string`, [`ToolDef`](/api/index/interfaces/ToolDef)\>

Defined in: [src/tree/types.ts:68](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L68)

***

### when?

> `optional` **when?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:55](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L55)

Container guard: every descendant tool's guard is AND-narrowed by this.
