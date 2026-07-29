/**
 * The scripted model, tested as the pure function it is.
 */
import { describe, expect, it } from 'vitest';
import type { LLMRequest } from 'agentfootprint';
import { deskRespond, intentOf, questionOf, ticketFor, DO_ACTION, WHATS_HERE, WHY } from './mockScript.js';

function request(messages: LLMRequest['messages']): LLMRequest {
  return { messages, model: 'mock' };
}

const ask = (question: string) => ({
  role: 'user' as const,
  content: `<session-context>\nYou are on 'desk'.\n</session-context>\n\n${question}`,
});

const toolResult = (name: string, value: unknown) => ({
  role: 'tool' as const,
  toolName: name,
  content: JSON.stringify(value),
});

describe('reading the turn', () => {
  it('recovers the ask from behind the grounding block', () => {
    expect(questionOf(request([ask('Reply to Priya')]))).toBe('Reply to Priya');
  });

  it('classifies what was asked', () => {
    expect(intentOf('Reply to Priya’s ticket')).toBe('reply');
    expect(intentOf('Switch to the archive tab')).toBe('tabs');
    expect(intentOf('Clear the archive')).toBe('clear-archive');
    expect(intentOf('Why is repliedCount 1?')).toBe('why');
    expect(intentOf('What can I do here?')).toBe('look');
  });

  it('matches a ticket by a whole word of its sender, never by a fragment', () => {
    const tickets = [
      { id: 't-1', from: 'Ada Okonjo', subject: 'a', replied: false },
      { id: 't-51', from: 'Priya Raman', subject: 'b', replied: false },
    ];
    expect(ticketFor('reply to priya', tickets)?.id).toBe('t-51');
    expect(ticketFor('reply to pri', tickets)).toBeNull();
  });
});

describe('the script', () => {
  it('looks before it acts', () => {
    const reply = deskRespond(request([ask('Reply to Priya')]));
    expect(reply.toolCalls?.[0]?.name).toBe(WHATS_HERE);
  });

  it('is stateless: the same transcript answers identically every time', () => {
    const req = request([ask('Switch to the archive tab'), toolResult(WHATS_HERE, { actions: [] })]);
    expect(deskRespond(req)).toEqual(deskRespond(req));
    expect(deskRespond(req).toolCalls?.[0]).toMatchObject({ name: DO_ACTION, args: { action: 'switch-to-archive' } });
  });

  it('reports a refusal as a refusal, in the session’s own words', () => {
    const answer = deskRespond(
      request([
        ask('Switch to the archive tab'),
        toolResult(WHATS_HERE, { actions: [], youAreOn: 'desk', version: 3 }),
        toolResult(DO_ACTION, { ok: false, did: 'desk.switch-to-archive', reason: 'NOT_MATERIALIZED', why: 'Nothing is wired.' }),
      ]),
    );
    expect(answer.content).toContain('NOT_MATERIALIZED');
    expect(answer.content).toContain('Nothing is wired.');
    expect(answer.content).not.toContain('Done');
  });

  it('quotes the ticket it actually read, and says whether that row was listed', () => {
    const answer = deskRespond(
      request([
        ask('Reply to Priya'),
        toolResult(WHATS_HERE, {
          actions: [{ action: 'desk.inbox.tickets.reply-to-ticket', instances: ['t-1', 't-2'] }],
          youAreOn: 'desk',
          version: 2,
        }),
        toolResult(DO_ACTION, {
          ok: true,
          produced: { matched: 1, showing: 1, tickets: [{ id: 't-51', from: 'Priya Raman', subject: 'Refund', replied: false }] },
        }),
        toolResult(DO_ACTION, {
          ok: true,
          did: 'desk.inbox.tickets.reply-to-ticket',
          settlement: 'awaiting-state',
          effectStatus: 'pending',
          produced: { ticketId: 't-51', to: 'Priya Raman', subject: 'Refund', message: 'On it.' },
        }),
      ]),
    );
    expect(answer.content).toContain('t-51');
    expect(answer.content).toContain('Priya Raman');
    expect(answer.content).toContain('NOT among the 2 rows');
  });

  it('will not clear the archive on its own — it shows the receipts and stops', () => {
    const answer = deskRespond(
      request([
        ask('Clear the archive'),
        toolResult(WHATS_HERE, { actions: [], youAreOn: 'desk', version: 1 }),
        toolResult(DO_ACTION, {
          judgment: 'needs-confirm',
          does: 'Permanently delete every archived ticket',
          receipts: { willDo: { does: 'Permanently delete every archived ticket', writes: ['archivedCount'] }, youAreOn: 'desk' },
        }),
      ]),
    );
    expect(answer.content).toContain('without you saying yes');
    expect(answer.content).toContain('archivedCount');
    expect(answer.toolCalls ?? []).toEqual([]);
  });

  it('asks the desk for a causal account rather than guessing one', () => {
    const first = deskRespond(request([ask('Why is repliedCount 1?')]));
    expect(first.toolCalls?.[0]).toMatchObject({ name: WHY, args: { key: 'repliedCount' } });
    const answer = deskRespond(
      request([ask('Why is repliedCount 1?'), toolResult(WHY, { ok: true, key: 'repliedCount', why: 'agent fired reply-to-ticket' })]),
    );
    expect(answer.content).toContain('agent fired reply-to-ticket');
  });
});
