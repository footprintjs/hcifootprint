---
title: SensedSummary
---

# Interface: SensedSummary

Defined in: [src/contextful/types.ts:150](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L150)

What the anchor saw while one action was in flight.

## Properties

### association

> **association**: `"inferred"`

Defined in: [src/contextful/types.ts:156](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L156)

ALWAYS 'inferred'. A listener sees that something happened next to
something else; it never sees causality. The word is the honesty marker
(law 3) and there is no second value it can take.

***

### changes

> **changes**: `number` \| `"unobservable"`

Defined in: [src/contextful/types.ts:161](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L161)

Changes observed inside the window — or 'unobservable' with no observer reachable.

***

### changesDropped?

> `optional` **changesDropped?**: `number`

Defined in: [src/contextful/types.ts:163](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L163)

Changes past the budget, dropped. Present only when something WAS dropped.

***

### effect?

> `optional` **effect?**: [`SensedEffect`](/api/index/interfaces/SensedEffect)

Defined in: [src/contextful/types.ts:166](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L166)

***

### eventsDropped?

> `optional` **eventsDropped?**: `number`

Defined in: [src/contextful/types.ts:165](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L165)

Events past the budget, dropped. Present only when something WAS dropped.

***

### rule

> **rule**: `string`

Defined in: [src/contextful/types.ts:158](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L158)

The correlation rule that produced this association, in words, on the record.

***

### trail

> **trail**: [`SensedTrail`](/api/index/type-aliases/SensedTrail)

Defined in: [src/contextful/types.ts:159](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L159)
