---
title: LintFinding
---

# Interface: LintFinding

Defined in: [src/testing/model/lint.ts:50](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L50)

## Properties

### affordance?

> `optional` **affordance?**: `string`

Defined in: [src/testing/model/lint.ts:58](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L58)

The action (affordance) the finding is about, when it is action-scoped.

***

### code

> **code**: [`LintCode`](/api/testing/type-aliases/LintCode)

Defined in: [src/testing/model/lint.ts:51](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L51)

***

### journey?

> `optional` **journey?**: `string`

Defined in: [src/testing/model/lint.ts:60](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L60)

The journey the finding is about, when journey-scoped.

***

### keys?

> `optional` **keys?**: `string`[]

Defined in: [src/testing/model/lint.ts:64](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L64)

The state key(s) implicated.

***

### message

> **message**: `string`

Defined in: [src/testing/model/lint.ts:54](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L54)

Plain-language statement of what drifted or is wrong.

***

### page?

> `optional` **page?**: `string`

Defined in: [src/testing/model/lint.ts:62](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L62)

The page the finding is about, when page-scoped.

***

### remedy

> **remedy**: `string`

Defined in: [src/testing/model/lint.ts:56](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L56)

The two consumer remedies — surfaced, never dictated.

***

### severity

> **severity**: [`LintSeverity`](/api/testing/type-aliases/LintSeverity)

Defined in: [src/testing/model/lint.ts:52](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L52)
