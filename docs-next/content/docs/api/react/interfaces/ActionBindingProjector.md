---
title: ActionBindingProjector<Interactive, Id>
---

# Interface: ActionBindingProjector\<Interactive, Id\>

Defined in: [src/react/use-action-binding.ts:42](https://github.com/footprintjs/hcifootprint/blob/main/src/react/use-action-binding.ts#L42)

Optional sensor ownership port for the interactive element's physical root.
`BindingAwarePageWatch` satisfies this structurally without entering React's
runtime dependency graph.

## Type Parameters

### Interactive

`Interactive` *extends* `object`

### Id

`Id` *extends* `string` = `string`

## Methods

### projectBinding()

> **projectBinding**(`projection`): [`ActionAttachment`](/api/index/interfaces/ActionAttachment)

Defined in: [src/react/use-action-binding.ts:46](https://github.com/footprintjs/hcifootprint/blob/main/src/react/use-action-binding.ts#L46)

#### Parameters

##### projection

[`ActionBindingProjection`](/api/react/interfaces/ActionBindingProjection)\<`Interactive`, `Id`\>

#### Returns

[`ActionAttachment`](/api/index/interfaces/ActionAttachment)
