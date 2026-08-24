---
title: ActionInvoke<F, Id, HasInputReader>
---

# Type Alias: ActionInvoke\<F, Id, HasInputReader\>

> **ActionInvoke**\<`F`, `Id`, `HasInputReader`\> = `unknown` *extends* `ThisParameterType`\<`F`\> ? `Parameters`\<`F`\> *extends* \[\] \| \[`unknown`\] \| \[`unknown`?\] ? `Parameters`\<`F`\> *extends* \[\] ? () => [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\> : \[\] *extends* `Parameters`\<`F`\> ? \{(): [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\>; (`input`): [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\>; \} : `HasInputReader` *extends* `true` ? \{(): [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\>; (`input`): [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\>; \} : (`input`) => [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\> : `never` : `never`

Defined in: [src/action/types.ts:203](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L203)

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
