---
title: ActionAbandonmentAuthority
---

# Type Alias: ActionAbandonmentAuthority

> **ActionAbandonmentAuthority** = \{ `kind`: `"cancelled"`; `reason`: `unknown`; \} \| \{ `deadlineAt`: `number`; `kind`: `"deadline"`; \} \| \{ `kind`: `"evidence-exhausted"`; `sources`: readonly `string`[]; \}

Defined in: [src/action/types.ts:371](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L371)

The explicit fact that authorizes an `abandoned` effect terminal.
