---
title: KindGovernanceReport
---

# Interface: KindGovernanceReport

Defined in: src/action/kinds.ts:180

What a runtime can say about its own kind governance — the visible row
that keeps "no catalog mounted" from reading like "every kind checked".
An unarmed check indistinguishable from a passing one is the disease this
family keeps curing; this report is the cure applied to itself.

## Properties

### fingerprint?

> `readonly` `optional` **fingerprint?**: `string`

Defined in: src/action/kinds.ts:182

***

### kindsSeen

> `readonly` **kindsSeen**: readonly `string`[]

Defined in: src/action/kinds.ts:184

Every kind the connected definitions declared, sorted.

***

### mounted

> `readonly` **mounted**: `boolean`

Defined in: src/action/kinds.ts:181

***

### ungoverned

> `readonly` **ungoverned**: readonly `string`[]

Defined in: src/action/kinds.ts:188

The kinds seen while NO catalog was mounted — declared, and governed by
 nobody. Empty when a catalog is mounted, because an unknown kind is
 then a connect-time refusal rather than a quiet passenger.
