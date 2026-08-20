/**
 * THE ACKNOWLEDGEMENT LEDGER — the receipts a caller wrote, the index the gate
 * reads them through, and a bound that is answerable.
 *
 * `acknowledgeStale` records that a caller performed a protocol step. The gate
 * (`judgeAcknowledgement`, freshness.ts) reads one row by id on the hot path of
 * the one loop a model actually drives — refused → acknowledge → refire — and
 * `session.acknowledgements()` reads the whole trail, oldest first. Two questions,
 * one structure: an insertion-ordered map is both the index and the order the
 * acts happened in.
 *
 * WHY BOUNDED, when the row is a receipt. That loop writes one row per turn, so
 * a long-lived session's receipt trail grows without limit and nothing said so.
 * "Unbounded" is not a property a library gets to have quietly: either the growth
 * is stated or the bound is. This file states the bound, and then owes the same
 * three things the offer ledger one file over owes for its own cap — evictions
 * COUNTED (`session.acknowledgementsDropped()`), the integrator WARNED once, and
 * a citation this session dropped answered as `'evicted'` rather than as an id
 * nobody ever minted.
 *
 * THAT LAST ONE IS THE POINT. A caller who acknowledged, then cited the id we
 * handed back, and is told the pointer is no good has been blamed for this
 * library's own limit. `standing()` is what makes the honest sentence available:
 * an id of this session's own shape, at or below its own counter, is a row we
 * WROTE and DROPPED — never one that never existed.
 *
 * WHAT THE BOUND DOES NOT DO. It never edits a row, never retracts one, and
 * never changes what a retained row says. A row the world has moved past stays
 * on the ledger as what it always was and stops AUTHORIZING; that is a different
 * mechanism (`acknowledgedAtStateVersion`) and this cap does not touch it.
 *
 * AND THE WARNING IS SAID TO EVERYONE, which is where this ledger parts company
 * with the offer ledger's addressed one. That cap fills from a READ path, so a
 * session that opted into nothing can hit it without ever having called
 * anything — warning there would tell an integrator to tune a mechanism they
 * never switched on. Nothing enters this ledger except through an explicit
 * `acknowledgeStale` call, so a session that fills it made five hundred calls of
 * its own, and being told that its own receipts have started dropping is a fact
 * about a door it used rather than noise about one it did not.
 *
 * WHY A PURE MODULE. Same reason as offers.ts: the eviction order, the
 * warn-once latch and the evicted-vs-unknown split are each one line to break
 * and hard to see broken from inside a 7,000-line session. Here each is a
 * three-line test.
 */
import type { StaleAcknowledgement } from "../atom/types.js";

/** How many receipts a session keeps before dropping the oldest. */
export const DEFAULT_MAX_ACKNOWLEDGEMENTS = 500;

/** Everything a receipt holds except the id this ledger mints for it. */
export type AcknowledgementFacts = Omit<
  StaleAcknowledgement,
  "acknowledgementId"
>;

/**
 * What this session can say about an acknowledgement id it was handed.
 *
 * `'evicted'` and `'unknown'` are kept apart deliberately, exactly as they are
 * for an offer: collapsing them would let a full ledger report a caller's honest
 * citation of its own receipt as a made-up one.
 */
export type AcknowledgementStanding = "retained" | "evicted" | "unknown";

/** `ack#7` — a session-local counter, so standing can be answered for a dropped id. */
const ID_SHAPE = /^ack#(\d+)$/;

/**
 * Said ONCE, to the integrator: this session's receipt trail is now dropping its
 * oldest rows. Nothing is broken and nothing was rewritten — but a cited receipt
 * can now be gone, and `session.acknowledgements()` no longer holds the whole
 * history it looks like it holds.
 */
export function ackLedgerFullWarning(max: number): string {
  return (
    `hcifootprint: the acknowledgement ledger is full (${max} receipts) and the oldest are being dropped. ` +
    `A fire citing a dropped acknowledgement is refused ACKNOWLEDGEMENT_REQUIRED with why:'evicted', and ` +
    `session.acknowledgements() no longer lists the dropped rows. ` +
    `Raise SessionOptions.maxAcknowledgements if your sessions perform more steps than that.`
  );
}

