---
title: SensorCoverage
---

# Interface: SensorCoverage

Defined in: src/sensor/types.ts:162

What the sensor is watching right now, and what it has said since it started.

## Properties

### at

> `readonly` **at**: `number`

Defined in: src/sensor/types.ts:170

The clock reading when coverage() was asked.

***

### bindings

> `readonly` **bindings**: readonly [`BindingCoverage`](/api/sensor/interfaces/BindingCoverage)[]

Defined in: src/sensor/types.ts:164

One row per LIVE binding: watching, or unwatched with the sentence saying why.

***

### reports

> `readonly` **reports**: `Readonly`\<`Record`\<[`SensorReport`](/api/sensor/type-aliases/SensorReport)\[`"kind"`\], `number`\>\>

Defined in: src/sensor/types.ts:166

How many reports of each kind this watcher has emitted.

***

### since

> `readonly` **since**: `number`

Defined in: src/sensor/types.ts:168

The clock reading when the watcher started — the tally's window opens here.
