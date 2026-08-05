/**
 * THE GATE — does a recorded human decision authorize this fire?
 *
 * What it replaces. `confirm: true` was the AGENT asserting that a human
 * approved: a boolean in the model's own tool arguments (serve/modes.ts
 * STEP_INPUT_SCHEMA), tied to no recorded decision. A model that skipped the ask
 * entirely was indistinguishable from one that got a yes — and on the first
 * call, with nothing open, it executed and the journal stayed EMPTY. So the
 * proof here is never a boolean the caller controls. It is a POINTER to a row a
 * human-side door wrote, and this function is the only thing that reads it.
 *
 * WHY A PURE FUNCTION with the world passed in. The verdict has ten branches and
 * each one is an attack somebody will try. Taking the open asks, the row lookup
 * and the standing grants as arguments means every branch gets a test with no
 * session, no graph and no clock — so each mutation proof is a three-line test
 * instead of a fixture. The session keeps the state; this file keeps the law.
 *
 * FAIL-CLOSED EVERYWHERE. Every unreachable-looking case returns a refusal, not
 * an allow: an unknown pointer, an unanswered ask, a row written by the wrong
 * principal, an input we cannot compare. The gate never guesses in the
 * permissive direction, because the mistake it would be making is the one that
 * cannot be taken back.
 */
import type { Cause, ConfirmRecord, Principal } from '../atom/types.js';
import { sameInput } from './same-input.js';

/**
 * One ask the session is holding — the card a human is looking at, or has
 * answered. ONE structure for both modes on purpose: a second structure would be
 * a second path through the gate, and a second path is an escape.
 */
export interface OpenAsk {
  askId: string;
  affordanceId: string;
  /**
   * The action's authored `does`, frozen when the card was assembled — the
   * capture law from {@link Cause.does}, applied to the one row that is
   * DESIGNED to outlive the moment it was made. Nothing in this file reads it:
   * the gate judges pointers, principals and inputs, never words. It rides here
   * so the session's own renders can name the card after the control that
   * raised it has unmounted. Absent when the ask names an id the graph did not
   * have — the same presence-only fact everywhere else.
   */
  does?: string;
  /** What the card said this fire would send — already normalized. */
  input: unknown;
  /** Which row/instance the card was about, when the action takes one. */
  instance?: string;
  /** The cursor version when the ask was assembled. */
  askedAtVersion: number;
  /** The STATE version when the ask was assembled (the "has the world moved" anchor). */
  askedAtStateVersion: number;
  askedAt: number;
  /** Absent means still open — nobody has answered yet. */
  answer?: 'approved' | 'declined';
  answeredAt?: number;
  /** Who answered, as the human-side door recorded them. */
  answeredBy?: string;
  /** True once a fire has spent this approval. One yes authorizes one fire. */
  spent?: boolean;
  /**
   * True once the person WITHDREW their yes ({@link Session.revokeAsk}) before
   * anything spent it. The answer above stays `'approved'` — the receipt taken
   * at rest is never rewritten — and this marker is what the gate reads to
   * refuse a fire that presents the withdrawn pointer. Never true beside
   * `spent`: a spent yes has already happened, and revoking cannot un-fire it.
   */
  revoked?: true;
}

/** How strict the session is about a yes given a while ago, or in an older world. */
export interface HumanApprovalRules {
  expiresAfterMs?: number;
  refuseWhenWorldMoved?: boolean;
}

/** Why the gate refused. Each one has an authored teaching sentence at the port. */
export type ApprovalRefusal =
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_SPENT'
  | 'APPROVAL_MISMATCH'
  | 'APPROVAL_STALE'
  | 'APPROVAL_DECLINED'
  | 'APPROVAL_REVOKED';

/** WHICH part of what the human was shown does not match this fire. */
export type ApprovalDiffers = 'action' | 'input' | 'instance' | 'both' | 'cannot-judge';

export type ApprovalVerdict =
  | { ok: true; via: 'approved' | 'always-approved'; askId: string }
  | { ok: false; reason: 'APPROVAL_REQUIRED'; askId?: string }
  | { ok: false; reason: 'APPROVAL_SPENT'; askId: string }
  | { ok: false; reason: 'APPROVAL_MISMATCH'; askId: string; differs: ApprovalDiffers }
  | { ok: false; reason: 'APPROVAL_STALE'; askId: string }
  | { ok: false; reason: 'APPROVAL_DECLINED'; askId: string }
  | { ok: false; reason: 'APPROVAL_REVOKED'; askId: string };

