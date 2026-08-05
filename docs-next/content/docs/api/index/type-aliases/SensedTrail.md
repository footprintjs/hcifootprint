---
title: SensedTrail
---

# Type Alias: SensedTrail

> **SensedTrail** = \{ `events`: [`SensedEvent`](/api/index/interfaces/SensedEvent)[]; `shape`: `"inline"`; \} \| \{ `count`: `number`; `shape`: `"by-reference"`; \}

Defined in: [src/contextful/types.ts:135](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L135)

How the event trail rides the record — inline while it is small, by reference after.

## Union Members

### Type Literal

\{ `events`: [`SensedEvent`](/api/index/interfaces/SensedEvent)[]; `shape`: `"inline"`; \}

***

### Type Literal

\{ `count`: `number`; `shape`: `"by-reference"`; \}

Ask [Session.sensedTrail](/api/index/classes/Session#sensedtrail) with the transition's id for the whole thing.
