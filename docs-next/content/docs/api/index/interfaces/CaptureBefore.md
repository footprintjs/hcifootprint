---
title: CaptureBefore
---

# Interface: CaptureBefore

Defined in: [src/contextful/types.ts:177](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L177)

What was true the moment before the action ran.

## Properties

### at

> **at**: `number`

Defined in: [src/contextful/types.ts:178](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L178)

***

### cursorVersion

> **cursorVersion**: `number`

Defined in: [src/contextful/types.ts:181](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L181)

***

### guard

> **guard**: [`GuardRead`](/api/index/interfaces/GuardRead)[]

Defined in: [src/contextful/types.ts:183](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L183)

Guard read-keys and their outcome. Names only — the values stay in the app.

***

### input?

> `optional` **input?**: `Record`\<`string`, `unknown`\>

Defined in: [src/contextful/types.ts:185](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L185)

The allowlisted payload keys, redacted by the app. Absent when nothing was allowlisted.

***

### node

> **node**: `string`

Defined in: [src/contextful/types.ts:180](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L180)

The cursor: where the session was, and at which version.
