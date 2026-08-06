---
title: ExternalObservation
---

# Interface: ExternalObservation

Defined in: [src/atom/types.ts:321](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L321)

WHAT SOMEBODY ELSE SAW — one report about an effect this client cannot
observe, handed in through [Session.observeEffect](/api/index/classes/Session#observeeffect).

A RECORD OF A REPORT, NEVER A FACT ABOUT THE WORLD. The library did not watch
the payment clear; the app said a source it trusts said so, and that sentence
is what is written down — source, status, and a REFERENCE to evidence nobody
here ever fetches, dereferences or interprets.

APPEND-ONLY. Observations accumulate on the live record in arrival order and
are never rewritten; the FIRST one decides the settlement (first settlement
wins, traverse/settlement.ts), and a later one is a new record beside the old,
exactly as an `arrival: 'observed'` upgrade rides beside its receipt.

## Properties

### evidenceRef?

> `optional` **evidenceRef?**: `string`

Defined in: [src/atom/types.ts:331](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L331)

A POINTER at the evidence — a receipt id, a URL, a log key. Recorded
verbatim (capped) and never followed: the library cannot check it, so it
does not pretend to have.

***

### recordedAt

> **recordedAt**: `number`

Defined in: [src/atom/types.ts:333](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L333)

When this session recorded the report (epoch ms). Never when the effect happened — nobody here knows that.

***

### source

> **source**: `string`

Defined in: [src/atom/types.ts:323](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L323)

WHO reported it, in the app's own words ('stripe-webhook'). App data, capped, never a sentence.

***

### status

> **status**: `"performed"` \| `"refused"`

Defined in: [src/atom/types.ts:325](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L325)

What they said happened. Two words, because a settlement has two answers.
