/**
 * The desk's data — sixty tickets, generated deterministically so `npm test`
 * and `npm run dev` see the same inbox on every run.
 *
 * The one hand-placed row is t-51: it is BEYOND the 50-key cap that
 * `available()` puts on a repeats edge's rendered instance list
 * (hcifootprint src/traverse/nav-session.ts:623 — "render cap only; fireability
 * is uncapped"). The demo's headline fire is aimed at exactly that ticket, so
 * "the cap caps what is SHOWN, never what can be done" is a thing you watch
 * happen rather than a sentence in a README.
 */

export interface Ticket {
  readonly id: string;
  readonly from: string;
  readonly subject: string;
  readonly status: 'open' | 'archived';
  /** A reply has been sent. The desk rule: you may only archive what you answered. */
  readonly replied: boolean;
}

/** The ticket the demo's headline fire targets — past the render cap, on purpose. */
export const NAMED_TICKET_ID = 't-51';

const SENDERS = [
  'Ada Okonjo',
  'Marco Ferretti',
  'Yuki Tanaka',
  'Sam Delacroix',
  'Rosa Iglesias',
  'Tom Bergström',
  'Nadia Haddad',
] as const;

const SUBJECTS = [
  'Invoice is missing a line item',
  'Cannot reset my password',
  'Export finished but the file is empty',
  'Double charge on the March renewal',
  'Seat count is wrong after the upgrade',
  'Webhook stopped firing yesterday',
  'Request: add a read-only role',
] as const;

/**
 * Sixty open tickets. The generator is a plain modulo cycle — no randomness, no
 * clock — and 'Priya Raman' appears exactly ONCE, on t-51, so a request naming
 * her resolves to one instance key and only one.
 */
export function seedTickets(): Ticket[] {
  const tickets: Ticket[] = [];
  for (let index = 1; index <= 60; index += 1) {
    const id = `t-${String(index)}`;
    if (id === NAMED_TICKET_ID) {
      tickets.push({
        id,
        from: 'Priya Raman',
        subject: 'Refund for the duplicate annual plan',
        status: 'open',
        replied: false,
      });
      continue;
    }
    tickets.push({
      id,
      from: SENDERS[index % SENDERS.length] as string,
      subject: SUBJECTS[index % SUBJECTS.length] as string,
      status: 'open',
      replied: false,
    });
  }
  return tickets;
}
