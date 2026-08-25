---
title: ResolvedActionHost<Host, Interactive, ValueElement, Locator>
---

# Interface: ResolvedActionHost\<Host, Interactive, ValueElement, Locator\>

Defined in: [src/action/host-adapter.ts:98](https://github.com/footprintjs/hcifootprint/blob/main/src/action/host-adapter.ts#L98)

One exact committed target and only the facts its adapter explicitly read.

## Type Parameters

### Host

`Host`

### Interactive

`Interactive` *extends* `object`

### ValueElement

`ValueElement` *extends* `object` = `Interactive`

### Locator

`Locator` = [`Binding`](/api/index/type-aliases/Binding)

## Properties

### busy

> `readonly` **busy**: `string` \| `undefined`

Defined in: [src/action/host-adapter.ts:109](https://github.com/footprintjs/hcifootprint/blob/main/src/action/host-adapter.ts#L109)

***

### coverage

> `readonly` **coverage**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage) \| `undefined`

Defined in: [src/action/host-adapter.ts:110](https://github.com/footprintjs/hcifootprint/blob/main/src/action/host-adapter.ts#L110)

***

### enabled

> `readonly` **enabled**: `boolean` \| `undefined`

Defined in: [src/action/host-adapter.ts:108](https://github.com/footprintjs/hcifootprint/blob/main/src/action/host-adapter.ts#L108)

***

### host

> `readonly` **host**: `Host`

Defined in: [src/action/host-adapter.ts:105](https://github.com/footprintjs/hcifootprint/blob/main/src/action/host-adapter.ts#L105)

***

### interactive

> `readonly` **interactive**: `Interactive`

Defined in: [src/action/host-adapter.ts:106](https://github.com/footprintjs/hcifootprint/blob/main/src/action/host-adapter.ts#L106)

***

### kind

> `readonly` **kind**: `"resolved"`

Defined in: [src/action/host-adapter.ts:104](https://github.com/footprintjs/hcifootprint/blob/main/src/action/host-adapter.ts#L104)

***

### locators

> `readonly` **locators**: readonly `Locator`[] \| `undefined`

Defined in: [src/action/host-adapter.ts:111](https://github.com/footprintjs/hcifootprint/blob/main/src/action/host-adapter.ts#L111)

***

### valueElement

> `readonly` **valueElement**: `ValueElement` \| `undefined`

Defined in: [src/action/host-adapter.ts:107](https://github.com/footprintjs/hcifootprint/blob/main/src/action/host-adapter.ts#L107)
