---
title: CaptureFailure
---

# Interface: CaptureFailure

Defined in: [src/contextful/types.ts:198](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L198)

What went wrong, if anything did.

## Properties

### errorClass

> **errorClass**: `string`

Defined in: [src/contextful/types.ts:200](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L200)

The error's constructor name — captured ALWAYS. A class is not app data.

***

### message?

> `optional` **message?**: `string`

Defined in: [src/contextful/types.ts:202](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L202)

The message — only when the app allowlisted [ERROR\_MESSAGE](/api/index/variables/ERROR_MESSAGE).
