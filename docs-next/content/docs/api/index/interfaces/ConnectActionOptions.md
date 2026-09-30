---
title: ConnectActionOptions<Input, Output, Id>
---

# Interface: ConnectActionOptions\<Input, Output, Id\>

Defined in: [src/action/types.ts:357](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L357)

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

Defined in: [src/action/types.ts:344](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L344)

#### Returns

`string` \| `undefined`

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`busy`](/api/index/interfaces/ActionBindingUpdate#busy)

***

### coverage?

> `readonly` `optional` **coverage?**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/types.ts:345](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L345)

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`coverage`](/api/index/interfaces/ActionBindingUpdate#coverage)

***

### enabled?

> `readonly` `optional` **enabled?**: () => `boolean` \| `undefined`

Defined in: [src/action/types.ts:343](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L343)

#### Returns

`boolean` \| `undefined`

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`enabled`](/api/index/interfaces/ActionBindingUpdate#enabled)

***

### humanReporting?

> `readonly` `optional` **humanReporting?**: [`HumanReporting`](/api/index/type-aliases/HumanReporting)

Defined in: [src/action/types.ts:347](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L347)

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`humanReporting`](/api/index/interfaces/ActionBindingUpdate#humanreporting)

***

### input?

> `readonly` `optional` **input?**: () => `Input`

Defined in: [src/action/types.ts:342](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L342)

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

Defined in: [src/action/types.ts:363](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L363)

***

### invokedBy?

> `readonly` `optional` **invokedBy?**: `"agent"` \| `"system"` \| `"user"`

Defined in: [src/action/types.ts:384](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L384)

Who invokes THIS connection through its direct doors (`invoke`,
`invokeContinuation`). Declared, never inferred: `humanReporting` says
which subsystem reports a person's interaction, not who called `invoke()`.
Checked against the definition's `principal.mayInvoke` at connect, so it
can never file an invocation under a principal the definition refuses.
Absent: direct invocations stay `'unknown'`. A caller other than this
one uses the principal port (`runtime.forPrincipal`), which stamps its own.

***

### locators?

> `readonly` `optional` **locators?**: readonly [`Binding`](/api/index/type-aliases/Binding)[]

Defined in: [src/action/types.ts:346](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L346)

#### Inherited from

[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate).[`locators`](/api/index/interfaces/ActionBindingUpdate#locators)

***

### node

> `readonly` **node**: `string`

Defined in: [src/action/types.ts:362](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L362)

***

### onInvocation?

> `readonly` `optional` **onInvocation?**: (`invocation`, `settlement`) => `void` \| `PromiseLike`\<`void`\>

Defined in: [src/action/types.ts:369](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L369)

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

Defined in: [src/action/types.ts:374](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L374)

Optional sink for observer failures; neither observer can replace app behavior.

#### Parameters

##### error

`unknown`

#### Returns

`void` \| `PromiseLike`\<`void`\>
