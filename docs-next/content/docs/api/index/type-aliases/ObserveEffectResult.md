---
title: ObserveEffectResult
---

# Type Alias: ObserveEffectResult

> **ObserveEffectResult** = \{ `ok`: `true`; `settled`: `boolean`; `transition`: [`TransitionRecord`](/api/index/interfaces/TransitionRecord); \} \| \{ `awaiting`: `string`[]; `ok`: `false`; `reason`: `"UNKNOWN_TRANSITION"`; \} \| \{ `ok`: `false`; `reason`: `"NOT_A_FIRE"`; `transitionId`: `string`; \} \| \{ `issues`: `string`; `ok`: `false`; `reason`: `"INVALID_OBSERVATION"`; \}

Defined in: [src/atom/types.ts:348](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L348)

What became of one external observation.

`settled: false` is not a failure — it means the fire had already come to rest
(its receipt stands, never rewritten) and this report was recorded beside it.

## Union Members

### Type Literal

\{ `ok`: `true`; `settled`: `boolean`; `transition`: [`TransitionRecord`](/api/index/interfaces/TransitionRecord); \}

***

### Type Literal

\{ `awaiting`: `string`[]; `ok`: `false`; `reason`: `"UNKNOWN_TRANSITION"`; \}

#### awaiting

> **awaiting**: `string`[]

The fires still awaiting a settlement — the ids this door can still answer for.

#### ok

> **ok**: `false`

#### reason

> **reason**: `"UNKNOWN_TRANSITION"`

***

### Type Literal

\{ `ok`: `false`; `reason`: `"NOT_A_FIRE"`; `transitionId`: `string`; \}

***

### Type Literal

\{ `issues`: `string`; `ok`: `false`; `reason`: `"INVALID_OBSERVATION"`; \}
