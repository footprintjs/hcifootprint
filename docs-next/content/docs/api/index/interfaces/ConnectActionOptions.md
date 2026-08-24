---
title: ConnectActionOptions<Input, Output, Id>
---

# Interface: ConnectActionOptions\<Input, Output, Id\>

Defined in: [src/action/types.ts:193](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L193)

Facts supplied when opening one live binding.

## Extends

- [`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate)\<`Input`\>

## Type Parameters

### Input

`Input`

### Output

`Output` = `unknown`

### Id

`Id` *extends* `string` = `string`

## Properties

### busy?

> `readonly` `optional` **busy?**: () => `string` \| `undefined`

Defined in: [src/action/types.ts:178](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L178)

#### Returns

`string` \| `undefined`

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`busy`](/api/index/interfaces/ActionBindingUpdate#busy)

***

### coverage?

> `readonly` `optional` **coverage?**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/types.ts:179](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L179)

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`coverage`](/api/index/interfaces/ActionBindingUpdate#coverage)

***

### enabled?

> `readonly` `optional` **enabled?**: () => `boolean` \| `undefined`

Defined in: [src/action/types.ts:177](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L177)

#### Returns

`boolean` \| `undefined`

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`enabled`](/api/index/interfaces/ActionBindingUpdate#enabled)

***

### humanReporting?

> `readonly` `optional` **humanReporting?**: [`HumanReporting`](/api/index/type-aliases/HumanReporting)

Defined in: [src/action/types.ts:181](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L181)

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`humanReporting`](/api/index/interfaces/ActionBindingUpdate#humanreporting)

***

### input?

> `readonly` `optional` **input?**: () => `Input`

Defined in: [src/action/types.ts:176](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L176)

Live value reader. Direct connection invocation reads it at invocation;
`available()` reads and retains it while minting an exact bound offer.
The definition-side payload shape is `inputSchema`.

#### Returns

`Input`

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`input`](/api/index/interfaces/ActionBindingUpdate#input-1)

***

### instance?

> `readonly` `optional` **instance?**: `string`

Defined in: [src/action/types.ts:200](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L200)

***

### locators?

> `readonly` `optional` **locators?**: readonly [`Binding`](/api/index/type-aliases/Binding)[]

Defined in: [src/action/types.ts:180](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L180)

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`locators`](/api/index/interfaces/ActionBindingUpdate#locators)

***

### node

> `readonly` **node**: `string`

Defined in: [src/action/types.ts:199](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L199)

***

### onInvocation?

> `readonly` `optional` **onInvocation?**: (`invocation`, `settlement`) => `void` \| `PromiseLike`\<`void`\>

Defined in: [src/action/types.ts:202](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L202)

Observe every direct, brokered, or host-continuation invocation.

#### Parameters

##### invocation

[`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Output`, `Id`\>

##### settlement

[`ActionSettlementCapability`](/api/index/interfaces/ActionSettlementCapability)\<`Id`\>

#### Returns

`void` \| `PromiseLike`\<`void`\>

***

### onInvocationError?

> `readonly` `optional` **onInvocationError?**: (`error`) => `void` \| `PromiseLike`\<`void`\>

Defined in: [src/action/types.ts:207](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L207)

Optional sink for observer failures; neither observer can replace app behavior.

#### Parameters

##### error

`unknown`

#### Returns

`void` \| `PromiseLike`\<`void`\>
