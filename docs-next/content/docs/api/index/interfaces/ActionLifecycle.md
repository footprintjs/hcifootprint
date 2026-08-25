---
title: ActionLifecycle<Id, Stage>
---

# Interface: ActionLifecycle\<Id, Stage\>

Defined in: [src/action/types.ts:430](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L430)

Narrow, transition-owned capability optionally passed to an opted-in handler.

## Type Parameters

### Id

`Id` *extends* `string` = `string`

### Stage

`Stage` *extends* `string` = `string`

## Properties

### transition

> `readonly` **transition**: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>

Defined in: [src/action/types.ts:434](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L434)

## Methods

### reportProgress()

> **reportProgress**(`stage`, `detail?`): `void`

Defined in: [src/action/types.ts:436](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L436)

Report one declared stage. Instrumentation failures never replace app behavior.

#### Parameters

##### stage

`Stage`

##### detail?

`unknown`

#### Returns

`void`
