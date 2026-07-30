---
title: SensorTimers
---

# Interface: SensorTimers

Defined in: [src/sensor/dom-port.ts:99](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L99)

The timer pair a debounced cadence needs — taken from the environment the app
already handed in, never from a global.

WHY THIS IS A PORT AND NOT A CALL: `setTimeout` is not in `lib: ["ES2022"]`,
so naming it in src/ is `error TS2304` (probed). The house law and the
compiler agree for once, and the result is that a non-browser host can drive
the debounce cadence with its own clock.

## Methods

### clearTimeout()

> **clearTimeout**(`handle`): `void`

Defined in: [src/sensor/dom-port.ts:101](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L101)

#### Parameters

##### handle

`unknown`

#### Returns

`void`

***

### setTimeout()

> **setTimeout**(`handler`, `timeout`): `unknown`

Defined in: [src/sensor/dom-port.ts:100](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L100)

#### Parameters

##### handler

() => `void`

##### timeout

`number`

#### Returns

`unknown`
