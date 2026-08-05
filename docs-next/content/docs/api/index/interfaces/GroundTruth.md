---
title: GroundTruth
---

# Interface: GroundTruth

Defined in: [src/atom/types.ts:2277](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2277)

The authoritative record of what this session ACTUALLY did — position plus
every attempt and how it came to rest, in words a model is told outrank the
conversation.

Deliberately separate from [ContextBrief](/api/index/interfaces/ContextBrief), which serves position +
options + narrative. The field exposed a structural hole in that brief: a
REFUSED fire is a gap-ledger row, not a transition, so failed attempts were
invisible in it — and with nothing grounding the model, one integration
watched it narrate an entire flow ("name set, recipe selected") having called
ZERO tools. Its own prose had become its context. This block is the counter:
every attempt, including the refused ones, in one authored channel.

`text` carries AUTHORED constants and authored ids only. What it excludes is
as deliberate as what it holds: no state values or payloads (the
two-string-class invariant, extended to history), no produced data (that is
the data channel), no available actions or journeys (options are whats_here's
job — facts are what happened, and the two stay non-overlapping so both stay
lean), no runtime free text, and no interpretation — one line per occurrence.

## Properties

### node

> **node**: `string`

Defined in: [src/atom/types.ts:2278](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2278)

***

### text

> **text**: `string`

Defined in: [src/atom/types.ts:2280](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2280)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:2279](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2279)
