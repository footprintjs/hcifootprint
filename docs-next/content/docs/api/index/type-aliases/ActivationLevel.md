---
title: ActivationLevel
---

# Type Alias: ActivationLevel

> **ActivationLevel** = `"synced"` \| `"assumed"` \| `"registered"` \| `"shown"` \| `"hidden"`

Defined in: [src/atom/types.ts:287](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L287)

How much evidence backs "this node is active" for a served edge (D18).
'synced'     — the router confirmed this page (page-level tools).
'assumed'    — declared subtree of the routed page, nothing registered there.
'registered' — a live mount handle exists on the node.
'shown'      — an explicit visibility signal says it is visible.
'hidden'     — an explicit visibility signal says it is NOT visible.
