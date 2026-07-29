---
title: FireOptions
---

# Interface: FireOptions

Defined in: [src/atom/types.ts:586](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L586)

## Properties

### expectedVersion?

> `optional` **expectedVersion?**: `number`

Defined in: [src/atom/types.ts:600](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L600)

Optimistic-concurrency token from available().version. If supplied and
stale, fire() rejects with STALE_CURSOR — the agent must replan on a
fresh slice. Guards are ALSO re-evaluated at fire time regardless.

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/atom/types.ts:603](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L603)

Instance key for a tool on a repeats container (e.g. an order-card id).

***

### invoke?

> `optional` **invoke?**: `boolean`

Defined in: [src/atom/types.ts:609](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L609)

Invoke the registered handler (default true when one exists). The DOM
sensor passes false: the browser already runs the app's own onClick, so
the sensor's fire() is record-only.

***

### payload?

> `optional` **payload?**: `unknown`

Defined in: [src/atom/types.ts:601](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L601)

***

### source

> **source**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:594](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L594)

Who is acting. Required here on purpose — a typed caller should never
leave provenance to an assumption. It is only ever assumed for a caller
the types never reached (plain JS): an omitted source reads as 'agent',
the same assumption `commitSkill()` and `confirmAsk()` publish, never as
'user' — a machine action must not enter the ledger as a human one.
