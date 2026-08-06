---
title: FreshnessMovement
---

# Interface: FreshnessMovement

Defined in: [src/atom/types.ts:1492](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1492)

ONE THING THAT MOVED UNDER A SERVED ROW — what a freshness refusal names, so a
reader is told the FIELD rather than a conclusion (the shape `GUARD_FAILED`'s
evidence and `TOOL_DISABLED`'s evidence already take).

Key names and page ids only. No value crosses on this wire, and nothing here
is compared against anything: it says a key moved, never that its value is now
wrong.

## Properties

### axis

> **axis**: `"guard"` \| `"reads"` \| `"writes"` \| `"position"`

Defined in: [src/atom/types.ts:1494](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1494)

Which declaration this movement is about.

***

### from?

> `optional` **from?**: `string`

Defined in: [src/atom/types.ts:1500](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1500)

`'position'` only: the page the row was served on.

***

### keys?

> `optional` **keys?**: `string`[]

Defined in: [src/atom/types.ts:1498](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1498)

The state keys that moved, by name. Absent on the `'position'` axis, which has none.

***

### response

> **response**: `"require-ack"` \| `"refuse"`

Defined in: [src/atom/types.ts:1496](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1496)

What this session's policy does about it — the reason the fire was refused.

***

### to?

> `optional` **to?**: `string`

Defined in: [src/atom/types.ts:1502](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1502)

`'position'` only: the page the cursor is on now.
