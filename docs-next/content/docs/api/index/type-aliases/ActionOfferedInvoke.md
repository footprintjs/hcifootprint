---
title: ActionOfferedInvoke<F, Id, HasInputReader>
---

# Type Alias: ActionOfferedInvoke\<F, Id, HasInputReader\>

> **ActionOfferedInvoke**\<`F`, `Id`, `HasInputReader`\> = `unknown` *extends* `ThisParameterType`\<`F`\> ? `Parameters`\<`F`\> *extends* \[\] \| \[`unknown`\] \| \[`unknown`?\] ? `Parameters`\<`F`\> *extends* \[\] ? (`options`) => [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\> : \[\] *extends* `Parameters`\<`F`\> ? \{(`options`): [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\>; (`options`, `input`): [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\>; \} : `HasInputReader` *extends* `true` ? \{(`options`): [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\>; (`options`, `input`): [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\>; \} : (`options`, `input`) => [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\> : `never` : `never`

Defined in: src/action/types.ts:221

## Type Parameters

### F

`F` *extends* (...`args`) => `any`

### Id

`Id` *extends* `string` = `string`

### HasInputReader

`HasInputReader` *extends* `boolean` = `false`
