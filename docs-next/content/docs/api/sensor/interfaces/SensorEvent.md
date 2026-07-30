---
title: SensorEvent
---

# Interface: SensorEvent

Defined in: [src/sensor/dom-port.ts:44](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L44)

The three things the sensor asks of an event: what happened, where, and
whether a human really did it.

`isTrusted` is optional because the port must not pretend a hand-built event
object carries it — the trust predicate reads it and answers honestly either
way (an absent flag is not a human).

## Properties

### isTrusted?

> `readonly` `optional` **isTrusted?**: `boolean`

Defined in: [src/sensor/dom-port.ts:47](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L47)

***

### key?

> `readonly` `optional` **key?**: `string`

Defined in: [src/sensor/dom-port.ts:49](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L49)

Present on keydown — the only event class where the key itself is the gesture.

***

### target

> `readonly` **target**: [`SensorElement`](/api/sensor/interfaces/SensorElement) \| `null`

Defined in: [src/sensor/dom-port.ts:46](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L46)

***

### type

> `readonly` **type**: `string`

Defined in: [src/sensor/dom-port.ts:45](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L45)
