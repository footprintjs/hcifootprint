---
title: ActionBindingUpdate<Input>
---

# Interface: ActionBindingUpdate\<Input\>

Defined in: [src/action/types.ts:287](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L287)

Mutable committed facts for one stable connection identity.

## Extended by

- [`ConnectActionOptions`](/api/index/interfaces/ConnectActionOptions)

## Type Parameters

### Input

`Input`

## Properties

### busy?

> `readonly` `optional` **busy?**: () => `string` \| `undefined`

Defined in: [src/action/types.ts:296](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L296)

#### Returns

`string` \| `undefined`

***

### coverage?

> `readonly` `optional` **coverage?**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/types.ts:297](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L297)

***

### enabled?

> `readonly` `optional` **enabled?**: () => `boolean` \| `undefined`

Defined in: [src/action/types.ts:295](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L295)

#### Returns

`boolean` \| `undefined`

***

### humanReporting?

> `readonly` `optional` **humanReporting?**: [`HumanReporting`](/api/index/type-aliases/HumanReporting)

Defined in: [src/action/types.ts:299](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L299)

***

### input?

> `readonly` `optional` **input?**: () => `Input`

Defined in: [src/action/types.ts:294](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L294)

Live value reader. Direct connection invocation reads it at invocation;
a principal port's `offers()` reads and retains it while minting an exact
bound offer.
The definition-side payload shape is `inputSchema`.

#### Returns

`Input`

***

### locators?

> `readonly` `optional` **locators?**: readonly [`Binding`](/api/index/type-aliases/Binding)[]

Defined in: [src/action/types.ts:298](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L298)
