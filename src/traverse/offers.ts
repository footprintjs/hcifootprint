/**
 * THE OFFER LEDGER — a name for the row that was served, and the record it
 * points at.
 *
 * `available()` used to hand back a version and `fire()` used to take an
 * `expectedVersion` the caller typed in by hand. Nothing tied a fire to the ROW
 * it was planned against, so the library could not answer the one question every
 * freshness rule rests on: *what was true when you were offered this?* An
 * `offerId` on the row and a citation on the fire closes exactly that gap, and
 * nothing else — see {@link OfferRef} for what a citation is NOT.
 *
 * THE IDENTITY RULE, and it is the whole design: an offer's id is minted from
 * the FACTS, so serving the same action again under an unchanged world hands
 * back the same id. Two records can therefore never disagree about one id, and
 * one id can never quietly come to mean something else — which is what makes the
 * record append-only in practice and not just in intent. It also keeps the
 * ledger quiet: a session that looks ten times without the world moving mints
 * one offer per action, not ten.
 *
 * WHY BOUNDED. This is written from a READ path — `available()` runs on every
 * look, on every served reply, and on every refused fire's gap row. An unbounded
 * map fed from a read path is a leak with a friendly name. So the ledger has a
 * cap and drops the oldest, and because that means a citation can expire, every
 * consequence of the bound is said out loud rather than absorbed: evictions are
 * COUNTED, the first one WARNS the integrator, and a fire citing a dropped id is
 * refused as `'evicted'` — never as an id that never existed, and never answered
 * as though the citation had been checked.
 *
 * AND THE WARNING IS ADDRESSED, not broadcast. Every session fills this ledger,
 * enforcing or not, because every served row carries its offer. But a dropped
 * citation only ever COSTS anybody something where a citation is required, so
 * that is the one place the warning is said — see `citationsRequired` below. A
 * session that opted into nothing keeps counting evictions in silence, because
 * telling an integrator to tune a mechanism they never switched on, about a
 * refusal that cannot reach them, is enforcement noise arriving unrequested.
 *
 * WHY A PURE MODULE. The identity rule, the eviction order and the
 * evicted-vs-unknown split are each one line to break and hard to see broken
 * from inside a 6,000-line session. Here every one of them is a three-line test.
 */
import type { OfferRecord, OfferRef } from '../atom/types.js';

/** How many records a session keeps before dropping the oldest. */
export const DEFAULT_MAX_OFFERS = 500;

/** Everything a record holds except the id and the timestamp the ledger stamps. */
export interface OfferFacts {
  actionId: string;
  node: string;
  version: number;
  stateVersion: number;
  structureVersion: number;
  guardEvaluated: string[];
  guardUnevaluated: string[];
  staleReads: string[];
  staleWrites: string[];
}

/**
 * What this session can say about an id it was handed.
 *
 * `'evicted'` and `'unknown'` are kept apart deliberately: collapsing them would
 * let a full ledger report a caller's honest citation as a forged one, which is
 * the library blaming a caller for its own bound.
 */
export type OfferStanding = 'retained' | 'evicted' | 'unknown';

/** `offer#7` — a session-local counter, so standing can be answered for a dropped id. */
const ID_SHAPE = /^offer#(\d+)$/;

/**
 * Said ONCE, to the integrator of an ENFORCING session, never to the model: the
 * ledger is full and citations have started expiring. Raising `maxOffers` is the
 * whole fix.
 */
export function ledgerFullWarning(max: number): string {
  return (
    `hcifootprint: the offer ledger is full (${max} records) and the oldest are being dropped. ` +
    `A fire citing a dropped offer is refused OFFER_NOT_ON_RECORD with why:'evicted'. ` +
    `Raise SessionOptions.maxOffers if your sessions plan over more rows than that.`
  );
}

export class OfferLedger {
  readonly #byId = new Map<string, OfferRecord>();
  /** facts → the id already minted for them (the identity rule). */
  readonly #byFacts = new Map<string, string>();
  /** id → its facts key, so eviction can drop both halves together. */
  readonly #factsOf = new Map<string, string>();
  readonly #max: number;
  readonly #now: () => number;
  readonly #warn: (message: string) => void;
  readonly #citationsRequired: () => boolean;
  #minted = 0;
  #dropped = 0;
  #warnedFull = false;

  constructor(opts: {
    max?: number;
    now: () => number;
    warn: (message: string) => void;
    /**
     * CAN A DROPPED CITATION COST ANYBODY ANYTHING HERE?
     *
     * Asked at eviction time rather than answered at construction, because the
     * answer can turn on later: a mount-declared action may bring a freshness
     * policy with it long after this ledger was built. It only ever turns ON,
     * so a session that starts enforcing gets the warning it is owed.
     */
    citationsRequired: () => boolean;
  }) {
    // A floor of one, so a `maxOffers: 0` cannot make every citation expire the
    // instant it is minted — a ledger that retains nothing is not a smaller
    // ledger, it is a mechanism that silently never works.
    this.#max = Math.max(1, opts.max ?? DEFAULT_MAX_OFFERS);
    this.#now = opts.now;
    this.#warn = opts.warn;
    this.#citationsRequired = opts.citationsRequired;
  }

