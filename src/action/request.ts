/**
 * request — the HITL input lifecycle: a skill asks a person for a value.
 *
 * The shape was proven in production before it was a library feature: an
 * agent that needs a value it must not guess pauses, the person answers
 * through a surface that can collect that KIND, and the turn resumes. Two
 * laws came back from the field with it:
 *
 * THE OFFERED-SET LAW. The exact offered list rides the request, and an
 * answer naming anything outside it is refused — with the list in the
 * refusal — while the request STAYS OPEN, so a refused attempt costs
 * nothing and the real answer still lands. Accepting an arbitrary string
 * on resume rebuilds the invented-identifier failure on the human side of
 * the wire, where it is harder to see because a person typed it.
 *
 * ABSENCE IS ESTABLISHED, NEVER ASSUMED. A request ends by answer, by
 * decline (the person, with a reason), by withdrawal (the requester), or
 * by an explicit abandonment authority — never by inference from silence.
 * "Nobody ever answered" is a fact somebody has to establish.
 *
 * The lifecycle is a DECLARED CHART (`REQUEST_LIFECYCLE`), enforced by its
 * mover: illegal moves refuse in teaching sentences, terminals never
 * reopen, and late answers after a terminal are KEPT AND QUOTED — the same
 * settlement law transitions follow, at the human seam.
 */
import type { Principal } from '../atom/types.js';
import type {
  ActionAbandonmentAuthority,
  ActionLateSettlement,
} from './types.js';
import { snapshotDeclaration } from './declarations.js';
import { declareLifecycle, type LifecycleChart } from './lifecycle.js';
import type { KindGovernor } from './kind-governor.js';
import type { SurfaceBoard } from './surface-board.js';
import type { SurfaceDeclaration } from './channels.js';

/** One choice put in front of a person. `value` is what resumes; `label`
 *  is display. The words are display; the structured value is the record. */
export interface RequestChoice {
  readonly value: string;
  readonly label?: string;
}

export type InputRequestState =
  | 'open'
  | 'answered'
  | 'declined'
  | 'withdrawn'
  | 'abandoned';

/** The chart, published — the same table the mover enforces, tests pin,
 *  and a surface may render. */
export const REQUEST_LIFECYCLE: LifecycleChart = Object.freeze({
  name: 'input-request',
  states: ['open', 'answered', 'declined', 'withdrawn', 'abandoned'],
  terminals: ['answered', 'declined', 'withdrawn', 'abandoned'],
  edges: Object.freeze([
    { from: 'open', to: 'answered' },
    { from: 'open', to: 'declined' },
    { from: 'open', to: 'withdrawn' },
    { from: 'open', to: 'abandoned' },
  ]),
});

export interface InputRequestRef {
  readonly kind: 'input-request';
  readonly requestId: string;
}

export interface InputRequestSnapshot {
  readonly ref: InputRequestRef;
  readonly question: string;
  /** The KIND being asked for — governed like every other kind. */
  readonly of: string;
  /** Who may answer. */
  readonly from: Principal;
  readonly state: InputRequestState;
  readonly offered: readonly RequestChoice[];
  /** The surfaces that could collect this kind WHEN THE REQUEST OPENED —
   *  presentation routing, recorded for the record. A missing surface never
   *  blocks the request: prose is the honest fallback, and the miss is
   *  already counted on the board. */
  readonly surfaces: readonly SurfaceDeclaration[];
  readonly answer?: string;
  readonly declineReason?: unknown;
  readonly withdrawReason?: unknown;
  readonly authority?: ActionAbandonmentAuthority;
  /** Answers that arrived after the terminal — kept and quoted, never
   *  adopted, never reopening. Absent when none did. */
  readonly lateAnswers?: readonly ActionLateSettlement[];
}

export interface InputRequestHandle {
  readonly ref: InputRequestRef;
  snapshot(): InputRequestSnapshot;
  /** Resolves with the terminal snapshot, whichever terminal it is. */
  readonly whenSettled: Promise<InputRequestSnapshot>;
  /** THE OFFERED-SET LAW lives here: a value outside the offered list
   *  refuses, naming the list, and the request stays open — a refused
   *  attempt costs nothing and the real answer still lands. */
  answer(value: string, by: Principal): InputRequestSnapshot;
  decline(by: Principal, reason: unknown): InputRequestSnapshot;
  /** The requester taking the question back. */
  withdraw(reason: unknown): InputRequestSnapshot;
  /** Never inferred from silence — an explicit authority, exactly as a
   *  transition's abandonment is. */
  abandon(authority: ActionAbandonmentAuthority): InputRequestSnapshot;
}

