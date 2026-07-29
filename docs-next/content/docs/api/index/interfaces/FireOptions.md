---
title: FireOptions
---

# Interface: FireOptions

Defined in: [src/atom/types.ts:492](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L492)

## Properties

### expectedVersion?

> `optional` **expectedVersion?**: `number`

Defined in: [src/atom/types.ts:499](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L499)

Optimistic-concurrency token from available().version. If supplied and
stale, fire() rejects with STALE_CURSOR — the agent must replan on a
fresh slice. Guards are ALSO re-evaluated at fire time regardless.

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/atom/types.ts:502](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L502)

Instance key for a tool on a repeats container (e.g. an order-card id).

***

### invoke?

> `optional` **invoke?**: `boolean`

Defined in: [src/atom/types.ts:508](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L508)

Invoke the registered handler (default true when one exists). The DOM
sensor passes false: the browser already runs the app's own onClick, so
the sensor's fire() is record-only.

***

### payload?

> `optional` **payload?**: `unknown`

Defined in: [src/atom/types.ts:500](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L500)

***

### source

> **source**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:493](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L493)
