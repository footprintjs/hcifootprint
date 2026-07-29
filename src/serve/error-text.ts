/**
 * An app's error, rendered for the wire.
 *
 * A settlement carries `error` as whatever the app threw or returned — an
 * Error, a string, a plain object, occasionally something exotic. Two things
 * must never happen when that value crosses a tool result:
 *
 * 1. It must not arrive UNBOUNDED. A stack trace or a serialized response body
 *    is the rest of the model's context window, spent on one refusal.
 * 2. Rendering it must not THROW. `String()` throws on a null-prototype object
 *    and on anything whose own `toString` fails (a getter reaching into a
 *    torn-down store), and a poll that crashes tells the caller nothing at
 *    all — the one answer this library never gives.
 *
 * It is deliberately text, not the object: a live error never crosses into a
 * result a consumer will serialize.
 */

/** Longest error text that crosses a result — the same cap sanitizeProduced puts on strings. */
const MAX_LENGTH = 200;

export function errorText(error: unknown): string {
  let text: string;
  try {
    text = String(error);
  } catch {
    // Unrenderable. Say exactly that, rather than dropping the field and
    // implying the failure came with no reason at all.
    return '(an error that cannot be rendered as text)';
  }
  return text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH)}…` : text;
}
