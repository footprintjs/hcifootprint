---
title: BindingRegistrationUpdate
---

# Type Alias: BindingRegistrationUpdate

> **BindingRegistrationUpdate** = [`BindingRegistrationOptions`](/api/index/interfaces/BindingRegistrationOptions)

Defined in: [src/registry/registry.ts:97](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L97)

What `update` accepts — the same shape as registration, said out loud.

An ALIAS rather than an empty interface extending the other. The two are
identical today and the name still earns its place: `update(ref, options)`
reads as though a registration is being replaced, where
`update(ref, update)` says a partial change is being applied, and the call
site is where that distinction is read. An empty `extends` claims the two
shapes are already diverging when they are not — it is an alias wearing a
type's clothes, and the next reader has to open both to find out nothing is
there. If update ever does take a field registration cannot, this becomes an
interface again on that day, and the change will be visible in the diff
instead of having been pre-announced by an empty body.
