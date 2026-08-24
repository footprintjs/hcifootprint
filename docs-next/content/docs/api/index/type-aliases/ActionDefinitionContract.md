---
title: ActionDefinitionContract
---

# Type Alias: ActionDefinitionContract

> **ActionDefinitionContract** = `Omit`\<[`ActionDef`](/api/index/interfaces/ActionDef), `"binding"` \| `"input"`\> & `object`

Defined in: [src/action/types.ts:68](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L68)

Authored semantics carried by a definition. Reachability belongs to a live binding.

## Type Declaration

### inputSchema?

> `readonly` `optional` **inputSchema?**: [`ActionDef`](/api/index/interfaces/ActionDef)\[`"input"`\]

Definition-side payload contract: Zod, JSON Schema, a `.safeParse`/`.parse`
validator, or `'none'`. Omission means the shape is not declared. The
Action Binding runtime enforces parseable schemas before the handler
runs. Other formats need `inputSchemaAdapter` or explicit disclosure mode.
Bound values are checked while minting an offer and caller values are
checked by `runtime.invoke()`. Live binding values use `input` readers.

### invocation

> `readonly` **invocation**: [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)

Explicit runtime call shape. `inputless` and `scalar` may be invoked
directly and brokered; `host` is recordable only through the exact host
continuation, preserving receivers and multi-argument listener calls.

### needs?

> `readonly` `optional` **needs?**: `Readonly`\<`Record`\<`string`, \{ `from?`: `string`; `kind`: `string`; `schema?`: `unknown`; \}\>\>

Inert, named inputs reserved for a future channel broker. Layer 1 stores
these declarations but never matches a surface, collects a value, or
changes action availability from them.

### produces?

> `readonly` `optional` **produces?**: `object`

Inert output declaration reserved for a future channel broker. Layer 1
records it without routing or rendering it.

#### produces.kind

> `readonly` **kind**: `string`

#### produces.schema?

> `readonly` `optional` **schema?**: `unknown`
