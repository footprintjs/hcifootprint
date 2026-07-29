---
title: RegisterToolGroupOptions
---

# Interface: RegisterToolGroupOptions

Defined in: [src/traverse/nav-session.ts:73](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L73)

## Properties

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
