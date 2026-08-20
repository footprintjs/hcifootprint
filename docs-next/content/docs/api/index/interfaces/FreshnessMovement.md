---
title: FreshnessMovement
---

# Interface: FreshnessMovement

Defined in: [src/atom/types.ts:1519](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1519)

ONE THING THAT MOVED UNDER A SERVED ROW — what a freshness refusal names, so a
reader is told the FIELD rather than a conclusion (the shape `GUARD_FAILED`'s
evidence and `TOOL_DISABLED`'s evidence already take).

Key names and page ids only. No value crosses on this wire, and nothing here
is compared against anything: it says a key moved, never that its value is now
wrong.

## Properties

### axis

> **axis**: `"guard"` \| `"reads"` \| `"writes"` \| `"position"`

Defined in: [src/atom/types.ts:1521](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1521)

Which declaration this movement is about.

***

### from?

> `optional` **from?**: `string`

Defined in: [src/atom/types.ts:1527](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1527)

`'position'` only: the page the row was served on.

***

### keys?

> `optional` **keys?**: `string`[]

Defined in: [src/atom/types.ts:1525](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1525)

The state keys that moved, by name. Absent on the `'position'` axis, which has none.

***

### response

> **response**: `"require-ack"` \| `"refuse"`

Defined in: [src/atom/types.ts:1523](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1523)

What this session's policy does about it — the reason the fire was refused.

***

### to?

> `optional` **to?**: `string`

Defined in: [src/atom/types.ts:1529](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1529)

`'position'` only: the page the cursor is on now.
