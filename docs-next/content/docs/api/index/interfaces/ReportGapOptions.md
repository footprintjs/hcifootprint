---
title: ReportGapOptions
---

# Interface: ReportGapOptions

Defined in: [src/atom/types.ts:1398](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1398)

## Properties

### actionsMayBeStale?

> `optional` **actionsMayBeStale?**: `boolean`

Defined in: [src/atom/types.ts:1420](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1420)

This row also says the ACTIONS ON OFFER may be out of date — the source they
come from could not be re-read, so what is being served is from before that.

The one 'reported' row that reaches the model. Every other one is triage for
the app (unmet demand, read from [Session.gaps](/api/index/classes/Session#gaps) / [Session.onGap](/api/index/classes/Session#ongap));
this one is a fact about the surface a model is looking at while it looks,
so `groundTruth()`'s facts block prints an AUTHORED line for it — never this
row's `request`, which is runtime text. Without it, a broken read reached the
developer's console and nothing else, and the session went on serving the
pre-failure list as current fact.

Use it for exactly that. It is not a general "tell the model" flag: a row that
marks itself this way while the served list is fine spends the one channel the
library keeps for saying the room may have moved.

***

### note?

> `optional` **note?**: `string`

Defined in: [src/atom/types.ts:1402](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1402)

***

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1403](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1403)

***

### reason?

> `optional` **reason?**: [`GapReason`](/api/index/type-aliases/GapReason)

Defined in: [src/atom/types.ts:1401](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1401)

***

### request

> **request**: `string`

Defined in: [src/atom/types.ts:1400](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1400)

The ask that could not be served (length-capped to stay token-lean).
