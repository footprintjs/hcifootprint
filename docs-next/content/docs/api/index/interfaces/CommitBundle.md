---
title: CommitBundle
---

# Interface: CommitBundle

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:66

The atomic bundle produced by TransactionBuffer.commit().

## Properties

### idx?

> `optional` **idx?**: `number`

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:68

Auto-assigned step index (set by EventLog.record).

***

### overwrite

> **overwrite**: `MemoryPatch`

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:80

Hard overwrite patches.

***

### redactedPaths

> **redactedPaths**: `string`[]

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:78

Paths that should be redacted in UI (sensitive data).

***

### runtimeStageId

> **runtimeStageId**: `string`

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:74

Unique per-execution-step identifier. Format: [subflowPath/]stageId#executionIndex

***

### stage

> **stage**: `string`

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:70

Human-readable stage name.

***

### stageId

> **stageId**: `string`

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:72

Stable stage identifier (matches spec node id).

***

### trace

> **trace**: `TraceEntry`[]

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:76

Chronological write log for deterministic replay.

***

### untrackedSources?

> `optional` **untrackedSources?**: readonly [`UntrackedSource`](#)[]

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:91

RFC-003 D2 honesty markers — untracked read paths this stage consumed
(see [UntrackedSource](#)). ABSENT when the stage used none, so
charts that never touch those paths keep byte-identical commit logs.
Causal-slice consumers (`causalChain`/`formatCausalChain`) surface this
as "slice may be incomplete here". Residual limitation (by design):
values smuggled through JS closures are undetectable.

***

### updates

> **updates**: `MemoryPatch`

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:82

Deep merge patches.
