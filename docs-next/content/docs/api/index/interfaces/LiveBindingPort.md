---
title: LiveBindingPort
---

# Interface: LiveBindingPort

Defined in: [src/graph/sources/types.ts:108](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L108)

What a live source needs from a session — structural and type-only, so
fromLiveStore stays a zero-value-import leaf. InteractionSession satisfies
it as-is: the declare-then-bind wire (registerToolGroup) plus the visibility
wire (show/setVisible) an app may drive after its own handler flips tabs.

## Methods

### registerToolGroup()

> **registerToolGroup**(`path`, `opts?`): [`ToolGroupHandle`](/api/index/interfaces/ToolGroupHandle)

Defined in: [src/graph/sources/types.ts:109](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L109)

#### Parameters

##### path

`string`

##### opts?

[`RegisterToolGroupOptions`](/api/index/interfaces/RegisterToolGroupOptions)

#### Returns

[`ToolGroupHandle`](/api/index/interfaces/ToolGroupHandle)

***

### setVisible()

> **setVisible**(`path`, `visible`): `void`

Defined in: [src/graph/sources/types.ts:111](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L111)

#### Parameters

##### path

`string`

##### visible

`boolean`

#### Returns

`void`

***

### show()

> **show**(`path`): `void`

Defined in: [src/graph/sources/types.ts:110](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L110)

#### Parameters

##### path

`string`

#### Returns

`void`
