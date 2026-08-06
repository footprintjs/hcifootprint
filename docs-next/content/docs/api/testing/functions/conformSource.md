---
title: conformSource
---

# Function: conformSource()

> **conformSource**(`source`, `opts?`): [`ConformanceReport`](/api/testing/interfaces/ConformanceReport)

Defined in: [src/testing/conform.ts:632](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L632)

Run a source's declarations through the real compiler and the real serving port
and report every field that did not come out the other side.

## Parameters

### source

[`SourceUnderTest`](/api/testing/type-aliases/SourceUnderTest)

### opts?

[`ConformanceOptions`](/api/testing/interfaces/ConformanceOptions)

## Returns

[`ConformanceReport`](/api/testing/interfaces/ConformanceReport)

## Example

```ts
const report = conformSource((fixture) => fromLiveStore(fixture.store));
report.dropped; // [] — every declared field survived both seams
```
