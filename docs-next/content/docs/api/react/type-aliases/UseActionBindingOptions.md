---
title: UseActionBindingOptions<Props, Input, Interactive, Id, ActionOutput, HostOutput>
---

# Type Alias: UseActionBindingOptions\<Props, Input, Interactive, Id, ActionOutput, HostOutput\>

> **UseActionBindingOptions**\<`Props`, `Input`, `Interactive`, `Id`, `ActionOutput`, `HostOutput`\> = `object` & \{ `input?`: `undefined`; `inputKey?`: `never`; \} \| \{ `input`: (`props`) => `Input`; `inputKey`: `unknown`; \}

Defined in: [src/react/use-action-binding.ts:50](https://github.com/footprintjs/hcifootprint/blob/main/src/react/use-action-binding.ts#L50)

Stable identity, host facts, and explicit input ownership for one React binding.

## Type Declaration

### attachmentKey?

> `readonly` `optional` **attachmentKey?**: `unknown`

A deliberate ref-identity key for props that change descendant resolution,
projected coverage, or locators. Ordinary props do not reattach.

### availabilityKey?

> `readonly` `optional` **availabilityKey?**: `unknown`

Committed generation for adapter-owned enabled/busy readers. Change it
whenever those facts can change. Without it, bindings with either reader
conservatively publish a new revision after every committed render.
Supplying it when the adapter has neither reader is a configuration error.

### coverage?

> `readonly` `optional` **coverage?**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Explicit fallback when coverage belongs to the call site rather than the adapter.

### instance?

> `readonly` `optional` **instance?**: `string`

### node

> `readonly` **node**: `string`

### onInvocation?

> `readonly` `optional` **onInvocation?**: (`invocation`, `settlement`) => `void` \| `PromiseLike`\<`void`\>

Receive the exact transition plus a narrow effect-settlement capability.
Errors from this observer never replace the host listener's own result.

#### Parameters

##### invocation

[`ActionObservedInvocation`](/api/index/type-aliases/ActionObservedInvocation)\<`ActionOutput`, `HostOutput`, `Id`\>

##### settlement

[`ActionSettlementCapability`](/api/index/interfaces/ActionSettlementCapability)\<`Id`\>

#### Returns

`void` \| `PromiseLike`\<`void`\>

### onInvocationError?

> `readonly` `optional` **onInvocationError?**: (`error`) => `void` \| `PromiseLike`\<`void`\>

Optional sink for an `onInvocation` observer failure.

#### Parameters

##### error

`unknown`

#### Returns

`void` \| `PromiseLike`\<`void`\>

### projector?

> `readonly` `optional` **projector?**: [`ActionBindingProjector`](/api/react/interfaces/ActionBindingProjector)\<`Interactive`, `Id`\> \| `null`

The watcher/projector that owns a portal's physical interactive root.

## Type Parameters

### Props

`Props`

### Input

`Input`

### Interactive

`Interactive` *extends* `object`

### Id

`Id` *extends* `string` = `string`

### ActionOutput

`ActionOutput` = `unknown`

### HostOutput

`HostOutput` = `unknown`
