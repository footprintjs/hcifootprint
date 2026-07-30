---
title: SensorElement
---

# Interface: SensorElement

Defined in: [src/sensor/dom-port.ts:62](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L62)

An element, as far as RECOGNITION is concerned — and recognition is all the
sensor does to an element.

Note what is NOT here: no `checked`, no `form`, no `children`, no per-control
`name`. Those are the members a DOM value-scraper needs, and this sensor does
not scrape values (see payload.ts). Leaving them out of the port is the
cheapest possible enforcement: the value-reading bug class is not a rule
somebody has to remember, it is a surface that does not exist.

## Properties

### labels?

> `readonly` `optional` **labels?**: `ArrayLike`\<`SensorElement`\> \| `null`

Defined in: [src/sensor/dom-port.ts:87](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L87)

Native label association, when the DOM already answers it.

***

### parentElement

> `readonly` **parentElement**: `SensorElement` \| `null`

Defined in: [src/sensor/dom-port.ts:65](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L65)

***

### tagName

> `readonly` **tagName**: `string`

Defined in: [src/sensor/dom-port.ts:64](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L64)

Uppercase in HTML documents ('BUTTON') — the native-semantics table folds case itself.

***

### textContent

> `readonly` **textContent**: `string` \| `null`

Defined in: [src/sensor/dom-port.ts:68](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L68)

The visible-text rung of the accessible-name ladder.

***

### value?

> `readonly` `optional` **value?**: `unknown`

Defined in: [src/sensor/dom-port.ts:85](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L85)

Read for ONE thing only: an `<input type="submit" value="Save">` carries its
LABEL in `value`, which is what HTML says that attribute is for on a button.
It is never read as a payload — a payload comes from the app's own declared
getter or not at all (payload.ts).

IT CANNOT BE RENAMED to something narrower like `submitLabel`, because the
real `HTMLInputElement` must satisfy this interface structurally and it
calls the member `value`. So the surface stays and the single read is PINNED
instead: test/sensor-boundary.test.ts fails if any module but
accessible-name.ts's `isInputButton` branch reads `element.value`.

Typed `unknown` because the real DOM is not uniform here
(`HTMLProgressElement.value` is a number), so promising `string` would be a
claim this port cannot keep.

## Methods

### getAttribute()

> **getAttribute**(`name`): `string` \| `null`

Defined in: [src/sensor/dom-port.ts:66](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/dom-port.ts#L66)

#### Parameters

##### name

`string`

#### Returns

`string` \| `null`
