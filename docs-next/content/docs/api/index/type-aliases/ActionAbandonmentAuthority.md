---
title: ActionAbandonmentAuthority
---

# Type Alias: ActionAbandonmentAuthority

> **ActionAbandonmentAuthority** = \{ `kind`: `"cancelled"`; `reason`: `unknown`; \} \| \{ `deadlineAt`: `number`; `kind`: `"deadline"`; \} \| \{ `kind`: `"evidence-exhausted"`; `sources`: readonly `string`[]; \}

Defined in: [src/action/types.ts:432](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L432)

The explicit fact that authorizes an `abandoned` effect terminal.
