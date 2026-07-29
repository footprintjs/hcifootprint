/**
 * The structural shape check behind PAYLOAD_INVALID for a plain JSON Schema.
 *
 * A declared input schema reached the model but never guarded the door: fire()
 * duck-typed `.safeParse`/`.parse` and let a plain JSON-Schema object through
 * unconditionally, so a planner that guessed `{name}` where the handler read
 * `{value}` was refused nowhere — the handler destructured undefined and the
 * app moved on with a hole in it. That is the null-dress regression's upstream
 * cause (test/undefined-semantics.test.ts records what it cost downstream),
 * and Mode B's published contract already promised the opposite: "A wrong
 * input returns a structured error RESULT carrying what was expected"
 * (src/serve/modes.ts:20-24).
 *
 * SCOPE: teachable, not complete. This is NOT a JSON-Schema validator and must
 * never be described as one. It judges the handful of defects a planner
 * actually commits — wrong key, missing key, wrong primitive type — and
 * DECLINES TO JUDGE everything else. Declining is the guardUnevaluated stance
 * the whole library takes (session.ts #evalGuard): what cannot be evaluated is
 * never reported as false, because a wrong REJECTION is worse than a miss — it
 * blocks an action the app would have accepted, and the caller has no appeal.
 *
 * VALUES NEVER APPEAR IN A MESSAGE. Every string built here is made of KEY
 * NAMES and TYPE NAMES only. `issues` rides the result channel to the model and
 * into the gap ledger, and payload values are runtime data (some of them under
 * keys the session redacts) — a shape teaches the correction; the value would
 * only leak.
 */

type JsonObject = Record<string, unknown>;

export type ShapeCheck = { ok: true } | { ok: false; issues: string };

/** One cap for every key list a message can carry — a rejection teaches, it does not dump. */
const MAX_LISTED_KEYS = 10;

/**
 * How many levels of object nesting this checker walks: the payload itself and
 * one level inside it. Deeper shapes are the app's own business — a planner's
 * mistakes cluster at the top, and each level walked is another level of
 * schema vocabulary this subset could misread.
 */
const MAX_DEPTH = 2;

/**
 * Keywords whose meaning this checker does not implement. A schema level
 * carrying one is not judged AT ALL: `$ref` puts the real shape somewhere else,
 * allOf/anyOf/oneOf mean a sibling `type` may describe just ONE branch of
 * several, and enum/format/pattern constrain values a shape check never sees.
 * Judging only the part we understand would refuse payloads the author's full
 * schema accepts.
 */
const UNJUDGED_KEYWORDS = ['$ref', 'allOf', 'anyOf', 'oneOf', 'enum', 'format', 'pattern'] as const;

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A value's runtime type in JSON Schema's vocabulary — the word a message uses. */
function typeName(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function declinesToJudge(schema: JsonObject): boolean {
  return UNJUDGED_KEYWORDS.some((keyword) => schema[keyword] !== undefined);
}

function requiredKeys(schema: JsonObject): string[] {
  const required = schema['required'];
  return Array.isArray(required) ? required.filter((key): key is string => typeof key === 'string') : [];
}

/**
 * The declared properties as a Map — own enumerable entries only. A Map rather
 * than the raw object because payload keys are UNTRUSTED input: `'toString' in
 * properties` would answer true for every schema ever written.
 */
function declaredProperties(schema: JsonObject): Map<string, unknown> {
  const properties = schema['properties'];
  return new Map(isPlainObject(properties) ? Object.entries(properties) : []);
}

/**
 * The payload's own keys, with undefined-valued ones dropped. The session
 * treats undefined as ABSENT everywhere else — updateState drops undefined
 * reports, a guard key holding undefined is unevaluable — and a handler
 * destructuring `{value: undefined}` reads exactly what it reads from a key
 * that was never sent. So a required key holding undefined is missing, and an
 * extra key holding undefined is not an extra key.
 */
function givenEntries(payload: JsonObject): Map<string, unknown> {
  return new Map(Object.entries(payload).filter(([, value]) => value !== undefined));
}

/** One declared primitive type against one runtime value. Unknown declarations are not judged. */
function matchesDeclaredType(declared: unknown, value: unknown): boolean {
  switch (declared) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return isPlainObject(value);
    case 'null':
      return value === null;
    default:
      // No type declared, a type union, or a token this subset does not know.
      return true;
  }
}

/**
 * The expected shape as one line: `{ value: string, note?: string }` — optional
 * keys marked with `?`.
 *
 * Deliberately FLAT: a nested object renders as `object`, not as its own
 * braces. This one string is both the teaching half of a rejection and the
 * human-readable form of what `expects` advertises, so it has to be the shape a
 * caller TYPES — the full schema already rides `expects` as data for anyone who
 * wants every keyword.
 */
