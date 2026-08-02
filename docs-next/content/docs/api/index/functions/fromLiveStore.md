---
title: fromLiveStore
---

# Function: fromLiveStore()

> **fromLiveStore**(`store`): [`LiveSource`](/api/index/interfaces/LiveSource)

Defined in: [src/graph/sources/from-live-store.ts:135](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/from-live-store.ts#L135)

Read a live action store into a LiveSource. Declare it in `sources` so every
createSession() wires it (and detachSources() releases it) — or use the
direct door: `const detach = fromLiveStore(store).attach(session)`.

## Parameters

### store

[`LiveActionStore`](/api/index/interfaces/LiveActionStore)

## Returns

[`LiveSource`](/api/index/interfaces/LiveSource)
