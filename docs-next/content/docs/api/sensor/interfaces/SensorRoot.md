---
title: SensorRoot
---

# Interface: SensorRoot

Defined in: [src/sensor/dom-port.ts:123](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L123)

The delegation root the app hands in. An element, a document, or a shadow
root — all three are real answers to "where do my controls live", so the port
names what they have in common and asks for nothing more.

## Extends

- [`SensorEventTarget`](/api/sensor/interfaces/SensorEventTarget)

## Properties

### defaultView?

> `readonly` `optional` **defaultView?**: [`SensorWindow`](/api/sensor/interfaces/SensorWindow) \| `null`

Defined in: [src/sensor/dom-port.ts:126](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L126)

***

### ownerDocument?

> `readonly` `optional` **ownerDocument?**: [`SensorDocument`](/api/sensor/interfaces/SensorDocument) \| `null`

Defined in: [src/sensor/dom-port.ts:124](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L124)

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

### getElementById()?

> `optional` **getElementById**(`elementId`): [`SensorElement`](/api/sensor/interfaces/SensorElement) \| `null`

Defined in: [src/sensor/dom-port.ts:125](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L125)

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
