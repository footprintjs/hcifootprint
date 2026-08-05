---
title: SensedEvent
---

# Interface: SensedEvent

Defined in: [src/contextful/types.ts:113](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L113)

One DOM event the anchor saw. Type and name-class only — never content.

## Properties

### at

> **at**: `number`

Defined in: [src/contextful/types.ts:121](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L121)

Epoch ms.

***

### targetRole?

> `optional` **targetRole?**: `string`

Defined in: [src/contextful/types.ts:117](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L117)

The target's own `role` attribute, when it has one.

***

### targetTag?

> `optional` **targetTag?**: `string`

Defined in: [src/contextful/types.ts:119](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L119)

The target's tag name, lowercased — the raw fact behind an absent role.

***

### type

> **type**: `string`

Defined in: [src/contextful/types.ts:115](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L115)

'click' | 'input' | 'change' — the event class, never its data.