export interface ApprovalQuestion {
  /** The pointer the fire presented. Absent is the bare `confirm: true` case. */
  askId?: string;
  affordanceId: string;
  instance?: string;
  /** The fire's payload, already through `normalizeInput`. */
  input: unknown;
  openAsks: ReadonlyMap<string, OpenAsk>;
  /**
   * The journal row that recorded the answer, by askId. The gate reads the ROW
   * and not just the ask entry: the entry is our own bookkeeping, while the row
   * is the thing an auditor exports — and the principal that must be 'user'
   * lives on the row.
   */
  rowFor: (askId: string) => ConfirmRecord | undefined;
  /**
   * Standing ALWAYS ALLOW grants that have NOT been revoked. Revocation is
   * applied by the caller because the journal is the authority on it; scope and
   * expiry are applied here because they are the law, not bookkeeping.
   */
  standingGrants: ReadonlyArray<ConfirmRecord>;
  /** The session's current state version — the "has the world moved" reading. */
  stateVersion: number;
  now: number;
  rules: HumanApprovalRules;
}

/** Only the human-side door writes these. An 'ask' row's principal proves nothing. */
const APPROVING_KINDS: ReadonlyArray<ConfirmRecord['kind']> = ['approved', 'always-approved'];

/** The one principal a recorded approval may carry. Not a default — a requirement. */
const HUMAN: Principal = 'user';

