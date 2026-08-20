---
title: Coverage
---

# Interface: Coverage

Defined in: [src/sensor/types.ts:247](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L247)

What the sensor is watching right now, and what it has said since it started.

## Properties

### at

> `readonly` **at**: `number`

Defined in: [src/sensor/types.ts:257](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L257)

The clock reading when coverage() was asked.

***

### declared

> `readonly` **declared**: `number`

Defined in: [src/sensor/types.ts:253](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L253)

How many controls are declared through attach() right now.

***

### edges

> `readonly` **edges**: readonly [`EdgeCoverage`](/api/sensor/interfaces/EdgeCoverage)[]

Defined in: [src/sensor/types.ts:249](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L249)

One row per LIVE edge: watching, or unwatched with the sentence saying why.

***

### reports

> `readonly` **reports**: `Readonly`\<`Record`\<[`SensorReport`](/api/sensor/type-aliases/SensorReport)\[`"kind"`\], `number`\>\>

Defined in: [src/sensor/types.ts:251](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L251)

How many reports of each kind this watcher has emitted.

***

### since

> `readonly` **since**: `number`

Defined in: [src/sensor/types.ts:255](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L255)

The clock reading when the watcher started — the tally's window opens here.
