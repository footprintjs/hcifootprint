---
title: ConformanceReport
---

# Interface: ConformanceReport

Defined in: [src/testing/conform.ts:156](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L156)

## Properties

### checked

> **checked**: `object`[]

Defined in: [src/testing/conform.ts:163](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L163)

The field/seam pairs this run actually put to the test — the pass's denominator.

#### field

> **field**: `string`

#### seam

> **seam**: [`ConformanceSeam`](/api/testing/type-aliases/ConformanceSeam)

***

### dropped

> **dropped**: `object`[]

Defined in: [src/testing/conform.ts:161](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L161)

Every declared field the source did not thread through, named with the seam
that lost it. Empty is the whole pass condition.

#### field

> **field**: `string`

#### seam

> **seam**: [`ConformanceSeam`](/api/testing/type-aliases/ConformanceSeam)

***

### excluded

> **excluded**: `object`[]

Defined in: [src/testing/conform.ts:168](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L168)

The field/seam pairs there was nothing to read at, each with the stated
reason. A pass is never silent about the part of itself that was vacuous.

#### because

> **because**: `string`

#### field

> **field**: `string`

#### seam

> **seam**: [`ConformanceSeam`](/api/testing/type-aliases/ConformanceSeam)
