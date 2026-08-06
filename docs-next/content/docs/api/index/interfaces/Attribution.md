---
title: Attribution
---

# Interface: Attribution

Defined in: [src/atom/types.ts:158](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L158)

WHO THIS TRANSITION IS FILED UNDER, HOW IT GOT THERE, AND WHAT THAT IS WORTH.

Present on every transition — fires, stimulus rows, sync hops. It is a
DISCLOSURE and refuses nothing; the enforcement half is
[SessionOptions.attributionPolicy](/api/index/interfaces/SessionOptions#attributionpolicy), which an integrator turns on.

`principal` is not always `cause.principal`, and the difference is the point.
A stimulus nobody attributed records `cause.principal: 'system'` — this
library's honest default for a ROW — while this field says `'unknown'`,
because nobody claimed it. The record keeps its old bytes (a consumer reading
`cause` sees exactly what it always saw); the new field says the true thing.

## Properties

### basis

> **basis**: [`AttributionBasis`](/api/index/type-aliases/AttributionBasis)

Defined in: [src/atom/types.ts:161](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L161)

***

### certainty

> **certainty**: [`AttributionCertainty`](/api/index/type-aliases/AttributionCertainty)

Defined in: [src/atom/types.ts:162](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L162)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:160](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L160)

The principal this motion is filed under. `'unknown'` when nobody claimed it.
