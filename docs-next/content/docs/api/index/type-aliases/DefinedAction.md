---
title: DefinedAction<F, Id, Mode>
---

# Type Alias: DefinedAction\<F, Id, Mode\>

> **DefinedAction**\<`F`, `Id`, `Mode`\> = `F` & `object`

Defined in: [src/action/types.ts:263](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L263)

A callable carrying an action-definition identity. The marker is type-only;
runtime recognition uses a non-enumerable `Symbol.for` property.

## Type Declaration

### \[DEFINED\_ACTION\_TYPE\]

> `readonly` **\[DEFINED\_ACTION\_TYPE\]**: `object`

#### \[DEFINED\_ACTION\_TYPE\].definitionId

> `readonly` **definitionId**: `Id`

#### \[DEFINED\_ACTION\_TYPE\].invocation

> `readonly` **invocation**: `Mode`

## Type Parameters

### F

`F` *extends* (...`args`) => `any` = (...`args`) => `any`

### Id

`Id` *extends* `string` = `string`

### Mode

`Mode` *extends* [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode) = [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)
