---
title: ControlSurfaceProviderProps
---

# Interface: ControlSurfaceProviderProps

Defined in: [src/react/context.ts:31](https://github.com/footprintjs/hcifootprint/blob/main/src/react/context.ts#L31)

## Properties

### children?

> `readonly` `optional` **children?**: `ReactNode`

Defined in: [src/react/context.ts:38](https://github.com/footprintjs/hcifootprint/blob/main/src/react/context.ts#L38)

***

### watch

> `readonly` **watch**: [`PageWatch`](/api/sensor/interfaces/PageWatch) \| `null`

Defined in: [src/react/context.ts:37](https://github.com/footprintjs/hcifootprint/blob/main/src/react/context.ts#L37)

The watcher every control below this point reports through, or `null` while
there is none (a server render, or the commit before the app's effect made
one).
