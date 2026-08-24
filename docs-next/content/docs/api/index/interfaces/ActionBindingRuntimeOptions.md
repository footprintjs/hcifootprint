---
title: ActionBindingRuntimeOptions
---

# Interface: ActionBindingRuntimeOptions

Defined in: [src/action/types.ts:488](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L488)

## Properties

### contractActivation?

> `readonly` `optional` **contractActivation?**: [`ActionContractActivation`](/api/index/type-aliases/ActionContractActivation)

Defined in: [src/action/types.ts:495](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L495)

`require-active` (default) rejects clauses this small runtime cannot
enforce. Self-validating and adapter-supported input schemas are enforced;
unsupported formats are rejected in strict mode or disclosure-only when
`disclosure` is selected explicitly.

***

### inputSchemaAdapter?

> `readonly` `optional` **inputSchemaAdapter?**: [`ActionInputSchemaAdapter`](/api/index/interfaces/ActionInputSchemaAdapter)

Defined in: [src/action/types.ts:497](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L497)

Optional validator for schema formats that are otherwise disclosure-only.
