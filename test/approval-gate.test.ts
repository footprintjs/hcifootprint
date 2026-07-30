/**
 * THE GATE'S LAW, with no session in the room.
 *
 * The verdict has ten branches and every one of them is something somebody will
 * try. Testing it as a pure function is what makes each mutation proof three
 * lines instead of a fixture — so every branch actually has one, rather than the
 * two or three that are cheap to reach through a live session.
 *
 * Mutation proofs, run and recorded — each flip turns exactly the named test red:
 *  - accept `principal: 'agent'` on the approving row → 'a row that is not the
 *    human's' passes.
 *  - drop the affordance match → 'an approval for another action' passes.
 *  - drop the `spent` check → 'a spent approval' passes.
 *  - drop the expiry comparison → 'an approval older than the rules allow' passes.
 *  - compare `version` instead of `stateVersion` for world-moved → 'a yes from
 *    before the world moved' passes (the ask and the row carry the same version
 *    while the state has moved under them).
 *  - let a standing grant outrank a decline → 'a human no outranks a standing
 *    grant' passes.
 *  - drop the scopeInstance filter → 'a grant scoped to one row' passes.
 */
import { describe, expect, it } from 'vitest';
import { checkApproval } from '../src/traverse/approval-gate.js';
import type { ApprovalQuestion, OpenAsk } from '../src/traverse/approval-gate.js';
import type { ConfirmRecord } from '../src/index.js';

const ACTION = 'checkout.place-order';

function ask(over: Partial<OpenAsk> = {}): OpenAsk {
  return {
    askId: 'ask#1',
    affordanceId: ACTION,
    input: { total: 42 },
    askedAtVersion: 3,
    askedAtStateVersion: 2,
    askedAt: 1_000,
    ...over,
  };
}

function approvedRow(over: Partial<ConfirmRecord> = {}): ConfirmRecord {
  return {
    kind: 'approved',
    askId: 'ask#1',
    affordanceId: ACTION,
    timestamp: 1_000,
    node: 'checkout',
    version: 3,
    stateVersion: 2,
    principal: 'user',
    by: 'alice@ops',
    enforced: true,
    ...over,
  };
}

function grantRow(over: Partial<ConfirmRecord> = {}): ConfirmRecord {
  return {
    kind: 'always-approved',
    askId: 'grant#1',
    affordanceId: ACTION,
    timestamp: 1_000,
    node: 'checkout',
    version: 3,
    principal: 'user',
    by: 'alice@ops',
    enforced: true,
    ...over,
  };
}

/** The question, with one approved ask on file unless a case says otherwise. */
function question(over: Partial<ApprovalQuestion> = {}): ApprovalQuestion {
  const entry = over.openAsks === undefined ? ask({ answer: 'approved', answeredBy: 'alice@ops' }) : undefined;
  const row = approvedRow();
  return {
    askId: 'ask#1',
    affordanceId: ACTION,
    input: { total: 42 },
    openAsks: entry ? new Map([[entry.askId, entry]]) : new Map(),
    rowFor: (id) => (id === row.askId ? row : undefined),
    standingGrants: [],
    stateVersion: 2,
    now: 1_500,
    rules: {},
    ...over,
  };
}

describe('the two ways through', () => {
  it('a recorded human ALLOW for this action and this input', () => {
    expect(checkApproval(question())).toEqual({ ok: true, via: 'approved', askId: 'ask#1' });
  });

  it('a standing ALWAYS ALLOW, with no ask presented at all', () => {
    const verdict = checkApproval(
      question({ askId: undefined, openAsks: new Map(), standingGrants: [grantRow()] }),
    );
    expect(verdict).toEqual({ ok: true, via: 'always-approved', askId: 'grant#1' });
  });

  it('a standing grant authorizes a DIFFERENT input — it is scoped to the action, not the payload', () => {
    const verdict = checkApproval(
      question({ askId: undefined, openAsks: new Map(), standingGrants: [grantRow()], input: { total: 999 } }),
    );
    expect(verdict).toMatchObject({ ok: true, via: 'always-approved' });
  });

  it('a grant still authorizes when an ask was minted after it (the pointer is unanswered)', () => {
    const open = ask();
    const verdict = checkApproval(
      question({ openAsks: new Map([[open.askId, open]]), standingGrants: [grantRow()] }),
    );
    expect(verdict).toMatchObject({ ok: true, via: 'always-approved' });
  });
});

