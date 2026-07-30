---
title: ControlRef
---

# Type Alias: ControlRef

> **ControlRef** = (`element`) => `void`

Defined in: [src/react/use-control.ts:49](https://github.com/footprintjs/hcifootprint/blob/main/src/react/use-control.ts#L49)

The ref callback the hook returns. It takes the structural
[SensorElement](/api/sensor/interfaces/SensorElement), which every real `HTMLElement` satisfies — so it goes
straight onto a `<button>`, an `<input>` or a `<div>` with no cast.

## Parameters

### element

[`SensorElement`](/api/sensor/interfaces/SensorElement) \| `null`

## Returns

`void`
