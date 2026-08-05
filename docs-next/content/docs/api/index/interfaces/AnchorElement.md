---
title: AnchorElement
---

# Interface: AnchorElement

Defined in: [src/contextful/anchor-port.ts:91](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/anchor-port.ts#L91)

The anchor itself: an element the app hands over, which the library listens
ON (capture phase, so the whole subtree is in scope) and observes INSIDE.

## Extends

- `AnchorNode`

## Properties

### ownerDocument?

> `readonly` `optional` **ownerDocument?**: [`AnchorDocument`](/api/index/interfaces/AnchorDocument) \| `null`

Defined in: [src/contextful/anchor-port.ts:94](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/anchor-port.ts#L94)

***

### tagName?

> `readonly` `optional` **tagName?**: `unknown`

Defined in: [src/contextful/anchor-port.ts:48](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/anchor-port.ts#L48)

Uppercase in HTML documents ('BUTTON'); the reader folds case itself.

#### Inherited from

`AnchorNode.tagName`

## Methods

### addEventListener()

> **addEventListener**(`type`, `listener`, `options?`): `void`

Defined in: [src/contextful/anchor-port.ts:92](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/anchor-port.ts#L92)

#### Parameters

##### type

`string`

##### listener

`AnchorListener`

##### options?

`AnchorListenerOptions`

#### Returns

`void`

***

### getAttribute()?

> `optional` **getAttribute**(`name`): `string` \| `null`

Defined in: [src/contextful/anchor-port.ts:49](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/anchor-port.ts#L49)

#### Parameters

##### name

`string`

#### Returns

`string` \| `null`

#### Inherited from

`AnchorNode.getAttribute`

***

### removeEventListener()

> **removeEventListener**(`type`, `listener`, `options?`): `void`

Defined in: [src/contextful/anchor-port.ts:93](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/anchor-port.ts#L93)

#### Parameters

##### type

`string`

##### listener

`AnchorListener`

##### options?

`AnchorListenerOptions`

#### Returns

`void`
