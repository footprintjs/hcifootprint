---
title: SyncResult
---

# Type Alias: SyncResult

> **SyncResult** = \{ `changed`: `false`; `node`: `string`; `version`: `number`; \} \| \{ `changed`: `true`; `node`: `string`; `offGraph?`: `boolean`; `transition`: [`TransitionRecord`](/api/index/interfaces/TransitionRecord); `version`: `number`; \}

Defined in: [src/atom/types.ts:1157](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1157)

## Union Members

### Type Literal

\{ `changed`: `false`; `node`: `string`; `version`: `number`; \}

***

### Type Literal

\{ `changed`: `true`; `node`: `string`; `offGraph?`: `boolean`; `transition`: [`TransitionRecord`](/api/index/interfaces/TransitionRecord); `version`: `number`; \}

#### changed

> **changed**: `true`

#### node

> **node**: `string`

#### offGraph?

> `optional` **offGraph?**: `boolean`

True when the observed node is not an authored page. The cursor
follows reality anyway (available() honestly serves zero edges there)
— external motion is recorded, never dropped.

#### transition

> **transition**: [`TransitionRecord`](/api/index/interfaces/TransitionRecord)

#### version

> **version**: `number`
