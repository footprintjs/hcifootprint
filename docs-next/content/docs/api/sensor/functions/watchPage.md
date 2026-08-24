---
title: watchPage
---

# Function: watchPage()

> **watchPage**(`session`, `options`): [`BindingAwarePageWatch`](/api/sensor/interfaces/BindingAwarePageWatch)

Defined in: [src/sensor/watch-page.ts:135](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/watch-page.ts#L135)

Attach the sensor to a page. The session is the single source of truth for what
to watch; `options.root` is the only thing about the environment the library is
told.

## Parameters

### session

[`SensorSession`](/api/sensor/interfaces/SensorSession)

### options

[`WatchOptions`](/api/sensor/interfaces/WatchOptions)

## Returns

[`BindingAwarePageWatch`](/api/sensor/interfaces/BindingAwarePageWatch)
