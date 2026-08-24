---
title: ResolvedActionHostTarget<Interactive, ValueElement>
---

# Interface: ResolvedActionHostTarget\<Interactive, ValueElement\>

Defined in: src/action/host-adapter.ts:12

The commit-time result returned by an adapter that found its target.

## Type Parameters

### Interactive

`Interactive` *extends* `object`

### ValueElement

`ValueElement` *extends* `object` = `Interactive`

## Properties

### interactive

> `readonly` **interactive**: `Interactive`

Defined in: src/action/host-adapter.ts:18

The element that actually receives the interaction, not necessarily the ref host.

***

### kind

> `readonly` **kind**: `"resolved"`

Defined in: src/action/host-adapter.ts:16

***

### valueElement?

> `readonly` `optional` **valueElement?**: `ValueElement`

Defined in: src/action/host-adapter.ts:20

The independently resolved focus/value owner, when the component has one.