export function checkApproval(question: ApprovalQuestion): ApprovalVerdict {
  const { askId, affordanceId, openAsks, rowFor, now, rules } = question;
  const presented = askId === undefined ? undefined : openAsks.get(askId);

  // 1. A HUMAN NO IS TERMINAL, and it outranks every other authority — including
  //    a standing grant. Otherwise Decline on the card would do nothing while a
  //    grant was live, which would make the button a lie. The askId stays
  //    refusable for the session's life: nothing here ever deletes a decision.
  //
  //    Read from the ASK BOOK, not only from the pointer the caller chose to
  //    present. A decline you can walk around by DROPPING the pointer is not
  //    terminal, it is optional — and the caller that wants to walk around it is
  //    the one this gate exists for. So the question is asked of the state, and
  //    the caller's pointer only decides which askId the refusal names.
  //
  //    SCOPED to this action, instance and input — that is what the person was
  //    shown, and the sentence above is true of exactly that. A standing grant is
  //    deliberately NOT input-bound ("any item, for the next hour" —
  //    Session.alwaysApprove), so a LATER, DIFFERENT input is authorized by the
  //    grant the human gave and not by the one thing they refused.
  const declined = presented?.answer === 'declined' ? presented : lastNoAbout(question);
  if (declined !== undefined) {
    return { ok: false, reason: 'APPROVAL_DECLINED', askId: declined.askId };
  }

  // 2. A standing ALWAYS ALLOW authorizes on its own — that is what durable
  //    means, and the human was told so in those words ("any item, for the next
  //    hour"). Checked before the pointer arithmetic below so a grant added
  //    after an ask was minted still authorizes the fire that ask was for.
  const grant = liveGrant(question);
  if (grant.ok) return { ok: true, via: 'always-approved', askId: grant.askId };

  // 3. A bare `confirm: true` — the reported forgery, and the whole point. No
  //    pointer, no proof. (An expired grant is the more specific truth when the
  //    human really did say always-yes and it ran out.)
  if (askId === undefined) {
    return grant.expiredAskId !== undefined
      ? { ok: false, reason: 'APPROVAL_STALE', askId: grant.expiredAskId }
      : { ok: false, reason: 'APPROVAL_REQUIRED' };
  }
  // 4. A pointer this session is not holding: a guess, a stale id, or an askId
  //    minted in ANOTHER session (ask ids are per-session counters, so two
  //    sessions both mint 'ask#1'). It resolves to nothing here, so it proves
  //    nothing here.
  if (presented === undefined) return { ok: false, reason: 'APPROVAL_REQUIRED', askId };

  // 5. An approval for Add to cart, presented on a fire of Place the order. The
  //    human approved a different ACTION, so `differs` says which join failed —
  //    'action' rather than APPROVAL_REQUIRED, because "no human has approved
  //    this" would hide the real bug: the caller presented the wrong pointer.
  if (presented.affordanceId !== affordanceId) {
    return { ok: false, reason: 'APPROVAL_MISMATCH', askId, differs: 'action' };
  }
  // 6. The card is on screen and nobody has answered it. THE REPORTED FORM: an
  //    ask landed, the agent said confirm, no human ever decided.
  if (presented.answer !== 'approved') return { ok: false, reason: 'APPROVAL_REQUIRED', askId };

  // 7. The ROW, not our entry — and its principal must be the human's. An agent
  //    with in-process reach can already mint an 'ask' row with
  //    `principal: 'user'` (confirmAsk takes a source), so only a row of an
  //    APPROVING kind, from a door that has no principal argument to lie with,
  //    counts here.
  const row = rowFor(askId);
  if (row === undefined || !APPROVING_KINDS.includes(row.kind) || row.principal !== HUMAN) {
    return { ok: false, reason: 'APPROVAL_REQUIRED', askId };
  }

  // 8. ONE YES, ONE FIRE. A second fire under a spent approval is a replay, and
  //    it refuses even though a genuine human approval exists — because it was
  //    for the action that already happened.
  if (presented.spent === true) return { ok: false, reason: 'APPROVAL_SPENT', askId };

  // 8b. THE PERSON TOOK THE YES BACK before anything spent it. The answer on
  //     the card is still 'approved' — a receipt taken at rest is never
  //     rewritten — but a withdrawn yes authorizes nothing, and the refusal
  //     says WITHDRAWN rather than the blank "nobody approved this" so the
  //     caller learns the person changed their mind. Checked before staleness:
  //     a decision-fact outranks a policy-fact, and a withdrawn yes must not be
  //     reported as merely old. (Never reachable beside `spent`: revokeAsk
  //     refuses a spent card, so the two marks are mutually exclusive by
  //     construction.)
  if (presented.revoked === true) return { ok: false, reason: 'APPROVAL_REVOKED', askId };

  // 9. A yes from a world that has moved on. Both rules default OFF: whether an
  //    old yes still counts is a product decision, and the library records the
  //    stamps always while enforcing only when asked.
  if (stale(row, presented, question)) return { ok: false, reason: 'APPROVAL_STALE', askId };

  // 10. THE APPROVAL BINDS TO THE RECEIPTS. The human approved the action AND
  //     the input on the card. A fire under this askId carrying something else
  //     is refused, or ask-to-do-A is a laundering token for doing-B.
  const differs = whatDiffers(presented, question);
  if (differs !== undefined) return { ok: false, reason: 'APPROVAL_MISMATCH', askId, differs };

  return { ok: true, via: 'approved', askId };
}

/**
 * The human's NO about this exact thing, if their last word on it was no.
 *
 * LAST WORD, not "any no ever": decline → re-ask → approve is the flow the docs
 * promise ("a re-ask after a no mints a NEW askId"), and a no that outlived a
 * later yes would break the person's own second decision. Ties break toward the
 * later entry — the ask book is in mint order, so the newer card is the more
 * recent conversation with the person.
 */
function lastNoAbout(question: ApprovalQuestion): OpenAsk | undefined {
  let latest: OpenAsk | undefined;
  for (const ask of question.openAsks.values()) {
    // An unanswered card is not a decision, and a RELAYED decline never sets an
    // answer (session.declineConfirm records a report) — so an agent cannot
    // manufacture the refusal that closes its own future fires either.
    if (ask.answer === undefined) continue;
    if (ask.affordanceId !== question.affordanceId) continue;
    if ((ask.instance ?? undefined) !== (question.instance ?? undefined)) continue;
    // 'different' is the ONLY answer that clears this fire of that decision. An
    // input we cannot judge stays covered by it: we cannot prove this is not the
    // thing the person refused, and the gate never guesses in the permissive
    // direction (same-input.ts, THE ASYMMETRY).
    if (sameInput(question.input, ask.input) === 'different') continue;
    /* v8 ignore next -- both `?? 0` arms are unreachable: #answerAsk is the only writer of `answer`, and it stamps `answeredAt` in the same breath, so every ask that survives the `answer === undefined` skip above carries a timestamp. (The tie-break the line makes IS exercised — "the person answered twice, and not in the order the cards were made" in human-approval.test.ts — but v8 cannot exempt part of a line.) */
    if (latest === undefined || (ask.answeredAt ?? 0) >= (latest.answeredAt ?? 0)) latest = ask;
  }
  return latest?.answer === 'declined' ? latest : undefined;
}

