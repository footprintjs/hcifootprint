---
title: ControlAttachment
---

# Interface: ControlAttachment

Defined in: [src/sensor/types.ts:268](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L268)

One declared control's registration. `attach`/`detach` are a true pair.

`detach()` is idempotent and TOKEN-IDENTITY: it releases the declaration it was
handed and nothing else, so attach → detach → attach nets to one entry the way
a PresenceHandle does (presence.ts:10-13) and a React StrictMode double-invoke
leaves exactly one control declared.

## Methods

### detach()

> **detach**(): `void`

Defined in: [src/sensor/types.ts:269](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L269)

#### Returns

`void`
