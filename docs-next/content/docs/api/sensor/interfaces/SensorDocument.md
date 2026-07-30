---
title: SensorDocument
---

# Interface: SensorDocument

Defined in: [src/sensor/dom-port.ts:113](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L113)

The document, for id lookup (aria-labelledby) and for reaching the view.

## Extends

- [`SensorEventTarget`](/api/sensor/interfaces/SensorEventTarget)

## Properties

### defaultView?

> `readonly` `optional` **defaultView?**: [`SensorWindow`](/api/sensor/interfaces/SensorWindow) \| `null`

Defined in: [src/sensor/dom-port.ts:115](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L115)

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

### getElementById()

> **getElementById**(`elementId`): [`SensorElement`](/api/sensor/interfaces/SensorElement) \| `null`

Defined in: [src/sensor/dom-port.ts:114](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L114)

#### Parameters

##### elementId

`string`

#### Returns

[`SensorElement`](/api/sensor/interfaces/SensorElement) \| `null`

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