/**
 * A live standing grant covering this action (and instance), if there is one.
 * Reports an EXPIRED grant separately so the refusal can say "it ran out"
 * instead of "nobody ever approved this" — a different move for the caller.
 */
function liveGrant(question: ApprovalQuestion): { ok: true; askId: string } | { ok: false; expiredAskId?: string } {
  let expiredAskId: string | undefined;
  for (const row of question.standingGrants) {
    /* v8 ignore next -- unreachable: alwaysApprove is the only thing that ever pushes onto standingGrants and every row it writes is kind 'always-approved'; the check keeps this loop honest if the list ever holds more than one kind. */
    if (row.kind !== 'always-approved') continue;
    if (row.affordanceId !== question.affordanceId) continue;
    if (row.principal !== HUMAN) continue;
    // A grant scoped to one row of a list authorizes THAT row only. An unscoped
    // grant covers the action wherever it appears — which is what the human was
    // shown, and why the scope is on the card.
    if (row.scopeInstance !== undefined && row.scopeInstance !== question.instance) continue;
    if (row.expiresAt !== undefined && question.now > row.expiresAt) {
      expiredAskId = row.askId;
      continue;
    }
    return { ok: true, askId: row.askId };
  }
  return expiredAskId === undefined ? { ok: false } : { ok: false, expiredAskId };
}

/**
 * Is the human's yes too old to stand? Two independent readings, both off by
 * default.
 *
 * `stateVersion`, never `version`: the honest question is "did the app's state
 * change since the human looked?", and `version` also bumps on served-structure
 * changes and on the fire itself — so comparing it would refuse almost every
 * real approval and teach the caller nothing true.
 *
 * EXPORTED so the ask BOOK can answer with the same law the gate will apply. A
 * serving layer that told a model "the human approved this — go do it" while
 * this function was about to refuse the fire would send it round a loop it could
 * never leave: the fire refuses APPROVAL_STALE, the ask stays approved-and-
 * unspent, the instruction repeats. One reading, both readers.
 */
export function stale(
  row: ConfirmRecord,
  ask: OpenAsk,
  question: { rules: HumanApprovalRules; now: number; stateVersion: number },
): boolean {
  const { rules, now, stateVersion } = question;
  if (rules.expiresAfterMs !== undefined && now - row.timestamp > rules.expiresAfterMs) return true;
  if (rules.refuseWhenWorldMoved === true) {
    // The row's own stamp is preferred; the ask's is the fallback for a row
    // written before the stamp existed. Neither is guessed.
    /* v8 ignore next -- the fallback arm is unreachable in a session this build wrote: every confirm row #answerAsk and alwaysApprove create stamps `stateVersion`. It stands for a row written by an older release, where the ask's own anchor is the nearest true answer. */
    const approvedAt = row.stateVersion ?? ask.askedAtStateVersion;
    if (approvedAt !== stateVersion) return true;
  }
  return false;
}

/** WHICH half of the receipts this fire disagrees with — or undefined if none. */
function whatDiffers(ask: OpenAsk, question: ApprovalQuestion): ApprovalDiffers | undefined {
  const verdict = sameInput(question.input, ask.input);
  // Uncomparable beats every other answer: we do not know whether the instance
  // matters when we cannot read the input at all, and the message says so.
  if (verdict === 'cannot-judge') return 'cannot-judge';
  const inputDiffers = verdict === 'different';
  const instanceDiffers = (question.instance ?? undefined) !== (ask.instance ?? undefined);
  if (inputDiffers && instanceDiffers) return 'both';
  if (inputDiffers) return 'input';
  if (instanceDiffers) return 'instance';
  return undefined;
}
