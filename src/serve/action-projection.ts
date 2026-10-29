/**
 * A bounded read of the existing action-row serializer, never another action
 * space. Only one continuation is retained, and it holds counters and a
 * checksum, not rows. The checksum detects live reader changes between looks;
 * it is not authority, and invoking an action still runs every Session gate.
 */
type Row = Record<string, unknown>;

export interface ProjectionPosition {
  version: number;
  stateVersion: number;
  structureVersion: number;
  node: string;
}

interface Continuation {
  token: string;
  offset: number;
  position: ProjectionPosition;
  checksum: string;
  sinceVersion: number | undefined;
}

type Refusal = { ok: false; judgment: 'error'; reason: string; why: string } & Row;
type Prepared = { ok: true; offset: number; sinceVersion: number | undefined };

// Port-local handles are citations, not secrets. A namespace distinguishes two
// live ports even when they have each served their first page. Nothing parses
// a caller's token into an offset; only the one retained token is accepted.
let nextProjection = 0;

const MAX_CURSOR_LENGTH = 128;

function refusal(reason: string, why: string): Refusal {
  return { ok: false, judgment: 'error', reason, why };
}

function samePosition(a: ProjectionPosition, b: ProjectionPosition): boolean {
  return a.version === b.version && a.stateVersion === b.stateVersion &&
    a.structureVersion === b.structureVersion && a.node === b.node;
}

