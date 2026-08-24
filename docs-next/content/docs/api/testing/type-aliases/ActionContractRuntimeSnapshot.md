---
title: ActionContractRuntimeSnapshot
---

# Type Alias: ActionContractRuntimeSnapshot

> **ActionContractRuntimeSnapshot** = \{ `complete`: `true`; `concurrencyEnforcement`: `boolean`; `highEffectVerification`: `boolean`; `humanApprovalGate`: `boolean`; `principalEnforcement`: `boolean`; \} \| \{ `complete`: `false`; `concurrencyEnforcement?`: `boolean`; `highEffectVerification?`: `boolean`; `humanApprovalGate?`: `boolean`; `principalEnforcement?`: `boolean`; \}

Defined in: src/action/contracts.ts:133

Normalized runtime switches. A complete snapshot carries every effective
boolean; a partial snapshot may omit facts the caller cannot currently know.
