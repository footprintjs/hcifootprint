---
title: KindCatalog
---

# Interface: KindCatalog

Defined in: src/action/kinds.ts:63

The governance contract a runtime mounts. Query-shaped, deliberately: the
runtime asks questions, the catalog never reaches into matching — one
direction of authority, the same reason a host adapter resolves targets
but never listens.

INVARIANT: `describe(k)` returns a record exactly when `has(k)` is true.
A catalog that answers has=true, describe=undefined has drifted, and the
default enforces the invariant by construction.

## Extended by

- [`DeclaredKindCatalog`](/api/index/interfaces/DeclaredKindCatalog)

## Properties

### fingerprint?

> `readonly` `optional` **fingerprint?**: `string`

Defined in: src/action/kinds.ts:74

A stable content hash of the vocabulary — sorted names with revisions.
Optional DATA rather than a third method: a transport carries it so a
match between sides governed by DIFFERENT catalogs can refuse naming
both fingerprints, converting drift into a loud refusal instead of a
silent mis-match. Enforcement at the seam arrives with the channel
layer; the fingerprint exists now so wires can start carrying it.

## Methods

### describe()

> **describe**(`kind`): [`KindRecord`](/api/index/interfaces/KindRecord) \| `undefined`

Defined in: src/action/kinds.ts:65

#### Parameters

##### kind

`string`

#### Returns

[`KindRecord`](/api/index/interfaces/KindRecord) \| `undefined`

***

### has()

> **has**(`kind`): `boolean`

Defined in: src/action/kinds.ts:64

#### Parameters

##### kind

`string`

#### Returns

`boolean`
