---
title: AttributionPolicy
---

# Type Alias: AttributionPolicy

> **AttributionPolicy** = `"default"` \| `"strict"`

Defined in: [src/atom/types.ts:1125](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1125)

How hard [Session.updateState](/api/index/classes/Session#updatestate) may guess. See
[SessionOptions.attributionPolicy](/api/index/interfaces/SessionOptions#attributionpolicy) — `'default'` is today's ladder,
`'strict'` refuses the two rungs that are guesses.
