/**
 * The encoder that replaced four copies of a fold.
 *
 * Each copy replaced every illegal character with `_`, so two different generics
 * addressed one tool and a caller asking for one got the other. The last of the
 * four lived in the conformance checker and described itself as "sanitized
 * exactly as the real serving layer does" — which was true, and was the problem.
 */
import { describe, expect, it } from 'vitest';
import { encodeToolName, encodeToolNameField, toolNameFrom } from '../../src/serve/tool-name.js';

const LEGAL = /^[A-Za-z0-9_.-]*$/;

describe('encodeToolNameField', () => {
  it('keeps distinct names distinct where the old fold merged them', () => {
    const folded = ['checkout:submit', 'checkout/submit', 'checkout submit', 'checkout_submit'];
    const encoded = folded.map(encodeToolNameField);
    expect(new Set(encoded).size).toBe(folded.length);
  });

  it('produces only characters a serving layer accepts', () => {
    for (const raw of ['a b', 'é', '😀', 'a/b', '', 'a_b', 'a.b-c']) {
      expect(encodeToolNameField(raw), raw).toMatch(LEGAL);
    }
  });

  it('leaves an already-legal name EXACTLY as it found it — including snake_case', () => {
    // The whole point of the pass-through arm. The first version of this file
    // escaped inline with `_`, the commonest character in a tool name, and
    // renamed every add_to_cart to add__to__cart for nothing.
    for (const raw of ['checkout.submit', 'add-to-cart', 'page1', 'add_to_cart', 'a_b_c']) {
      expect(encodeToolName(raw), raw).toBe(raw);
    }
  });
});

describe('toolNameFrom', () => {
  it('a field cannot donate the separator', () => {
    // The join collision: both composed `checkout.v2.submit` before.
    expect(toolNameFrom('checkout.v2', 'submit')).not.toBe(toolNameFrom('checkout', 'v2.submit'));
  });

  it('composes a legal name from illegal fields', () => {
    expect(toolNameFrom('check out', 'sub/mit')).toMatch(LEGAL);
  });
});
