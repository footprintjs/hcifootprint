/**
 * The INPUT CONTRACT an action advertises — derived ONCE, served everywhere.
 *
 * Mode B has always rendered it as `expects` on its result rows; `available()`
 * served only the raw `schema` (a live validator, useful in-process, unusable
 * over a wire). So a consumer driving the port directly re-derived the contract
 * by hand — which schema kinds serialize, which decline — and a law duplicated
 * at the consumer is drift by construction. One helper now answers for both,
 * so the same edge can never teach two shapes.
 *
 * Two kinds of answer, and a deliberate third that is silence:
 * - a DECLARED schema renders as the wire form of itself: zod → normalizeSchema,
 *   plain JSON Schema → a detached clone, any other `.safeParse`/`.parse`
 *   validator → the authored sentinel sentence. A live validator never crosses
 *   the wire — that is the firewall, not an oversight.
 * - `'none'` — the author's explicit "this control takes NO input", declared
 *   with the same sentinel at every authoring door and served as the same word,
 *   so a model is TOLD to send nothing before it can guess wrong once.
 * - ABSENCE — no schema declared at all. That is not "no input": it is the
 *   library not knowing, and it says so by serving nothing rather than
 *   inventing an empty contract the author never wrote.
 *
 * The rendered form is CACHED per schema object and deep-frozen. Cached because
 * `available()` is hot — every refused fire calls it for the gap row's context —
 * and re-running normalizeSchema on a zod schema there would tax exactly the
 * refusal paths. Frozen because one shared object now reaches many callers: the
 * same stance `binding` already takes on an AvailableEdge, where deep-frozen
 * spec data is safe to share precisely because nobody can rewrite it.
 */
import { detectSchema } from 'footprintjs';
import { normalizeSchema } from 'footprintjs/advanced';

/**
 * The author's sentinel for "this action takes NO input", accepted by
 * `ActionDef.input` and served back verbatim.
 * Deliberately the word an author would type, not a symbol: it has to survive
 * a JSON config file and a route table as easily as a source literal.
 */
export const NO_INPUT = 'none';

/** What a non-serializable validator advertises instead of a shape it cannot render. */
const OPAQUE_VALIDATOR = 'validated at fire time (non-serializable validator)';

/**
 * Is this declared input the sentinel rather than a schema? The three authoring
 * doors ask BEFORE detectSchema, which would otherwise read the string as an
 * unrecognized schema and refuse the very declaration this exists to accept.
 */
export function takesNoInput(declared: unknown): declared is typeof NO_INPUT {
  return declared === NO_INPUT;
}

/** What an author's declaration compiles to — `undefined` schema, the flag instead. */
export function noInputFlag(declared: unknown): { noInput: true } | Record<string, never> {
  return takesNoInput(declared) ? { noInput: true } : {};
}

/** The schema a declaration compiles to — the sentinel compiles to none at all. */
export function schemaOf(declared: unknown): unknown {
  return takesNoInput(declared) ? undefined : declared;
}

/** Anything carrying an input contract — the compiled affordance and the served edge alike. */
export interface InputCarrier {
  schema?: unknown;
  noInput?: boolean;
}

const wireForm = new WeakMap<object, unknown>();

/**
 * What a caller must send, wire-shaped — or `undefined` when the library has
 * nothing to say, which is its own honest answer (see the module header).
 */
export function expectsOf(carrier: InputCarrier | undefined): unknown {
  if (carrier === undefined) return undefined;
  if (carrier.noInput === true) return NO_INPUT;
  const schema = carrier.schema;
  if (schema === undefined) return undefined;
  // Only an object (or a callable validator) can key a WeakMap. Anything else
  // is cheap to render anyway, so it skips the cache rather than the answer.
  if (typeof schema !== 'object' && typeof schema !== 'function') return render(schema);
  const cached = wireForm.get(schema as object);
  if (cached !== undefined) return cached;
  const rendered = render(schema);
  wireForm.set(schema as object, rendered);
  return rendered;
}

function render(schema: unknown): unknown {
  const kind = detectSchema(schema);
  if (kind === 'zod') return deepFreeze(normalizeSchema(schema as never));
  // Detached: a wire contract must never be a live reference into the spec.
  if (kind === 'json-schema') return deepFreeze(structuredClone(schema));
  // 'parseable' — and anything unrecognized, which a hand-built spec can still
  // hold. It validates at fire() and cannot be serialized, so the sentence is
  // the whole truth about it.
  return OPAQUE_VALIDATOR;
}

/**
 * Freeze an object and every plain nested object/array (the compiled-spec
 * discipline).
 *
 * CYCLE-GUARDED, because the input is the AUTHOR's schema and a JSON Schema is
 * routinely self-referential — a tree node whose `properties.child` is the node
 * itself is the ordinary way to say "a tree". `structuredClone` above preserves
 * that cycle faithfully, so an unguarded walk blew the stack with a RangeError
 * on a schema the compiler had just accepted, and it did so inside `available()`
 * — the hot path every refused fire calls for its gap row. The `seen` set is
 * carried rather than inferred from `Object.isFrozen`: a caller may hand in a
 * shallow-frozen object whose children still need the walk.
 */
function deepFreeze<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return value; // already on this walk — the cycle stops here
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}
