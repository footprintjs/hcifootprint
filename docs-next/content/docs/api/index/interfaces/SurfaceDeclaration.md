---
title: SurfaceDeclaration
---

# Interface: SurfaceDeclaration

Defined in: [src/action/channels.ts:19](https://github.com/footprintjs/hcifootprint/blob/main/src/action/channels.ts#L19)

What one surface can serve. Kinds, never actions; a node, never a URL.

## Properties

### collects?

> `readonly` `optional` **collects?**: readonly `string`[]

Defined in: [src/action/channels.ts:25](https://github.com/footprintjs/hcifootprint/blob/main/src/action/channels.ts#L25)

Kinds this surface can obtain from a person.

***

### node

> `readonly` **node**: `string`

Defined in: [src/action/channels.ts:23](https://github.com/footprintjs/hcifootprint/blob/main/src/action/channels.ts#L23)

Where it lives in the application graph.

***

### shows?

> `readonly` `optional` **shows?**: readonly `string`[]

Defined in: [src/action/channels.ts:27](https://github.com/footprintjs/hcifootprint/blob/main/src/action/channels.ts#L27)

Kinds this surface can render.

***

### surface

> `readonly` **surface**: `string`

Defined in: [src/action/channels.ts:21](https://github.com/footprintjs/hcifootprint/blob/main/src/action/channels.ts#L21)

The surface's own id — refused when a live surface already holds it.
