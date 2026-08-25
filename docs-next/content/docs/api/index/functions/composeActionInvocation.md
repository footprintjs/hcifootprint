---
title: composeActionInvocation
---

# Function: composeActionInvocation()

> **composeActionInvocation**\<`This`, `Args`, `Result`\>(`existing`, `invoke`): [`ActionHostListener`](/api/index/type-aliases/ActionHostListener)\<`This`, `Args`, `Result`\>

Defined in: [src/action/host-adapter.ts:306](https://github.com/footprintjs/hcifootprint/blob/main/src/action/host-adapter.ts#L306)

Compose a host-free invocation door without duplicating application work.

The middleware is entered exactly once. Its `proceed` continuation closes
over the original receiver and arguments and is token-owned: repeated calls
return the exact first value or rethrow the exact first error instead of
executing the existing listener again.

## Type Parameters

### This

`This`

### Args

`Args` *extends* readonly `unknown`[]

### Result

`Result`

## Parameters

### existing

[`ActionHostListener`](/api/index/type-aliases/ActionHostListener)\<`This`, `Args`, `Result`\>

### invoke

[`ActionInvocationMiddleware`](/api/index/type-aliases/ActionInvocationMiddleware)\<`This`, `Args`, `Result`\>

## Returns

[`ActionHostListener`](/api/index/type-aliases/ActionHostListener)\<`This`, `Args`, `Result`\>
