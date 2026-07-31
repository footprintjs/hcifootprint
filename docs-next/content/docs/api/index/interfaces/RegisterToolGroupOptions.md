---
title: RegisterToolGroupOptions
---

# Interface: RegisterToolGroupOptions

Defined in: [src/traverse/nav-session.ts:73](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L73)

## Properties

### busy?

> `optional` **busy?**: `Record`\<`string`, `string`\>

Defined in: [src/traverse/nav-session.ts:94](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L94)

Which controls are ALREADY WORKING as this mounts, in your own words (leaf
name — or qualified id — → the label). The registration-time half of
[AvailableEdge.busy](/api/index/interfaces/AvailableEdge#busy), for a component that re-renders mid-flight and
knows it; flip it later through `handle.setBusy`.

A label, never a flag: there is no boolean form, and a non-string is refused
with one warning rather than turned into a state this library made up. A tool
absent from this map says NOTHING about that control — not "idle".

***

### enabled?

> `optional` **enabled?**: `Record`\<`string`, `boolean`\>

Defined in: [src/traverse/nav-session.ts:83](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L83)

Initial disabled state per tool (leaf name → enabled). Flip later via handle.setEnabled.

***

### handlers?

> `optional` **handlers?**: `Record`\<`string`, [`ToolHandler`](/api/index/type-aliases/ToolHandler)\>

Defined in: [src/traverse/nav-session.ts:75](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L75)

Bind the app's EXISTING handlers (by reference) to tools declared on this node.

***

### holds?

> `optional` **holds?**: `Record`\<`string`, () => `unknown`\>

Defined in: [src/traverse/nav-session.ts:110](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L110)

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

Defined in: [src/traverse/nav-session.ts:79](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L79)

Instance key when registering one card of a repeats container ('o-123').

***

### tools?

> `optional` **tools?**: `Record`\<`string`, [`RegisteredToolDef`](/api/index/interfaces/RegisteredToolDef)\>

Defined in: [src/traverse/nav-session.ts:77](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L77)

Declare new leaf tools here-and-now (the register-with-just-a-description path).

***

### visible?

> `optional` **visible?**: `boolean`

Defined in: [src/traverse/nav-session.ts:81](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L81)

Initial visibility signal (same wire as setVisible).
