---
title: ActionBindingContractRow<Id>
---

# Interface: ActionBindingContractRow\<Id\>

Defined in: [src/action/contracts.ts:79](https://github.com/footprintjs/hcifootprint/blob/main/src/action/contracts.ts#L79)

One row from the canonical live-binding inventory.

## Type Parameters

### Id

`Id` *extends* `string` = `string`

## Properties

### coverage

> `readonly` **coverage**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/contracts.ts:81](https://github.com/footprintjs/hcifootprint/blob/main/src/action/contracts.ts#L81)

***

### interactiveHost?

> `readonly` `optional` **interactiveHost?**: [`InteractiveHostResolution`](/api/testing/type-aliases/InteractiveHostResolution)

Defined in: [src/action/contracts.ts:86](https://github.com/footprintjs/hcifootprint/blob/main/src/action/contracts.ts#L86)

The adapter's committed resolution result, never inferred from a locator.

***

### ref

> `readonly` **ref**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`Id`\>

Defined in: [src/action/contracts.ts:80](https://github.com/footprintjs/hcifootprint/blob/main/src/action/contracts.ts#L80)

***

### requestedCapabilities?

> `readonly` `optional` **requestedCapabilities?**: readonly [`ActionBindingCapability`](/api/testing/type-aliases/ActionBindingCapability)[]

Defined in: [src/action/contracts.ts:82](https://github.com/footprintjs/hcifootprint/blob/main/src/action/contracts.ts#L82)

***

### requiresInteractiveHost?

> `readonly` `optional` **requiresInteractiveHost?**: `boolean`

Defined in: [src/action/contracts.ts:84](https://github.com/footprintjs/hcifootprint/blob/main/src/action/contracts.ts#L84)

Whether this adapter must resolve a real interactive descendant.
