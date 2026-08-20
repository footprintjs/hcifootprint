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
  if (typeof value === "function") return undefined;
  if (typeof value === "string")
    return value.length > 200 ? `${value.slice(0, 200)}…` : value;
  // A bigint survives structuredClone — this library's usual wire bar — and then
  // THROWS in JSON.stringify, which is how every MCP result crosses. One app
  // value of this type would cost the model the whole answer (facts, actions and
  // journeys), so it crosses as its decimal digits: the same number, in the only
  // type JSON has for it.
  if (typeof value === "bigint") return `${value}`;
  if (value === null || typeof value !== "object") return value; // number, boolean, undefined
  if (depth >= 4) return null; // deep enough — and a cycle backstop
  if (Array.isArray(value)) {
    const kept = value
      .slice(0, 30)
      .map((item) => sanitizeProduced(item, depth + 1));
    // SAID, not silent (1.13.0). The string cut nine lines up has always
    // announced itself with "…"; an array cut at 30 said nothing, so a reader
    // — human or model — took the 30 for the whole set. A silently shortened
    // list is a worse failure than a long one: a model that cannot see an
    // item and is not told one exists concludes the app cannot do it. The
    // marker is a trailing STRING element so existing rows keep their shape
    // and a scanner meets the same "…" grammar the string cap taught it.
    if (value.length > 30) kept.push(`… ${value.length - 30} more omitted`);
    return kept;
  }
  const out: Record<string, unknown> = {};
  let count = 0;
  let omittedKeys = 0;
  for (const [key, child] of Object.entries(value)) {
    if (count++ >= 40) {
      omittedKeys += 1;
      continue;
    }
    const clean = sanitizeProduced(child, depth + 1);
    if (clean !== undefined) out[key] = clean;
  }
  // Same law for the 40-key cap: the cut names its size where the cut
  // happened, under a key no app object can collide with silently.
  if (omittedKeys > 0) out["…"] = `${omittedKeys} more key(s) omitted`;
  return out;
}
