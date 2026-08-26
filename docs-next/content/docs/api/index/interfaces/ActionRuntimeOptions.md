---
title: ActionRuntimeOptions
---

# Interface: ActionRuntimeOptions

Defined in: [src/action/types.ts:737](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L737)

## Properties

### contractActivation?

> `readonly` `optional` **contractActivation?**: [`ActionContractActivation`](/api/index/type-aliases/ActionContractActivation)

Defined in: [src/action/types.ts:744](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L744)

`require-active` (default) rejects clauses this small runtime cannot
enforce. Self-validating and adapter-supported input schemas are enforced;
unsupported formats are rejected in strict mode or disclosure-only when
`disclosure` is selected explicitly.

***

### inputSchemaAdapter?

> `readonly` `optional` **inputSchemaAdapter?**: [`ActionInputSchemaAdapter`](/api/index/interfaces/ActionInputSchemaAdapter)

Defined in: [src/action/types.ts:746](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L746)

Optional validator for schema formats that are otherwise disclosure-only.

***

### kinds?

> `readonly` `optional` **kinds?**: [`KindCatalog`](/api/index/interfaces/KindCatalog)

Defined in: [src/action/types.ts:754](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L754)

The kind vocabulary this runtime is governed by — `declareKinds()` builds
the default; any object with synchronous `has()`/`describe()` serves.
Unmounted is a CHOICE the runtime keeps visible: declarations are then
accepted and reported ungoverned by `kindGovernance()`, never silently
unchecked. A mounted catalog must be immutable — answers are memoized.
