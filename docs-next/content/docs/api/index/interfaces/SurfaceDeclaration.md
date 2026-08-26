---
title: SurfaceDeclaration
---

# Interface: SurfaceDeclaration

Defined in: src/action/channels.ts:19

What one surface can serve. Kinds, never actions; a node, never a URL.

## Properties

### collects?

> `readonly` `optional` **collects?**: readonly `string`[]

Defined in: src/action/channels.ts:25

Kinds this surface can obtain from a person.

***

### node

> `readonly` **node**: `string`

Defined in: src/action/channels.ts:23

Where it lives in the application graph.

***

### shows?

> `readonly` `optional` **shows?**: readonly `string`[]

Defined in: src/action/channels.ts:27

Kinds this surface can render.

***

### surface

> `readonly` **surface**: `string`

Defined in: src/action/channels.ts:21

The surface's own id — refused when a live surface already holds it.
