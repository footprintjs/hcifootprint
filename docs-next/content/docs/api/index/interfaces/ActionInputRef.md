---
title: ActionInputRef<Source>
---

# Interface: ActionInputRef\<Source\>

Defined in: [src/action/types.ts:62](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L62)

Auditable identity for one invocation payload without disclosing its value.
A bound offer and every transition invoked from it carry the same ref.

## Type Parameters

### Source

`Source` *extends* `"bound"` \| `"caller"` = `"bound"` \| `"caller"`

## Properties

### inputId

> `readonly` **inputId**: `string`

Defined in: [src/action/types.ts:66](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L66)

***

### kind

> `readonly` **kind**: `"action-input"`

Defined in: [src/action/types.ts:65](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L65)

***

### source

> `readonly` **source**: `Source`

Defined in: [src/action/types.ts:67](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L67)
