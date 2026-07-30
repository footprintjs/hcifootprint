---
title: useControlSurface
---

# Function: useControlSurface()

> **useControlSurface**(): [`PageWatch`](/api/sensor/interfaces/PageWatch) \| `null`

Defined in: [src/react/context.ts:60](https://github.com/footprintjs/hcifootprint/blob/main/src/react/context.ts#L60)

The watcher in scope, or `null`.

`null` when there is no provider above at all — which is the honest answer, not
an error: a component that renders outside a provider is not broken, it simply
reports nothing. Throwing there would make the sensor's absence a crash, and the
whole point of this subpath is that adopting it changes no behaviour.

## Returns

[`PageWatch`](/api/sensor/interfaces/PageWatch) \| `null`
