---
title: ActionInvocationSettlement<Output, Id>
---

# Type Alias: ActionInvocationSettlement\<Output, Id\>

> **ActionInvocationSettlement**\<`Output`, `Id`\> = \{ `produced`: `Output`; `status`: `"performed"`; `transition`: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>; \} \| \{ `error`: `unknown`; `status`: `"refused"`; `transition`: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>; \} \| \{ `error`: `unknown`; `status`: `"failed"`; `transition`: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>; \}

Defined in: [src/action/types.ts:214](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L214)

## Type Parameters

### Output

`Output`

### Id

`Id` *extends* `string` = `string`

## Union Members

### Type Literal

\{ `produced`: `Output`; `status`: `"performed"`; `transition`: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>; \}

***

### Type Literal

\{ `error`: `unknown`; `status`: `"refused"`; `transition`: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>; \}

#### error

> `readonly` **error**: `unknown`

#### status

> `readonly` **status**: `"refused"`

The application handler never started.

#### transition

> `readonly` **transition**: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>

***

### Type Literal

\{ `error`: `unknown`; `status`: `"failed"`; `transition`: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>; \}

#### error

> `readonly` **error**: `unknown`

#### status

> `readonly` **status**: `"failed"`

The application handler started but threw or rejected.

#### transition

> `readonly` **transition**: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>
