---
title: ContextfulOptions
---

# Interface: ContextfulOptions

Defined in: [src/contextful/types.ts:73](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L73)

What `contextful(fn, opts)` takes. Everything is optional; the defaults are the honest minimum.

## Properties

### anchor?

> `optional` **anchor?**: [`AnchorSource`](/api/index/type-aliases/AnchorSource)

Defined in: [src/contextful/types.ts:84](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L84)

The element this action lives at. Required for [watch](/api/index/interfaces/ContextfulOptions#watch); a getter is
the SSR-safe form (nothing reads the DOM until the session attaches).

***

### expect?

> `optional` **expect?**: [`ActionExpectation`](/api/index/interfaces/ActionExpectation)

Defined in: [src/contextful/types.ts:100](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L100)

What the app expects to SEE at the anchor when this action really happens.

***

### include?

> `optional` **include?**: readonly `string`[]

Defined in: [src/contextful/types.ts:91](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L91)

THE VALUE ALLOWLIST — payload key names that may be captured BY VALUE, plus
the reserved [ERROR\_MESSAGE](/api/index/variables/ERROR_MESSAGE). Nothing outside it ever carries a value
into the record through this wrapper (law 1). Absent means: no values at
all, which is the honest minimum.

***

### onStimulus?

> `optional` **onStimulus?**: (`event`) => `void`

Defined in: [src/contextful/types.ts:109](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L109)

Anchor events NO invocation claimed — the human moving around the control
without performing the action (law 3: outside the window is stimulus, never
part of the action). Isolated: a listener that throws never reaches the
app's own event dispatch.

#### Parameters

##### event

[`SensedEvent`](/api/index/interfaces/SensedEvent)

#### Returns

`void`

***

### principal?

> `optional` **principal?**: [`DirectPrincipal`](/api/index/type-aliases/DirectPrincipal)

Defined in: [src/contextful/types.ts:102](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L102)

Who a direct (app-initiated) call is filed under. Default 'user'.

***

### redact?

> `optional` **redact?**: (`value`, `key`) => `unknown`

Defined in: [src/contextful/types.ts:98](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L98)

The app's own redactor, run over every allowlisted value before it is
recorded. The library never invents a redaction policy — it only promises
that yours is the last word. Return whatever should stand in the record; a
redactor that throws costs the value its slot and nothing else.

#### Parameters

##### value

`unknown`

##### key

`string`

#### Returns

`unknown`

***

### watch?

> `optional` **watch?**: `boolean`

Defined in: [src/contextful/types.ts:79](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L79)

Attach anchor-scoped listeners and one observer at [anchor](/api/index/interfaces/ContextfulOptions#anchor). Off by
default — sensing is the half that touches the DOM, so it is the half an
app opts into.
