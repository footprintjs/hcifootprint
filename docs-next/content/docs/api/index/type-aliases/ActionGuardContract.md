---
title: ActionGuardContract
---

# Type Alias: ActionGuardContract

> **ActionGuardContract** = `object` & \{ `when`: [`WhereFilter`](/api/index/type-aliases/WhereFilter); \} \| \{ `enabledWhen`: [`WhereFilter`](/api/index/type-aliases/WhereFilter); \} \| \{ `blockedBecause`: `NonNullable`\<`object`\[`"blockedBecause"`\]\>; \}

Defined in: [src/action/types.ts:97](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L97)

Grouped, declarative availability metadata owned by one action definition.

## Type Declaration

### blockedBecause?

> `readonly` `optional` **blockedBecause?**: [`BlockedBecause`](/api/index/interfaces/BlockedBecause) \| (() => [`BlockedBecause`](/api/index/interfaces/BlockedBecause) \| `undefined`)

The app-authored explanation served while the action is unavailable.

### enabledWhen?

> `readonly` `optional` **enabledWhen?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Projected-state condition for enabledness.

### when?

> `readonly` `optional` **when?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Projected-state condition for presence.
