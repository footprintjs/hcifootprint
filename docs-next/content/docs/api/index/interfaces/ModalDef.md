---
title: ModalDef
---

# Interface: ModalDef

Defined in: [src/tree/types.ts:137](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L137)

A container node: areas coexist (AND), tabs exclude (at most one shown), modals overlay.

## Extends

- [`NodeDef`](/api/index/interfaces/NodeDef)

## Properties

### actions?

> `optional` **actions?**: `Record`\<`string`, [`ActionDef`](/api/index/interfaces/ActionDef)\>

Defined in: [src/tree/types.ts:134](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L134)

The controls on this node.

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`actions`](/api/index/interfaces/NodeDef#actions)

***

### areas?

> `optional` **areas?**: `Record`\<`string`, [`NodeDef`](/api/index/interfaces/NodeDef)\>

Defined in: [src/tree/types.ts:121](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L121)

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`areas`](/api/index/interfaces/NodeDef#areas)

***

### blocks?

> `optional` **blocks?**: `boolean`

Defined in: [src/tree/types.ts:139](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L139)

Default true: a shown modal masks actions outside it. `false` = popover (coexists).

***

### does?

> `optional` **does?**: `string`

Defined in: [src/tree/types.ts:118](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L118)

Optional authored description of the container itself.

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`does`](/api/index/interfaces/NodeDef#does)

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

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`instances`](/api/index/interfaces/NodeDef#instances)

***

### modals?

> `optional` **modals?**: `Record`\<`string`, `ModalDef`\>

Defined in: [src/tree/types.ts:123](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L123)

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`modals`](/api/index/interfaces/NodeDef#modals)

***

### repeats?

> `optional` **repeats?**: `boolean`

Defined in: [src/tree/types.ts:125](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L125)

Template container: instances carry runtime keys (order cards, product tiles).

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`repeats`](/api/index/interfaces/NodeDef#repeats)

***

### tabs?

> `optional` **tabs?**: `Record`\<`string`, [`NodeDef`](/api/index/interfaces/NodeDef)\>

Defined in: [src/tree/types.ts:122](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L122)

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`tabs`](/api/index/interfaces/NodeDef#tabs)

***

### when?

> `optional` **when?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:120](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L120)

Container guard: every descendant action's guard is AND-narrowed by this.

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`when`](/api/index/interfaces/NodeDef#when)