interface StoredRequest {
  ref: InputRequestRef;
  question: string;
  of: string;
  from: Principal;
  state: InputRequestState;
  offered: readonly RequestChoice[];
  surfaces: readonly SurfaceDeclaration[];
  answer?: string;
  declineReason?: unknown;
  withdrawReason?: unknown;
  authority?: ActionAbandonmentAuthority;
  late?: ActionLateSettlement[];
  settle?: (snapshot: InputRequestSnapshot) => void;
}

const lifecycle = declareLifecycle(REQUEST_LIFECYCLE);

/**
 * request-desk — one composed unit owning every open and settled request.
 * The runtime composes it as a field, beside the board and the ledger.
 * @internal
 */
export class RequestDesk {
  readonly #governor: KindGovernor;
  readonly #board: SurfaceBoard;
  readonly #rows = new Map<string, StoredRequest>();
  #sequence = 0;

  constructor(governor: KindGovernor, board: SurfaceBoard) {
    this.#governor = governor;
    this.#board = board;
  }

  open(input: {
    readonly question: string;
    readonly of: string;
    readonly from: Principal;
    readonly offered: readonly (RequestChoice | string)[];
  }): InputRequestHandle {
    if (
      input === null ||
      typeof input !== 'object' ||
      typeof input.question !== 'string' ||
      input.question.trim().length === 0
    ) {
      throw new TypeError(
        'hcifootprint: requestInput() needs a non-empty question — the person answering deserves to know what they are answering.',
      );
    }
    if (typeof input.of !== 'string' || input.of.trim().length === 0) {
      throw new TypeError(
        'hcifootprint: requestInput() needs `of` — the KIND being asked for, so a surface that collects it can present the choice.',
      );
    }
    if (!Array.isArray(input.offered) || input.offered.length === 0) {
      throw new TypeError(
        'hcifootprint: requestInput() needs a non-empty offered list — a question with no offered answers is prose, not a request; say it in conversation instead.',
      );
    }
    this.#governor.govern(input.of, 'requestInput() asks for');
    const offered: RequestChoice[] = input.offered.map((choice, index) => {
      const value = typeof choice === 'string' ? choice : choice?.value;
      if (typeof value !== 'string' || value.trim().length === 0) {
        throw new TypeError(
          `hcifootprint: requestInput() offered[${String(index)}] needs a non-empty value — the value is what resumes; a label alone resumes nothing.`,
        );
      }
      return Object.freeze(
        typeof choice === 'string'
          ? { value: choice }
          : { value, ...(choice.label !== undefined ? { label: choice.label } : {}) },
      );
    });
    const seen = new Set<string>();
    for (const choice of offered) {
      if (seen.has(choice.value)) {
        throw new TypeError(
          `hcifootprint: requestInput() offers '${choice.value}' twice — one choice, one value; a duplicate makes the answer ambiguous about which was picked.`,
        );
      }
      seen.add(choice.value);
    }
    this.#sequence += 1;
    const ref: InputRequestRef = Object.freeze({
      kind: 'input-request' as const,
      requestId: `request#${String(this.#sequence)}`,
    });
    // Presentation routing, recorded at open. A miss is already a counted
    // gap on the board; the request proceeds regardless — prose is the
    // honest fallback, and blocking a question on a missing panel would
    // make governance a hostage-taker.
    const surfaces = this.#board.surfacesFor({ collects: input.of });
    const stored: StoredRequest = {
      ref,
      question: input.question,
      of: input.of,
      from: input.from,
      state: lifecycle.initial as InputRequestState,
      offered: Object.freeze(offered),
      surfaces,
    };
    this.#rows.set(ref.requestId, stored);
    const whenSettled = new Promise<InputRequestSnapshot>((resolve) => {
      stored.settle = resolve;
    });

    const finish = (
      to: InputRequestState,
      apply: (row: StoredRequest) => void,
      by?: Principal,
    ): InputRequestSnapshot => {
      lifecycle.assertMove(stored.state, to, by);
      apply(stored);
      stored.state = to;
      const snapshot = this.#snapshot(stored);
      const settle = stored.settle;
      stored.settle = undefined;
      settle?.(snapshot);
      return snapshot;
    };

    const handle: InputRequestHandle = Object.freeze({
      ref,
      whenSettled,
      snapshot: () => this.#snapshot(stored),
      answer: (value: string, by: Principal): InputRequestSnapshot => {
        if (lifecycle.isTerminal(stored.state)) {
          // FIRST TERMINAL WINS — and the loser is KEPT. A late answer is
          // quoted beside the record, never adopted, never reopening.
          (stored.late ??= []).push(
            Object.freeze({
              claimed: 'answered',
              payload: snapshotDeclaration(value),
            }),
          );
          return this.#snapshot(stored);
        }
        if (by !== stored.from) {
          throw new Error(
            `hcifootprint: request '${ref.requestId}' asks '${stored.from}' — an answer from '${by}' is not that person's answer. The asked principal answers, or the requester withdraws.`,
          );
        }
        if (!stored.offered.some((choice) => choice.value === value)) {
          // THE OFFERED-SET LAW — refuse, name the list, STAY OPEN.
          throw new Error(
            `hcifootprint: '${value}' was never offered by request '${ref.requestId}'. The offered values are: ${stored.offered.map((choice) => `'${choice.value}'`).join(', ')}. The request is still open — answer with one of those.`,
          );
        }
        return finish('answered', (row) => {
          row.answer = value;
        });
      },
      decline: (by: Principal, reason: unknown): InputRequestSnapshot => {
        if (by !== stored.from) {
          throw new Error(
            `hcifootprint: request '${ref.requestId}' asks '${stored.from}' — only they may decline it. The requester's door is withdraw().`,
          );
        }
        if (reason === undefined || reason === null || reason === '') {
          throw new TypeError(
            `hcifootprint: declining request '${ref.requestId}' needs a reason — "no, because…" is an answer the asker can act on; bare silence is not.`,
          );
        }
        return finish('declined', (row) => {
          row.declineReason = snapshotDeclaration(reason);
        });
      },
      withdraw: (reason: unknown): InputRequestSnapshot => {
        if (reason === undefined || reason === null || reason === '') {
          throw new TypeError(
            `hcifootprint: withdrawing request '${ref.requestId}' needs a reason — the person mid-decision deserves to know why the question left.`,
          );
        }
        return finish('withdrawn', (row) => {
          row.withdrawReason = snapshotDeclaration(reason);
        });
      },
      abandon: (
        authority: ActionAbandonmentAuthority,
      ): InputRequestSnapshot => {
        if (
          authority === null ||
          typeof authority !== 'object' ||
          typeof (authority as { kind?: unknown }).kind !== 'string'
        ) {
          throw new TypeError(
            `hcifootprint: abandoning request '${ref.requestId}' needs an explicit authority — silence is never established by inference; say cancelled, deadline, or evidence-gone.`,
          );
        }
        return finish('abandoned', (row) => {
          row.authority = authority;
        });
      },
    });
    return handle;
  }

  /** Every request still open, oldest first — what a surface renders. */
  openRequests(): readonly InputRequestSnapshot[] {
    return Object.freeze(
      [...this.#rows.values()]
        .filter((row) => !lifecycle.isTerminal(row.state))
        .map((row) => this.#snapshot(row)),
    );
  }

  #snapshot(row: StoredRequest): InputRequestSnapshot {
    return Object.freeze({
      ref: row.ref,
      question: row.question,
      of: row.of,
      from: row.from,
      state: row.state,
      offered: row.offered,
      surfaces: row.surfaces,
      ...(row.answer !== undefined ? { answer: row.answer } : {}),
      ...(row.declineReason !== undefined
        ? { declineReason: row.declineReason }
        : {}),
      ...(row.withdrawReason !== undefined
        ? { withdrawReason: row.withdrawReason }
        : {}),
      ...(row.authority !== undefined ? { authority: row.authority } : {}),
      ...(row.late !== undefined && row.late.length > 0
        ? { lateAnswers: Object.freeze([...row.late]) }
        : {}),
    });
  }
}