describe('no proof at all', () => {
  it('a bare confirm — no pointer presented, nothing on file', () => {
    expect(checkApproval(question({ askId: undefined, openAsks: new Map() }))).toEqual({
      ok: false,
      reason: 'APPROVAL_REQUIRED',
    });
  });

  it('a pointer this session is not holding (a guess, or an askId minted elsewhere)', () => {
    expect(checkApproval(question({ askId: 'ask#99' }))).toEqual({
      ok: false,
      reason: 'APPROVAL_REQUIRED',
      askId: 'ask#99',
    });
  });

  it('an ask nobody has answered — THE REPORTED FORM: a card landed, no human decided', () => {
    const open = ask();
    expect(checkApproval(question({ openAsks: new Map([[open.askId, open]]) }))).toEqual({
      ok: false,
      reason: 'APPROVAL_REQUIRED',
      askId: 'ask#1',
    });
  });

  it('a row that is not the human’s — the ENTRY says approved, the ROW says agent', () => {
    // The gate reads the row, never just its own bookkeeping: confirmAsk takes a
    // principal, so an agent with in-process reach can already stamp 'user' on an
    // 'ask' row. Only an approving row from the door counts.
    const entry = ask({ answer: 'approved' });
    const forged = approvedRow({ principal: 'agent' });
    expect(
      checkApproval(question({ openAsks: new Map([[entry.askId, entry]]), rowFor: () => forged })),
    ).toEqual({ ok: false, reason: 'APPROVAL_REQUIRED', askId: 'ask#1' });
  });

  it('an ASK row cannot stand in for an approval, whatever principal it carries', () => {
    const entry = ask({ answer: 'approved' });
    const askRow = approvedRow({ kind: 'ask', principal: 'user' });
    expect(
      checkApproval(question({ openAsks: new Map([[entry.askId, entry]]), rowFor: () => askRow })),
    ).toMatchObject({ ok: false, reason: 'APPROVAL_REQUIRED' });
  });

  it('no row at all behind an entry that claims to be approved', () => {
    const entry = ask({ answer: 'approved' });
    expect(
      checkApproval(question({ openAsks: new Map([[entry.askId, entry]]), rowFor: () => undefined })),
    ).toMatchObject({ ok: false, reason: 'APPROVAL_REQUIRED' });
  });
});

describe('the approval is for something else', () => {
  it('an approval for another action — differs names the join that failed', () => {
    expect(checkApproval(question({ affordanceId: 'catalog.add-to-cart' }))).toEqual({
      ok: false,
      reason: 'APPROVAL_MISMATCH',
      askId: 'ask#1',
      differs: 'action',
    });
  });

  it('a different input under the right askId — laundering ask-A into do-B', () => {
    expect(checkApproval(question({ input: { total: 9_999 } }))).toEqual({
      ok: false,
      reason: 'APPROVAL_MISMATCH',
      askId: 'ask#1',
      differs: 'input',
    });
  });

  it('a different instance — the human was looking at one row of a list', () => {
    const entry = ask({ answer: 'approved', instance: 'o-1' });
    expect(
      checkApproval(question({ openAsks: new Map([[entry.askId, entry]]), instance: 'o-999' })),
    ).toEqual({ ok: false, reason: 'APPROVAL_MISMATCH', askId: 'ask#1', differs: 'instance' });
  });

  it('both wrong reads as both', () => {
    const entry = ask({ answer: 'approved', instance: 'o-1' });
    expect(
      checkApproval(
        question({ openAsks: new Map([[entry.askId, entry]]), instance: 'o-2', input: { total: 1 } }),
      ),
    ).toMatchObject({ differs: 'both' });
  });

  it('an input the library cannot compare REFUSES — it never approximates a match', () => {
    const entry = ask({ answer: 'approved', input: { when: new Date(0) } });
    expect(
      checkApproval(question({ openAsks: new Map([[entry.askId, entry]]), input: { when: new Date(0) } })),
    ).toEqual({ ok: false, reason: 'APPROVAL_MISMATCH', askId: 'ask#1', differs: 'cannot-judge' });
  });

  it('and uncomparable outranks a wrong instance — we do not rank what we cannot read', () => {
    const entry = ask({ answer: 'approved', instance: 'o-1', input: { m: new Map() } });
    expect(
      checkApproval(
        question({ openAsks: new Map([[entry.askId, entry]]), instance: 'o-2', input: { m: new Map() } }),
      ),
    ).toMatchObject({ differs: 'cannot-judge' });
  });
});

