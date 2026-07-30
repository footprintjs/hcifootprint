---
title: useControl
---

# Function: useControl()

> **useControl**(`spec`): [`ControlRef`](/api/react/type-aliases/ControlRef)

Defined in: [src/react/use-control.ts:59](https://github.com/footprintjs/hcifootprint/blob/main/src/react/use-control.ts#L59)

Declare this element as the control for one edge, for as long as it is rendered.

```ts
const ref = useControl({ edge: 'compose.send', value: () => draft });
return createElement('button', { ref, onClick: send }, 'Send');
```

## Parameters

### spec

[`ControlSpec`](/api/react/type-aliases/ControlSpec)

## Returns

[`ControlRef`](/api/react/type-aliases/ControlRef)
