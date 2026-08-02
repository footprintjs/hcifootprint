---
title: BusyControl
---

# Type Alias: BusyControl

> **BusyControl** = `Pick`\<[`ActionHandle`](/api/index/interfaces/ActionHandle), `"setBusy"`\>

Defined in: [src/react/use-working.ts:87](https://github.com/footprintjs/hcifootprint/blob/main/src/react/use-working.ts#L87)

Anything that can say a control is working — `setBusy` and nothing else.

DERIVED FROM THE REAL HANDLE, so a `ActionHandle` from `session.registerAction`
goes straight in. A `ActionGroup` deliberately does NOT: its `setBusy` names the
action first (`setBusy(actionId, label)`), and a two-argument function is not
assignable to a one-argument one — so pointing this hook at a group is a
COMPILE ERROR rather than a call that quietly labels an action named "Saving…".
Name the action where the group already knows how:

```ts
actions: { setBusy: (label) => group.setBusy('save', label) }
```
