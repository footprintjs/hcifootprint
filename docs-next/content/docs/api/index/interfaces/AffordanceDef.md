---
title: AffordanceDef
---

# Interface: AffordanceDef

Defined in: [src/atom/types.ts:179](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L179)

## Properties

### binding

> **binding**: [`Binding`](/api/index/type-aliases/Binding)

Defined in: [src/atom/types.ts:188](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L188)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:187](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L187)

AUTHORED planner-facing text — the only string class ever served to an
LLM as instruction/description. Runtime-resolved strings (labels, user
content) are data, never description (prompt-injection firewall).

***

### effect?

> `optional` **effect?**: [`Effect`](/api/index/interfaces/Effect)

Defined in: [src/atom/types.ts:195](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L195)

***

### guard?

> `optional` **guard?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:194](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L194)

Serializable availability predicate over projected state. Omit for an
always-offered affordance — `{}` is rejected at build() because
footprint's evaluator deliberately never matches an empty filter.

***

### highEffect?

> `optional` **highEffect?**: `boolean`

Defined in: [src/atom/types.ts:206](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L206)

Marks edges that need server-side step-up/confirmation. Advisory client-side.

***

### on

> **on**: `string` \| `string`[]

Defined in: [src/atom/types.ts:181](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L181)

Page id(s) where this affordance is offered.

***

### role?

> `optional` **role?**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

Defined in: [src/atom/types.ts:207](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L207)

***

### schema?

> `optional` **schema?**: `unknown`

Defined in: [src/atom/types.ts:202](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L202)

Payload contract: Zod, JSON Schema, any `.safeParse`/`.parse` validator —
or the literal `'none'`, the author's explicit "this action takes NO
input". OMITTING it is a different statement: absence means the library
does not know the shape, so it never guesses one.

***

### verify?

> `optional` **verify?**: [`VerifyContract`](/api/index/type-aliases/VerifyContract)

Defined in: [src/atom/types.ts:204](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L204)

The app's own post-settlement check that the action really happened.