/** JSON.stringify escapes lone surrogates; paired code points use four bytes. */
function utf8Bytes(text: string): number {
  let bytes = 0;
  for (const point of text) {
    const code = point.codePointAt(0)!;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
}

/** Two independent bounded rolling checksums; no serialized snapshot retained. */
function checksum() {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  return {
    add(text: string): void {
      // A length frame distinguishes adjacent rows without a delimiter grammar.
      for (const char of `${text.length}:${text}`) {
        const code = char.codePointAt(0)!;
        first = Math.imul(first ^ code, 0x01000193) >>> 0;
        second = Math.imul(second ^ code, 0x85ebca6b) >>> 0;
      }
    },
    value: () => `${first.toString(16)}:${second.toString(16)}`,
  };
}

export function createActionProjection(option: { maxBytes: number }) {
  const maxBytes = option !== null && typeof option === 'object' ? option.maxBytes : undefined;
  if (option === null || typeof option !== 'object' || Array.isArray(option) ||
    Object.keys(option).some((key) => key !== 'maxBytes') ||
    typeof maxBytes !== 'number' || !Number.isSafeInteger(maxBytes) || maxBytes < 2) {
    throw new TypeError('hcifootprint: actionProjection needs { maxBytes }, a safe integer of at least 2: the UTF-8 JSON byte budget for the actions array only.');
  }
  const namespace = ++nextProjection;
  let sequence = 0;
  let continuation: Continuation | undefined;

  function stale(): Refusal {
    continuation = undefined;
    return refusal('ACTION_CURSOR_STALE', 'The action list changed since this continuation was served. Call whats_here without actionCursor to start a fresh read.');
  }

  return {
    /** Strict only on this opt-in door; the default port keeps its old inputs. */
    prepare(args: unknown, position: ProjectionPosition): Prepared | Refusal {
      const invalid = () => refusal('ACTION_PROJECTION_ARGUMENTS_INVALID',
        'whats_here accepts an object with optional sinceVersion (a non-negative integer no later than version), routeTo (a non-empty page id), and actionCursor (the continuation this port served).');
      if (args === undefined) args = {};
      if (args === null || typeof args !== 'object' || Array.isArray(args) ||
        (Object.getPrototypeOf(args) !== Object.prototype && Object.getPrototypeOf(args) !== null)) return invalid();
      const data = args as Row;
      if (Object.keys(data).some((key) => !['sinceVersion', 'routeTo', 'actionCursor'].includes(key)) ||
        ('sinceVersion' in data && (!Number.isSafeInteger(data.sinceVersion) ||
          (data.sinceVersion as number) < 0 || (data.sinceVersion as number) > position.version)) ||
        ('routeTo' in data && (typeof data.routeTo !== 'string' || data.routeTo.length === 0))) return invalid();
      if ('actionCursor' in data) {
        if (typeof data.actionCursor !== 'string' || data.actionCursor.length === 0 ||
          data.actionCursor.length > MAX_CURSOR_LENGTH || continuation === undefined ||
          data.actionCursor !== continuation.token) {
          return refusal('ACTION_CURSOR_INVALID', 'Use the most recent actionProjection.nextCursor from this port, or call whats_here without actionCursor to start again.');
        }
        if (!samePosition(continuation.position, position)) return stale();
        if ('sinceVersion' in data && data.sinceVersion !== continuation.sinceVersion) return invalid();
        return { ok: true, offset: continuation.offset, sinceVersion: continuation.sinceVersion };
      }
      return { ok: true, offset: 0, sinceVersion: data.sinceVersion as number | undefined };
    },

    project<T>(
      rows: readonly T[],
      render: (row: T) => Row,
      identity: (row: T) => Row,
      prepared: Prepared,
      position: ProjectionPosition,
      positionNow: () => ProjectionPosition,
      onIncluded: (row: T) => void,
    ): Row {
      const previous = prepared.offset === 0 ? undefined : continuation;
      const actions: Row[] = [];
      const digest = checksum();
      let bytes = 2; // [] belongs to the budget, as do separating commas.
      let full = false;
      let oversized: { action: unknown; requiredBytes: number } | undefined;
      function encode(input: T) {
        const row = render(input);
        try {
          const json = JSON.stringify(row);
          // The underlying availability facts matter too: for example a
          // registered action and an unknown materialization can project to
          // identical rows while a coalesced structure update is still queued.
          digest.add(JSON.stringify(identity(input)));
          // Citation rotation is bookkeeping, not a change to this action.
          // Keep its id in the measured/returned row; execution checks that
          // exact citation's standing through the Session's existing gate.
          const { offerId: _offerId, ...semanticRow } = row;
          digest.add(JSON.stringify(semanticRow));
          return { ok: true as const, row, json };
        } catch {
          return { ok: false as const, answer: {
            ...refusal('ACTION_ROW_NOT_SERIALIZABLE', 'An action row cannot be encoded as JSON. Correct its declared schema or live reader before requesting a bounded projection.'), action: row.action,
          } };
        }
      }
      for (let index = 0; index < rows.length; index += 1) {
        const encoded = encode(rows[index]!);
        if (!encoded.ok) return encoded.answer;
        const { row, json } = encoded;
        if (index < prepared.offset || full) continue;
        const size = utf8Bytes(json);
        const nextBytes = bytes + size + (actions.length > 0 ? 1 : 0);
        if (nextBytes > maxBytes) {
          full = true;
          if (actions.length === 0) oversized = { action: row.action, requiredBytes: size + 2 };
        } else {
          actions.push(row);
          bytes = nextBytes;
        }
      }
      if (!samePosition(position, positionNow()) ||
        (previous !== undefined && previous.checksum !== digest.value())) return stale();
      if (oversized !== undefined) {
        continuation = undefined;
        return {
          ...refusal('ACTION_ROW_TOO_LARGE', 'This complete action row exceeds the actions-array budget. Create a port with actionProjection.maxBytes at least requiredBytes; no fields have been removed and nothing has been performed.'),
          ...oversized,
          maxBytes,
        };
      }
      const next = prepared.offset + actions.length;
      // Serving a stale stamp is recorded by the existing serializer's owner,
      // but omitted rows and refused continuations have not been served.
      for (let index = prepared.offset; index < next; index += 1) onIncluded(rows[index]!);
      const omitted = rows.length - next;
      const nextCursor = omitted > 0 ? `actions#${namespace}:${++sequence}` : undefined;
      continuation = nextCursor === undefined ? undefined : {
        token: nextCursor, offset: next, position, checksum: digest.value(), sinceVersion: prepared.sinceVersion,
      };
      return {
        actions,
        actionProjection: {
          maxBytes, bytes, total: rows.length, offset: prepared.offset,
          shown: actions.length, omitted,
          ...(nextCursor === undefined ? {} : { nextCursor }),
          means: 'Only the actions array is bounded, measured as UTF-8 JSON bytes. Rows are complete and in their existing order. Other result fields are outside this budget. Continue with actionCursor: nextCursor; a changed list requires a fresh read.',
        },
      };
    },
  };
}
