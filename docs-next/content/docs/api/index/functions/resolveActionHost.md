---
title: resolveActionHost
---

# Function: resolveActionHost()

> **resolveActionHost**\<`Props`, `Host`, `Interactive`, `ValueElement`, `Invocation`, `ComposedProps`, `Locator`\>(`adapter`, `props`, `host`): [`ActionHostResolution`](/api/index/type-aliases/ActionHostResolution)\<`Host`, `Interactive`, `ValueElement`, `Locator`\>

Defined in: src/action/host-adapter.ts:138

Resolve one committed host and snapshot only explicitly supplied facts.

Successful element resolution does not imply enabledness, busy state,
semantic coverage, value ownership, or a locator. Unresolved targets do not
call fact readers at all, so absence can never be laundered into disabledness.

## Type Parameters

### Props

`Props`

### Host

`Host`

### Interactive

`Interactive` *extends* `object`

### ValueElement

`ValueElement` *extends* `object`

### Invocation

`Invocation`

### ComposedProps

`ComposedProps`

### Locator

`Locator`

## Parameters

### adapter

[`ActionHostAdapter`](/api/index/interfaces/ActionHostAdapter)\<`Props`, `Host`, `Interactive`, `ValueElement`, `Invocation`, `ComposedProps`, `Locator`\>

### props

`Readonly`\<`Props`\>

### host

`Host`

## Returns

[`ActionHostResolution`](/api/index/type-aliases/ActionHostResolution)\<`Host`, `Interactive`, `ValueElement`, `Locator`\>
