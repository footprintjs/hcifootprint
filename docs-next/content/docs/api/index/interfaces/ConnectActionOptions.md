---
title: ConnectActionOptions<Input>
---

# Interface: ConnectActionOptions\<Input\>

Defined in: [src/action/types.ts:118](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L118)

Facts supplied when opening one live binding.

## Extends

- [`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate)\<`Input`\>

## Type Parameters

### Input

`Input`

## Properties

### busy?

> `readonly` `optional` **busy?**: () => `string` \| `undefined`

Defined in: [src/action/types.ts:111](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L111)

#### Returns

`string` \| `undefined`

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`busy`](/api/index/interfaces/ActionBindingUpdate#busy)

***

### coverage?

> `readonly` `optional` **coverage?**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/types.ts:112](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L112)

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`coverage`](/api/index/interfaces/ActionBindingUpdate#coverage)

***

### enabled?

> `readonly` `optional` **enabled?**: () => `boolean` \| `undefined`

Defined in: [src/action/types.ts:110](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L110)

#### Returns

`boolean` \| `undefined`

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`enabled`](/api/index/interfaces/ActionBindingUpdate#enabled)

***

### humanReporting?

> `readonly` `optional` **humanReporting?**: [`HumanReporting`](/api/index/type-aliases/HumanReporting)

Defined in: [src/action/types.ts:114](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L114)

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`humanReporting`](/api/index/interfaces/ActionBindingUpdate#humanreporting)

***

### input?

> `readonly` `optional` **input?**: () => `Input`

Defined in: [src/action/types.ts:109](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L109)

Invocation-time value reader; the definition-side shape is `inputSchema`.

#### Returns

`Input`

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`input`](/api/index/interfaces/ActionBindingUpdate#input-1)

***

### instance?

> `readonly` `optional` **instance?**: `string`

Defined in: [src/action/types.ts:121](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L121)

***

### locators?

> `readonly` `optional` **locators?**: readonly [`Binding`](/api/index/type-aliases/Binding)[]

Defined in: [src/action/types.ts:113](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L113)

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`locators`](/api/index/interfaces/ActionBindingUpdate#locators)

***

### node

> `readonly` **node**: `string`

Defined in: [src/action/types.ts:120](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L120)
