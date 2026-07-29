---
title: Affordance
---

# Interface: Affordance

Defined in: [src/atom/types.ts:177](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L177)

## Properties

### binding?

> `optional` **binding?**: [`Binding`](/api/index/type-aliases/Binding)

Defined in: [src/atom/types.ts:186](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L186)

Optional since D18: a spine tool may exist with only its description
(plannable/tour-able) and gain a binding or handler at mount time.
The v1 fluent builder still requires it at authoring.

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:180](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L180)

***

### descriptionSource?

> `optional` **descriptionSource?**: `"declared"` \| `"registration"`

Defined in: [src/atom/types.ts:197](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L197)

Where the planner-facing description came from. Both classes are
developer-AUTHORED source-code literals (the firewall holds either way);
the marker keeps the origin auditable. Default 'declared'.

***

### effect?

> `optional` **effect?**: [`Effect`](/api/index/interfaces/Effect)

Defined in: [src/atom/types.ts:188](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L188)

***

### guard?

> `optional` **guard?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:187](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L187)

***

### highEffect

> **highEffect**: `boolean`

Defined in: [src/atom/types.ts:190](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L190)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:178](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L178)

***

### on

> **on**: `string`[]

Defined in: [src/atom/types.ts:179](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L179)

***

### role

> **role**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

Defined in: [src/atom/types.ts:191](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L191)

***

### schema?

> `optional` **schema?**: `unknown`

Defined in: [src/atom/types.ts:189](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L189)
