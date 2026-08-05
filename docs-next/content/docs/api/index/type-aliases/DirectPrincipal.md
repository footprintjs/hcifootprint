---
title: DirectPrincipal
---

# Type Alias: DirectPrincipal

> **DirectPrincipal** = `"user"` \| `"system"`

Defined in: [src/contextful/types.ts:42](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L42)

Who a DIRECT call is filed under — a call the APP made itself, through its
own button, rather than one that arrived through `fire()`.

'agent' is deliberately not expressible: an agent has exactly one door into
this library and it is `fire()`, so a wrapped function invoked directly is by
construction the app's own code acting. Default 'user'; say 'system' when the
caller is a timer or a subscription rather than a person at the keyboard.
