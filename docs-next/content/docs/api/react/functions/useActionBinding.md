---
title: useActionBinding
---

# Function: useActionBinding()

> **useActionBinding**\<`F`, `Id`, `Mode`, `Props`, `Host`, `Interactive`, `ValueElement`, `This`, `EventArgs`, `HostResult`, `ComposedProps`\>(`runtime`, `definition`, `props`, `adapter`, `options`): [`UseActionBindingResult`](/api/react/interfaces/UseActionBindingResult)\<`Host`, `ComposedProps`, `Id`\>

Defined in: [src/react/use-action-binding.ts:168](https://github.com/footprintjs/hcifootprint/blob/main/src/react/use-action-binding.ts#L168)

Connect a callable action to one committed React host.

Render only composes props. The callback ref owns resolve/connect/attach and
their exact inverse; an insertion effect publishes the newest committed prop
readers without touching a host or changing binding identity.

## Type Parameters

### F

`F` *extends* (...`args`) => `any`

### Id

`Id` *extends* `string`

### Mode

`Mode` *extends* [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)

### Props

`Props`

### Host

`Host`

### Interactive

`Interactive` *extends* `object`

### ValueElement

`ValueElement` *extends* `object`

### This

`This`

### EventArgs

`EventArgs` *extends* readonly `unknown`[]

### HostResult

`HostResult`

### ComposedProps

`ComposedProps`

## Parameters

### runtime

[`ActionRuntime`](/api/index/interfaces/ActionRuntime)

### definition

[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `Mode`\>

### props

`Readonly`\<`Props`\>

### adapter

[`ActionHostAdapter`](/api/index/interfaces/ActionHostAdapter)\<`Props`, `Host`, `Interactive`, `ValueElement`, [`ActionInvocationMiddleware`](/api/index/type-aliases/ActionInvocationMiddleware)\<`This`, `EventArgs`, `HostResult`\>, `ComposedProps`, [`Binding`](/api/index/type-aliases/Binding)\>

### options

[`UseActionBindingOptions`](/api/react/type-aliases/UseActionBindingOptions)\<`Props`, `Mode` *extends* `"scalar"` ? `Parameters`\<`F`\>\[`0`\] : `undefined`, `Interactive`, `Id`, `Awaited`\<`ReturnType`\<`F`\>\>, `Awaited`\<`HostResult`\>\> & `Mode` *extends* `"scalar"` ? `unknown` : `object`

## Returns

[`UseActionBindingResult`](/api/react/interfaces/UseActionBindingResult)\<`Host`, `ComposedProps`, `Id`\>
