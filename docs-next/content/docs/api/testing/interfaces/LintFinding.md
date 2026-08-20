---
title: LintFinding
---

# Interface: LintFinding

Defined in: [src/testing/model/lint.ts:51](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L51)

## Properties

### affordance?

> `optional` **affordance?**: `string`

Defined in: [src/testing/model/lint.ts:59](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L59)

The action (affordance) the finding is about, when it is action-scoped.

***

### code

> **code**: [`LintCode`](/api/testing/type-aliases/LintCode)

Defined in: [src/testing/model/lint.ts:52](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L52)

***

### journey?

> `optional` **journey?**: `string`

Defined in: [src/testing/model/lint.ts:61](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L61)

The journey the finding is about, when journey-scoped.

***

### keys?

> `optional` **keys?**: `string`[]

Defined in: [src/testing/model/lint.ts:65](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L65)

The state key(s) implicated.

***

### message

> **message**: `string`

Defined in: [src/testing/model/lint.ts:55](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L55)

Plain-language statement of what drifted or is wrong.

***

### page?

> `optional` **page?**: `string`

Defined in: [src/testing/model/lint.ts:63](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L63)

The page the finding is about, when page-scoped.

***

### remedy

> **remedy**: `string`

Defined in: [src/testing/model/lint.ts:57](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L57)

The two consumer remedies — surfaced, never dictated.

***

### severity

> **severity**: [`LintSeverity`](/api/testing/type-aliases/LintSeverity)

Defined in: [src/testing/model/lint.ts:53](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L53)
