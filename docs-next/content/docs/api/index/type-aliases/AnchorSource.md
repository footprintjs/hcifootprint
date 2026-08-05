---
title: AnchorSource
---

# Type Alias: AnchorSource

> **AnchorSource** = [`AnchorElement`](/api/index/interfaces/AnchorElement) \| (() => [`AnchorElement`](/api/index/interfaces/AnchorElement) \| `null` \| `undefined`)

Defined in: [src/contextful/anchor-port.ts:105](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/anchor-port.ts#L105)

How an app names its anchor: the element, or a getter for it.

THE GETTER IS THE SSR-SAFE FORM and the reason the option is a union at all:
`contextful()` runs at module scope in plenty of apps, and a getter is not
called until the session attaches — so wrapping a handler on a server touches
no `document` at all.
