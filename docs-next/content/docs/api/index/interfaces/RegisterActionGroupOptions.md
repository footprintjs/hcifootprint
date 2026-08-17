---
title: RegisterActionGroupOptions
---

# Interface: RegisterActionGroupOptions

Defined in: [src/traverse/nav-session.ts:80](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L80)

## Properties

### actions?

> `optional` **actions?**: `Record`\<`string`, [`RegisteredActionDef`](/api/index/interfaces/RegisteredActionDef)\>

Defined in: [src/traverse/nav-session.ts:84](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L84)

Declare new leaf actions here-and-now (the register-with-just-a-description path).

***

### busy?

> `optional` **busy?**: `Record`\<`string`, `string`\>

Defined in: [src/traverse/nav-session.ts:101](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L101)

Which controls are ALREADY WORKING as this mounts, in your own words (leaf
name — or qualified id — → the label). The registration-time half of
[AvailableEdge.busy](/api/index/interfaces/AvailableEdge#busy), for a component that re-renders mid-flight and
knows it; flip it later through `handle.setBusy`.

A label, never a flag: there is no boolean form, and a non-string is refused
with one warning rather than turned into a state this library made up. An action
absent from this map says NOTHING about that control — not "idle".

***

### enabled?

> `optional` **enabled?**: `Record`\<`string`, `boolean`\>

Defined in: [src/traverse/nav-session.ts:90](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L90)

Initial disabled state per action (leaf name → enabled). Flip later via handle.setEnabled.

***

### handlers?

> `optional` **handlers?**: `Record`\<`string`, [`ActionHandler`](/api/index/type-aliases/ActionHandler)\>

Defined in: [src/traverse/nav-session.ts:82](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L82)

Bind the app's EXISTING handlers (by reference) to actions declared on this node.

***

### holds?

> `optional` **holds?**: `Record`\<`string`, () => `unknown`\>

Defined in: [src/traverse/nav-session.ts:117](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L117)

What each control HOLDS right now (leaf name — or qualified id — → a reader
the served row calls at serve time). The registration-time half of
[AvailableEdge.holds](/api/index/interfaces/AvailableEdge#holds): the component already holds the draft in a
variable, so it hands over the way to read it and never a copy.

Released with the group's handlers on `unregister()` — a reader that
outlived its component would answer with the last render's state, which is
exactly the stale value this surface exists to avoid.

KEEP IT A READ. It runs once per served row, and rows are assembled on a hot
path (every refused fire builds one for its gap context), so return the
variable you already hold — never compute, fetch, or write in it. A reader
that throws costs the row its value and nothing else.

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/traverse/nav-session.ts:86](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L86)

Instance key when registering one card of a repeats container ('o-123').

***

### visible?

> `optional` **visible?**: `boolean`

Defined in: [src/traverse/nav-session.ts:88](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L88)

Initial visibility signal (same wire as setVisible).
