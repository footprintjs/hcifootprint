---
title: ActionHostResolution<Host, Interactive, ValueElement, Locator>
---

# Type Alias: ActionHostResolution\<Host, Interactive, ValueElement, Locator\>

> **ActionHostResolution**\<`Host`, `Interactive`, `ValueElement`, `Locator`\> = [`ResolvedActionHost`](/api/index/interfaces/ResolvedActionHost)\<`Host`, `Interactive`, `ValueElement`, `Locator`\> \| [`UnresolvedActionHost`](/api/index/interfaces/UnresolvedActionHost)\<`Host`\>

Defined in: [src/action/host-adapter.ts:122](https://github.com/footprintjs/hcifootprint/blob/main/src/action/host-adapter.ts#L122)

The framework-neutral result of resolving a host after commit.

## Type Parameters

### Host

`Host`

### Interactive

`Interactive` *extends* `object`

### ValueElement

`ValueElement` *extends* `object` = `Interactive`

### Locator

`Locator` = [`Binding`](/api/index/type-aliases/Binding)
