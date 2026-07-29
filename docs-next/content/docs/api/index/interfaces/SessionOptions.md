---
title: SessionOptions
---

# Interface: SessionOptions

Defined in: [src/atom/types.ts:226](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L226)

## Properties

### allowUnmaterializedFires?

> `optional` **allowUnmaterializedFires?**: `boolean`

Defined in: [src/atom/types.ts:260](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L260)

Let AGENT fires of declared-but-unbound tools proceed as honest no-ops
(executed: false, materialized: false on the result) instead of the
default NOT_MATERIALIZED rejection. For guide/tour/plan flows — the
Phase-0 rung walking the graph without touching the app. Navigation
claims still move the cursor (that is the tour); re-sync() before
trusting position. Default false (fail-closed).

***

### captureProduced?

> `optional` **captureProduced?**: `boolean`

Defined in: [src/atom/types.ts:251](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L251)

Capture each handler's RETURN value onto its transition (sanitized+capped)
as the "act → get data back" channel — TransitionRecord.produced. Default
true. Set false to opt a session out entirely (handlers whose returns are
internal and should never reach the agent).

***

### checkPayloadShape?

> `optional` **checkPayloadShape?**: `boolean`

Defined in: [src/atom/types.ts:275](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L275)

Check a plain JSON-Schema declaration against the payload at fire time.
STRUCTURAL only — required keys, declared primitive types, closed objects —
and never a full JSON-Schema validator: anything it cannot judge it passes
(the name says exactly what it does, because claiming more would be a lie
a caller only discovers in production).

Default true. Declaring a schema is already the author's opt-in signal, and
Mode B's published contract has always promised that "a wrong input returns
a structured error RESULT carrying what was expected" (serve/modes.ts) — a
promise a plain JSON Schema could not keep while nothing enforced it. Set
false for the 0.3.0 pass-through. Zod and other parseable validators run
either way; this flag governs only the plain-JSON-Schema branch.

***

### commitValues?

> `optional` **commitValues?**: `"full"` \| `"delta"`

Defined in: [src/atom/types.ts:242](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L242)

Commit-log value encoding (footprintjs dial). Default 'delta'.

***

### navigate?

> `optional` **navigate?**: (`href`) => `void` \| `Promise`\<`void`\>

Defined in: [src/atom/types.ts:287](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L287)

The caller's OWN router navigation (e.g. `(href) => router.push(href)`).
PRESENCE of this option is the opt-in: with it, an edge whose gesture
yields a literal href — an explicit `url` binding, else the fully-literal
route of the page it claims to navigate to — materialises through this
function, so a pure URL navigation no longer needs a fake do-nothing
handler to get past NOT_MATERIALIZED. Registered handlers still win, and
the synthesized navigation rides the SAME invocation machinery: resolve →
effectStatus 'performed'; throw → 'refused' with the honest rollback.
Without this option nothing changes — fail-closed, byte-identical.

#### Parameters

##### href

`string`

#### Returns

`void` \| `Promise`\<`void`\>

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:228](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L228)

Starting page id.

***

### onWarn?

> `optional` **onWarn?**: (`message`) => `void`

Defined in: [src/atom/types.ts:244](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L244)

Dev-warning sink (StrictMode re-registrations, handler errors). Default console.warn.

#### Parameters

##### message

`string`

#### Returns

`void`

***

### redactedKeys?

> `optional` **redactedKeys?**: `string`[]

Defined in: [src/atom/types.ts:240](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L240)

Keys stored as 'REDACTED' in the commit log while live state keeps raw values.

***

### state?

> `optional` **state?**: `Record`\<`string`, `unknown`\>

Defined in: [src/atom/types.ts:230](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L230)

Initial projected state (the lean snapshot guards read — not the whole app).

***

### stateTap?

> `optional` **stateTap?**: `boolean`

Defined in: [src/atom/types.ts:238](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L238)

Whether this session receives updateState() reports (a router/store tap).
Default: true when `state` was provided, false otherwise. Without a tap,
declared-writes fires settle on handler completion (or immediately when
nothing executes) with effectVerified 'unobservable' — instead of staying
pending forever (the D18 rung-killer fix).
