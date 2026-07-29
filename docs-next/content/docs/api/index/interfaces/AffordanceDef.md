---
title: AffordanceDef
---

# Interface: AffordanceDef

Defined in: [src/atom/types.ts:137](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L137)

## Properties

### binding

> **binding**: [`Binding`](/api/index/type-aliases/Binding)

Defined in: [src/atom/types.ts:146](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L146)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:145](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L145)

AUTHORED planner-facing text — the only string class ever served to an
LLM as instruction/description. Runtime-resolved strings (labels, user
content) are data, never description (prompt-injection firewall).

***

### effect?

> `optional` **effect?**: [`Effect`](/api/index/interfaces/Effect)

Defined in: [src/atom/types.ts:153](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L153)

***

### guard?

> `optional` **guard?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:152](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L152)

Serializable availability predicate over projected state. Omit for an
always-offered affordance — `{}` is rejected at build() because
footprint's evaluator deliberately never matches an empty filter.

***

### highEffect?

> `optional` **highEffect?**: `boolean`

Defined in: [src/atom/types.ts:157](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L157)

Marks edges that need server-side step-up/confirmation. Advisory client-side.

***

### on

> **on**: `string` \| `string`[]

Defined in: [src/atom/types.ts:139](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L139)

Page id(s) where this affordance is offered.

***

### role?

> `optional` **role?**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

Defined in: [src/atom/types.ts:158](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L158)

***

### schema?

> `optional` **schema?**: `unknown`

Defined in: [src/atom/types.ts:155](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L155)

Payload contract: Zod, JSON Schema, or any .safeParse/.parse validator.
