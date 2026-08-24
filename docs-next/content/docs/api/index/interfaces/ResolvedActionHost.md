---
title: ResolvedActionHost<Host, Interactive, ValueElement, Locator>
---

# Interface: ResolvedActionHost\<Host, Interactive, ValueElement, Locator\>

Defined in: src/action/host-adapter.ts:98

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

Defined in: src/action/host-adapter.ts:109

***

### coverage

> `readonly` **coverage**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage) \| `undefined`

Defined in: src/action/host-adapter.ts:110

***

### enabled

> `readonly` **enabled**: `boolean` \| `undefined`

Defined in: src/action/host-adapter.ts:108

***

### host

> `readonly` **host**: `Host`

Defined in: src/action/host-adapter.ts:105

***

### interactive

> `readonly` **interactive**: `Interactive`

Defined in: src/action/host-adapter.ts:106

***

### kind

> `readonly` **kind**: `"resolved"`

Defined in: src/action/host-adapter.ts:104

***

### locators

> `readonly` **locators**: readonly `Locator`[] \| `undefined`

Defined in: src/action/host-adapter.ts:111

***

### valueElement

> `readonly` **valueElement**: `ValueElement` \| `undefined`

Defined in: src/action/host-adapter.ts:107
