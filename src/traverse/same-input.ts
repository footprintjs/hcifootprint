/**
 * Is the input a human approved the input that is now being fired?
 *
 * A human approves WHAT THEY WERE SHOWN — the action AND the input on the ask
 * card. Without this comparison, "approve adding one dress to the cart" is a
 * laundering token for "add nine hundred", because the approval names only the
 * verb. This module answers the one question that closes that: are these two
 * inputs the same input?
 *
 * THE ASYMMETRY, and it is the most important comment in this change.
 * `payload-shape.ts` declines toward ALLOW — what it cannot judge it passes,
 * because a wrong REJECTION blocks an action the app would have accepted and the
 * caller has no appeal (payload-shape.ts:16-21). This module declines toward
 * REFUSE, because it stands on a security boundary: an unprovable match is not a
 * match. Same stance — never report as certain what you cannot judge — opposite
 * default, and the reason is which mistake is unrecoverable. A false refusal
 * costs one more trip past the human; a false match spends a human's yes on
 * something they never saw.
 *
 * WHY EXACT EQUALITY AND NOT A DECLARED SUBSET. A subset rule would need the
 * library to know which fields are consequential. It cannot: `note` is cosmetic
 * in one app and the payee in the next. Guessing is precisely how ask-to-do-A
 * becomes do-B in the fields nobody declared, so the whole input is bound and
 * the caller re-asks when it changes.
 *
 * WHY THE CAPS REFUSE INSTEAD OF TRUNCATING. The snapshot on the ask card is
 * bounded (session.ts sanitizeProduced — depth 4, 30 array items, 40 keys, 200
 * string chars), so an input larger than that was shown to the human TRUNCATED.
 * Comparing two truncations would approve a fire whose 31st item differs from
 * the one on the card. So anything the receipts pack cannot hold faithfully is
 * 'cannot-judge', and the gate refuses with a sentence that says why. The limit
 * is stated rather than silently papered over.
 */

/**
 * The caps, held here and matched by the receipts snapshot in session.ts. They
 * are the same numbers on purpose: the comparison must not be able to judge a
 * value the card could not show faithfully.
 */
const MAX_DEPTH = 4;
const MAX_ARRAY_ITEMS = 30;
const MAX_OBJECT_KEYS = 40;
const MAX_STRING_LENGTH = 200;

/** What `sameInput` could conclude. 'cannot-judge' is a refusal at the gate. */
export type InputVerdict = 'same' | 'different' | 'cannot-judge';

/**
 * The one normalization both sides of the comparison pass through — the ask when
 * it records what the card will show, and the fire when the gate checks it.
 *
 * PARITY IS LOAD-BEARING. `fire()` rewrites a `noInput` affordance's payload to
 * `undefined` before anything downstream sees it (session.ts:872-881). If the
 * ask stored the `input: ''` a uniform relay contract made a model send, and the
 * gate compared that raw against the fire's erased `undefined`, every
 * click-only control would refuse a legitimate approval. One helper, called from
 * both places, is why that cannot happen.
 */
export function normalizeInput(payload: unknown, noInput: boolean): unknown {
  // The affordance takes nothing: there is no input to bind, so both sides
  // normalize to the same nothing whatever the caller sent.
  if (noInput) return undefined;
  return payload;
}

/**
 * Are these the same input? Compared over a canonical, key-order-independent
 * rendering, so `{a:1,b:2}` and `{b:2,a:1}` are the same input (they are the
 * same input — refusing them would break approvals for no reason).
 *
 * Returns 'cannot-judge' for every value canonical JSON cannot render
 * faithfully: Map, Set, Date, RegExp, class instances, BigInt, symbols,
 * functions, NaN/Infinity, circular references, and anything past the caps
 * above. The gate turns that into a refusal — never into a guessed match.
 */
export function sameInput(a: unknown, b: unknown): InputVerdict {
  const left = canonical(a);
  const right = canonical(b);
  if (left === undefined || right === undefined) return 'cannot-judge';
  return left === right ? 'same' : 'different';
}

