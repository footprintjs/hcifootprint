---
title: SensorWindow
---

# Interface: SensorWindow

Defined in: [src/sensor/dom-port.ts:105](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L105)

The window: location motion, and the timers a debounced cadence borrows.

## Extends

- [`SensorEventTarget`](/api/sensor/interfaces/SensorEventTarget)

## Properties

### location?

> `readonly` `optional` **location?**: \{ `pathname?`: `string`; \} \| `null`

Defined in: [src/sensor/dom-port.ts:106](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L106)

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

#### Inherited from

[`SensorEventTarget`](/api/sensor/interfaces/SensorEventTarget).[`addEventListener`](/api/sensor/interfaces/SensorEventTarget#addeventlistener)

***

### clearTimeout()?

> `optional` **clearTimeout**(`handle`): `void`

Defined in: [src/sensor/dom-port.ts:109](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L109)

#### Parameters

##### handle

`unknown`

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

#### Inherited from

[`SensorEventTarget`](/api/sensor/interfaces/SensorEventTarget).[`removeEventListener`](/api/sensor/interfaces/SensorEventTarget#removeeventlistener)

***

### setTimeout()?

> `optional` **setTimeout**(`handler`, `timeout`): `unknown`

Defined in: [src/sensor/dom-port.ts:108](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L108)

Optional so a minimal view still satisfies the port; `timersOf` checks before it reads.

#### Parameters

##### handler

() => `void`

##### timeout

`number`

#### Returns

`unknown`
