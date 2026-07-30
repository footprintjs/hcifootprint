---
title: SensorElement
---

# Interface: SensorElement

Defined in: src/sensor/dom-port.ts:66

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

Defined in: src/sensor/dom-port.ts:82

Native label association, when the DOM already answers it.

***

### parentElement

> `readonly` **parentElement**: `SensorElement` \| `null`

Defined in: src/sensor/dom-port.ts:69

***

### tagName

> `readonly` **tagName**: `string`

Defined in: src/sensor/dom-port.ts:68

Uppercase in HTML documents ('BUTTON') — the native-semantics table folds case itself.

***

### textContent

> `readonly` **textContent**: `string` \| `null`

Defined in: src/sensor/dom-port.ts:72

The visible-text rung of the accessible-name ladder.

***

### value?

> `readonly` `optional` **value?**: `unknown`

Defined in: src/sensor/dom-port.ts:80

Read for ONE thing only: an `<input type="submit" value="Save">` carries its
LABEL in `value`, which is what HTML says that attribute is for on a button.
It is never read as a payload — the sensor sends none. Typed `unknown`
because the real DOM is not uniform here (`HTMLProgressElement.value` is a
number), so promising `string` would be a claim this port cannot keep.

## Methods

### getAttribute()

> **getAttribute**(`name`): `string` \| `null`

Defined in: src/sensor/dom-port.ts:70

#### Parameters

##### name

`string`

#### Returns

`string` \| `null`
