---
title: ActionProgressSnapshot
---

# Type Alias: ActionProgressSnapshot

> **ActionProgressSnapshot** = \{ `declared`: readonly `string`[]; `disposition`: `"open"`; `observed`: readonly [`ActionProgressObservation`](/api/index/interfaces/ActionProgressObservation)[]; \} \| \{ `declared`: readonly `string`[]; `disposition`: `"not-started"`; `observed`: readonly \[\]; \} \| \{ `declared`: readonly `string`[]; `disposition`: `"closed"`; `integrity?`: `"unmet"`; `observed`: readonly [`ActionProgressObservation`](/api/index/interfaces/ActionProgressObservation)[]; `unreported`: readonly `string`[]; \}

Defined in: [src/action/types.ts:400](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L400)

What is knowable about declared progress at this instant.

## Union Members

### Type Literal

\{ `declared`: readonly `string`[]; `disposition`: `"open"`; `observed`: readonly [`ActionProgressObservation`](/api/index/interfaces/ActionProgressObservation)[]; \}

***

### Type Literal

\{ `declared`: readonly `string`[]; `disposition`: `"not-started"`; `observed`: readonly \[\]; \}

#### declared

> `readonly` **declared**: readonly `string`[]

#### disposition

> `readonly` **disposition**: `"not-started"`

The application handler never started, so no stage was owed.

#### observed

> `readonly` **observed**: readonly \[\]

***

### Type Literal

\{ `declared`: readonly `string`[]; `disposition`: `"closed"`; `integrity?`: `"unmet"`; `observed`: readonly [`ActionProgressObservation`](/api/index/interfaces/ActionProgressObservation)[]; `unreported`: readonly `string`[]; \}

#### declared

> `readonly` **declared**: readonly `string`[]

#### disposition

> `readonly` **disposition**: `"closed"`

#### integrity?

> `readonly` `optional` **integrity?**: `"unmet"`

Present only when `required` was declared and no stage was observed.

#### observed

> `readonly` **observed**: readonly [`ActionProgressObservation`](/api/index/interfaces/ActionProgressObservation)[]

#### unreported

> `readonly` **unreported**: readonly `string`[]

Declared stages with no retained observation when invocation closed.
