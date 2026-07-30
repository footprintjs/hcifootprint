---
title: watchPage
---

# Function: watchPage()

> **watchPage**(`session`, `options`): [`PageWatcher`](/api/sensor/interfaces/PageWatcher)

Defined in: src/sensor/watch-page.ts:99

Attach the sensor to a page. The session is the single source of truth for
what to watch; `options.root` is the only thing about the environment the
library is told.

## Parameters

### session

[`SensorSession`](/api/sensor/interfaces/SensorSession)

### options

[`WatchOptions`](/api/sensor/interfaces/WatchOptions)

## Returns

[`PageWatcher`](/api/sensor/interfaces/PageWatcher)
