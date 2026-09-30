---
title: ActionReturnOutcome<Output, Id>
---

# Type Alias: ActionReturnOutcome\<Output, Id\>

> **ActionReturnOutcome**\<`Output`, `Id`\> = `Extract`\<[`ActionInvocationSettlement`](/api/index/type-aliases/ActionInvocationSettlement)\<`Output`, `Id`\>, \{ `status`: `"performed"` \| `"failed"`; \}\>

Defined in: [src/action/types.ts:133](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L133)

What `settle.onReturn` judges: the two arms of an invocation in which the
application handler RAN — it returned (`performed`) or threw/rejected
(`failed`). A preflight refusal never reaches it; the runtime settled that
effect `refused` itself.

## Type Parameters

### Output

`Output` = `unknown`

### Id

`Id` *extends* `string` = `string`
