---
title: RecordOnlyFire
---

# Type Alias: RecordOnlyFire

> **RecordOnlyFire** = `Omit`\<[`FireOptions`](/api/index/interfaces/FireOptions), `"invoke"`\> & `object`

Defined in: src/sensor/types.ts:42

ONE CANONICAL DOOR, STATED IN THE TYPE SYSTEM.

There are two shapes an integration can take, and mixing them double-executes
a human's action: either fire() invokes the app's function and the app never
calls it directly, or the report path is record-only and the app's own code
does the performing. THE SENSOR IS FIRMLY THE SECOND. The browser has already
run the app's onClick by the time anything here records it; a fire that also
invoked would run it twice (atom/types.ts:604-609, session.ts:1074-1075).

So the port does not merely pass `invoke: false` as a habit somebody could
forget — it makes the executing fire INEXPRESSIBLE. `invoke` is required and
pinned to `false`, so there is no shape of this call that performs anything.
A real Session still satisfies the port (its `invoke?: boolean` accepts it);
the narrowing binds the CALLER, which is the side that could get it wrong.

## Type Declaration

### invoke

> `readonly` **invoke**: `false`
