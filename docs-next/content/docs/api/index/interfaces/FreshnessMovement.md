---
title: FreshnessMovement
---

# Interface: FreshnessMovement

Defined in: [src/atom/types.ts:1543](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1543)

ONE THING THAT MOVED UNDER A SERVED ROW — what a freshness refusal names, so a
reader is told the FIELD rather than a conclusion (the shape `GUARD_FAILED`'s
evidence and `TOOL_DISABLED`'s evidence already take).

Key names and page ids only. No value crosses on this wire, and nothing here
is compared against anything: it says a key moved, never that its value is now
wrong.

## Properties

### axis

> **axis**: `"guard"` \| `"reads"` \| `"writes"` \| `"position"`

Defined in: [src/atom/types.ts:1545](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1545)

Which declaration this movement is about.

***

### from?

> `optional` **from?**: `string`

Defined in: [src/atom/types.ts:1551](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1551)

`'position'` only: the page the row was served on.

***

### keys?

> `optional` **keys?**: `string`[]

Defined in: [src/atom/types.ts:1549](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1549)

The state keys that moved, by name. Absent on the `'position'` axis, which has none.

***

### response

> **response**: `"require-ack"` \| `"refuse"`

Defined in: [src/atom/types.ts:1547](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1547)

What this session's policy does about it — the reason the fire was refused.

***

### to?

> `optional` **to?**: `string`

Defined in: [src/atom/types.ts:1553](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1553)

`'position'` only: the page the cursor is on now.
