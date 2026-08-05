---
title: SenseDeclaration
---

# Interface: SenseDeclaration

Defined in: [src/contextful/types.ts:230](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L230)

A SENSE-ONLY declaration — contextful.sense's output, handed to
`session.sense(actionId, …)`.

The L0 on-ramp: an app with no registered handler still gets its humans into
the record, because the anchor is enough. A trusted click inside it opens a
record-only fire stamped `cause.inferred` — the library performs nothing, it
only writes down what it saw.

## Properties

### anchor

> `readonly` **anchor**: [`AnchorSource`](/api/index/type-aliases/AnchorSource)

Defined in: [src/contextful/types.ts:231](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L231)

***

### options

> `readonly` **options**: [`ContextfulOptions`](/api/index/interfaces/ContextfulOptions)

Defined in: [src/contextful/types.ts:232](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L232)
