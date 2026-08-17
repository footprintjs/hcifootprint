/**
 * serve/tool-name — the ONE owner of "a name becomes a legal tool name".
 *
 * A serving layer may only expose `[A-Za-z0-9_.-]`, and a graph id or a generic
 * is whatever the app called it. Four copies of the same one-liner used to do
 * that conversion — `src/serve/mcp.ts`, `src/serve/modes.ts`,
 * `src/testing/harness.ts` and `src/testing/conform.ts`, the last of which
 * described itself as "sanitized exactly as the real serving layer does". Four
 * copies is how a fix lands in one place and leaves three, and it is also how a
 * conformance checker comes to reproduce the defect it is checking for
 * faithfully enough to pass.
 *
 * They all replaced every illegal character with `_`, which is not a conversion
 * but a FOLD: `checkout:submit`, `checkout/submit` and `checkout submit` all
 * became `checkout_submit`, so two different generics addressed one tool and a
 * caller asking for one got the other.
 *
 * ── Two arms, and why the first one exists ──────────────────────────────────
 * A tool name is a WIRE CONTRACT — it is what a caller types and what a
 * recording pins — so a conversion that renames names which were already fine
 * is a breaking change bought for nothing. The first attempt at this file
 * escaped inline with `_` as the escape character, which is the most common
 * character in a tool name: every `add_to_cart` became `add__to__cart` and 351
 * tests failed for a rename nobody needed.
 *
 *   A. already legal, and not claiming to be an encoded name → returned byte for
 *      byte. Every name that works today keeps working, unchanged.
 *   B. anything else → `_enc_` + an escaped form (`_` → `__`, any other unit →
 *      `_uXXXX`), which is injective because a decoder is its left inverse.
 *
 * Arm A never starts with `_enc_` (excluded by construction) and every arm B
 * output does, so no name from one arm can collide with a name from the other.
 * Only names that were being FOLDED change — which is exactly the set that was
 * broken.
 */

/** Marks a name this module had to rewrite; excluded from the pass-through arm. */
const ENCODED_PREFIX = '_enc_';

/** Legal in a standalone tool name. */
const NAME_LEGAL = /^[A-Za-z0-9_.-]+$/;

/** Legal in a name FRAGMENT — no dot, because the dot separates fragments. */
const FIELD_LEGAL = /^[A-Za-z0-9_-]+$/;

/** Legal AND not the escape character. */
const PASSES_THROUGH = /[A-Za-z0-9.-]/;

function encode(raw: string): string {
  let out = ENCODED_PREFIX;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (ch === '_') out += '__';
    else if (PASSES_THROUGH.test(ch)) out += ch;
    else out += `_u${raw.charCodeAt(i).toString(16).padStart(4, '0')}`;
  }
  return out;
}

/** A standalone tool name, made legal without folding two names into one. */
export function encodeToolName(raw: string): string {
  return NAME_LEGAL.test(raw) && !raw.startsWith(ENCODED_PREFIX) ? raw : encode(raw);
}

/**
 * One FRAGMENT of a composed name. Stricter than {@link encodeToolName} by
 * exactly one character: a dot is legal inside a standalone name and dangerous
 * inside a fragment, because a fragment carrying one could donate the separator
 * — `checkout.v2` + `submit` and `checkout` + `v2.submit` composed the same name.
 */
export function encodeToolNameField(raw: string): string {
  if (!FIELD_LEGAL.test(raw) || raw.startsWith(ENCODED_PREFIX)) return encode(raw).replace(/\./g, '_u002e');
  return raw;
}

/** Compose a tool name from fragments, each encoded BEFORE the join. */
export function toolNameFrom(...fields: readonly string[]): string {
  return fields.map(encodeToolNameField).join('.');
}
