---
title: useActionBinding
---

# Function: useActionBinding()

> **useActionBinding**\<`F`, `Id`, `Props`, `Host`, `Interactive`, `ValueElement`, `This`, `EventArgs`, `ComposedProps`\>(`runtime`, `definition`, `props`, `adapter`, `options`): [`UseActionBindingResult`](/api/react/interfaces/UseActionBindingResult)\<`Host`, `ComposedProps`, `Id`\>

Defined in: src/react/use-action-binding.ts:149

Connect a callable action to one committed React host.

Render only composes props. The callback ref owns resolve/connect/attach and
their exact inverse; an insertion effect publishes the newest committed prop
readers without touching a host or changing binding identity.

## Type Parameters

### F

`F` *extends* (...`args`) => `any`

### Id

`Id` *extends* `string`

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

### ComposedProps

`ComposedProps`

## Parameters

### runtime

[`ActionBindingRuntime`](/api/index/interfaces/ActionBindingRuntime)

### definition

[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`\>

### props

`Readonly`\<`Props`\>

### adapter

[`ActionHostAdapter`](/api/index/interfaces/ActionHostAdapter)\<`Props`, `Host`, `Interactive`, `ValueElement`, [`ActionInvocationMiddleware`](/api/index/type-aliases/ActionInvocationMiddleware)\<`This`, `EventArgs`, `ReturnType`\<`F`\>\>, `ComposedProps`, [`Binding`](/api/index/type-aliases/Binding)\>

### options

`Parameters`\<`F`\> *extends* \[\] ? `Omit`\<[`UseActionBindingOptions`](/api/react/interfaces/UseActionBindingOptions)\<`Props`, `undefined`, `Interactive`, `Id`, `Awaited`\<`ReturnType`\<`F`\>\>\>, `"input"`\> & `object` : [`UseActionBindingOptions`](/api/react/interfaces/UseActionBindingOptions)\<`Props`, `Parameters`\<`F`\>\[`0`\], `Interactive`, `Id`, `Awaited`\<`ReturnType`\<`F`\>\>\>

## Returns

[`UseActionBindingResult`](/api/react/interfaces/UseActionBindingResult)\<`Host`, `ComposedProps`, `Id`\>
