---
title: watchPage
---

# Function: watchPage()

> **watchPage**(`session`, `options`): [`PageWatch`](/api/sensor/interfaces/PageWatch)

Defined in: [src/sensor/watch-page.ts:118](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/watch-page.ts#L118)

Attach the sensor to a page. The session is the single source of truth for what
to watch; `options.root` is the only thing about the environment the library is
told.

## Parameters

### session

[`SensorSession`](/api/sensor/interfaces/SensorSession)

### options

[`WatchOptions`](/api/sensor/interfaces/WatchOptions)

## Returns

[`PageWatch`](/api/sensor/interfaces/PageWatch)
