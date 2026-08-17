---
title: Resolver<State>
---

# Type Alias: Resolver\<State\>

> **Resolver**\<`State`\> = (`payload`, `ctx`) => [`ResolverOutcome`](/api/testing/interfaces/ResolverOutcome)\<`State`\> \| `void`

Defined in: [src/testing/harness.ts:64](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L64)

One mock handler for an action. Synchronous — runs inside the precise-attribution window.

## Type Parameters

### State

`State` = `Record`\<`string`, `unknown`\>

## Parameters

### payload

`unknown`

### ctx

[`ResolverContext`](/api/testing/interfaces/ResolverContext)\<`State`\>

## Returns

[`ResolverOutcome`](/api/testing/interfaces/ResolverOutcome)\<`State`\> \| `void`
