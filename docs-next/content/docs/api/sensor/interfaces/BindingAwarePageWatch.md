---
title: BindingAwarePageWatch
---

# Interface: BindingAwarePageWatch

Defined in: [src/sensor/types.ts:307](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L307)

A current watcher that can accept exact connection-owned projections.

## Extends

- [`PageWatch`](/api/sensor/interfaces/PageWatch)

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

#### Inherited from

[`PageWatch`](/api/sensor/interfaces/PageWatch).[`attach`](/api/sensor/interfaces/PageWatch#attach)

***

### coverage()

> **coverage**(): [`Coverage`](/api/sensor/interfaces/Coverage)

Defined in: [src/sensor/types.ts:302](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L302)

#### Returns

[`Coverage`](/api/sensor/interfaces/Coverage)

#### Inherited from

[`PageWatch`](/api/sensor/interfaces/PageWatch).[`coverage`](/api/sensor/interfaces/PageWatch#coverage)

***

### projectBinding()

> **projectBinding**(`projection`): [`ControlAttachment`](/api/sensor/interfaces/ControlAttachment)

Defined in: [src/sensor/types.ts:309](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L309)

Make the sensor stand down for this exact connection-owned element only.

#### Parameters

##### projection

[`BindingControlProjection`](/api/sensor/interfaces/BindingControlProjection)

#### Returns

[`ControlAttachment`](/api/sensor/interfaces/ControlAttachment)

***

### stop()

> **stop**(): `void`

Defined in: [src/sensor/types.ts:303](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L303)

#### Returns

`void`

#### Inherited from

[`PageWatch`](/api/sensor/interfaces/PageWatch).[`stop`](/api/sensor/interfaces/PageWatch#stop)
