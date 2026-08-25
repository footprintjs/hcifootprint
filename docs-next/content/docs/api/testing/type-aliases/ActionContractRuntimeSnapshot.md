---
title: ActionContractRuntimeSnapshot
---

# Type Alias: ActionContractRuntimeSnapshot

> **ActionContractRuntimeSnapshot** = \{ `complete`: `true`; `humanApprovalGate`: `boolean`; `predicateVerification`: `boolean`; `principalEnforcement`: `boolean`; \} \| \{ `complete`: `false`; `humanApprovalGate?`: `boolean`; `predicateVerification?`: `boolean`; `principalEnforcement?`: `boolean`; \}

Defined in: [src/action/contracts.ts:130](https://github.com/footprintjs/hcifootprint/blob/main/src/action/contracts.ts#L130)

Normalized runtime switches. A complete snapshot carries every effective
boolean; a partial snapshot may omit facts the caller cannot currently know.

## Union Members

### Type Literal

\{ `complete`: `true`; `humanApprovalGate`: `boolean`; `predicateVerification`: `boolean`; `principalEnforcement`: `boolean`; \}

#### complete

> `readonly` **complete**: `true`

#### humanApprovalGate

> `readonly` **humanApprovalGate**: `boolean`

#### predicateVerification

> `readonly` **predicateVerification**: `boolean`

Whether this environment will execute function-valued settle.verify clauses.

#### principalEnforcement

> `readonly` **principalEnforcement**: `boolean`

***

### Type Literal

\{ `complete`: `false`; `humanApprovalGate?`: `boolean`; `predicateVerification?`: `boolean`; `principalEnforcement?`: `boolean`; \}

#### complete

> `readonly` **complete**: `false`

#### humanApprovalGate?

> `readonly` `optional` **humanApprovalGate?**: `boolean`

#### predicateVerification?

> `readonly` `optional` **predicateVerification?**: `boolean`

Omitted when predicate-executor activation is not yet known.

#### principalEnforcement?

> `readonly` `optional` **principalEnforcement?**: `boolean`
