---
title: Registration
---

# Interface: Registration

Defined in: [src/registry/registry.ts:34](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L34)

## Extended by

- [`BindingRegistration`](/api/index/interfaces/BindingRegistration)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/registry/registry.ts:35](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L35)

***

### binding?

> `optional` **binding?**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`string`\>

Defined in: [src/registry/registry.ts:56](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L56)

Structured identity for registrations made through the Action Binding
Protocol. Absent on the legacy flat registration door, which was never
handed a node or instance and must not invent either one.

***

### busy?

> `optional` **busy?**: `string`

Defined in: [src/registry/registry.ts:50](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L50)

The app's own label for "this control is working right now" (the spinner in
the button). Absent means the app has not said — never "not busy". Purely a
carried fact: this layer neither reads it nor times it out.

***

### enabled

> **enabled**: `boolean`

Defined in: [src/registry/registry.ts:44](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L44)

False when the control is on screen but not currently clickable (a greyed
button). The tool is still SERVED to the agent — with an honesty marker —
but firing it is refused as TOOL_DISABLED. Default true.

***

### group

> **group**: `string`

Defined in: [src/registry/registry.ts:36](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L36)

***

### handler

> **handler**: [`ActionHandler`](/api/index/type-aliases/ActionHandler)

Defined in: [src/registry/registry.ts:37](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L37)

***

### registeredAt

> **registeredAt**: `number`

Defined in: [src/registry/registry.ts:38](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L38)
