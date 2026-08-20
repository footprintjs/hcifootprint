---
title: SensorReport
---

# Type Alias: SensorReport

> **SensorReport** = \{ `edge`: `string`; `instance?`: `string`; `kind`: `"reported"`; `result`: [`FireResult`](/api/index/type-aliases/FireResult); \} \| \{ `actuation`: [`Actuation`](/api/index/type-aliases/Actuation); `kind`: `"off-graph"`; `name`: `string`; `role`: `string`; \} \| \{ `candidates`: readonly `string`[]; `kind`: `"ambiguous"`; \} \| \{ `actuation`: [`Actuation`](/api/index/type-aliases/Actuation); `edge`: `string`; `instance?`: `string`; `kind`: `"synthetic-event"`; \} \| \{ `edge`: `string`; `kind`: `"value-not-declared"`; `reason`: `string`; \} \| \{ `blocked`: [`BlockedBy`](/api/sensor/type-aliases/BlockedBy); `edge`: `string`; `kind`: `"unwatched"`; `reason`: `string`; \} \| \{ `edge`: `string`; `kind`: `"cadence-unavailable"`; `reason`: `string`; \} \| \{ `edge`: `string`; `kind`: `"watching"`; \} \| \{ `error`: `unknown`; `kind`: `"sensor-error"`; \}

Defined in: [src/sensor/types.ts:179](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L179)

Everything the sensor did and everything it refused to do — one union, no
silent arms.

The rule this encodes: a human action the sensor cannot attribute confidently
is REPORTED, never invented. There is no arm here that writes a guessed session
row, and there is no path in the sensor that writes a row without passing
through `reported`.

## Union Members

### Type Literal

\{ `edge`: `string`; `instance?`: `string`; `kind`: `"reported"`; `result`: [`FireResult`](/api/index/type-aliases/FireResult); \}

A gesture was recognised and recorded. `result` is the session's own answer, refusals included.

***

### Type Literal

\{ `actuation`: [`Actuation`](/api/index/type-aliases/Actuation); `kind`: `"off-graph"`; `name`: `string`; `role`: `string`; \}

Real human motion on a real control the graph does not declare. The sensor
does NOT fabricate a stimulus row for it: world-motion attribution belongs to
updateState(), not to a DOM listener.

***

### Type Literal

\{ `candidates`: readonly `string`[]; `kind`: `"ambiguous"`; \}

Two or more live edges answer to one role+name+moment. The sensor refuses to pick.

***

### Type Literal

\{ `actuation`: [`Actuation`](/api/index/type-aliases/Actuation); `edge`: `string`; `instance?`: `string`; `kind`: `"synthetic-event"`; \}

Code did this, not a person, so `source: 'user'` would be a lie — and the arm
NAMES what it declined, because a team deleting their own isTrusted filter
needs to see that the sensor caught the same events theirs did. Reported only
when the gesture WOULD have been attributed: a programmatic click on prose is
as unreportable as a human one.

***

### Type Literal

\{ `edge`: `string`; `kind`: `"value-not-declared"`; `reason`: `string`; \}

A control was handed over for an action that takes a VALUE, and the
declaration carries no `value()`. The sensor stands down for it rather than
scraping the DOM. Said once per edge; always in coverage() with
`blocked: 'payload'`.

***

### Type Literal

\{ `blocked`: [`BlockedBy`](/api/sensor/type-aliases/BlockedBy); `edge`: `string`; `kind`: `"unwatched"`; `reason`: `string`; \}

A live edge the sensor is not watching, with the wall it hit — `'gesture'`
(no moment to recognise), `'payload'` (takes a value nobody declared), or
`'door'` (the app reports it itself). Said once per edge; always in coverage().

***

### Type Literal

\{ `edge`: `string`; `kind`: `"cadence-unavailable"`; `reason`: `string`; \}

A `{ debounceMs }` cadence was asked for and this watcher has no clock to run
it on. REFUSED, never downgraded: turning "one row when they stop typing"
into "one row per keystroke" behind the app's back is its own bug.

***

### Type Literal

\{ `edge`: `string`; `kind`: `"watching"`; \}

AN ADVISORY WITHDRAWN: an edge this watcher advised about is watched now,
because the app lifted the wall — usually by handing the control over.

It exists because `attach()` lives on the handle `watchPage` RETURNS. At the
moment the first advisories are given, a declaration is IMPOSSIBLE, so every
value-taking edge is advised about before the app has had its chance; the
advice is honest when it is said and stale a moment later. Without this arm
the report stream would leave a consumer believing a wall that no longer
exists, while coverage() said the opposite.

Emitted only for an edge that WAS advised about, and named after the coverage
status it announces — one vocabulary, so the two surfaces cannot describe the
same edge with two different words.

***

### Type Literal

\{ `error`: `unknown`; `kind`: `"sensor-error"`; \}

The sensor itself threw. Isolated exactly like a session listener — the app's dispatch is never broken.
