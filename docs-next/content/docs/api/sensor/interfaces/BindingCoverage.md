---
title: BindingCoverage
---

# Interface: BindingCoverage

Defined in: src/sensor/binding-index.ts:48

One row of `coverage()`: a live binding and whether the sensor is watching it.

## Properties

### blocked?

> `readonly` `optional` **blocked?**: [`BlockedBy`](/api/sensor/type-aliases/BlockedBy)

Defined in: src/sensor/binding-index.ts:54

Present only when unwatched — which of the three walls it hit.

***

### edge

> `readonly` **edge**: `string`

Defined in: src/sensor/binding-index.ts:49

***

### reason?

> `readonly` `optional` **reason?**: `string`

Defined in: src/sensor/binding-index.ts:52

Present only when unwatched — the plain sentence saying why, and what to do.

***

### status

> `readonly` **status**: `"unwatched"` \| `"watching"`

Defined in: src/sensor/binding-index.ts:50
