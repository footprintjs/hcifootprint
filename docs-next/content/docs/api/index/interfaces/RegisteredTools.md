---
title: RegisteredTools
---

# Interface: RegisteredTools

Defined in: [src/traverse/session.ts:269](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L269)

registerTools() output: optional exact-provenance triggers + the group's cleanup.

## Properties

### triggers

> **triggers**: `Record`\<`string`, (`payload?`) => [`FireResult`](/api/index/type-aliases/FireResult)\>

Defined in: [src/traverse/session.ts:278](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L278)

Wrapped manual triggers (same signature as the app's handlers): calling
one records the action as source 'user' AND invokes the handler — the
opt-in precision tier. Wire a trigger IN PLACE OF the handler at the call
site (the trigger invokes it for you); keeping both wired executes the
handler twice. If you cannot replace the call site, rely on the zero-touch
tiers instead (DOM sensor / effect-signature inference).

***

### unregister

> **unregister**: () => `void`

Defined in: [src/traverse/session.ts:280](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L280)

Unregister everything this call registered (call on unmount).

#### Returns

`void`
