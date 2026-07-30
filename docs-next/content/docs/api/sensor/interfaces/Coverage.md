---
title: Coverage
---

# Interface: Coverage

Defined in: [src/sensor/types.ts:231](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L231)

What the sensor is watching right now, and what it has said since it started.

## Properties

### at

> `readonly` **at**: `number`

Defined in: [src/sensor/types.ts:241](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L241)

The clock reading when coverage() was asked.

***

### declared

> `readonly` **declared**: `number`

Defined in: [src/sensor/types.ts:237](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L237)

How many controls are declared through attach() right now.

***

### edges

> `readonly` **edges**: readonly [`EdgeCoverage`](/api/sensor/interfaces/EdgeCoverage)[]

Defined in: [src/sensor/types.ts:233](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L233)

One row per LIVE edge: watching, or unwatched with the sentence saying why.

***

### reports

> `readonly` **reports**: `Readonly`\<`Record`\<[`SensorReport`](/api/sensor/type-aliases/SensorReport)\[`"kind"`\], `number`\>\>

Defined in: [src/sensor/types.ts:235](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L235)

How many reports of each kind this watcher has emitted.

***

### since

> `readonly` **since**: `number`

Defined in: [src/sensor/types.ts:239](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L239)

The clock reading when the watcher started — the tally's window opens here.
