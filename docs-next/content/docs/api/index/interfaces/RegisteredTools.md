---
title: RegisteredTools
---

# Interface: RegisteredTools

Defined in: [src/traverse/session.ts:187](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L187)

registerTools() output: optional exact-provenance triggers + the group's cleanup.

## Properties

### triggers

> **triggers**: `Record`\<`string`, (`payload?`) => [`FireResult`](/api/index/type-aliases/FireResult)\>

Defined in: [src/traverse/session.ts:196](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L196)

Wrapped manual triggers (same signature as the app's handlers): calling
one records the action as source 'user' AND invokes the handler — the
opt-in precision tier. Wire a trigger IN PLACE OF the handler at the call
site (the trigger invokes it for you); keeping both wired executes the
handler twice. If you cannot replace the call site, rely on the zero-touch
tiers instead (DOM sensor / effect-signature inference).

***

### unregister

> **unregister**: () => `void`

Defined in: [src/traverse/session.ts:198](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L198)

Unregister everything this call registered (call on unmount).

#### Returns

`void`
