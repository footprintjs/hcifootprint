/**
 * HIDING A FIELD INSIDE A VALUE — the redaction `redactedKeys` never did.
 *
 * `redactedKeys` governs STATE KEYS: a key named there is stored as a
 * placeholder in the commit log and rendered `'[REDACTED]'` in guard evidence,
 * while live state keeps the raw bytes. It never governed the DATA a transition
 * carries — a fire's payload, a handler's return value, the input on an approval
 * card — and the library said so in its own voice. This module is the other
 * half: named PATHS inside those values, replaced by a marker a reader can see.
 *
 * WHY A MARKER AND NOT A DROP. A dropped field reads as a field that was never
 * sent, and a reader — a person auditing the journal, a model reading a result —
 * cannot tell "hidden" from "empty". They go looking for a bug that is not
 * there, or they trust a card that is quietly missing the thing they were meant
 * to judge. The marker is the honesty of the whole mechanism: it says a value
 * was here and you are not being shown it.
 *
 * WHY ABSENT STAYS ABSENT. A path whose value is missing or `undefined` is NOT
 * marked. This library reads undefined as absent everywhere — `updateState`
 * drops undefined-valued keys, a guard key holding undefined is unevaluable,
 * `sanitizeProduced` and `sameInput` both drop undefined-valued keys — so
 * stamping a marker there would announce a secret that was never sent. `null` IS
 * marked: the app said "explicitly nothing", which is a value it chose to send.
 *
 * WHY ONLY PLAIN OBJECTS AND ARRAYS ARE WALKED, and why anything else on the
 * path is hidden WHOLE. A Map, a Set, a Date, a class instance, a function:
 * own-property enumeration cannot see everything that will ride out of them (a
 * Map's entries live in internal slots, a getter can sit on the prototype), so
 * reaching "inside" one and declaring the secret gone would be a guess in the
 * permissive direction. `same-input.ts` refuses the same shapes for the same
 * reason. A PRIMITIVE on the path is left exactly alone — a string cannot hold a
 * field named `token`, so hiding it would hide data nobody named.
 *
 * WHY AN ARRAY IS DESCENDED ELEMENT-WISE. `'items.token'` hides `token` in every
 * item, because a consumer naming a field means the field and not one row of a
 * list whose length they cannot know. One rule, no index syntax, no `*` — the
 * grammar stays the dot path footprintjs already teaches.
 *
 * PRIOR ART: footprintjs `RedactionPolicy.fields` (dot-notation paths → the
 * `'[REDACTED]'` placeholder, `scope/ScopeFacade.ts` `_scrubFields`). Same
 * grammar, same marker, same fail-visible stance; this is that mechanism aimed
 * at hcifootprint's own channels.
 *
 * MUTATION PROOF: return `value` unchanged from `redactFields` and 16 of the 30
 * tests in redacted-fields.test.ts go red with the secret in hand; the 14 that
 * stay green are the ones asserting nothing was supposed to change.
 */

/**
 * What a hidden value is replaced by — footprintjs's own placeholder, and the
 * string this library already shows for a redacted guard reading
 * (`FilterCondition.actualSummary`). One marker across both siblings, so a
 * reader who has seen it once knows what it means everywhere.
 */
export const REDACTED = '[REDACTED]';

/**
 * A detached-where-it-had-to-be copy of `value` with every named path replaced
 * by {@link REDACTED}.
 *
 * STRUCTURALLY SHARED ON PURPOSE. Only the spine down to a hidden field is
 * rebuilt; untouched branches keep their references, and a path that matches
 * nothing returns the very same value that came in. That is not a shortcut — it
 * is what keeps the default and near-default paths byte-identical: the record
 * has always held the caller's own payload object and cloned it at the export
 * door (`session.ts` `#copyRecord`), so sharing what nothing hid changes no
 * guarantee that existed before.
 *
 * NEVER MUTATES the value handed in. The caller's object is the one the handler
 * is about to be given; rewriting it would make redaction change what the app
 * does, which is the one thing an observability dial may never do.
 */
export function redactFields(value: unknown, paths: readonly string[] | undefined): unknown {
  if (paths === undefined || paths.length === 0) return value;
  let out = value;
  for (const path of paths) {
    // Empty segments are tolerated rather than interpreted: 'a..b' is the author
    // meaning 'a.b', and '' names nothing at all. A path that names nothing is
    // skipped — "hide everything" is a different request, and inventing it here
    // from an empty string would be a policy nobody typed.
    const segments = path.split('.').filter((segment) => segment.length > 0);
    if (segments.length === 0) continue;
    out = hide(out, segments);
  }
  return out;
}

/**
 * One path, one level at a time. Returns the SAME node when nothing matched, so
 * an unmatched path costs no copy and changes no reference.
 */
function hide(node: unknown, segments: readonly string[]): unknown {
  if (Array.isArray(node)) {
    let changed = false;
    const out = node.map((element) => {
      const next = hide(element, segments);
      if (next !== element) changed = true;
      return next;
    });
    return changed ? out : node;
  }
  // A primitive cannot hold a field, so a path pointing past one names nothing.
  if (node === null || (typeof node !== 'object' && typeof node !== 'function')) return node;
  // Fail closed: something we cannot read faithfully is hidden WHOLE rather than
  // reached into (see the header). Reachable only on the raw-payload channel —
  // the receipts and `produced` are sanitized to plain shapes before they get
  // here — and a payload of this shape is one the approval gate already refuses
  // as 'cannot-judge', so nothing that can fire under enforcement lands on it.
  if (!isPlain(node)) return REDACTED;
  const [head, ...rest] = segments;
  const record = node as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(record, head)) return node;
  const current = record[head];
  if (current === undefined) return node; // absent is EMPTY, never hidden
  const replacement = rest.length === 0 ? REDACTED : hide(current, rest);
  if (replacement === current) return node;
  return { ...record, [head]: replacement };
}

/**
 * A plain object — the only object shape whose own properties are the whole of
 * it. The same test `same-input.ts` applies before it will compare a value, and
 * deliberately not `payload-shape.ts`'s looser one (which calls a Date plain,
 * because it is judging a JSON Schema and not guarding a secret).
 */
function isPlain(value: object): boolean {
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
}
