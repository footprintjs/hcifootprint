---
title: ControlSpec
---

# Type Alias: ControlSpec

> **ControlSpec** = `Omit`\<[`ControlDeclaration`](/api/sensor/interfaces/ControlDeclaration), `"element"`\>

Defined in: [src/react/use-control.ts:42](https://github.com/footprintjs/hcifootprint/blob/main/src/react/use-control.ts#L42)

What a component declares about one control: the core's own
[ControlDeclaration](/api/sensor/interfaces/ControlDeclaration) minus the element, because the ref supplies that.

DERIVED, NEVER RESTATED. A field the core grows arrives here for free, and the
two can never drift into describing different things.
