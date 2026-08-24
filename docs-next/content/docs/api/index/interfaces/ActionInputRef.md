---
title: ActionInputRef<Source>
---

# Interface: ActionInputRef\<Source\>

Defined in: [src/action/types.ts:46](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L46)

Auditable identity for one invocation payload without disclosing its value.
A bound offer and every transition invoked from it carry the same ref.

## Type Parameters

### Source

`Source` *extends* [`ActionInputSource`](/api/index/type-aliases/ActionInputSource) = [`ActionInputSource`](/api/index/type-aliases/ActionInputSource)

## Properties

### inputId

> `readonly` **inputId**: `string`

Defined in: [src/action/types.ts:50](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L50)

***

### kind

> `readonly` **kind**: `"action-input"`

Defined in: [src/action/types.ts:49](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L49)

***

### source

> `readonly` **source**: `Source`

Defined in: [src/action/types.ts:51](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L51)
