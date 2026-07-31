---
title: BusyControl
---

# Type Alias: BusyControl

> **BusyControl** = `Pick`\<[`ToolHandle`](/api/index/interfaces/ToolHandle), `"setBusy"`\>

Defined in: src/react/use-working.ts:87

Anything that can say a control is working — `setBusy` and nothing else.

DERIVED FROM THE REAL HANDLE, so a `ToolHandle` from `session.registerTool`
goes straight in. A `ToolGroup` deliberately does NOT: its `setBusy` names the
tool first (`setBusy(toolId, label)`), and a two-argument function is not
assignable to a one-argument one — so pointing this hook at a group is a
COMPILE ERROR rather than a call that quietly labels a tool named "Saving…".
Name the tool where the group already knows how:

```ts
tools: { setBusy: (label) => group.setBusy('save', label) }
```
