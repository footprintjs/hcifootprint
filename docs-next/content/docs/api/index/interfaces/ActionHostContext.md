---
title: ActionHostContext<Props, Host, Interactive, ValueElement>
---

# Interface: ActionHostContext\<Props, Host, Interactive, ValueElement\>

Defined in: [src/action/host-adapter.ts:41](https://github.com/footprintjs/hcifootprint/blob/main/src/action/host-adapter.ts#L41)

The context explicit fact readers receive after one target has resolved.
It is ephemeral adapter state; connections retain only their projection.

## Type Parameters

### Props

`Props`

### Host

`Host`

### Interactive

`Interactive` *extends* `object`

### ValueElement

`ValueElement` *extends* `object` = `Interactive`

## Properties

### host

> `readonly` **host**: `Host`

Defined in: [src/action/host-adapter.ts:48](https://github.com/footprintjs/hcifootprint/blob/main/src/action/host-adapter.ts#L48)

***

### interactive

> `readonly` **interactive**: `Interactive`

Defined in: [src/action/host-adapter.ts:49](https://github.com/footprintjs/hcifootprint/blob/main/src/action/host-adapter.ts#L49)

***

### props

> `readonly` **props**: `Readonly`\<`Props`\>

Defined in: [src/action/host-adapter.ts:47](https://github.com/footprintjs/hcifootprint/blob/main/src/action/host-adapter.ts#L47)

***

### valueElement

> `readonly` **valueElement**: `ValueElement` \| `undefined`

Defined in: [src/action/host-adapter.ts:50](https://github.com/footprintjs/hcifootprint/blob/main/src/action/host-adapter.ts#L50)
