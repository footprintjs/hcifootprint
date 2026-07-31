---
title: WorkingSession
---

# Type Alias: WorkingSession

> **WorkingSession** = `Pick`\<[`Session`](/api/index/classes/Session), `"beginWork"` \| `"warn"`\>

Defined in: [src/react/use-working.ts:97](https://github.com/footprintjs/hcifootprint/blob/main/src/react/use-working.ts#L97)

The two session doors this hook drives, and not one more.

Picked from the real [Session](/api/index/classes/Session) rather than restated, so it can never
drift from what a session actually offers — and narrow on purpose: the type
itself says a component that adopts this hook handed over the power to open
work and to warn, and no power at all to fire, settle, reject or write state.
