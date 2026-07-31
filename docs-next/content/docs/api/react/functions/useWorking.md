---
title: useWorking
---

# Function: useWorking()

> **useWorking**(`spec`): `void`

Defined in: [src/react/use-working.ts:256](https://github.com/footprintjs/hcifootprint/blob/main/src/react/use-working.ts#L256)

Say the app is working, for as long as your own flag says so.

```ts
useWorking({ busy: save.isPending, label: 'Saving your draft…', error: save.error, tools: saveTool, session });
```

The flag rising opens one work row and stands the label on each control; the
flag falling closes that row — with the error if one is present — and takes
the label back. Every rise is its own row: a flag that flaps three times
writes three rows, never one reused, because two pieces of work that happened
at different times are two facts.

## Parameters

### spec

[`WorkingSpec`](/api/react/interfaces/WorkingSpec)

## Returns

`void`
