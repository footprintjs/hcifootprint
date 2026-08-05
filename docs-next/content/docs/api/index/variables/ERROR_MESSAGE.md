---
title: ERROR_MESSAGE
---

# Variable: ERROR\_MESSAGE

> `const` **ERROR\_MESSAGE**: `"error.message"` = `'error.message'`

Defined in: [src/contextful/types.ts:53](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L53)

The name that opens the failure MESSAGE, and the one reserved word
[ContextfulOptions.include](/api/index/interfaces/ContextfulOptions#include) understands.

A message is app data — it routinely carries the row that failed, the address
that bounced, the id nobody should have seen — so the error CLASS is captured
always and the message only when the app names this. A payload key spelled
exactly like this cannot be projected by value; pick another name for it.
