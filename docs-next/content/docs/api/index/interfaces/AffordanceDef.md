---
title: AffordanceDef
---

# Interface: AffordanceDef

Defined in: [src/atom/types.ts:186](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L186)

## Properties

### binding

> **binding**: [`Binding`](/api/index/type-aliases/Binding)

Defined in: [src/atom/types.ts:195](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L195)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:194](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L194)

AUTHORED planner-facing text — the only string class ever served to an
LLM as instruction/description. Runtime-resolved strings (labels, user
content) are data, never description (prompt-injection firewall).

***

### effect?

> `optional` **effect?**: [`Effect`](/api/index/interfaces/Effect)

Defined in: [src/atom/types.ts:202](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L202)

***

### guard?

> `optional` **guard?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:201](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L201)

Serializable availability predicate over projected state. Omit for an
always-offered affordance — `{}` is rejected at build() because
footprint's evaluator deliberately never matches an empty filter.

***

### highEffect?

> `optional` **highEffect?**: `boolean`

Defined in: [src/atom/types.ts:213](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L213)

Marks edges that need server-side step-up/confirmation. Advisory client-side.

***

### on

> **on**: `string` \| `string`[]

Defined in: [src/atom/types.ts:188](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L188)

Page id(s) where this affordance is offered.

***

### role?

> `optional` **role?**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

Defined in: [src/atom/types.ts:214](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L214)

***

### schema?

> `optional` **schema?**: `unknown`

Defined in: [src/atom/types.ts:209](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L209)

Payload contract: Zod, JSON Schema, any `.safeParse`/`.parse` validator —
or the literal `'none'`, the author's explicit "this action takes NO
input". OMITTING it is a different statement: absence means the library
does not know the shape, so it never guesses one.

***

### verify?

> `optional` **verify?**: [`VerifyContract`](/api/index/type-aliases/VerifyContract)

Defined in: [src/atom/types.ts:211](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L211)

The app's own post-settlement check that the action really happened.
