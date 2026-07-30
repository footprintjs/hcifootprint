---
title: Coverage
---

# Interface: Coverage

Defined in: [src/sensor/types.ts:246](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L246)

What the sensor is watching right now, and what it has said since it started.

## Properties

### at

> `readonly` **at**: `number`

Defined in: [src/sensor/types.ts:256](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L256)

The clock reading when coverage() was asked.

***

### declared

> `readonly` **declared**: `number`

Defined in: [src/sensor/types.ts:252](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L252)

How many controls are declared through attach() right now.

***

### edges

> `readonly` **edges**: readonly [`EdgeCoverage`](/api/sensor/interfaces/EdgeCoverage)[]

Defined in: [src/sensor/types.ts:248](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L248)

One row per LIVE edge: watching, or unwatched with the sentence saying why.

***

### reports

> `readonly` **reports**: `Readonly`\<`Record`\<[`SensorReport`](/api/sensor/type-aliases/SensorReport)\[`"kind"`\], `number`\>\>

Defined in: [src/sensor/types.ts:250](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L250)

How many reports of each kind this watcher has emitted.

***

### since

> `readonly` **since**: `number`

Defined in: [src/sensor/types.ts:254](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L254)

The clock reading when the watcher started — the tally's window opens here.
