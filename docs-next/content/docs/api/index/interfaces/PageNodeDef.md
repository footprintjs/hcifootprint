---
title: PageNodeDef
---

# Interface: PageNodeDef

Defined in: [src/tree/types.ts:76](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L76)

A container node: areas coexist (AND), tabs exclude (at most one shown), modals overlay.

## Extends

- [`NodeDef`](/api/index/interfaces/NodeDef)

## Properties

### areas?

> `optional` **areas?**: `Record`\<`string`, [`NodeDef`](/api/index/interfaces/NodeDef)\>

Defined in: [src/tree/types.ts:56](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L56)

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`areas`](/api/index/interfaces/NodeDef#areas)

***

### does?

> `optional` **does?**: `string`

Defined in: [src/tree/types.ts:53](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L53)

Optional authored description of the container itself.

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`does`](/api/index/interfaces/NodeDef#does)

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

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`instances`](/api/index/interfaces/NodeDef#instances)

***

### modals?

> `optional` **modals?**: `Record`\<`string`, [`ModalDef`](/api/index/interfaces/ModalDef)\>

Defined in: [src/tree/types.ts:58](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L58)

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`modals`](/api/index/interfaces/NodeDef#modals)

***

### repeats?

> `optional` **repeats?**: `boolean`

Defined in: [src/tree/types.ts:60](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L60)

Template container: instances carry runtime keys (order cards, product tiles).

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`repeats`](/api/index/interfaces/NodeDef#repeats)

***

### route?

> `optional` **route?**: `string`

Defined in: [src/tree/types.ts:77](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L77)

***

### tabs?

> `optional` **tabs?**: `Record`\<`string`, [`NodeDef`](/api/index/interfaces/NodeDef)\>

Defined in: [src/tree/types.ts:57](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L57)

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`tabs`](/api/index/interfaces/NodeDef#tabs)

***

### tools?

> `optional` **tools?**: `Record`\<`string`, [`ToolDef`](/api/index/interfaces/ToolDef)\>

Defined in: [src/tree/types.ts:68](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L68)

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`tools`](/api/index/interfaces/NodeDef#tools)

***

### when?

> `optional` **when?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:55](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L55)

Container guard: every descendant tool's guard is AND-narrowed by this.

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`when`](/api/index/interfaces/NodeDef#when)
