---
title: DefineActionOptions<Mode, HasProgress, F, Id, Stages, Input, Output>
---

# Type Alias: DefineActionOptions\<Mode, HasProgress, F, Id, Stages, Input, Output\>

> **DefineActionOptions**\<`Mode`, `HasProgress`, `F`, `Id`, `Stages`, `Input`, `Output`\> = `object` & `Mode` *extends* `"inputless"` ? `HasProgress` *extends* `true` ? `object` : `object` : `Mode` *extends* `"scalar"` ? `HasProgress` *extends* `true` ? `object` : `object` : `Mode` *extends* `"host"` ? `HasProgress` *extends* `true` ? `never` : `object` : `never`

Defined in: [src/action/definition.ts:224](https://github.com/footprintjs/hcifootprint/blob/main/src/action/definition.ts#L224)

The complete options record accepted by one `defineAction()` overload.
`Mode` selects the invocation door and `HasProgress` selects whether the
mutation receives the narrow lifecycle capability.

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

## Type Parameters

### Mode

`Mode` *extends* [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)

### HasProgress

`HasProgress` *extends* `boolean`

### F

`F` *extends* (...`args`) => `any`

### Id

`Id` *extends* `string` = `string`

### Stages

`Stages` *extends* readonly `string`[] = readonly `string`[]

### Input

`Input` = `unknown`

### Output

`Output` = `ReturnType`\<`F`\>
