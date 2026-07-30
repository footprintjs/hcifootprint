---
title: EdgeCoverage
---

# Interface: EdgeCoverage

Defined in: [src/sensor/binding-index.ts:58](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/binding-index.ts#L58)

One row of `coverage()`: a live edge and whether the sensor is watching it.

## Properties

### blocked?

> `readonly` `optional` **blocked?**: [`BlockedBy`](/api/sensor/type-aliases/BlockedBy)

Defined in: [src/sensor/binding-index.ts:64](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/binding-index.ts#L64)

Present only when unwatched — which of the three walls it hit.

***

### edge

> `readonly` **edge**: `string`

Defined in: [src/sensor/binding-index.ts:59](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/binding-index.ts#L59)

***

### reason?

> `readonly` `optional` **reason?**: `string`

Defined in: [src/sensor/binding-index.ts:62](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/binding-index.ts#L62)

Present only when unwatched — the plain sentence saying why, and what to do.

***

### status

> `readonly` **status**: `"unwatched"` \| `"watching"`

Defined in: [src/sensor/binding-index.ts:60](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/binding-index.ts#L60)
