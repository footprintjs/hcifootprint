---
title: ActionInvocationSettlement<Output, Id>
---

# Type Alias: ActionInvocationSettlement\<Output, Id\>

> **ActionInvocationSettlement**\<`Output`, `Id`\> = \{ `produced`: `Output`; `status`: `"performed"`; `transition`: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>; \} \| \{ `error`: `unknown`; `status`: `"refused"`; `transition`: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>; \}

Defined in: src/action/types.ts:122

## Type Parameters

### Output

`Output`

### Id

`Id` *extends* `string` = `string`
