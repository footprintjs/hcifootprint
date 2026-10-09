---
title: CommitBundle
---

# Interface: CommitBundle

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:64

The atomic bundle produced by TransactionBuffer.commit().

## Properties

### idx?

> `optional` **idx?**: `number`

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:66

Auto-assigned step index (set by EventLog.record).

***

### overwrite

> **overwrite**: `MemoryPatch`

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:78

Hard overwrite patches.

***

### phase?

> `optional` **phase?**: `CommitPhase`

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:123

Which CONTINUATION of a stage's execution this bundle is (9.39.0) —
stamped by the WRITER. THE LAW: the FIRST bundle per `runtimeStageId` is
the stage's own and carries NO `phase`; only a bundle after it can:

- `'exit'` — a subflow mount's exit commit (`SubflowExecutor`) after its
  merge-back bundle (`outputMapper`). A mount without a merge-back (a lazy
  mount, every `parallelForEach` branch, any mount with no mapper) has
  its exit as its ONLY bundle — its own, so no `phase`; the execution
  tree names it a mount.
- `'repeat'` — the fan-out's settle commit of a fork child's frame
  (`ChildrenExecutor`), after the child's own bundle.

A reader groups a stage's bundles by `runtimeStageId` and reads this
field to know what each continuation is; it never infers it from the
log's shape. A log written before 9.39.0 carries no `phase` anywhere —
see `inferLegacyPhases` (footprintjs/trace) for how it is still read.

***

### redactedPaths

> **redactedPaths**: `string`[]

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:76

Paths that should be redacted in UI (sensitive data).

***

### runtimeStageId

> **runtimeStageId**: `string`

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:72

Unique per-execution-step identifier. Format: [subflowPath/]stageId#executionIndex

***

### stage

> **stage**: `string`

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:68

Human-readable stage name.

***

### stageId

> **stageId**: `string`

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:70

Stable stage identifier (matches spec node id).

***

### tags?

> `optional` **tags?**: readonly `string`[]

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:104

Declared tags (9.21.0) — the names the author put on this stage at build
time (`FlowChartBuilder.tag` / `options.tags`), stamped here by the
traverser so a stored recording carries its own milestones without a
consumer's id conventions. ABSENT when the stage declares none, so an
untagged chart's log is byte-identical to 9.20.0 (the law
`untrackedSources` keeps). Recorded on the FIRST bundle of each execution
of the stage — the stage's own bundle, the one without a `phase` — so
retry attempts stamp it once, a continuation (a fork child's `'repeat'`,
a mount's `'exit'` after its merge-back) carries none, and a mount whose
exit is its only bundle (no `outputMapper`) carries them on that bundle. Free strings: footprintjs assigns
them no meaning; `tagStops` (footprintjs/trace) keeps a stop when any of
them matches.

***

### trace

> **trace**: `TraceEntry`[]

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:74

Chronological write log for deterministic replay.

***

### untrackedSources?

> `optional` **untrackedSources?**: readonly [`UntrackedSource`](#)[]

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:89

RFC-003 D2 honesty markers — untracked read paths this stage consumed
(see [UntrackedSource](#)). ABSENT when the stage used none, so
charts that never touch those paths keep byte-identical commit logs.
Causal-slice consumers (`causalChain`/`formatCausalChain`) surface this
as "slice may be incomplete here". Residual limitation (by design):
values smuggled through JS closures are undetectable.

***

### updates

> **updates**: `MemoryPatch`

Defined in: node\_modules/footprintjs/dist/esm/lib/memory/types.d.ts:80

Deep merge patches.
