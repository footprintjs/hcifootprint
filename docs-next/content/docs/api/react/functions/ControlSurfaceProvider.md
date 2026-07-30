---
title: ControlSurfaceProvider
---

# Function: ControlSurfaceProvider()

> **ControlSurfaceProvider**(`props`): `ReactElement`

Defined in: [src/react/context.ts:48](https://github.com/footprintjs/hcifootprint/blob/main/src/react/context.ts#L48)

Put a watcher in scope for a subtree.

Written with `createElement` rather than JSX on purpose: the library builds with
no `jsx` compiler option and ships no `.tsx`, so a skin must be expressible in
plain TypeScript. It costs one line and buys a subpath that any bundler can read.

## Parameters

### props

[`ControlSurfaceProviderProps`](/api/react/interfaces/ControlSurfaceProviderProps)

## Returns

`ReactElement`
