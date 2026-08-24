---
title: DefinedAction<F, Id>
---

# Type Alias: DefinedAction\<F, Id\>

> **DefinedAction**\<`F`, `Id`\> = `F` & `object`

Defined in: src/action/types.ts:80

A callable carrying an action-definition identity. The marker is type-only;
runtime recognition uses a non-enumerable `Symbol.for` property.

## Type Declaration

### \[DEFINED\_ACTION\_TYPE\]

> `readonly` **\[DEFINED\_ACTION\_TYPE\]**: `Id`

## Type Parameters

### F

`F` *extends* (...`args`) => `any` = (...`args`) => `any`

### Id

`Id` *extends* `string` = `string`
