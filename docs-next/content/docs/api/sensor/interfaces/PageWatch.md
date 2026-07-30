---
title: PageWatch
---

# Interface: PageWatch

Defined in: [src/sensor/types.ts:281](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L281)

The handle `watchPage` returns.

A named method rather than a bare closure because a framework binding stores it
across renders, and `registerToolGroup`'s handle already sets that idiom
(nav-session.ts:238-257).

`stop()` is idempotent, the same contract a PresenceHandle keeps: watch → stop
→ watch nets to one live listener set.

## Methods

### attach()

> **attach**(`control`): [`ControlAttachment`](/api/sensor/interfaces/ControlAttachment)

Defined in: [src/sensor/types.ts:283](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L283)

Hand a control over. THE declared level — see [ControlDeclaration](/api/sensor/interfaces/ControlDeclaration).

#### Parameters

##### control

[`ControlDeclaration`](/api/sensor/interfaces/ControlDeclaration)

#### Returns

[`ControlAttachment`](/api/sensor/interfaces/ControlAttachment)

***

### coverage()

> **coverage**(): [`Coverage`](/api/sensor/interfaces/Coverage)

Defined in: [src/sensor/types.ts:284](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L284)

#### Returns

[`Coverage`](/api/sensor/interfaces/Coverage)

***

### stop()

> **stop**(): `void`

Defined in: [src/sensor/types.ts:285](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L285)

#### Returns

`void`
