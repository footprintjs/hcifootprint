---
title: RegisterToolGroupOptions
---

# Interface: RegisterToolGroupOptions

Defined in: [src/traverse/nav-session.ts:72](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L72)

## Properties

### enabled?

> `optional` **enabled?**: `Record`\<`string`, `boolean`\>

Defined in: [src/traverse/nav-session.ts:82](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L82)

Initial disabled state per tool (leaf name → enabled). Flip later via handle.setEnabled.

***

### handlers?

> `optional` **handlers?**: `Record`\<`string`, [`ToolHandler`](/api/index/type-aliases/ToolHandler)\>

Defined in: [src/traverse/nav-session.ts:74](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L74)

Bind the app's EXISTING handlers (by reference) to tools declared on this node.

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/traverse/nav-session.ts:78](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L78)

Instance key when registering one card of a repeats container ('o-123').

***

### tools?

> `optional` **tools?**: `Record`\<`string`, [`RegisteredToolDef`](/api/index/interfaces/RegisteredToolDef)\>

Defined in: [src/traverse/nav-session.ts:76](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L76)

Declare new leaf tools here-and-now (the register-with-just-a-description path).

***

### visible?

> `optional` **visible?**: `boolean`

Defined in: [src/traverse/nav-session.ts:80](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L80)

Initial visibility signal (same wire as setVisible).
