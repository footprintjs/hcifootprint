---
title: UpdateResult
---

# Type Alias: UpdateResult

> **UpdateResult** = \{ `attributed`: `boolean`; `ok`: `true`; `transition`: [`TransitionRecord`](/api/index/interfaces/TransitionRecord); `version`: `number`; \} \| \{ `issues`: `string`; `ok`: `false`; `reason`: `"UNCLONEABLE_DELTA"`; \} \| \{ `ok`: `false`; `pending`: `string`[]; `reason`: `"UNKNOWN_TRANSITION"`; \}

Defined in: [src/atom/types.ts:1328](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1328)
