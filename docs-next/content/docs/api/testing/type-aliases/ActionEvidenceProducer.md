---
title: ActionEvidenceProducer
---

# Type Alias: ActionEvidenceProducer

> **ActionEvidenceProducer** = \{ `definitionId?`: `string`; `keys`: readonly `string`[]; `kind`: `"state"`; `producerId`: `string`; `stages`: readonly [`ActionEvidenceStage`](/api/testing/type-aliases/ActionEvidenceStage)[]; \} \| \{ `definitionId?`: `string`; `kind`: `"navigation"`; `producerId`: `string`; \} \| \{ `definitionId?`: `string`; `kind`: `"external-effect"`; `producerId`: `string`; \}

Defined in: [src/action/contracts.ts:101](https://github.com/footprintjs/hcifootprint/blob/main/src/action/contracts.ts#L101)

An authoritative application rail the checker may rely on.

## Union Members

### Type Literal

\{ `definitionId?`: `string`; `keys`: readonly `string`[]; `kind`: `"state"`; `producerId`: `string`; `stages`: readonly [`ActionEvidenceStage`](/api/testing/type-aliases/ActionEvidenceStage)[]; \}

#### definitionId?

> `readonly` `optional` **definitionId?**: `string`

Omitted means this producer is shared by every definition.

#### keys

> `readonly` **keys**: readonly `string`[]

#### kind

> `readonly` **kind**: `"state"`

#### producerId

> `readonly` **producerId**: `string`

#### stages

> `readonly` **stages**: readonly [`ActionEvidenceStage`](/api/testing/type-aliases/ActionEvidenceStage)[]

***

### Type Literal

\{ `definitionId?`: `string`; `kind`: `"navigation"`; `producerId`: `string`; \}

#### definitionId?

> `readonly` `optional` **definitionId?**: `string`

Omitted means the router observation rail is shared.

#### kind

> `readonly` **kind**: `"navigation"`

#### producerId

> `readonly` **producerId**: `string`

***

### Type Literal

\{ `definitionId?`: `string`; `kind`: `"external-effect"`; `producerId`: `string`; \}

#### definitionId?

> `readonly` `optional` **definitionId?**: `string`

Omitted means the observation rail accepts every definition.

#### kind

> `readonly` **kind**: `"external-effect"`

#### producerId

> `readonly` **producerId**: `string`
