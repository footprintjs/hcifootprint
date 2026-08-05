---
title: ModalDef
---

# Interface: ModalDef

Defined in: [src/tree/types.ts:183](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L183)

A container node: areas coexist (AND), tabs exclude (at most one shown), modals overlay.

## Extends

- [`NodeDef`](/api/index/interfaces/NodeDef)

## Properties

### actions?

> `optional` **actions?**: `Record`\<`string`, [`ActionDef`](/api/index/interfaces/ActionDef)\>

Defined in: [src/tree/types.ts:180](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L180)

The controls on this node.

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`actions`](/api/index/interfaces/NodeDef#actions)

***

### areas?

> `optional` **areas?**: `Record`\<`string`, [`NodeDef`](/api/index/interfaces/NodeDef)\>

Defined in: [src/tree/types.ts:167](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L167)

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`areas`](/api/index/interfaces/NodeDef#areas)

***

### blocks?

> `optional` **blocks?**: `boolean`

Defined in: [src/tree/types.ts:185](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L185)

Default true: a shown modal masks actions outside it. `false` = popover (coexists).

***

### does?

> `optional` **does?**: `string`

Defined in: [src/tree/types.ts:164](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L164)

Optional authored description of the container itself.

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`does`](/api/index/interfaces/NodeDef#does)

***

### instances?

> `optional` **instances?**: (`state`) => `string`[]

Defined in: [src/tree/types.ts:178](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L178)

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

Defined in: [src/tree/types.ts:169](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L169)

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`modals`](/api/index/interfaces/NodeDef#modals)

***

### repeats?

> `optional` **repeats?**: `boolean`

Defined in: [src/tree/types.ts:171](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L171)

Template container: instances carry runtime keys (order cards, product tiles).

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`repeats`](/api/index/interfaces/NodeDef#repeats)

***

### tabs?

> `optional` **tabs?**: `Record`\<`string`, [`NodeDef`](/api/index/interfaces/NodeDef)\>

Defined in: [src/tree/types.ts:168](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L168)

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`tabs`](/api/index/interfaces/NodeDef#tabs)

***

### when?

> `optional` **when?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:166](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L166)

Container guard: every descendant action's guard is AND-narrowed by this.

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`when`](/api/index/interfaces/NodeDef#when)
