---
title: ControlDeclaration
---

# Interface: ControlDeclaration

Defined in: [src/sensor/control-index.ts:32](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/control-index.ts#L32)

A control the app hands over. FIVE fields besides the element, none of them
framework-shaped — this is the entire surface a Vue or Angular binding needs
(a template ref plus a scope-dispose, an ElementRef plus ngOnDestroy).

## Properties

### cadence?

> `readonly` `optional` **cadence?**: [`Cadence`](/api/sensor/type-aliases/Cadence)

Defined in: [src/sensor/control-index.ts:45](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/control-index.ts#L45)

Per-control override of the watcher's cadence (cadence.ts).

***

### commits?

> `readonly` `optional` **commits?**: () => `boolean`

Defined in: [src/sensor/control-index.ts:65](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/control-index.ts#L65)

"Is a gesture on this element the act RIGHT NOW?" Asked at the moment of the
gesture; absent means always, which is what an ordinary control means.

THE TWO-STEP CONTROL IS WHY THIS EXISTS, AND WITHHOLDING THE DECLARATION IS
NOT THE ALTERNATIVE IT LOOKS LIKE. A confirm button reads "Clear archive"
until it is armed and asks a question afterwards, and the first press clears
nothing. An app that simply stopped handing the element over would not stop
the report — it would only change which evidence level answers: the resting
label IS the action's own locator, so the RECOGNISED level claims the element
by name (match.ts) and the ledger gains a clear that never happened.

Only the app knows which press is the act, so this is where it says so, and
the answer is SILENCE rather than a report: nothing happened that the graph
declares. A declaration outranks a name match on the same element, so `false`
closes both levels at once — which is the per-element, per-moment stand-down
`reportedElsewhere` cannot express, because that one is per-edge and
page-wide (types.ts `reportedElsewhere`).

#### Returns

`boolean`

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
