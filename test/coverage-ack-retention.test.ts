/**
 * The acknowledgement ledger's RETENTION WINDOW, counted
 * (src/traverse/ack-ledger.ts · AcknowledgementLedger.retention, and its session
 * door src/traverse/session.ts · Session.acknowledgementsRetention).
 *
 * The twin of the offer ledger's window (test/offer-references.test.ts): what is
 * still answerable, not only how much is gone. The ends are real retained ids,
 * everything before the window answers `'evicted'`, and an empty ledger is
 * honestly end-less — no `firstRetained`/`lastRetained` key at all.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import { AcknowledgementLedger } from '../src/traverse/ack-ledger.js';

const facts = {
  actionId: 'ledger.settle',
  principal: 'agent' as const,
  keys: ['claim.total'],
  acknowledgedAtStateVersion: 0,
  timestamp: 1_000,
};

describe('the ledger’s own window', () => {
  it('an empty ledger has no ends', () => {
    const window = new AcknowledgementLedger({ warn: () => undefined }).retention();
    expect(window).toEqual({ minted: 0, dropped: 0 });
    expect('firstRetained' in window).toBe(false);
    expect('lastRetained' in window).toBe(false);
  });

  it('a capped ledger names the oldest and newest ids it still holds', () => {
    const ledger = new AcknowledgementLedger({ max: 2, warn: () => undefined });
    for (let i = 0; i < 5; i += 1) ledger.append(facts);
    expect(ledger.retention()).toEqual({
      minted: 5,
      dropped: 3,
      firstRetained: 'ack#4',
      lastRetained: 'ack#5',
    });
    expect(ledger.standing('ack#3')).toBe('evicted');
    expect(ledger.get('ack#4')).toBeDefined();
  });
});

describe('through the session', () => {
  function session(maxAcknowledgements?: number) {
    const map = buildNavigationGraph('desk', {
      pages: {
        ledger: {
          actions: {
            settle: { does: 'Settle the claim', reads: ['claim.total'], writes: ['purse.left'] },
          },
        },
      },
    });
    const live = map.createSession({
      node: 'ledger',
      state: { 'claim.total': 100, 'purse.left': 500 },
      ...(maxAcknowledgements !== undefined ? { maxAcknowledgements } : {}),
      onWarn: () => undefined,
    });
    live.registerActions('ledger', { handlers: { settle: () => undefined } });
    return live;
  }

  it('acknowledgementsRetention is the ledger’s window, and agrees with the rows served', () => {
    const live = session(2);
    for (let i = 0; i < 4; i += 1) live.acknowledgeStale('ledger.settle');
    const window = live.acknowledgementsRetention();
    expect(window).toEqual({
      minted: 4,
      dropped: 2,
      firstRetained: 'ack#3',
      lastRetained: 'ack#4',
    });
    expect(window.dropped).toBe(live.acknowledgementsDropped());
    expect(live.acknowledgements().map((row) => row.acknowledgementId)).toEqual([
      window.firstRetained,
      window.lastRetained,
    ]);
  });

  it('a session that has acknowledged nothing is honestly end-less', () => {
    expect(session().acknowledgementsRetention()).toEqual({ minted: 0, dropped: 0 });
  });
});