export class AcknowledgementLedger {
  /** id → row. Insertion-ordered, so this map IS the trail as well as the index. */
  readonly #byId = new Map<string, StaleAcknowledgement>();
  readonly #max: number;
  readonly #warn: (message: string) => void;
  #minted = 0;
  #dropped = 0;
  #warnedFull = false;

  constructor(opts: { max?: number; warn: (message: string) => void }) {
    // A floor of one, for the offer ledger's reason: a ledger that retains
    // nothing is not a smaller ledger, it is a mechanism that silently never
    // works — every receipt would expire the instant it was written.
    this.#max = Math.max(1, opts.max ?? DEFAULT_MAX_ACKNOWLEDGEMENTS);
    this.#warn = opts.warn;
  }

  /**
   * Write a receipt and hand back the row, id and all.
   *
   * Every call is a new row. Unlike an offer — which is minted from its FACTS,
   * so re-serving an unchanged world reuses one id — an acknowledgement is an
   * ACT, and two acts at one state version are two things somebody did.
   */
  append(facts: AcknowledgementFacts): StaleAcknowledgement {
    this.#minted += 1;
    const row: StaleAcknowledgement = {
      acknowledgementId: `ack#${this.#minted}`,
      ...facts,
      // Detached at the door: a caller mutating the array it passed must not be
      // able to widen what its own receipt says it covered.
      keys: [...facts.keys],
    };
    this.#byId.set(row.acknowledgementId, row);
    this.#evictToCap();
    return copyOf(row);
  }

  /** One receipt by id, as a copy, or nothing — a lookup, never a verdict. */
  get(acknowledgementId: string): StaleAcknowledgement | undefined {
    const row = this.#byId.get(acknowledgementId);
    return row === undefined ? undefined : copyOf(row);
  }

  /** Every retained receipt, oldest first, as copies. */
  all(): StaleAcknowledgement[] {
    return [...this.#byId.values()].map(copyOf);
  }

  /** How many receipts this session has dropped to stay inside its cap. */
  get dropped(): number {
    return this.#dropped;
  }

  /** The retention window, counted — see {@link LedgerRetention} in offers.ts. */
  retention(): import("./offers.js").LedgerRetention {
    const ids = [...this.#byId.keys()];
    return {
      minted: this.#minted,
      dropped: this.#dropped,
      ...(ids.length > 0 && {
        firstRetained: ids[0],
        lastRetained: ids[ids.length - 1],
      }),
    };
  }

  /**
   * What became of an id. Retained, dropped by the cap, or never written here —
   * answered from the id's own shape and this session's counter, so a caller is
   * never told "no such thing" about a receipt this session really did write.
   */
  standing(acknowledgementId: string): AcknowledgementStanding {
    if (this.#byId.has(acknowledgementId)) return "retained";
    const parsed = ID_SHAPE.exec(acknowledgementId);
    if (parsed === null) return "unknown";
    const nth = Number(parsed[1]);
    return nth >= 1 && nth <= this.#minted ? "evicted" : "unknown";
  }

  /** Oldest out first — insertion order IS the order the acts happened. */
  #evictToCap(): void {
    while (this.#byId.size > this.#max) {
      // Defined here: the loop only runs while the map holds more entries than a
      // cap this class refuses to set below 1.
      const oldest = this.#byId.keys().next().value as string;
      this.#byId.delete(oldest);
      this.#dropped += 1;
    }
    // COUNTED ALWAYS, SAID ONCE. The count is the fact; the sentence is the
    // courtesy, and repeating it every turn of a loop that writes one row per
    // turn would be the library shouting over its own protocol.
    if (this.#dropped > 0 && !this.#warnedFull) {
      this.#warnedFull = true;
      this.#warn(ackLedgerFullWarning(this.#max));
    }
  }
}

function copyOf(row: StaleAcknowledgement): StaleAcknowledgement {
  return { ...row, keys: [...row.keys] };
}
