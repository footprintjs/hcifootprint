---
title: ActionDefinitionContract
---

# Type Alias: ActionDefinitionContract

> **ActionDefinitionContract** = `object` & \{ `inputSchema?`: `"none"`; `invocation`: `"inputless"`; `settle?`: [`ActionSettleContract`](/api/index/type-aliases/ActionSettleContract); \} \| \{ `inputSchema?`: `object`; `invocation`: `"scalar"`; `settle?`: [`ActionSettleContract`](/api/index/type-aliases/ActionSettleContract); \} \| \{ `inputSchema?`: `never`; `invocation`: `"host"`; `settle?`: `object` & `object` & `object` \| `object` & `object` & `object` \| `object` & `object` & `object` \| `object` & `object` & `object` \| `object` & `object` & `object` \| `object` & `object` & `object` \| `never` \| `never`; \}

Defined in: [src/action/types.ts:248](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L248)

Authored semantics carried by a definition. Reachability belongs to a live
binding, and each invocation branch states its payload/progress laws.

## Type Declaration

### does

> `readonly` **does**: `string`

Stable, app-authored sentence describing the action's meaning.

### guard?

> `readonly` `optional` **guard?**: [`ActionGuardContract`](/api/index/type-aliases/ActionGuardContract)

### needs?

> `readonly` `optional` **needs?**: `Readonly`\<`Record`\<`string`, \{ `from?`: `string`; `kind`: `string`; `schema?`: `unknown`; \}\>\>

Inert, named inputs reserved for a future channel broker. Layer 1 stores
these declarations but never matches a surface, collects a value, or
changes action availability from them.

### principal?

> `readonly` `optional` **principal?**: [`PrincipalPolicy`](/api/index/interfaces/PrincipalPolicy) & `object` \| [`PrincipalPolicy`](/api/index/interfaces/PrincipalPolicy) & `object` \| [`PrincipalPolicy`](/api/index/interfaces/PrincipalPolicy) & `object`

Invocation authority and decision ownership.

### produces?

> `readonly` `optional` **produces?**: `object`

Inert output declaration reserved for a future channel broker. Layer 1
records it without routing or rendering it.

#### produces.kind

> `readonly` **kind**: `string`

#### produces.schema?

> `readonly` `optional` **schema?**: `unknown`

### role?

> `readonly` `optional` **role?**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)
