---
title: Coverage
---

# Interface: Coverage

Defined in: [src/sensor/types.ts:203](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L203)

What the sensor is watching right now, and what it has said since it started.

## Properties

### at

> `readonly` **at**: `number`

Defined in: [src/sensor/types.ts:213](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L213)

The clock reading when coverage() was asked.

***

### declared

> `readonly` **declared**: `number`

Defined in: [src/sensor/types.ts:209](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L209)

How many controls are declared through attach() right now.

***

### edges

> `readonly` **edges**: readonly [`EdgeCoverage`](/api/sensor/interfaces/EdgeCoverage)[]

Defined in: [src/sensor/types.ts:205](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L205)

One row per LIVE edge: watching, or unwatched with the sentence saying why.

***

### reports

> `readonly` **reports**: `Readonly`\<`Record`\<[`SensorReport`](/api/sensor/type-aliases/SensorReport)\[`"kind"`\], `number`\>\>

Defined in: [src/sensor/types.ts:207](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L207)

How many reports of each kind this watcher has emitted.

***

### since

> `readonly` **since**: `number`

Defined in: [src/sensor/types.ts:211](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L211)

The clock reading when the watcher started — the tally's window opens here.
