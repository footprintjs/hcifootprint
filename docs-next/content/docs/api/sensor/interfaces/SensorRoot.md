---
title: SensorRoot
---

# Interface: SensorRoot

Defined in: src/sensor/dom-port.ts:101

The delegation root the app hands in. An element, a document, or a shadow
root — all three are real answers to "where do my controls live", so the port
names what they have in common and asks for nothing more.

## Extends

- [`SensorEventTarget`](/api/sensor/interfaces/SensorEventTarget)

## Properties

### defaultView?

> `readonly` `optional` **defaultView?**: [`SensorWindow`](/api/sensor/interfaces/SensorWindow) \| `null`

Defined in: src/sensor/dom-port.ts:104

***

### ownerDocument?

> `readonly` `optional` **ownerDocument?**: [`SensorDocument`](/api/sensor/interfaces/SensorDocument) \| `null`

Defined in: src/sensor/dom-port.ts:102

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

### getElementById()?

> `optional` **getElementById**(`elementId`): [`SensorElement`](/api/sensor/interfaces/SensorElement) \| `null`

Defined in: src/sensor/dom-port.ts:103

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
