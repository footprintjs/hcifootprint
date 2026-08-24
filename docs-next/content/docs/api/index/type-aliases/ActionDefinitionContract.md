---
title: ActionDefinitionContract
---

# Type Alias: ActionDefinitionContract

> **ActionDefinitionContract** = `Omit`\<[`ActionDef`](/api/index/interfaces/ActionDef), `"binding"` \| `"input"`\> & `object`

Defined in: [src/action/types.ts:46](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L46)

Authored semantics carried by a definition. Reachability belongs to a live binding.

## Type Declaration

### inputSchema?

> `readonly` `optional` **inputSchema?**: [`ActionDef`](/api/index/interfaces/ActionDef)\[`"input"`\]

Definition-side payload contract: Zod, JSON Schema, a `.safeParse`/`.parse`
validator, or `'none'`. Omission means the shape is not declared. The
framework-neutral runtime cannot enforce this clause: supply an enforcing
port or opt visibly into `contractActivation: 'disclosure'`. Live binding
values use invocation-time `input` readers instead.
