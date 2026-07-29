---
title: FireResult
---

# Type Alias: FireResult

> **FireResult** = \{ `effectStatus`: [`EffectStatus`](/api/index/type-aliases/EffectStatus); `executed?`: `false`; `materialized?`: `false`; `ok`: `true`; `settlement`: `"settled"` \| `"awaiting-state"`; `transition`: [`TransitionRecord`](/api/index/interfaces/TransitionRecord); `version`: `number`; `whenSettled`: `Promise`\<[`FireSettlement`](/api/index/interfaces/FireSettlement)\>; \} \| \{ `available`: `string`[]; `ok`: `false`; `reason`: `"UNKNOWN_AFFORDANCE"`; \} \| \{ `ok`: `false`; `reason`: `"STALE_CURSOR"`; `version`: `number`; \} \| \{ `node`: `string`; `ok`: `false`; `reason`: `"NOT_ON_NODE"`; \} \| \{ `evidence`: `FilterCondition`[]; `ok`: `false`; `reason`: `"GUARD_FAILED"`; \} \| \{ `issues`: `string`; `ok`: `false`; `reason`: `"PAYLOAD_INVALID"`; \} \| \{ `ok`: `false`; `overlay`: `string`; `reason`: `"BLOCKED_BY_OVERLAY"`; \} \| \{ `node`: `string`; `ok`: `false`; `reason`: `"NODE_NOT_VISIBLE"`; \} \| \{ `node`: `string`; `ok`: `false`; `reason`: `"STILL_MOUNTING"`; \} \| \{ `instances`: `string`[]; `ok`: `false`; `reason`: `"INSTANCE_REQUIRED"`; \} \| \{ `instances`: `string`[]; `ok`: `false`; `reason`: `"INSTANCE_UNKNOWN"`; \} \| \{ `affordanceId`: `string`; `ok`: `false`; `reason`: `"TOOL_DISABLED"`; \} \| \{ `affordanceId`: `string`; `gesture?`: [`Binding`](/api/index/type-aliases/Binding); `ok`: `false`; `reason`: `"NOT_MATERIALIZED"`; \}

Defined in: [src/atom/types.ts:552](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L552)

## Union Members

### Type Literal

\{ `effectStatus`: [`EffectStatus`](/api/index/type-aliases/EffectStatus); `executed?`: `false`; `materialized?`: `false`; `ok`: `true`; `settlement`: `"settled"` \| `"awaiting-state"`; `transition`: [`TransitionRecord`](/api/index/interfaces/TransitionRecord); `version`: `number`; `whenSettled`: `Promise`\<[`FireSettlement`](/api/index/interfaces/FireSettlement)\>; \}

#### effectStatus

> **effectStatus**: [`EffectStatus`](/api/index/type-aliases/EffectStatus)

Whether the app's side has run — the truth AT RETURN TIME. The handler
is always deferred, so this can never be 'performed' here: a fire with
something bound to run returns 'pending', and `whenSettled` carries the
answer. `settlement` answers a different question (does a commit bundle
exist yet?) — reading it as "the app did it" was the reported bug.

#### executed?

> `optional` **executed?**: `false`

Present (false) only on an allowed unmaterialized agent fire: nothing ran.

#### materialized?

> `optional` **materialized?**: `false`

Present (false) only on an allowed unmaterialized agent fire: nothing is bound.

#### ok

> **ok**: `true`

#### settlement

> **settlement**: `"settled"` \| `"awaiting-state"`

#### transition

> **transition**: [`TransitionRecord`](/api/index/interfaces/TransitionRecord)

#### version

> **version**: `number`

#### whenSettled

> **whenSettled**: `Promise`\<[`FireSettlement`](/api/index/interfaces/FireSettlement)\>

Resolves ONCE with what actually happened. NEVER rejects: a refusal
arrives as data (`effectStatus: 'refused'`), because most callers drop
this result unread and an orphaned rejecting promise would be noise
they never opted into.

***

### Type Literal

\{ `available`: `string`[]; `ok`: `false`; `reason`: `"UNKNOWN_AFFORDANCE"`; \}

***

### Type Literal

\{ `ok`: `false`; `reason`: `"STALE_CURSOR"`; `version`: `number`; \}

***

### Type Literal

\{ `node`: `string`; `ok`: `false`; `reason`: `"NOT_ON_NODE"`; \}

***

### Type Literal

\{ `evidence`: `FilterCondition`[]; `ok`: `false`; `reason`: `"GUARD_FAILED"`; \}

***

### Type Literal

\{ `issues`: `string`; `ok`: `false`; `reason`: `"PAYLOAD_INVALID"`; \}

***

### Type Literal

\{ `ok`: `false`; `overlay`: `string`; `reason`: `"BLOCKED_BY_OVERLAY"`; \}

A shown blocking modal masks this tool's node. Close the modal first.

***

### Type Literal

\{ `node`: `string`; `ok`: `false`; `reason`: `"NODE_NOT_VISIBLE"`; \}

The tool's node carries an explicit not-visible signal (hidden tab, closed modal).

***

### Type Literal

\{ `node`: `string`; `ok`: `false`; `reason`: `"STILL_MOUNTING"`; \}

RETRIABLE: the node's mounts have not arrived yet (mid-navigation / deep link).

***

### Type Literal

\{ `instances`: `string`[]; `ok`: `false`; `reason`: `"INSTANCE_REQUIRED"`; \}

***

### Type Literal

\{ `instances`: `string`[]; `ok`: `false`; `reason`: `"INSTANCE_UNKNOWN"`; \}

***

### Type Literal

\{ `affordanceId`: `string`; `ok`: `false`; `reason`: `"TOOL_DISABLED"`; \}

RETRIABLE: the control is registered but currently greyed out (disabled).

***

### Type Literal

\{ `affordanceId`: `string`; `gesture?`: [`Binding`](/api/index/type-aliases/Binding); `ok`: `false`; `reason`: `"NOT_MATERIALIZED"`; \}

Declared but nothing is bound: an agent fire would execute NOTHING (register
 a tool group, or opt the session into read-only touring via
 allowUnmaterializedFires). The app-self-report tier (source 'user'/'system'
 or invoke:false) is never gated — that motion really happened.

#### affordanceId

> **affordanceId**: `string`

#### gesture?

> `optional` **gesture?**: [`Binding`](/api/index/type-aliases/Binding)

The DECLARED gesture nothing is wired to perform — so the refusal says
"this is a click on the checkout button", not "nothing is bound".
Absent when the edge declared no binding (there the old words were
already the whole truth).

#### ok

> **ok**: `false`

#### reason

> **reason**: `"NOT_MATERIALIZED"`
