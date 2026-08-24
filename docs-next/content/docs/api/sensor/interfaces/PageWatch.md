---
title: PageWatch
---

# Interface: PageWatch

Defined in: [src/sensor/types.ts:299](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L299)

The handle `watchPage` returns.

A named method rather than a bare closure because a framework binding stores it
across renders, and `registerActions`'s handle already sets that idiom
(nav-session.ts:238-257).

`stop()` is idempotent, the same contract a PresenceHandle keeps: watch → stop
→ watch nets to one live listener set.

## Extended by

- [`BindingAwarePageWatch`](/api/sensor/interfaces/BindingAwarePageWatch)

## Methods

### attach()

> **attach**(`control`): [`ControlAttachment`](/api/sensor/interfaces/ControlAttachment)

Defined in: [src/sensor/types.ts:301](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L301)

Hand a control over. THE declared level — see [ControlDeclaration](/api/sensor/interfaces/ControlDeclaration).

#### Parameters

##### control

[`ControlDeclaration`](/api/sensor/interfaces/ControlDeclaration)

#### Returns

[`ControlAttachment`](/api/sensor/interfaces/ControlAttachment)

***

### coverage()

> **coverage**(): [`Coverage`](/api/sensor/interfaces/Coverage)

Defined in: [src/sensor/types.ts:302](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L302)

#### Returns

[`Coverage`](/api/sensor/interfaces/Coverage)

***

### stop()

> **stop**(): `void`

Defined in: [src/sensor/types.ts:303](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L303)

#### Returns

`void`
