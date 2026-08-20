---
title: AttributionCertainty
---

# Type Alias: AttributionCertainty

> **AttributionCertainty** = `"observed"` \| `"inferred"` \| `"unknown"`

Defined in: [src/atom/types.ts:144](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L144)

How strong the basis is. It grades THE ASSOCIATION between this record and the
motion — never an identity, and never a value. See traverse/attribution.ts for
the whole of the reasoning; the short version is that `'observed'` means a
door that carries identity said so (or the library was in the call),
`'inferred'` means the library matched a shape or an order, and `'unknown'`
means nobody said and nothing matched.
