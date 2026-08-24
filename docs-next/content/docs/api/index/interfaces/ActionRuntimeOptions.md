---
title: ActionRuntimeOptions
---

# Interface: ActionRuntimeOptions

Defined in: [src/action/types.ts:714](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L714)

## Properties

### contractActivation?

> `readonly` `optional` **contractActivation?**: [`ActionContractActivation`](/api/index/type-aliases/ActionContractActivation)

Defined in: [src/action/types.ts:721](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L721)

`require-active` (default) rejects clauses this small runtime cannot
enforce. Self-validating and adapter-supported input schemas are enforced;
unsupported formats are rejected in strict mode or disclosure-only when
`disclosure` is selected explicitly.

***

### inputSchemaAdapter?

> `readonly` `optional` **inputSchemaAdapter?**: [`ActionInputSchemaAdapter`](/api/index/interfaces/ActionInputSchemaAdapter)

Defined in: [src/action/types.ts:723](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L723)

Optional validator for schema formats that are otherwise disclosure-only.