/**
 * The same rendering, handed out for a caller that needs a KEY rather than a
 * verdict — single-flight, which has to hold what a pending fire carried and
 * compare a later one against it without keeping the caller's object alive.
 *
 * ONE RENDERER, deliberately. Two canonical forms would let the approval gate
 * and the repeat check disagree about whether two payloads are the same payload,
 * and a disagreement of that shape is a second payment.
 */
export function renderInput(payload: unknown): string | undefined {
  return canonical(payload);
}

/**
 * A deterministic string for a value, or `undefined` meaning "this library
 * cannot render this faithfully". A string rather than a structure so the
 * comparison is one `===` with no deep-equality walker to get subtly wrong.
 *
 * `undefined` doubles as the not-judgeable signal AND as the rendering of the
 * absent input, which would be an ambiguity — so absence is rendered as the
 * literal 'nothing' token and the return type keeps `undefined` for one job.
 */
function canonical(value: unknown): string | undefined {
  return render(value, 0, new Set<object>());
}

function render(value: unknown, depth: number, seen: Set<object>): string | undefined {
  if (value === undefined) return 'nothing';
  if (value === null) return 'null';
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      // JSON renders NaN and ±Infinity as `null`, which would make NaN equal to
      // null and to each other. The honest answer is that we cannot compare it.
      return Number.isFinite(value) ? `n:${value}` : undefined;
    case 'string':
      // Past the cap the card showed a truncated string, so two different
      // strings sharing a 200-character prefix would compare equal. Refuse.
      return value.length > MAX_STRING_LENGTH ? undefined : `s:${JSON.stringify(value)}`;
    case 'bigint':
    case 'symbol':
    case 'function':
      // A BigInt does not survive JSON, a symbol has no faithful text, and a
      // function is not data. None of them can be shown on a card either.
      return undefined;
    default:
      break;
  }
  const object = value as object;
  // A cycle is detected rather than followed: the alternative is a hang, and a
  // hang inside a security gate is worse than any refusal.
  if (seen.has(object)) return undefined;
  if (depth >= MAX_DEPTH) return undefined;
  seen.add(object);
  try {
    if (Array.isArray(object)) {
      if (object.length > MAX_ARRAY_ITEMS) return undefined;
      const parts: string[] = [];
      for (const item of object) {
        const part = render(item, depth + 1, seen);
        if (part === undefined) return undefined;
        parts.push(part);
      }
      return `[${parts.join(',')}]`;
    }
    // PLAIN objects only. A Map, a Set, a Date, a RegExp or a class instance all
    // render as `{}` through JSON — so two different Maps would compare equal,
    // which is the false-match this module exists to prevent.
    const proto = Object.getPrototypeOf(object) as unknown;
    if (proto !== Object.prototype && proto !== null) return undefined;
    const entries = Object.entries(object as Record<string, unknown>);
    if (entries.length > MAX_OBJECT_KEYS) return undefined;
    const parts: string[] = [];
    // Key-sorted, so the comparison is about the input and not about the order a
    // JSON parser happened to hand the keys over in.
    // Hoisted so the exemption lands on THIS statement only: a `v8 ignore`
    // before a `for` exempts the whole loop, and the body below carries the
    // undefined-drop rule the comment two lines down calls load-bearing.
    /* v8 ignore next -- the comparator's equal arm is unreachable: these are one object's own keys, so no two are the same string and the sort never asks whether they tie. */
    const sorted = entries.sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0));
    for (const [key, child] of sorted) {
      // An undefined-valued key is DROPPED, matching the receipts snapshot
      // (sanitizeProduced omits it). Without this, `{a:1,b:undefined}` on the
      // wire would refuse against `{a:1}` on the card — a false refusal caused
      // by our own storage, not by the caller.
      if (child === undefined) continue;
      const part = render(child, depth + 1, seen);
      if (part === undefined) return undefined;
      parts.push(`${JSON.stringify(key)}:${part}`);
    }
    return `{${parts.join(',')}}`;
  } finally {
    // Popped on the way out so a value repeated in two SIBLING positions is not
    // mistaken for a cycle — that is a shared reference, not a loop.
    seen.delete(object);
  }
}
