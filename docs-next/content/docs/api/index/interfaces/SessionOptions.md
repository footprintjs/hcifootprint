---
title: SessionOptions
---

# Interface: SessionOptions

Defined in: [src/atom/types.ts:295](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L295)

## Properties

### allowUnmaterializedFires?

> `optional` **allowUnmaterializedFires?**: `boolean`

Defined in: [src/atom/types.ts:329](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L329)

Let AGENT fires of declared-but-unbound tools proceed as honest no-ops
(executed: false, materialized: false on the result) instead of the
default NOT_MATERIALIZED rejection. For guide/tour/plan flows — the
Phase-0 rung walking the graph without touching the app. Navigation
claims still move the cursor (that is the tour); re-sync() before
trusting position. Default false (fail-closed).

***

### captureProduced?

> `optional` **captureProduced?**: `boolean`

Defined in: [src/atom/types.ts:320](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L320)

Capture each handler's RETURN value onto its transition (sanitized+capped)
as the "act → get data back" channel — TransitionRecord.produced. Default
true. Set false to opt a session out entirely (handlers whose returns are
internal and should never reach the agent).

***

### checkPayloadShape?

> `optional` **checkPayloadShape?**: `boolean`

Defined in: [src/atom/types.ts:344](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L344)

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

Defined in: [src/atom/types.ts:311](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L311)

Commit-log value encoding (footprintjs dial). Default 'delta'.

***

### navigate?

> `optional` **navigate?**: (`href`) => `void` \| `Promise`\<`void`\>

Defined in: [src/atom/types.ts:356](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L356)

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

Defined in: [src/atom/types.ts:297](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L297)

Starting page id.

***

### onWarn?

> `optional` **onWarn?**: (`message`) => `void`

Defined in: [src/atom/types.ts:313](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L313)

Dev-warning sink (StrictMode re-registrations, handler errors). Default console.warn.

#### Parameters

##### message

`string`

#### Returns

`void`

***

### redactedKeys?

> `optional` **redactedKeys?**: `string`[]

Defined in: [src/atom/types.ts:309](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L309)

Keys stored as 'REDACTED' in the commit log while live state keeps raw values.

***

### state?

> `optional` **state?**: `Record`\<`string`, `unknown`\>

Defined in: [src/atom/types.ts:299](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L299)

Initial projected state (the lean snapshot guards read — not the whole app).

***

### stateTap?

> `optional` **stateTap?**: `boolean`

Defined in: [src/atom/types.ts:307](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L307)

Whether this session receives updateState() reports (a router/store tap).
Default: true when `state` was provided, false otherwise. Without a tap,
declared-writes fires settle on handler completion (or immediately when
nothing executes) with effectVerified 'unobservable' — instead of staying
pending forever (the D18 rung-killer fix).
