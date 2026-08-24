---
title: DeepReadonly<T>
---

# Type Alias: DeepReadonly\<T\>

> **DeepReadonly**\<`T`\> = `T` *extends* (...`args`) => `any` ? `T` : `T` *extends* readonly infer Item[] ? readonly `DeepReadonly`\<`Item`\>[] : `T` *extends* `object` ? `{ readonly [Key in keyof T]: DeepReadonly<T[Key]> }` : `T`

Defined in: [src/action/types.ts:121](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L121)

Recursively make declaration containers readonly while retaining callable
validators and readers as their original function types.

## Type Parameters

### T

`T`
