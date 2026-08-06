/**
 * A RECEIPT TRAIL THAT SAYS HOW LONG IT IS.
 *
 * `acknowledgeStale` writes one row per turn of the loop this feature asks a
 * model to run — refused → acknowledge → refire — so a long-lived session's trail
 * grew without limit and nothing said so. "Unbounded" is not a property a library
 * gets to have quietly.
 *
 * The bound is the easy half. The honest half is what it OWES, and it is the same
 * debt the offer ledger pays one file over: every eviction COUNTED, the
 * integrator WARNED once, and a citation this session dropped answered as
 * `'evicted'` — because a caller who performed the step, cited the id we handed
 * back, and is told the pointer is no good has been blamed for our limit.
 *
 * WHAT THE CAP DOES NOT DO, pinned here because a receipt ledger invites the
 * fear: it never edits a row, never retracts one, and never changes what a
 * retained row says. Dropping the oldest rows whole is a different act from
 * rewriting one, and only the second would be a lie.
 *
 * MUTATION PROOFS — each one was applied to the source and this file re-run
 * (19 tests); the number is how many died.
 * - Never evict (keep the unbounded trail) → 7 red.
 * - Evict newest-first instead of oldest-first → 6 red.
 * - Report an evicted receipt as 'unknown' → 3 red (one of them the served
 *   sentence, which would then have blamed the caller).
 * - Warn on every eviction instead of once → 2 red.
 * - Never warn at all → 2 red.
 * - Read `maxAcknowledgements: 0` as zero instead of one → 1 red.
 * - Mint one id for every act instead of counting → 10 red.
 * - Hand out the ledger's own row instead of a copy → 1 red.
 * - Keep the caller's `keys` array instead of detaching it → 1 red.
 * - Serve the ordinary "you have not done this yet" sentence for an evicted
 *   receipt → 1 red.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { FireResult, FreshnessPolicy } from '../src/index.js';
import { AcknowledgementLedger, DEFAULT_MAX_ACKNOWLEDGEMENTS } from '../src/traverse/ack-ledger.js';
import type { AcknowledgementFacts } from '../src/traverse/ack-ledger.js';

// ---------------------------------------------------------------------------
// The ledger, on its own
// ---------------------------------------------------------------------------

const facts = (over: Partial<AcknowledgementFacts> = {}): AcknowledgementFacts => ({
  actionId: 'ledger.settle',
  principal: 'agent',
  keys: ['claim.total'],
  acknowledgedAtStateVersion: 3,
  timestamp: 1_000,
  ...over,
});

const ledgerOf = (max?: number) => {
  const said: string[] = [];
  const ledger = new AcknowledgementLedger({
    ...(max !== undefined ? { max } : {}),
    warn: (message) => said.push(message),
  });
  return { ledger, said };
};

describe('an acknowledgement is an ACT — every call is its own row', () => {
  it('two steps at ONE state version are two receipts, not one', () => {
    // The difference from an offer, which is minted from its facts and reused:
    // an offer is a description of the world, and two acts are two acts.
    const { ledger } = ledgerOf();
    const first = ledger.append(facts());
    const second = ledger.append(facts());
    expect([first.acknowledgementId, second.acknowledgementId]).toEqual(['ack#1', 'ack#2']);
    expect(ledger.all()).toHaveLength(2);
  });

  it('the row holds what was handed in, with the id this ledger minted', () => {
    const { ledger } = ledgerOf();
    expect(ledger.append(facts({ offerId: 'offer#4' }))).toEqual({
      acknowledgementId: 'ack#1',
      actionId: 'ledger.settle',
      offerId: 'offer#4',
      principal: 'agent',
      keys: ['claim.total'],
      acknowledgedAtStateVersion: 3,
      timestamp: 1_000,
    });
  });

  it('and the default cap is a number this file can name', () => {
    expect(DEFAULT_MAX_ACKNOWLEDGEMENTS).toBe(500);
  });
});

describe('the rows are handed out as copies', () => {
  it('sorting a key list in place does not reach the ledger', () => {
    const { ledger } = ledgerOf();
    const id = ledger.append(facts()).acknowledgementId;
    ledger.get(id)!.keys.push('mine');
    ledger.all()[0].keys.push('mine too');
    expect(ledger.get(id)!.keys).toEqual(['claim.total']);
  });

  it('and the array the CALLER passed is detached at the door', () => {
    const { ledger } = ledgerOf();
    const keys = ['claim.total'];
    const id = ledger.append(facts({ keys })).acknowledgementId;
    keys.push('purse.left');
    // A receipt that could be widened after the fact is not a receipt.
    expect(ledger.get(id)!.keys).toEqual(['claim.total']);
  });

  it('an id nobody wrote answers with nothing', () => {
    const { ledger } = ledgerOf();
    expect(ledger.get('ack#9')).toBeUndefined();
  });
});

describe('the bound, and saying so', () => {
  it('the OLDEST goes first, and the count says how many', () => {
    const { ledger } = ledgerOf(2);
    for (let i = 0; i < 4; i += 1) ledger.append(facts());
    expect(ledger.all().map((row) => row.acknowledgementId)).toEqual(['ack#3', 'ack#4']);
    expect(ledger.dropped).toBe(2);
  });

  it('AN EVICTED RECEIPT IS SAID TO BE EVICTED, never called made up', () => {
    const { ledger } = ledgerOf(1);
    ledger.append(facts());
    ledger.append(facts());
    expect(ledger.standing('ack#1')).toBe('evicted');
    expect(ledger.standing('ack#2')).toBe('retained');
  });

  it('and an id this session never wrote is unknown, however it is shaped', () => {
    const { ledger } = ledgerOf();
    ledger.append(facts());
    expect(ledger.standing('ack#99')).toBe('unknown'); // past the counter
    expect(ledger.standing('ack#0')).toBe('unknown'); // no zeroth act
    expect(ledger.standing('receipt-7')).toBe('unknown'); // not this session's shape
  });

  it('the integrator is told ONCE, and the sentence names the fix', () => {
    const { ledger, said } = ledgerOf(1);
    ledger.append(facts());
    expect(said).toEqual([]); // nothing dropped yet
    ledger.append(facts());
    ledger.append(facts());
    expect(said).toHaveLength(1);
    expect(said[0]).toContain('maxAcknowledgements');
    expect(said[0]).toContain("why:'evicted'");
  });

  it('a cap of zero is read as one — a ledger that retains nothing never works', () => {
    const { ledger } = ledgerOf(0);
    const id = ledger.append(facts()).acknowledgementId;
    expect(ledger.get(id)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Through the session — the door, the refusal, and the wire
// ---------------------------------------------------------------------------

function desk(opts: { freshness?: FreshnessPolicy; maxAcknowledgements?: number } = {}) {
  const said: string[] = [];
  const map = buildNavigationGraph('desk', {
    pages: {
      ledger: {
        actions: {
          settle: {
            does: 'Settle the claim',
            reads: ['claim.total'],
            writes: ['purse.left'],
            ...(opts.freshness ? { freshness: opts.freshness } : {}),
          },
        },
      },
    },
  });
  const session = map.createSession({
    node: 'ledger',
    state: { 'claim.total': 100, 'purse.left': 500 },
    ...(opts.maxAcknowledgements !== undefined
      ? { maxAcknowledgements: opts.maxAcknowledgements }
      : {}),
    onWarn: (message) => said.push(message),
  });
  session.registerActions('ledger', { handlers: { settle: () => undefined } });
  return { session, said };
}

const settleOffer = (session: ReturnType<typeof desk>['session']): string =>
  session.available().edges.find((e) => e.affordanceId === 'ledger.settle')!.offerRef!.offerId;

const refusal = (fired: FireResult): Extract<FireResult, { ok: false }> => {
  expect(fired.ok).toBe(false);
  return fired as Extract<FireResult, { ok: false }>;
};

describe('the session carries the bound, and answers for it', () => {
  it('a session that acknowledges more than its cap keeps the newest and counts the rest', () => {
    const { session } = desk({ maxAcknowledgements: 2 });
    for (let i = 0; i < 5; i += 1) session.acknowledgeStale('ledger.settle');
    expect(session.acknowledgements().map((row) => row.acknowledgementId)).toEqual([
      'ack#4',
      'ack#5',
    ]);
    expect(session.acknowledgementsDropped()).toBe(3);
  });

  it('an ordinary session drops nothing and says nothing', () => {
    const { session, said } = desk();
    for (let i = 0; i < 20; i += 1) session.acknowledgeStale('ledger.settle');
    expect(session.acknowledgements()).toHaveLength(20);
    expect(session.acknowledgementsDropped()).toBe(0);
    expect(said).toEqual([]);
  });

  it('and the warning reaches the host’s own sink, once', () => {
    const { session, said } = desk({ maxAcknowledgements: 1 });
    for (let i = 0; i < 4; i += 1) session.acknowledgeStale('ledger.settle');
    expect(said.filter((line) => line.includes('acknowledgement ledger is full'))).toHaveLength(1);
  });

  it('the trail is still append-only: a retained row is never edited', () => {
    const { session } = desk({ maxAcknowledgements: 3 });
    session.acknowledgeStale('ledger.settle', ['claim.total']);
    session.updateState({ 'claim.total': 120 }, { stimulus: 'push' });
    session.acknowledgeStale('ledger.settle', ['purse.left']);
    expect(session.acknowledgements()[0]).toMatchObject({
      acknowledgementId: 'ack#1',
      keys: ['claim.total'],
      acknowledgedAtStateVersion: 0,
    });
  });
});

describe('a citation this library dropped is not a citation the caller made up', () => {
  it('the refusal says WHY, and the word is this library’s own limit', () => {
    const { session } = desk({
      freshness: { readChanges: 'require-ack' },
      maxAcknowledgements: 1,
    });
    const offerId = settleOffer(session);
    session.updateState({ 'claim.total': 120 }, { stimulus: 'push' });
    const { acknowledgementId } = session.acknowledgeStale('ledger.settle', ['claim.total'], {
      offerId,
    });
    // The caller's own receipt, pushed off the end by this session's cap.
    session.acknowledgeStale('ledger.settle');
    expect(session.acknowledgementsDropped()).toBe(1);

    const fired = refusal(
      session.fire('ledger.settle', { source: 'agent', offerId, acknowledgementId }),
    );
    expect(fired).toMatchObject({
      reason: 'ACKNOWLEDGEMENT_REQUIRED',
      acknowledgementId,
      why: 'evicted',
    });
  });

  it('while a pointer nobody ever wrote gets NO such excuse', () => {
    const { session } = desk({ freshness: { readChanges: 'require-ack' } });
    const offerId = settleOffer(session);
    session.updateState({ 'claim.total': 120 }, { stimulus: 'push' });
    const fired = refusal(
      session.fire('ledger.settle', { source: 'agent', offerId, acknowledgementId: 'ack#404' }),
    );
    expect(fired).toMatchObject({ reason: 'ACKNOWLEDGEMENT_REQUIRED', acknowledgementId: 'ack#404' });
    expect(fired).not.toHaveProperty('why');
  });

  it('and the acknowledgement that IS still held works exactly as it did', () => {
    const { session } = desk({
      freshness: { readChanges: 'require-ack' },
      maxAcknowledgements: 1,
    });
    const offerId = settleOffer(session);
    session.updateState({ 'claim.total': 120 }, { stimulus: 'push' });
    session.acknowledgeStale('ledger.settle');
    const { acknowledgementId } = session.acknowledgeStale('ledger.settle', ['claim.total'], {
      offerId,
    });
    expect(session.fire('ledger.settle', { source: 'agent', offerId, acknowledgementId }).ok).toBe(
      true,
    );
  });

  it('the wire says the same thing, and does not send the caller looking for their mistake', () => {
    const { session } = desk({
      freshness: { readChanges: 'require-ack' },
      maxAcknowledgements: 1,
    });
    const port = serveToAgent(session);
    const offerId = settleOffer(session);
    session.updateState({ 'claim.total': 120 }, { stimulus: 'push' });
    const { acknowledgementId } = session.acknowledgeStale('ledger.settle', ['claim.total'], {
      offerId,
    });
    session.acknowledgeStale('ledger.settle');

    const refused = port.call('desk.do_action', {
      action: 'ledger.settle',
      offerId,
      acknowledgementId,
    });
    expect(refused).toMatchObject({ ok: false, reason: 'ACKNOWLEDGEMENT_REQUIRED' });
    expect(String(refused['why'])).toContain('You did record that step');
    expect(String(refused['why'])).toContain('Nothing is wrong with what you did');
    // …and it still refuses to claim the step meant anything.
    expect(String(refused['why'])).toContain('makes no claim that anything was understood');
  });
});
