---
title: Binding
---

# Type Alias: Binding

> **Binding** = \{ `actuation?`: [`Actuation`](/api/index/type-aliases/Actuation); `kind`: `"element"`; `locator`: [`ElementLocator`](/api/index/interfaces/ElementLocator); \} \| \{ `chord`: `string`; `kind`: `"keychord"`; \} \| \{ `kind`: `"programmatic"`; `provider`: `string`; \} \| \{ `href`: `string`; `kind`: `"url"`; \} \| \{ `kind`: `"tab"`; `target`: `string`; \}

Defined in: [src/atom/types.ts:86](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L86)

Activation descriptor. Generalized past "element selector" because keyboard
shortcuts have no element and canvas surfaces have no ARIA — those bind via
`keychord` and `programmatic` (the component publishes its own affordance).
With `url` and `tab` the set covers the four gestures a routed web app
actually performs: url | click (element) | tab | programmatic.

## Union Members

### Type Literal

\{ `actuation?`: [`Actuation`](/api/index/type-aliases/Actuation); `kind`: `"element"`; `locator`: [`ElementLocator`](/api/index/interfaces/ElementLocator); \}

***

### Type Literal

\{ `chord`: `string`; `kind`: `"keychord"`; \}

***

### Type Literal

\{ `kind`: `"programmatic"`; `provider`: `string`; \}

***

### Type Literal

\{ `href`: `string`; `kind`: `"url"`; \}

A literal address the app's OWN router can be handed (see
`SessionOptions.navigate`). `href` must be FULLY literal — a ':param'
segment is refused loudly at authoring, because the library never guesses
params: an address either exists as bytes or the gesture does not exist.

***

### Type Literal

\{ `kind`: `"tab"`; `target`: `string`; \}

A tab switch to a sibling node path. Its own gesture, DESCRIPTIVE in v1:
it materialises only via a registered handler, and it NEVER moves the page
cursor — flipping a tab does not change the page you are on. After the
app's handler flips tabs, the existing visibility wire (show/setVisible)
reports the result; fire() itself never writes the PresenceIndex.