describe('one yes, one fire', () => {
  it('a spent approval refuses the replay, even though a real human yes exists', () => {
    const entry = ask({ answer: 'approved', spent: true });
    expect(checkApproval(question({ openAsks: new Map([[entry.askId, entry]]) }))).toEqual({
      ok: false,
      reason: 'APPROVAL_SPENT',
      askId: 'ask#1',
    });
  });

  it('a standing grant is NEVER spent — that is what durable means', () => {
    const spentGrant = grantRow();
    const first = checkApproval(question({ askId: undefined, openAsks: new Map(), standingGrants: [spentGrant] }));
    const second = checkApproval(question({ askId: undefined, openAsks: new Map(), standingGrants: [spentGrant] }));
    expect(first).toMatchObject({ ok: true });
    expect(second).toMatchObject({ ok: true });
  });
});

describe('a yes from a world that moved on', () => {
  it('an approval older than the rules allow', () => {
    expect(checkApproval(question({ now: 1_000 + 5_000, rules: { expiresAfterMs: 1_000 } }))).toEqual({
      ok: false,
      reason: 'APPROVAL_STALE',
      askId: 'ask#1',
    });
  });

  it('inside the window it still stands', () => {
    expect(checkApproval(question({ now: 1_500, rules: { expiresAfterMs: 1_000 } }))).toMatchObject({ ok: true });
  });

  it('a yes from before the world moved — stateVersion, not version', () => {
    // The ask and the row both carry version 3 while the STATE has moved from 2
    // to 3. Comparing `version` here would pass this and refuse almost every
    // real approval elsewhere (it bumps on frames and on the fire itself).
    expect(checkApproval(question({ stateVersion: 3, rules: { refuseWhenWorldMoved: true } }))).toEqual({
      ok: false,
      reason: 'APPROVAL_STALE',
      askId: 'ask#1',
    });
  });

  it('an unmoved world with the rule on still stands', () => {
    expect(checkApproval(question({ stateVersion: 2, rules: { refuseWhenWorldMoved: true } }))).toMatchObject({
      ok: true,
    });
  });

  it('both rules default OFF — the stamps are recorded, the thresholds are yours', () => {
    expect(checkApproval(question({ now: 9_999_999, stateVersion: 99 }))).toMatchObject({ ok: true });
  });

  it('an expired standing grant says STALE, not "nobody ever approved this"', () => {
    expect(
      checkApproval(
        question({
          askId: undefined,
          openAsks: new Map(),
          standingGrants: [grantRow({ expiresAt: 1_200 })],
          now: 1_500,
        }),
      ),
    ).toEqual({ ok: false, reason: 'APPROVAL_STALE', askId: 'grant#1' });
  });

  it('a live standing grant inside its window authorizes', () => {
    expect(
      checkApproval(
        question({ askId: undefined, openAsks: new Map(), standingGrants: [grantRow({ expiresAt: 9_000 })] }),
      ),
    ).toMatchObject({ ok: true, via: 'always-approved' });
  });
});

describe('a human no', () => {
  it('is terminal for its askId', () => {
    const entry = ask({ answer: 'declined' });
    expect(checkApproval(question({ openAsks: new Map([[entry.askId, entry]]) }))).toEqual({
      ok: false,
      reason: 'APPROVAL_DECLINED',
      askId: 'ask#1',
    });
  });

  it('a human no outranks a standing grant — otherwise Decline on the card is a lie', () => {
    const entry = ask({ answer: 'declined' });
    expect(
      checkApproval(question({ openAsks: new Map([[entry.askId, entry]]), standingGrants: [grantRow()] })),
    ).toMatchObject({ ok: false, reason: 'APPROVAL_DECLINED' });
  });
});

describe('a standing grant’s scope', () => {
  it('does not reach another action', () => {
    expect(
      checkApproval(
        question({
          askId: undefined,
          openAsks: new Map(),
          affordanceId: 'catalog.add-to-cart',
          standingGrants: [grantRow()],
        }),
      ),
    ).toMatchObject({ ok: false, reason: 'APPROVAL_REQUIRED' });
  });

  it('a grant scoped to one row does not reach another row', () => {
    const scoped = [grantRow({ scopeInstance: 'o-1' })];
    expect(
      checkApproval(question({ askId: undefined, openAsks: new Map(), standingGrants: scoped, instance: 'o-1' })),
    ).toMatchObject({ ok: true });
    expect(
      checkApproval(question({ askId: undefined, openAsks: new Map(), standingGrants: scoped, instance: 'o-999' })),
    ).toMatchObject({ ok: false, reason: 'APPROVAL_REQUIRED' });
  });

  it('a grant whose row is not the human’s authorizes nothing', () => {
    expect(
      checkApproval(
        question({
          askId: undefined,
          openAsks: new Map(),
          standingGrants: [grantRow({ principal: 'agent' })],
        }),
      ),
    ).toMatchObject({ ok: false, reason: 'APPROVAL_REQUIRED' });
  });
});
