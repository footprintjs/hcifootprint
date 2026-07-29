---
title: DriftReport
---

# Interface: DriftReport

Defined in: [src/testing/harness.ts:79](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L79)

## Properties

### effectDrift

> **effectDrift**: `object`[]

Defined in: [src/testing/harness.ts:83](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L83)

Actions whose settled delta did not cover their declared writes — the graph drifted from the handler.

#### affordanceId

> **affordanceId**: `string`

#### declaredWrites

> **declaredWrites**: `string`[]

#### transitionId

> **transitionId**: `string`

***

### gaps

> **gaps**: [`GapRecord`](/api/index/interfaces/GapRecord)[]

Defined in: [src/testing/harness.ts:87](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L87)

The unmet-demand ledger: refused fires + reported gaps.

***

### ok

> **ok**: `boolean`

Defined in: [src/testing/harness.ts:81](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L81)

True when no declared-effect drift was observed (the release-readiness signal).

***

### unevaluatedGuards

> **unevaluatedGuards**: `object`[]

Defined in: [src/testing/harness.ts:85](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L85)

Guard keys taken on faith because the state view never held them (honesty, not failure).

#### affordanceId

> **affordanceId**: `string`

#### keys

> **keys**: `string`[]

#### transitionId

> **transitionId**: `string`
