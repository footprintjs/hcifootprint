---
title: ControlDeclaration
---

# Interface: ControlDeclaration

Defined in: [src/sensor/control-index.ts:32](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/control-index.ts#L32)

A control the app hands over. FOUR fields, none of them framework-shaped —
this is the entire surface a Vue or Angular binding needs (a template ref plus
a scope-dispose, an ElementRef plus ngOnDestroy).

## Properties

### cadence?

> `readonly` `optional` **cadence?**: [`Cadence`](/api/sensor/type-aliases/Cadence)

Defined in: [src/sensor/control-index.ts:45](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/control-index.ts#L45)

Per-control override of the watcher's cadence (cadence.ts).

***

### edge

> `readonly` **edge**: `string`

Defined in: [src/sensor/control-index.ts:34](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/control-index.ts#L34)

The affordance this control IS.

***

### element

> `readonly` **element**: [`SensorElement`](/api/sensor/interfaces/SensorElement)

Defined in: [src/sensor/control-index.ts:36](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/control-index.ts#L36)

Handed over — never matched by name.

***

### instance?

> `readonly` `optional` **instance?**: `string`

Defined in: [src/sensor/control-index.ts:38](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/control-index.ts#L38)

One row of a repeats container.

***

### value?

> `readonly` `optional` **value?**: () => `unknown`

Defined in: [src/sensor/control-index.ts:43](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/control-index.ts#L43)

THE DECLARED VALUE, read at report time. The only legal source of a payload
anywhere in this subpath (payload.ts).

#### Returns

`unknown`
