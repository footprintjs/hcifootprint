---
title: RegisteredHandlers
---

# Interface: RegisteredHandlers

Defined in: [src/traverse/session.ts:325](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L325)

registerHandlers() output: optional exact-provenance triggers + the group's cleanup.

## Properties

### setBusy

> **setBusy**: (`actionId`, `label`) => `void`

Defined in: [src/traverse/session.ts:353](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L353)

Say this control is WORKING right now — the app's own label for it, or
`undefined` to clear. The third state a control has, scoped and refused the
same way `setEnabled` is.

It is here for the same reason `setEnabled` is: the door that mounted a
control owns its state, and greyed/working are not two different kinds of
ownership. Its absence also had a consequence beyond symmetry —
`useWorking` (hcifootprint/react) takes handles by their `setBusy`, so a
flat-session app could mount its controls through this door and then could
not hand the result to the React binding at all.

#### Parameters

##### actionId

`string`

##### label

`string` \| `undefined`

#### Returns

`void`

***

### setEnabled

> **setEnabled**: (`actionId`, `enabled`) => `void`

Defined in: [src/traverse/session.ts:340](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L340)

Grey out (or restore) one of the actions THIS group registered — the same
control the tree API's group handle has always offered, scoped the same way.
Reaching for an action the group did not register is refused by name.

#### Parameters

##### actionId

`string`

##### enabled

`boolean`

#### Returns

`void`

***

### triggers

> **triggers**: `Record`\<`string`, (`payload?`) => [`FireResult`](/api/index/type-aliases/FireResult)\>

Defined in: [src/traverse/session.ts:334](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L334)

Wrapped manual triggers (same signature as the app's handlers): calling
one records the action as source 'user' AND invokes the handler — the
opt-in precision tier. Wire a trigger IN PLACE OF the handler at the call
site (the trigger invokes it for you); keeping both wired executes the
handler twice. If you cannot replace the call site, rely on the zero-touch
tiers instead (DOM sensor / effect-signature inference).

***

### unregister

> **unregister**: () => `void`

Defined in: [src/traverse/session.ts:355](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L355)

Unregister everything this call registered (call on unmount).

#### Returns

`void`
