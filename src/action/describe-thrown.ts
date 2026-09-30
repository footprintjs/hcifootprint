/**
 * describe-thrown — words for whatever app code threw, and never a second
 * throw. The one owner: the declared-context fold (a reader's skip reason)
 * and the walk (a step's refusal) both record a thrown value as text, and
 * both sit where a throw of their own would escape — the fold into
 * `settle()` after the settlement was already recorded, the walk out of
 * `run()` as a rejected manifest instead of a refused row.
 *
 * `String()` itself throws on a null-prototype object, a hostile `toString`
 * / `Symbol.toPrimitive`, or a revoked Proxy; so does `instanceof` on a
 * revoked Proxy.
 * @internal
 */

/** `String(error)`, falling back to the tag, then to a fixed phrase. */
export function describeThrown(error: unknown): string {
  try {
    return String(error);
  } catch {
    try {
      return Object.prototype.toString.call(error);
    } catch {
      return 'an unprintable value';
    }
  }
}

/**
 * The sentence an `Error` carries (the protocol's refusals ARE their
 * message), else `describeThrown`. Never throws.
 */
export function thrownMessage(error: unknown): string {
  try {
    if (error instanceof Error && typeof error.message === 'string') {
      return error.message;
    }
  } catch {
    // A revoked Proxy refuses `instanceof`; describe it like any other value.
  }
  return describeThrown(error);
}
