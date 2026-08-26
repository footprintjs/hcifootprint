---
title: KindRecord
---

# Interface: KindRecord

Defined in: [src/action/kinds.ts:38](https://github.com/footprintjs/hcifootprint/blob/main/src/action/kinds.ts#L38)

What a catalog knows about one kind. Frozen; returned by identity.

## Properties

### docs?

> `readonly` `optional` **docs?**: `string`

Defined in: [src/action/kinds.ts:50](https://github.com/footprintjs/hcifootprint/blob/main/src/action/kinds.ts#L50)

***

### kind

> `readonly` **kind**: `string`

Defined in: [src/action/kinds.ts:39](https://github.com/footprintjs/hcifootprint/blob/main/src/action/kinds.ts#L39)

***

### revision?

> `readonly` `optional` **revision?**: `number`

Defined in: [src/action/kinds.ts:47](https://github.com/footprintjs/hcifootprint/blob/main/src/action/kinds.ts#L47)

The vocabulary's own version of this MEANING. Kind names are forever;
their shapes evolve — and mutable meaning under a stable name is the
stale-picture disease at the vocabulary level. The revision rides the
catalog fingerprint, so two sides holding different meanings of the
same name refuse loudly instead of matching silently.

***

### schema?

> `readonly` `optional` **schema?**: `unknown`

Defined in: [src/action/kinds.ts:49](https://github.com/footprintjs/hcifootprint/blob/main/src/action/kinds.ts#L49)

Optional payload shape, in whatever schema convention the app uses.
