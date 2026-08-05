/**
 * THE DATA CHANNEL'S ONE BOUNDING RULE.
 *
 * Everything this library carries as DATA rather than as prose — a handler's
 * return value, what a control holds, a contextful capture's allowlisted input —
 * crosses through here, so "bounded, firewall-safe copy" is one derivation
 * rather than a rule each door remembers differently.
 *
 * It lived inside session.ts until D21 needed the same bound for the capture
 * envelope (contextful/capture.ts). A second copy there would have been a second
 * answer to "how big may an app value be on a record", which is exactly the kind
 * of drift the redaction points and the value doors are written to avoid.
 */

/**
 * Bounded, firewall-safe copy of a handler's return value for the DATA channel.
 * Caps depth/breadth/string length (search results can be large), drops
 * functions, and tolerates cycles via the depth cap — so a handler return can
 * never blow up a tool result or smuggle live references into the record.
 */
export function sanitizeProduced(value: unknown, depth = 0): unknown {
  if (typeof value === 'function') return undefined;
  if (typeof value === 'string') return value.length > 200 ? `${value.slice(0, 200)}…` : value;
  // A bigint survives structuredClone — this library's usual wire bar — and then
  // THROWS in JSON.stringify, which is how every MCP result crosses. One app
  // value of this type would cost the model the whole answer (facts, actions and
  // journeys), so it crosses as its decimal digits: the same number, in the only
  // type JSON has for it.
  if (typeof value === 'bigint') return `${value}`;
  if (value === null || typeof value !== 'object') return value; // number, boolean, undefined
  if (depth >= 4) return null; // deep enough — and a cycle backstop
  if (Array.isArray(value)) {
    return value.slice(0, 30).map((item) => sanitizeProduced(item, depth + 1));
  }
  const out: Record<string, unknown> = {};
  let count = 0;
  for (const [key, child] of Object.entries(value)) {
    if (count++ >= 40) break;
    const clean = sanitizeProduced(child, depth + 1);
    if (clean !== undefined) out[key] = clean;
  }
  return out;
}
