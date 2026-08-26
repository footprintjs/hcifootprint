---
title: SurfaceHandle
---

# Interface: SurfaceHandle

Defined in: src/action/channels.ts:30

## Properties

### declaration

> `readonly` **declaration**: [`SurfaceDeclaration`](/api/index/interfaces/SurfaceDeclaration)

Defined in: src/action/channels.ts:31

## Methods

### retire()

> **retire**(): `boolean`

Defined in: src/action/channels.ts:35

Retiring is idempotent and final: a retired surface serves no match,
 and its id may be declared again by a successor. Returns whether this
 call was the one that retired it.

#### Returns

`boolean`
