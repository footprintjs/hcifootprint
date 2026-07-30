---
title: SensorEventTarget
---

# Interface: SensorEventTarget

Defined in: src/sensor/dom-port.ts:35

Anything the sensor can attach a delegated listener to.

## Extended by

- [`SensorDocument`](/api/sensor/interfaces/SensorDocument)
- [`SensorRoot`](/api/sensor/interfaces/SensorRoot)
- [`SensorWindow`](/api/sensor/interfaces/SensorWindow)

## Methods

### addEventListener()

> **addEventListener**(`type`, `listener`, `options?`): `void`

Defined in: src/sensor/dom-port.ts:36

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

Defined in: src/sensor/dom-port.ts:37

#### Parameters

##### type

`string`

##### listener

[`SensorListener`](/api/sensor/type-aliases/SensorListener)

##### options?

[`SensorListenerOptions`](/api/sensor/interfaces/SensorListenerOptions)

#### Returns

`void`
