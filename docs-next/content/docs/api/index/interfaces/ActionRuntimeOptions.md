---
title: ActionRuntimeOptions
---

# Interface: ActionRuntimeOptions

Defined in: [src/action/types.ts:838](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L838)

## Properties

### contractActivation?

> `readonly` `optional` **contractActivation?**: [`ActionContractActivation`](/api/index/type-aliases/ActionContractActivation)

Defined in: [src/action/types.ts:845](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L845)

`require-active` (default) rejects clauses this small runtime cannot
enforce. Self-validating and adapter-supported input schemas are enforced;
unsupported formats are rejected in strict mode or disclosure-only when
`disclosure` is selected explicitly.

***

### history?

> `readonly` `optional` **history?**: [`ActionHistoryPolicy`](/api/index/interfaces/ActionHistoryPolicy)

Defined in: [src/action/types.ts:858](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L858)

Bound the settled history. Absent: every transition is kept until
 `forgetTransition` releases it (the pre-2.6 behaviour).

***

### inputSchemaAdapter?

> `readonly` `optional` **inputSchemaAdapter?**: [`ActionInputSchemaAdapter`](/api/index/interfaces/ActionInputSchemaAdapter)

Defined in: [src/action/types.ts:847](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L847)

Optional validator for schema formats that are otherwise disclosure-only.

***

### kinds?

> `readonly` `optional` **kinds?**: [`KindCatalog`](/api/index/interfaces/KindCatalog)

Defined in: [src/action/types.ts:855](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L855)

The kind vocabulary this runtime is governed by — `declareKinds()` builds
the default; any object with synchronous `has()`/`describe()` serves.
Unmounted is a CHOICE the runtime keeps visible: declarations are then
accepted and reported ungoverned by `kindGovernance()`, never silently
unchecked. A mounted catalog must be immutable — answers are memoized.
