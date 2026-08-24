---
title: BindingRegistration
---

# Interface: BindingRegistration

Defined in: [src/registry/registry.ts:60](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L60)

One registration whose structured binding identity is known.

## Extends

- [`Registration`](/api/index/interfaces/Registration)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/registry/registry.ts:35](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L35)

#### Inherited from

[`Registration`](/api/index/interfaces/Registration).[`affordanceId`](/api/index/interfaces/Registration#affordanceid)

***

### attached

> **attached**: `boolean`

Defined in: [src/registry/registry.ts:63](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L63)

***

### binding

> **binding**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)

Defined in: [src/registry/registry.ts:61](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L61)

Structured identity for registrations made through the Action Binding
Protocol. Absent on the legacy flat registration door, which was never
handed a node or instance and must not invent either one.

#### Overrides

[`Registration`](/api/index/interfaces/Registration).[`binding`](/api/index/interfaces/Registration#binding)

***

### busy?

> `optional` **busy?**: `string`

Defined in: [src/registry/registry.ts:50](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L50)

The app's own label for "this control is working right now" (the spinner in
the button). Absent means the app has not said — never "not busy". Purely a
carried fact: this layer neither reads it nor times it out.

#### Inherited from

[`Registration`](/api/index/interfaces/Registration).[`busy`](/api/index/interfaces/Registration#busy)

***

### coverage

> **coverage**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/registry/registry.ts:62](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L62)

***

### enabled

> **enabled**: `boolean`

Defined in: [src/registry/registry.ts:44](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L44)

False when the control is on screen but not currently clickable (a greyed
button). The tool is still SERVED to the agent — with an honesty marker —
but firing it is refused as TOOL_DISABLED. Default true.

#### Inherited from

[`Registration`](/api/index/interfaces/Registration).[`enabled`](/api/index/interfaces/Registration#enabled)

***

### group

> **group**: `string`

Defined in: [src/registry/registry.ts:36](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L36)

#### Inherited from

[`Registration`](/api/index/interfaces/Registration).[`group`](/api/index/interfaces/Registration#group)

***

### handler

> **handler**: [`ActionHandler`](/api/index/type-aliases/ActionHandler)

Defined in: [src/registry/registry.ts:37](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L37)

#### Inherited from

[`Registration`](/api/index/interfaces/Registration).[`handler`](/api/index/interfaces/Registration#handler)

***

### humanReporting?

> `optional` **humanReporting?**: [`HumanReporting`](/api/index/type-aliases/HumanReporting)

Defined in: [src/registry/registry.ts:65](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L65)

***

### input?

> `optional` **input?**: () => `unknown`

Defined in: [src/registry/registry.ts:66](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L66)

#### Returns

`unknown`

***

### locators

> **locators**: readonly [`Binding`](/api/index/type-aliases/Binding)[]

Defined in: [src/registry/registry.ts:64](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L64)

***

### readBusy?

> `optional` **readBusy?**: () => `string` \| `undefined`

Defined in: [src/registry/registry.ts:68](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L68)

#### Returns

`string` \| `undefined`

***

### readEnabled?

> `optional` **readEnabled?**: () => `boolean` \| `undefined`

Defined in: [src/registry/registry.ts:67](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L67)

#### Returns

`boolean` \| `undefined`

***

### registeredAt

> **registeredAt**: `number`

Defined in: [src/registry/registry.ts:38](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L38)

#### Inherited from

[`Registration`](/api/index/interfaces/Registration).[`registeredAt`](/api/index/interfaces/Registration#registeredat)

***

### revision

> **revision**: `number`

Defined in: [src/registry/registry.ts:70](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L70)

Increments whenever committed binding facts change.
