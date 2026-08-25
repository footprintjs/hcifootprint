---
title: ActionObservedInvocation<ActionOutput, HostOutput, Id>
---

# Type Alias: ActionObservedInvocation\<ActionOutput, HostOutput, Id\>

> **ActionObservedInvocation**\<`ActionOutput`, `HostOutput`, `Id`\> = [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`ActionOutput`, `Id`, `"mutation"`\> \| [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`HostOutput`, `Id`, `"host-continuation"`\>

Defined in: [src/action/types.ts:490](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L490)

Observer view of a connection occurrence. Direct/brokered calls produce the
action mutation's output; host continuations produce their own independent
listener result. `behavior` is the honest discriminator between them.

## Type Parameters

### ActionOutput

`ActionOutput`

### HostOutput

`HostOutput` = `unknown`

### Id

`Id` *extends* `string` = `string`
