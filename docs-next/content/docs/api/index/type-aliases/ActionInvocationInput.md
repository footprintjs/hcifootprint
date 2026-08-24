---
title: ActionInvocationInput
---

# Type Alias: ActionInvocationInput

> **ActionInvocationInput** = \{ `provided`: `false`; `source`: `"none"`; \} \| \{ `provided`: `true`; `ref`: [`ActionInputRef`](/api/index/interfaces/ActionInputRef)\<`"bound"`\>; `source`: `"bound"`; \} \| \{ `provided`: `false`; `source`: `"bound"`; \} \| \{ `provided`: `true`; `ref`: [`ActionInputRef`](/api/index/interfaces/ActionInputRef)\<`"caller"`\>; `source`: `"caller"`; \} \| \{ `provided`: `false`; `source`: `"caller"`; \} \| \{ `provided`: `false`; `source`: `"host"`; \}

Defined in: [src/action/types.ts:440](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L440)

Non-secret provenance for the payload rail of one invocation.
