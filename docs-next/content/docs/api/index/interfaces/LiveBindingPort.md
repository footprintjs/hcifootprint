---
title: LiveBindingPort
---

# Interface: LiveBindingPort

Defined in: [src/graph/sources/types.ts:99](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L99)

What a live source needs from a session — structural and type-only, so
fromLiveStore stays a zero-value-import leaf. InteractionSession satisfies
it as-is: the declare-then-bind wire (registerToolGroup) plus the visibility
wire (show/setVisible) an app may drive after its own handler flips tabs.

## Methods

### registerToolGroup()

> **registerToolGroup**(`path`, `opts?`): [`ToolGroupHandle`](/api/index/interfaces/ToolGroupHandle)

Defined in: [src/graph/sources/types.ts:100](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L100)

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

Defined in: [src/graph/sources/types.ts:102](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L102)

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

Defined in: [src/graph/sources/types.ts:101](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L101)

#### Parameters

##### path

`string`

#### Returns

`void`
