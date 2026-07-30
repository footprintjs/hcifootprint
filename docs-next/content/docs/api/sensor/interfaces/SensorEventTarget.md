---
title: SensorEventTarget
---

# Interface: SensorEventTarget

Defined in: [src/sensor/dom-port.ts:31](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L31)

Anything the sensor can attach a delegated listener to.

## Extended by

- [`SensorDocument`](/api/sensor/interfaces/SensorDocument)
- [`SensorRoot`](/api/sensor/interfaces/SensorRoot)
- [`SensorWindow`](/api/sensor/interfaces/SensorWindow)

## Methods

### addEventListener()

> **addEventListener**(`type`, `listener`, `options?`): `void`

Defined in: [src/sensor/dom-port.ts:32](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L32)

#### Parameters

##### type

`string`

##### listener

[`SensorListener`](/api/sensor/type-aliases/SensorListener)

##### options?

[`SensorListenerOptions`](/api/sensor/interfaces/SensorListenerOptions)

#### Returns

`void`

***

### removeEventListener()

> **removeEventListener**(`type`, `listener`, `options?`): `void`

Defined in: [src/sensor/dom-port.ts:33](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L33)

#### Parameters

##### type

`string`

##### listener

[`SensorListener`](/api/sensor/type-aliases/SensorListener)

##### options?

[`SensorListenerOptions`](/api/sensor/interfaces/SensorListenerOptions)

#### Returns

`void`
