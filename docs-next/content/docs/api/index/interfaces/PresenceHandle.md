---
title: PresenceHandle
---

# Interface: PresenceHandle

Defined in: [src/presence/presence.ts:23](https://github.com/footprintjs/hcifootprint/blob/main/src/presence/presence.ts#L23)

PresenceIndex — the pure presence sensor (D18).

Registration observes MOUNTED, nothing more. This index is deliberately a
plain refcounted data structure that knows nothing about sessions, trees,
routers, or footprint — the meaning of presence (dormancy below the router,
overlay masking, tab exclusivity, assumed-active defaults) lives one layer
up in NavSession, which COMPOSES this with the authored tree.

Contract points that make React StrictMode/HMR safe by construction:
- Handles are identities: open() returns a token, close(token) is
  idempotent per token. setup→cleanup→setup nets to one open handle.
- Instance handles (repeats containers) are tracked separately and are
  EXCLUDED from the fingerprint — a scrolling virtualized list must never
  look like world motion (that scoping rule is enforced here, at the
  lowest layer that can).
- Visibility is an EXPLICIT signal store (set by show()/setVisible()/the
  `visible:` mount option). No amount of mount-counting can see CSS; when
  no signal exists the layer above serves honesty markers instead of
  guessing.

## Properties

### instance?

> `readonly` `optional` **instance?**: `string`

Defined in: [src/presence/presence.ts:25](https://github.com/footprintjs/hcifootprint/blob/main/src/presence/presence.ts#L25)

***

### node

> `readonly` **node**: `string`

Defined in: [src/presence/presence.ts:24](https://github.com/footprintjs/hcifootprint/blob/main/src/presence/presence.ts#L24)

## Methods

### release()

> **release**(): `void`

Defined in: [src/presence/presence.ts:27](https://github.com/footprintjs/hcifootprint/blob/main/src/presence/presence.ts#L27)

Idempotent.

#### Returns

`void`
