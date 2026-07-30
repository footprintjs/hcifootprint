---
title: PageWatcher
---

# Interface: PageWatcher

Defined in: src/sensor/types.ts:180

The handle `watchPage` returns.

`stop()` is idempotent, the same contract a PresenceHandle keeps
(presence.ts:10-13): setup → cleanup → setup nets to one live watcher, so a
React StrictMode double-invoke leaves exactly one listener set behind.

## Methods

### coverage()

> **coverage**(): [`SensorCoverage`](/api/sensor/interfaces/SensorCoverage)

Defined in: src/sensor/types.ts:182

#### Returns

[`SensorCoverage`](/api/sensor/interfaces/SensorCoverage)

***

### stop()

> **stop**(): `void`

Defined in: src/sensor/types.ts:181

#### Returns

`void`
