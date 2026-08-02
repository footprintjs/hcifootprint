---
title: Registration
---

# Interface: Registration

Defined in: [src/registry/registry.ts:23](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L23)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/registry/registry.ts:24](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L24)

***

### busy?

> `optional` **busy?**: `string`

Defined in: [src/registry/registry.ts:39](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L39)

The app's own label for "this control is working right now" (the spinner in
the button). Absent means the app has not said — never "not busy". Purely a
carried fact: this layer neither reads it nor times it out.

***

### enabled

> **enabled**: `boolean`

Defined in: [src/registry/registry.ts:33](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L33)

False when the control is on screen but not currently clickable (a greyed
button). The tool is still SERVED to the agent — with an honesty marker —
but firing it is refused as TOOL_DISABLED. Default true.

***

### group

> **group**: `string`

Defined in: [src/registry/registry.ts:25](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L25)

***

### handler

> **handler**: [`ActionHandler`](/api/index/type-aliases/ActionHandler)

Defined in: [src/registry/registry.ts:26](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L26)

***

### registeredAt

> **registeredAt**: `number`

Defined in: [src/registry/registry.ts:27](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L27)
