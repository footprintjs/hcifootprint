---
title: LiveSource
---

# Interface: LiveSource

Defined in: [src/graph/sources/types.ts:49](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L49)

A runtime source: the app's live action store, attached per session. It
contributes NOTHING at build (last in the merge order, bind-only — it can
never remove or reshape what the static sources laid down); createSession
calls `attach` on each new session, and `detachSources()` (or the returned
detach) releases everything it registered.

## Properties

### kind

> `readonly` **kind**: `"live"`

Defined in: [src/graph/sources/types.ts:50](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L50)

## Methods

### attach()

> **attach**(`session`, `warn?`): () => `void`

Defined in: [src/graph/sources/types.ts:59](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L59)

Wire the store's actions onto a session; returns detach (idempotent).
`warn` is the session's dev-warning sink (createSession passes it) so a
post-attach reconcile failure can be reported WITHOUT throwing inside the
app's own store-notify loop; a source without one falls back to the
console. Optional and additive: a one-parameter implementation still
satisfies this shape.

#### Parameters

##### session

[`LiveBindingPort`](/api/index/interfaces/LiveBindingPort)

##### warn?

(`message`) => `void`

#### Returns

() => `void`
