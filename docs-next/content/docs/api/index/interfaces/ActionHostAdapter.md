---
title: ActionHostAdapter<Props, Host, Interactive, ValueElement, Invocation, ComposedProps, Locator>
---

# Interface: ActionHostAdapter\<Props, Host, Interactive, ValueElement, Invocation, ComposedProps, Locator\>

Defined in: src/action/host-adapter.ts:61

A framework-neutral component adapter.

`composeInvocation` deliberately has no Host argument: a framework may call
it while rendering, before any ref has committed. `resolve` and all live fact
readers belong to the later host-commit phase. None of the optional readers
has a heuristic fallback; an omitted reader produces `undefined`.

## Type Parameters

### Props

`Props`

### Host

`Host`

### Interactive

`Interactive` *extends* `object`

### ValueElement

`ValueElement` *extends* `object` = `Interactive`

### Invocation

`Invocation` = `unknown`

### ComposedProps

`ComposedProps` = `Readonly`\<`Props`\>

### Locator

`Locator` = [`Binding`](/api/index/type-aliases/Binding)

## Methods

### composeInvocation()

> **composeInvocation**(`props`, `invoke`): `ComposedProps`

Defined in: src/action/host-adapter.ts:70

#### Parameters

##### props

`Readonly`\<`Props`\>

##### invoke

`Invocation`

#### Returns

`ComposedProps`

***

### projectLocators()?

> `optional` **projectLocators**(`context`): readonly `Locator`[] \| `undefined`

Defined in: src/action/host-adapter.ts:92

#### Parameters

##### context

[`ActionHostContext`](/api/index/interfaces/ActionHostContext)\<`Props`, `Host`, `Interactive`, `ValueElement`\>

#### Returns

readonly `Locator`[] \| `undefined`

***

### readBusy()?

> `optional` **readBusy**(`context`): `string` \| `undefined`

Defined in: src/action/host-adapter.ts:84

#### Parameters

##### context

[`ActionHostContext`](/api/index/interfaces/ActionHostContext)\<`Props`, `Host`, `Interactive`, `ValueElement`\>

#### Returns

`string` \| `undefined`

***

### readCoverage()?

> `optional` **readCoverage**(`context`): [`BindingCoverage`](/api/index/type-aliases/BindingCoverage) \| `undefined`

Defined in: src/action/host-adapter.ts:88

#### Parameters

##### context

[`ActionHostContext`](/api/index/interfaces/ActionHostContext)\<`Props`, `Host`, `Interactive`, `ValueElement`\>

#### Returns

[`BindingCoverage`](/api/index/type-aliases/BindingCoverage) \| `undefined`

***

### readEnabled()?

> `optional` **readEnabled**(`context`): `boolean` \| `undefined`

Defined in: src/action/host-adapter.ts:80

#### Parameters

##### context

[`ActionHostContext`](/api/index/interfaces/ActionHostContext)\<`Props`, `Host`, `Interactive`, `ValueElement`\>

#### Returns

`boolean` \| `undefined`

***

### resolve()

> **resolve**(`props`, `host`): [`ActionHostTargetResolution`](/api/index/type-aliases/ActionHostTargetResolution)\<`Interactive`, `ValueElement`\>

Defined in: src/action/host-adapter.ts:75

#### Parameters

##### props

`Readonly`\<`Props`\>

##### host

`Host`

#### Returns

[`ActionHostTargetResolution`](/api/index/type-aliases/ActionHostTargetResolution)\<`Interactive`, `ValueElement`\>
