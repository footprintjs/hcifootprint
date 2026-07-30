---
title: PageWatch
---

# Interface: PageWatch

Defined in: [src/sensor/types.ts:238](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L238)

The handle `watchPage` returns.

A named method rather than a bare closure because a framework binding stores it
across renders, and `registerToolGroup`'s handle already sets that idiom
(nav-session.ts:238-257).

`stop()` is idempotent, the same contract a PresenceHandle keeps: watch → stop
→ watch nets to one live listener set.

## Methods

### attach()

> **attach**(`control`): [`ControlAttachment`](/api/sensor/interfaces/ControlAttachment)

Defined in: [src/sensor/types.ts:240](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L240)

Hand a control over. THE declared level — see [ControlDeclaration](/api/sensor/interfaces/ControlDeclaration).

#### Parameters

##### control

[`ControlDeclaration`](/api/sensor/interfaces/ControlDeclaration)

#### Returns

[`ControlAttachment`](/api/sensor/interfaces/ControlAttachment)

***

### coverage()

> **coverage**(): [`Coverage`](/api/sensor/interfaces/Coverage)

Defined in: [src/sensor/types.ts:241](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L241)

#### Returns

[`Coverage`](/api/sensor/interfaces/Coverage)

***

### stop()

> **stop**(): `void`

Defined in: [src/sensor/types.ts:242](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L242)

#### Returns

`void`
