---
title: ActionBindingUpdate<Input>
---

# Interface: ActionBindingUpdate\<Input\>

Defined in: [src/action/types.ts:170](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L170)

Mutable committed facts for one stable connection identity.

## Extended by

- [`ConnectActionOptions`](/api/index/interfaces/ConnectActionOptions)

## Type Parameters

### Input

`Input`

## Properties

### busy?

> `readonly` `optional` **busy?**: () => `string` \| `undefined`

Defined in: [src/action/types.ts:178](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L178)

#### Returns

`string` \| `undefined`

***

### coverage?

> `readonly` `optional` **coverage?**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/types.ts:179](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L179)

***

### enabled?

> `readonly` `optional` **enabled?**: () => `boolean` \| `undefined`

Defined in: [src/action/types.ts:177](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L177)

#### Returns

`boolean` \| `undefined`

***

### humanReporting?

> `readonly` `optional` **humanReporting?**: [`HumanReporting`](/api/index/type-aliases/HumanReporting)

Defined in: [src/action/types.ts:181](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L181)

***

### input?

> `readonly` `optional` **input?**: () => `Input`

Defined in: [src/action/types.ts:176](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L176)

Live value reader. Direct connection invocation reads it at invocation;
`available()` reads and retains it while minting an exact bound offer.
The definition-side payload shape is `inputSchema`.

#### Returns

`Input`

***

### locators?

> `readonly` `optional` **locators?**: readonly [`Binding`](/api/index/type-aliases/Binding)[]

Defined in: [src/action/types.ts:180](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L180)
