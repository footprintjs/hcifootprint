---
title: Settlement
---

# Type Alias: Settlement

> **Settlement** = `"pending"` \| `"committed"` \| `"rejected"` \| `"rolled-back"` \| `"superseded"`

Defined in: [src/atom/types.ts:95](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L95)

Settlement of a transition's declared effect.
fire() → 'pending' when the affordance declares writes; the app reports the
real state delta via updateState() which settles to 'committed'. Async and
optimistic UI reject/rollback/supersede instead of lying in the record.
