---
title: testApp
---

# Function: testApp()

## Call Signature

> **testApp**\<`State`\>(`graph`, `options?`): [`TestApp`](/api/testing/interfaces/TestApp)\<`State`\>

Defined in: [src/testing/harness.ts:189](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L189)

Build a headless test harness over a navigation graph. Wires each resolver as
a real handler, auto-mounts the current page's tools, and drives the real
session — so tests exercise production code, not a copy.

### Type Parameters

#### State

`State` *extends* `Record`\<`string`, `unknown`\> = `Record`\<`string`, `unknown`\>

### Parameters

#### graph

[`NavigationGraph`](/api/index/interfaces/NavigationGraph)

#### options?

[`TestAppOptions`](/api/testing/interfaces/TestAppOptions)\<`State`\>

### Returns

[`TestApp`](/api/testing/interfaces/TestApp)\<`State`\>

## Call Signature

> **testApp**\<`State`\>(`options`): [`TestApp`](/api/testing/interfaces/TestApp)\<`State`\>

Defined in: [src/testing/harness.ts:193](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L193)

Build a headless test harness over a navigation graph. Wires each resolver as
a real handler, auto-mounts the current page's tools, and drives the real
session — so tests exercise production code, not a copy.

### Type Parameters

#### State

`State` *extends* `Record`\<`string`, `unknown`\> = `Record`\<`string`, `unknown`\>

### Parameters

#### options

[`TestAppOptions`](/api/testing/interfaces/TestAppOptions)\<`State`\> & `object`

### Returns

[`TestApp`](/api/testing/interfaces/TestApp)\<`State`\>
