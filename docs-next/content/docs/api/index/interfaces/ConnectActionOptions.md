---
title: ConnectActionOptions<Input, Output, Id>
---

# Interface: ConnectActionOptions\<Input, Output, Id\>

Defined in: [src/action/types.ts:309](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L309)

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

Defined in: [src/action/types.ts:296](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L296)

#### Returns

`string` \| `undefined`

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`busy`](/api/index/interfaces/ActionBindingUpdate#busy)

***

### coverage?

> `readonly` `optional` **coverage?**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/types.ts:297](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L297)

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`coverage`](/api/index/interfaces/ActionBindingUpdate#coverage)

***

### enabled?

> `readonly` `optional` **enabled?**: () => `boolean` \| `undefined`

Defined in: [src/action/types.ts:295](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L295)

#### Returns

`boolean` \| `undefined`

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`enabled`](/api/index/interfaces/ActionBindingUpdate#enabled)

***

### humanReporting?

> `readonly` `optional` **humanReporting?**: [`HumanReporting`](/api/index/type-aliases/HumanReporting)

Defined in: [src/action/types.ts:299](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L299)

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`humanReporting`](/api/index/interfaces/ActionBindingUpdate#humanreporting)

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

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`input`](/api/index/interfaces/ActionBindingUpdate#input-1)

***

### instance?

> `readonly` `optional` **instance?**: `string`

Defined in: [src/action/types.ts:315](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L315)

***

### locators?

> `readonly` `optional` **locators?**: readonly [`Binding`](/api/index/type-aliases/Binding)[]

Defined in: [src/action/types.ts:298](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L298)

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`locators`](/api/index/interfaces/ActionBindingUpdate#locators)

***

### node

> `readonly` **node**: `string`

Defined in: [src/action/types.ts:314](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L314)

***

### onInvocation?

> `readonly` `optional` **onInvocation?**: (`invocation`, `settlement`) => `void` \| `PromiseLike`\<`void`\>

Defined in: [src/action/types.ts:321](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L321)

Observe every invocation without pretending a host listener returns the
action mutation's output. Core does not own the host callback type, so its
host branch is deliberately `unknown`; framework bindings may refine it.

#### Parameters

##### invocation

[`ActionObservedInvocation`](/api/index/type-aliases/ActionObservedInvocation)\<`Output`, `unknown`, `Id`\>

##### settlement

[`ActionSettlementCapability`](/api/index/interfaces/ActionSettlementCapability)\<`Id`\>

#### Returns

`void` \| `PromiseLike`\<`void`\>

***

### onInvocationError?

> `readonly` `optional` **onInvocationError?**: (`error`) => `void` \| `PromiseLike`\<`void`\>

Defined in: [src/action/types.ts:326](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L326)

Optional sink for observer failures; neither observer can replace app behavior.

#### Parameters

##### error

`unknown`

#### Returns

`void` \| `PromiseLike`\<`void`\>
