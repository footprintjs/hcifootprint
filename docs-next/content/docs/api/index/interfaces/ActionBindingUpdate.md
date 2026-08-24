---
title: ActionBindingUpdate<Input>
---

# Interface: ActionBindingUpdate\<Input\>

Defined in: [src/action/types.ts:107](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L107)

Mutable committed facts for one stable connection identity.

## Extended by

- [`ConnectActionOptions`](/api/index/interfaces/ConnectActionOptions)

## Type Parameters

### Input

`Input`

## Properties

### busy?

> `readonly` `optional` **busy?**: () => `string` \| `undefined`

Defined in: [src/action/types.ts:111](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L111)

#### Returns

`string` \| `undefined`

***

### coverage?

> `readonly` `optional` **coverage?**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/types.ts:112](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L112)

***

### enabled?

> `readonly` `optional` **enabled?**: () => `boolean` \| `undefined`

Defined in: [src/action/types.ts:110](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L110)

#### Returns

`boolean` \| `undefined`

***

### humanReporting?

> `readonly` `optional` **humanReporting?**: [`HumanReporting`](/api/index/type-aliases/HumanReporting)

Defined in: [src/action/types.ts:114](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L114)

***

### input?

> `readonly` `optional` **input?**: () => `Input`

Defined in: [src/action/types.ts:109](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L109)

Invocation-time value reader; the definition-side shape is `inputSchema`.

#### Returns

`Input`

***

### locators?

> `readonly` `optional` **locators?**: readonly [`Binding`](/api/index/type-aliases/Binding)[]

Defined in: [src/action/types.ts:113](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L113)
