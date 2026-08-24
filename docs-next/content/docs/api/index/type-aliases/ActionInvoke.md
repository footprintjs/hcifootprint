---
title: ActionInvoke<F, Id, HasInputReader, Mode>
---

# Type Alias: ActionInvoke\<F, Id, HasInputReader, Mode\>

> **ActionInvoke**\<`F`, `Id`, `HasInputReader`, `Mode`\> = `Mode` *extends* `"host"` ? `never` : `Mode` *extends* `"inputless"` ? () => [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\> : `Mode` *extends* `"scalar"` ? `HasInputReader` *extends* `true` ? () => [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\> : (`input`) => [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\> : `never`

Defined in: [src/action/types.ts:402](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L402)

Direct invocation is intentionally a scalar-payload door. Host listeners
with a receiver or several arguments use `invokeContinuation`, which keeps
their exact call/apply semantics inside the host adapter.

## Type Parameters

### F

`F` *extends* (...`args`) => `any`

### Id

`Id` *extends* `string` = `string`

### HasInputReader

`HasInputReader` *extends* `boolean` = `false`

### Mode

`Mode` *extends* [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode) = [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)
