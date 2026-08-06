---
title: DECLARABLE_ACTION_FIELDS
---

# Variable: DECLARABLE\_ACTION\_FIELDS

> `const` **DECLARABLE\_ACTION\_FIELDS**: readonly \[`"does"`, `"binding"`, `"when"`, `"enabledWhen"`, `"blockedBecause"`, `"writes"`, `"reads"`, `"goTo"`, `"confirm"`, `"input"`, `"verify"`, `"humanDecides"`, `"freshness"`, `"concurrency"`, `"principalPolicy"`, `"observability"`, `"role"`, `"on"`, `"handler"`\]

Defined in: [src/testing/conform.ts:106](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L106)

THE CANONICAL DECLARABLE-FIELD MANIFEST — every field a source must thread, in
one list, so "did you carry all of it?" becomes a question with an answer.

The lock below is what makes it trustworthy: this list cannot fall behind
[FullActionDef](/api/testing/type-aliases/FullActionDef) without the build failing and naming the missing field.