  /**
   * The offer for these facts — the one already on record, or a new one.
   *
   * A re-serve returns the FIRST record untouched, `servedAt` and all: a record
   * taken at rest is never rewritten, and the fact that this row is being shown
   * again is not a new fact about what was true.
   */
  mint(facts: OfferFacts): OfferRef {
    const key = factsKey(facts);
    const already = this.#byFacts.get(key);
    if (already !== undefined) return refOf(this.#byId.get(already) as OfferRecord);
    this.#minted += 1;
    const record: OfferRecord = {
      offerId: `offer#${this.#minted}`,
      actionId: facts.actionId,
      node: facts.node,
      stateVersion: facts.stateVersion,
      structureVersion: facts.structureVersion,
      servedAt: this.#now(),
      version: facts.version,
      guardEvaluated: [...facts.guardEvaluated],
      guardUnevaluated: [...facts.guardUnevaluated],
      staleReads: [...facts.staleReads],
      staleWrites: [...facts.staleWrites],
    };
    this.#byId.set(record.offerId, record);
    this.#byFacts.set(key, record.offerId);
    this.#factsOf.set(record.offerId, key);
    this.#evictToCap();
    return refOf(record);
  }

  /** The record, as a copy — a caller sorting its key lists must not reach the ledger. */
  get(offerId: string): OfferRecord | undefined {
    const record = this.#byId.get(offerId);
    return record === undefined ? undefined : copyOf(record);
  }

  /** Every retained record, oldest first, as copies. */
  all(): OfferRecord[] {
    return [...this.#byId.values()].map(copyOf);
  }

  /** How many records this session has dropped to stay inside its cap. */
  get dropped(): number {
    return this.#dropped;
  }

  /**
   * What became of an id. Retained, dropped by the cap, or never minted here —
   * answered from the id's own shape and this session's counter, so a caller is
   * never told "no such thing" about a citation this session really did write.
   */
  standing(offerId: string): OfferStanding {
    if (this.#byId.has(offerId)) return 'retained';
    const parsed = ID_SHAPE.exec(offerId);
    if (parsed === null) return 'unknown';
    const nth = Number(parsed[1]);
    return nth >= 1 && nth <= this.#minted ? 'evicted' : 'unknown';
  }

  /** Oldest out first — insertion order IS serve order, so nothing has to be sorted. */
  #evictToCap(): void {
    while (this.#byId.size > this.#max) {
      // Map iteration is insertion-ordered, so the first key is the oldest
      // record. `.next().value` is defined here because the loop only runs while
      // the map holds more entries than a cap this class refuses to set below 1.
      const oldest = this.#byId.keys().next().value as string;
      this.#byId.delete(oldest);
      const key = this.#factsOf.get(oldest) as string;
      this.#factsOf.delete(oldest);
      // Dropped WITH its facts entry: leaving the index behind would hand a
      // later serve an id whose record is gone — a citation this session could
      // neither answer nor honestly call evicted.
      this.#byFacts.delete(key);
      this.#dropped += 1;
    }
    // COUNTED ALWAYS, SAID ONLY WHERE IT LANDS. `#warnedFull` is set only when
    // the sentence actually goes out, so a session that starts requiring
    // citations later still hears about a ledger that filled up before it did.
    if (this.#dropped > 0 && !this.#warnedFull && this.#citationsRequired()) {
      this.#warnedFull = true;
      this.#warn(ledgerFullWarning(this.#max));
    }
  }
}

/** The five fields that ride a served row. */
function refOf(record: OfferRecord): OfferRef {
  return {
    offerId: record.offerId,
    actionId: record.actionId,
    node: record.node,
    stateVersion: record.stateVersion,
    structureVersion: record.structureVersion,
  };
}

function copyOf(record: OfferRecord): OfferRecord {
  return {
    ...record,
    guardEvaluated: [...record.guardEvaluated],
    guardUnevaluated: [...record.guardUnevaluated],
    staleReads: [...record.staleReads],
    staleWrites: [...record.staleWrites],
  };
}

/**
 * THE IDENTITY OF ONE OFFER — every fact the record holds, and nothing else.
 *
 * TWO FIELDS ARE DELIBERATELY ABSENT, and both absences are load-bearing.
 *
 * `servedAt` — a clock is not a fact about the world, and including it would
 * mint a fresh offer on every look, which is precisely the unbounded growth this
 * key exists to prevent.
 *
 * `version` — the cursor moves on every fire, sync and frame change, most of
 * which commit nothing. Including it would mint a full set of new offers after
 * every fire and evict a working session's citations for no gain, because the
 * retained (older) anchor names the SAME keys: no state key can be committed
 * without `stateVersion` moving, and a moved `stateVersion` is already a
 * different offer. So the anchor a reused offer carries is its first serve's,
 * and the window it opens is identical to the one a re-mint would have opened.
 *
 * RENDERED WITH `JSON.stringify`, not by joining. A joined string is
 * collision-free only if no field can contain the separator, and nothing
 * validates the characters in a state key or a page id. The FIELD separator was
 * U+0000, which no authored identifier realistically carries — but each key LIST
 * was joined on `','` first, and a state key may contain a comma, so
 * `guardEvaluated: ['a,b']` and `['a', 'b']` rendered to one string. Two
 * different fact sets, one id, in the file whose whole design rests on that being
 * impossible. Quoting and escaping are the language's job, and they have no
 * exceptions — so the claim is now the code's rather than the comment's.
 */
function factsKey(facts: OfferFacts): string {
  return JSON.stringify([
    facts.actionId,
    facts.node,
    facts.stateVersion,
    facts.structureVersion,
    facts.guardEvaluated,
    facts.guardUnevaluated,
    facts.staleReads,
    facts.staleWrites,
  ]);
}
