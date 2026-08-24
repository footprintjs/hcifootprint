---
title: ActionBindingContractRow<Id>
---

# Interface: ActionBindingContractRow\<Id\>

Defined in: src/action/contracts.ts:82

One row from the canonical live-binding inventory.

## Type Parameters

### Id

`Id` *extends* `string` = `string`

## Properties

### coverage

> `readonly` **coverage**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: src/action/contracts.ts:84

***

### interactiveHost?

> `readonly` `optional` **interactiveHost?**: [`InteractiveHostResolution`](/api/testing/type-aliases/InteractiveHostResolution)

Defined in: src/action/contracts.ts:89

The adapter's committed resolution result, never inferred from a locator.

***

### ref

> `readonly` **ref**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`Id`\>

Defined in: src/action/contracts.ts:83

***

### requestedCapabilities?

> `readonly` `optional` **requestedCapabilities?**: readonly [`ActionBindingCapability`](/api/testing/type-aliases/ActionBindingCapability)[]

Defined in: src/action/contracts.ts:85

***

### requiresInteractiveHost?

> `readonly` `optional` **requiresInteractiveHost?**: `boolean`

Defined in: src/action/contracts.ts:87

Whether this adapter must resolve a real interactive descendant.
