---
title: SensorReport
---

# Type Alias: SensorReport

> **SensorReport** = \{ `edge`: `string`; `kind`: `"reported"`; `result`: [`FireResult`](/api/index/type-aliases/FireResult); \} \| \{ `actuation`: [`Actuation`](/api/index/type-aliases/Actuation); `kind`: `"off-graph"`; `name`: `string`; `role`: `string`; \} \| \{ `candidates`: readonly `string`[]; `kind`: `"ambiguous"`; \} \| \{ `kind`: `"synthetic-event"`; \} \| \{ `edge`: `string`; `kind`: `"payload-opaque"`; `reason`: `string`; \} \| \{ `edge`: `string`; `kind`: `"unwatched"`; `reason`: `string`; \} \| \{ `error`: `unknown`; `kind`: `"sensor-error"`; \}

Defined in: src/sensor/types.ts:131

Everything the sensor did and everything it refused to do — one union, no
silent arms.

The rule this encodes: a human action the sensor cannot attribute confidently
is REPORTED, never invented. There is no arm here that writes a guessed
session row, and there is no path in the sensor that writes a row without
passing through `reported`.

## Union Members

### Type Literal

\{ `edge`: `string`; `kind`: `"reported"`; `result`: [`FireResult`](/api/index/type-aliases/FireResult); \}

A gesture was recognized and recorded. `result` is the session's own answer, refusals included.

***

### Type Literal

\{ `actuation`: [`Actuation`](/api/index/type-aliases/Actuation); `kind`: `"off-graph"`; `name`: `string`; `role`: `string`; \}

Real human motion on a real control that the graph does not declare. The
sensor does NOT fabricate a stimulus row for it: world-motion attribution
belongs to updateState() (atom/types.ts:738-752), not to a DOM listener.

***

### Type Literal

\{ `candidates`: readonly `string`[]; `kind`: `"ambiguous"`; \}

Two or more live edges answer to one role+name+gesture. The sensor refuses to pick.

***

### Type Literal

\{ `kind`: `"synthetic-event"`; \}

`isTrusted` was false — code did this, not a person, and `source: 'user'` would be a lie.

***

### Type Literal

\{ `edge`: `string`; `kind`: `"payload-opaque"`; `reason`: `string`; \}

THE BIG ONE: this edge takes a VALUE, and the sensor never reads one off the
DOM (payload.ts). Kept apart from `unwatched` because the fix is different —
not "the sensor cannot see this gesture" but "report this one from where the
value is declared". Announced once per edge; always in coverage() with
`blocked: 'payload'`.

***

### Type Literal

\{ `edge`: `string`; `kind`: `"unwatched"`; `reason`: `string`; \}

A live binding whose GESTURE the sensor does not watch (hover, a keychord, a
url hop), or one the app has already spoken for via `reportedElsewhere`.
Announced once per edge; always in coverage().

***

### Type Literal

\{ `error`: `unknown`; `kind`: `"sensor-error"`; \}

The sensor itself threw. Isolated exactly like a session listener — the app's dispatch is never broken.