export function describeExpectedShape(schema: unknown): string {
  if (!isPlainObject(schema)) return 'object';
  const properties = declaredProperties(schema);
  if (properties.size === 0) {
    return typeof schema['type'] === 'string' ? schema['type'] : 'object';
  }
  const required = new Set(requiredKeys(schema));
  const fields = [...properties].map(([name, property]) => {
    const declared = isPlainObject(property) && typeof property['type'] === 'string' ? property['type'] : 'any';
    return `${name}${required.has(name) ? '' : '?'}: ${declared}`;
  });
  return `{ ${fields.join(', ')} }`;
}

/**
 * The payload as one line: `{ name: string }` — or a bare type name when it is
 * not an object at all (`received string`). Keys and types only, never values.
 * Undefined-valued keys DO show here: "you sent the key but left it empty" is
 * the most useful thing a caller can be told about that payload.
 */
export function describeReceivedShape(payload: unknown): string {
  if (!isPlainObject(payload)) return typeName(payload);
  const keys = Object.keys(payload);
  if (keys.length === 0) return '{}';
  const shown = keys.slice(0, MAX_LISTED_KEYS).map((key) => `${key}: ${typeName(payload[key])}`);
  if (keys.length > MAX_LISTED_KEYS) shown.push('…');
  return `{ ${shown.join(', ')} }`;
}

/**
 * Judge a payload against a plain JSON Schema, structurally.
 *
 * `{ ok: true }` means "nothing this checker understands is wrong" — which
 * includes every schema it declines to judge. A failure's `issues` names the
 * defects it can name, then always states both shapes, so one string teaches
 * the correction without a second round trip.
 */
export function checkJsonShape(schema: unknown, payload: unknown): ShapeCheck {
  if (!isPlainObject(schema) || declinesToJudge(schema)) return { ok: true };
  // v0 judges object payloads — the shape a planner fills in. A schema for a
  // bare string or an array declares something this checker has no opinion on.
  const declaresObject = schema['type'] === 'object' || isPlainObject(schema['properties']);
  if (!declaresObject) return { ok: true };

  const expected = describeExpectedShape(schema);
  if (!isPlainObject(payload)) {
    // No payload offered at all, and nothing required: absence is not a defect
    // — there is no key missing from it. (A payload that IS present and wrong,
    // including an explicit null, still has to answer for its shape.)
    if (payload === undefined && requiredKeys(schema).length === 0) return { ok: true };
    return { ok: false, issues: `expected ${expected}, received ${typeName(payload)}` };
  }

  const defects: string[] = [];
  collectDefects(schema, payload, '', 1, defects);
  if (defects.length === 0) return { ok: true };
  return {
    ok: false,
    issues: `${defects.join('; ')} — expected ${expected}, received ${describeReceivedShape(payload)}`,
  };
}

/**
 * Walk one level and append what is wrong with it. `path` prefixes nested keys
 * (`user.name`) so a defect names itself even though the expected/received
 * shapes at the end of the message describe the TOP level only.
 */
function collectDefects(
  schema: JsonObject,
  payload: JsonObject,
  path: string,
  depth: number,
  defects: string[],
): void {
  const properties = declaredProperties(schema);
  const given = givenEntries(payload);

  for (const key of requiredKeys(schema)) {
    if (!given.has(key)) defects.push(`missing required '${path}${key}'`);
  }

  for (const [key, value] of given) {
    const property = properties.get(key);
    if (!isPlainObject(property) || declinesToJudge(property)) continue;
    if (!matchesDeclaredType(property['type'], value)) {
      defects.push(`'${path}${key}' should be ${String(property['type'])}, not ${typeName(value)}`);
      continue; // the wrong kind of thing entirely — its insides are not this rejection's story
    }
    if (depth < MAX_DEPTH && isPlainObject(value) && isPlainObject(property['properties'])) {
      collectDefects(property, value, `${path}${key}.`, depth + 1, defects);
    }
  }

  // Unknown keys are a defect ONLY where the author closed the object. An open
  // object is JSON Schema's default and most authors never write the keyword —
  // refusing extras there would reject on a rule nobody stated.
  if (schema['additionalProperties'] === false) {
    const unexpected = [...given.keys()].filter((key) => !properties.has(key));
    if (unexpected.length > 0) {
      const shown = unexpected.slice(0, MAX_LISTED_KEYS).map((key) => `'${path}${key}'`);
      if (unexpected.length > MAX_LISTED_KEYS) shown.push('…');
      defects.push(`${unexpected.length === 1 ? 'unexpected key' : 'unexpected keys'} ${shown.join(', ')}`);
    }
  }
}
