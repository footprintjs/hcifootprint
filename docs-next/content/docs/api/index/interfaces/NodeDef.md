---
title: NodeDef
---

# Interface: NodeDef

Defined in: [src/tree/types.ts:116](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L116)

A container node: areas coexist (AND), tabs exclude (at most one shown), modals overlay.

## Extended by

- [`ModalDef`](/api/index/interfaces/ModalDef)
- [`PageNodeDef`](/api/index/interfaces/PageNodeDef)

## Properties

### actions?

> `optional` **actions?**: `Record`\<`string`, [`ActionDef`](/api/index/interfaces/ActionDef)\>

Defined in: [src/tree/types.ts:134](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L134)

The controls on this node.

***

### areas?

> `optional` **areas?**: `Record`\<`string`, `NodeDef`\>

Defined in: [src/tree/types.ts:121](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L121)

***

### does?

> `optional` **does?**: `string`

Defined in: [src/tree/types.ts:118](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L118)

Optional authored description of the container itself.

***

### instances?

> `optional` **instances?**: (`state`) => `string`[]

Defined in: [src/tree/types.ts:132](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L132)

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

Defined in: [src/tree/types.ts:123](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L123)

***

### repeats?

> `optional` **repeats?**: `boolean`

Defined in: [src/tree/types.ts:125](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L125)

Template container: instances carry runtime keys (order cards, product tiles).

***

### tabs?

> `optional` **tabs?**: `Record`\<`string`, `NodeDef`\>

Defined in: [src/tree/types.ts:122](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L122)

***

### when?

> `optional` **when?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:120](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L120)

Container guard: every descendant action's guard is AND-narrowed by this.
