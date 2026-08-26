---
title: DeclaredKindCatalog
---

# Interface: DeclaredKindCatalog

Defined in: src/action/kinds.ts:85

The concrete default — enumerable, frozen, fingerprinted.

## Extends

- [`KindCatalog`](/api/index/interfaces/KindCatalog)

## Properties

### fingerprint

> `readonly` **fingerprint**: `string`

Defined in: src/action/kinds.ts:86

A stable content hash of the vocabulary — sorted names with revisions.
Optional DATA rather than a third method: a transport carries it so a
match between sides governed by DIFFERENT catalogs can refuse naming
both fingerprints, converting drift into a loud refusal instead of a
silent mis-match. Enforcement at the seam arrives with the channel
layer; the fingerprint exists now so wires can start carrying it.

#### Overrides

[`KindCatalog`](/api/index/interfaces/KindCatalog).[`fingerprint`](/api/index/interfaces/KindCatalog#fingerprint)

## Methods

### describe()

> **describe**(`kind`): [`KindRecord`](/api/index/interfaces/KindRecord) \| `undefined`

Defined in: src/action/kinds.ts:65

#### Parameters

##### kind

`string`

#### Returns

[`KindRecord`](/api/index/interfaces/KindRecord) \| `undefined`

#### Inherited from

[`KindCatalog`](/api/index/interfaces/KindCatalog).[`describe`](/api/index/interfaces/KindCatalog#describe)

***

### has()

> **has**(`kind`): `boolean`

Defined in: src/action/kinds.ts:64

#### Parameters

##### kind

`string`

#### Returns

`boolean`

#### Inherited from

[`KindCatalog`](/api/index/interfaces/KindCatalog).[`has`](/api/index/interfaces/KindCatalog#has)

***

### list()

> **list**(): readonly [`KindRecord`](/api/index/interfaces/KindRecord)[]

Defined in: src/action/kinds.ts:90

Every kind, sorted — for tooling, docs, and the degradation record.
 On the CONCRETE catalog only, never the interface: a remote adapter
 must not be forced to promise a listing it cannot give synchronously.

#### Returns

readonly [`KindRecord`](/api/index/interfaces/KindRecord)[]
