---
title: UseActionBindingOptions<Props, Input, Interactive, Id, Output>
---

# Interface: UseActionBindingOptions\<Props, Input, Interactive, Id, Output\>

Defined in: src/react/use-action-binding.ts:52

Stable identity and explicit host facts for one React binding.

## Type Parameters

### Props

`Props`

### Input

`Input`

### Interactive

`Interactive` *extends* `object`

### Id

`Id` *extends* `string` = `string`

### Output

`Output` = `unknown`

## Properties

### attachmentKey?

> `readonly` `optional` **attachmentKey?**: `unknown`

Defined in: src/react/use-action-binding.ts:69

A deliberate ref-identity key for props that change descendant resolution,
projected coverage, or locators. Ordinary props do not reattach.

***

### coverage?

> `readonly` `optional` **coverage?**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: src/react/use-action-binding.ts:62

Explicit fallback when coverage belongs to the call site rather than the adapter.

***

### input?

> `readonly` `optional` **input?**: (`props`) => `Input`

Defined in: src/react/use-action-binding.ts:64

Application-owned input for direct agent invocation; never scraped from the host.

#### Parameters

##### props

`Readonly`\<`Props`\>

#### Returns

`Input`

***

### instance?

> `readonly` `optional` **instance?**: `string`

Defined in: src/react/use-action-binding.ts:60

***

### node

> `readonly` **node**: `string`

Defined in: src/react/use-action-binding.ts:59

***

### onInvocation?

> `readonly` `optional` **onInvocation?**: (`invocation`, `settlement`) => `void` \| `PromiseLike`\<`void`\>

Defined in: src/react/use-action-binding.ts:76

Receive the exact transition plus a narrow effect-settlement capability.
Errors from this observer never replace the host listener's own result.

#### Parameters

##### invocation

[`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Output`, `Id`\>

##### settlement

[`ActionSettlementCapability`](/api/react/interfaces/ActionSettlementCapability)\<`Id`\>

#### Returns

`void` \| `PromiseLike`\<`void`\>

***

### onInvocationError?

> `readonly` `optional` **onInvocationError?**: (`error`) => `void` \| `PromiseLike`\<`void`\>

Defined in: src/react/use-action-binding.ts:81

Optional sink for an `onInvocation` observer failure.

#### Parameters

##### error

`unknown`

#### Returns

`void` \| `PromiseLike`\<`void`\>

***

### projector?

> `readonly` `optional` **projector?**: [`ActionBindingProjector`](/api/react/interfaces/ActionBindingProjector)\<`Interactive`, `Id`\> \| `null`

Defined in: src/react/use-action-binding.ts:71

The watcher/projector that owns a portal's physical interactive root.
