---
title: JourneyDef
---

# Interface: JourneyDef

Defined in: [src/tree/types.ts:122](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L122)

A named multi-step flow, in the navigation graph's authoring vocabulary.

Named for the person WRITING it: a journey is the path someone takes through
the app ("sign up", "buy a dress end to end"). What the agent reads is the
compiled SKILL — `does` becomes its description, `when` its precondition,
suffix steps resolve to qualified ids — which is the dual identity this
whole authoring layer is built on (navigation in, skill graph out). The two
vocabularies keep separate names on purpose: the compiled shape is `Skill`.
An app that already keeps a journey list feeds it in with `fromJourneys()`.

## Properties

### does

> **does**: `string`

Defined in: [src/tree/types.ts:123](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L123)

***

### steps

> **steps**: `string`[]

Defined in: [src/tree/types.ts:125](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L125)

Steps by qualified path ('checkout.confirm-order.place-order') or unambiguous suffix ('place-order').

***

### when?

> `optional` **when?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:126](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L126)
