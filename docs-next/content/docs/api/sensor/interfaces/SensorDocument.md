---
title: SensorDocument
---

# Interface: SensorDocument

Defined in: src/sensor/dom-port.ts:91

The document, for id lookup (aria-labelledby) and for reaching the view.

## Extends

- [`SensorEventTarget`](/api/sensor/interfaces/SensorEventTarget)

## Properties

### defaultView?

> `readonly` `optional` **defaultView?**: [`SensorWindow`](/api/sensor/interfaces/SensorWindow) \| `null`

Defined in: src/sensor/dom-port.ts:93

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

#### Inherited from

[`SensorEventTarget`](/api/sensor/interfaces/SensorEventTarget).[`addEventListener`](/api/sensor/interfaces/SensorEventTarget#addeventlistener)

***

### getElementById()

> **getElementById**(`elementId`): [`SensorElement`](/api/sensor/interfaces/SensorElement) \| `null`

Defined in: src/sensor/dom-port.ts:92

#### Parameters

##### elementId

`string`

#### Returns

[`SensorElement`](/api/sensor/interfaces/SensorElement) \| `null`

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

#### Inherited from

[`SensorEventTarget`](/api/sensor/interfaces/SensorEventTarget).[`removeEventListener`](/api/sensor/interfaces/SensorEventTarget#removeeventlistener)
