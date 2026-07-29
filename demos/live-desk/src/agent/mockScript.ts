/**
 * The scripted model — what `npm run dev` and `npm test` run with, by default,
 * with no key and no network.
 *
 * `respond`, never `replies`: `replies` uses a per-instance cursor that THROWS
 * on exhaustion, so a visitor asking twice would blow the demo up. `respond` is
 * handed the whole request and is fully STATELESS — it counts the tool messages
 * in the transcript and reads the earlier tool RESULTS back out of it.
 *
 * THE LOAD-BEARING RULE: every sentence it writes is derived from a result the
 * desk actually returned. The ticket it replies to is chosen from the real
 * `list-tickets` output; the reply text quotes that ticket's real subject; the
 * closing report reads the fire's own `ok` / `reason` / `effectStatus` /
 * `settlement` fields back. Change the desk's data or wiring and the answers
 * change with it, because there is no prose in here that survives them.
 */
import type { LLMRequest, LLMResponse } from 'agentfootprint';

/** The three fixed Mode B tools, as the model sees them (dots substituted). */
export const WHATS_HERE = 'desk__whats_here';
export const DO_ACTION = 'desk__do_action';
export const WHY = 'desk__why';

export type Intent = 'reply' | 'tabs' | 'clear-archive' | 'why' | 'look';

/** Everything the desk's `whats_here` reports about one action. */
interface ActionLine {
  action: string;
  does?: string;
  materialized?: boolean;
  instances?: string[];
  enumeration?: string;
  highEffect?: boolean;
}

interface TicketLine {
  id: string;
  from: string;
  subject: string;
  replied: boolean;
}

// ── reading the transcript ─────────────────────────────────────────────

/** The user's ask. The turn wraps its grounding in a tag; the ask follows it. */
export function questionOf(req: LLMRequest): string {
  const first = req.messages.find((message) => message.role === 'user');
  const text = first?.content ?? '';
  const end = text.lastIndexOf('</session-context>');
  return (end < 0 ? text : text.slice(end + '</session-context>'.length)).trim();
}

export function intentOf(question: string): Intent {
  const q = question.toLowerCase();
  if (/\b(archive tab|switch|tab)\b/.test(q)) return 'tabs';
  if (/\b(clear|empty|delete)\b.*\barchive\b/.test(q)) return 'clear-archive';
  if (/^why\b/.test(q)) return 'why';
  if (/\b(reply|respond|answer)\b/.test(q)) return 'reply';
  return 'look';
}

function toolResults(req: LLMRequest, name: string): unknown[] {
  const out: unknown[] = [];
  for (const message of req.messages) {
    if (message.role !== 'tool' || message.toolName !== name) continue;
    try {
      out.push(JSON.parse(message.content));
    } catch {
      out.push(message.content);
    }
  }
  return out;
}

function lastResult(req: LLMRequest, name: string): Record<string, unknown> | null {
  const all = toolResults(req, name);
  for (let index = all.length - 1; index >= 0; index -= 1) {
    const value = all[index];
    if (typeof value === 'object' && value !== null) return value as Record<string, unknown>;
  }
  return null;
}

function actionsOf(result: Record<string, unknown> | null): ActionLine[] {
  const actions = result?.['actions'];
  return Array.isArray(actions) ? (actions as ActionLine[]) : [];
}

function producedListing(result: Record<string, unknown> | null): { matched: number; tickets: TicketLine[] } {
  const produced = result?.['produced'] as { matched?: number; tickets?: TicketLine[] } | undefined;
  const tickets = Array.isArray(produced?.tickets) ? produced.tickets : [];
  return { matched: typeof produced?.matched === 'number' ? produced.matched : tickets.length, tickets };
}

/** The ticket whose sender the question names. Nothing fuzzy: a whole word. */
export function ticketFor(question: string, tickets: readonly TicketLine[]): TicketLine | null {
  const words = new Set(question.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2));
  return (
    tickets.find((ticket) =>
      ticket.from
        .toLowerCase()
        .split(/\s+/)
        .some((part) => part.length > 2 && words.has(part)),
    ) ?? null
  );
}

// ── the script ─────────────────────────────────────────────────────────

export function deskRespond(req: LLMRequest): Partial<LLMResponse> {
  const question = questionOf(req);
  const intent = intentOf(question);
  const done = req.messages.filter((message) => message.role === 'tool').length;

  if (done === 0) {
    if (intent === 'why') {
      return {
        content: 'Let me ask the desk what actually produced that value.',
        toolCalls: [{ id: 'call_why', name: WHY, args: { key: keyOf(question) } }],
      };
    }
    return {
      content: 'Let me look at what this desk can actually do right now.',
      toolCalls: [{ id: 'call_look', name: WHATS_HERE, args: {} }],
    };
  }

  if (intent === 'why') return { content: whyAnswer(req) };

  const here = lastResult(req, WHATS_HERE);
  const actions = actionsOf(here);

  if (intent === 'look') return { content: lookAnswer(here, actions) };

  if (intent === 'tabs') {
    if (done === 1) {
      return {
        content: 'The desk lists a tab switch. Trying it.',
        toolCalls: [{ id: 'call_tab', name: DO_ACTION, args: { action: 'switch-to-archive' } }],
      };
    }
    return { content: firedAnswer(lastResult(req, DO_ACTION), 'switch to the Archive tab') };
  }

  if (intent === 'clear-archive') {
    if (done === 1) {
      return {
        content: 'That one looks destructive. Asking the desk what it would do first.',
        toolCalls: [{ id: 'call_clear', name: DO_ACTION, args: { action: 'clear-archive' } }],
      };
    }
    return { content: confirmAnswer(lastResult(req, DO_ACTION)) };
  }

  // intent 'reply'
  if (done === 1) {
    if (!actions.some((line) => line.action.endsWith('.list-tickets'))) {
      return { content: noListingAnswer(actions) };
    }
    return {
      content: 'The action list carries row ids, not names — so I am asking the desk which ticket that is.',
      toolCalls: [
        // The desk does the matching: it is what knows its senders. The whole
        // ask goes in as the search text.
        { id: 'call_list', name: DO_ACTION, args: { action: 'list-tickets', input: { search: question } } },
      ],
    };
  }
  if (done === 2) {
    const listing = producedListing(lastResult(req, DO_ACTION));
    const ticket = ticketFor(question, listing.tickets);
    if (!ticket) return { content: noTicketAnswer(question, listing) };
    return {
      content: `That is ticket ${ticket.id}, from ${ticket.from}. Replying to it.`,
      toolCalls: [
        {
          id: 'call_reply',
          name: DO_ACTION,
          args: {
            action: 'reply-to-ticket',
            instance: ticket.id,
            input: { message: `Thanks for writing in about "${ticket.subject}" — we are on it.` },
          },
        },
      ],
    };
  }
  return { content: replyAnswer(req) };
}

// ── answers, each assembled from results this run really got ───────────

function keyOf(question: string): string {
  const match = /\b(repliedCount|archivedCount|sentCount|lastRepliedTo|inboxTicketIds|openCount)\b/.exec(question);
  return match?.[1] ?? 'repliedCount';
}

function whyAnswer(req: LLMRequest): string {
  const result = lastResult(req, WHY);
  if (result?.['ok'] !== true) return `The desk would not answer that: ${String(result?.['reason'] ?? 'no result')}.`;
  return [
    `Here is the desk's own account of '${String(result['key'])}', traced back through what was fired:`,
    '',
    String(result['why']),
  ].join('\n');
}

function lookAnswer(here: Record<string, unknown> | null, actions: ActionLine[]): string {
  if (!here) return 'The desk returned nothing to look at.';
  const unwired = actions.filter((line) => line.materialized === false).map((line) => line.action);
  const rows = actions.map((line) => {
    const marks: string[] = [];
    if (line.materialized === false) marks.push('nothing wired to it');
    if (line.highEffect) marks.push('needs confirmation');
    if (line.instances) marks.push(`${String(line.instances.length)} rows listed (${String(line.enumeration)})`);
    return `  • ${line.action}${marks.length > 0 ? ` — ${marks.join('; ')}` : ''}`;
  });
  return [
    `You are on '${String(here['youAreOn'])}' (cursor version ${String(here['version'])}). The desk offers ${String(actions.length)} actions:`,
    ...rows,
    '',
    unwired.length > 0
      ? `${String(unwired.length)} of them would execute nothing if I fired them: ${unwired.join(', ')}.`
      : 'Everything listed has something wired behind it.',
  ].join('\n');
}

function firedAnswer(result: Record<string, unknown> | null, what: string): string {
  if (!result) return `I tried to ${what} and got no result back.`;
  if (result['ok'] === true) {
    // The word matters. A tool result is assembled synchronously, before the
    // app's handler has run, so 'pending' is the honest report at return time —
    // saying "done" there would be me deciding what happened.
    const status = String(result['effectStatus']);
    return [
      status === 'performed'
        ? `Done — the desk performed the ${what}.`
        : `The desk accepted the ${what} and had not reported finishing it when it answered me.`,
      `It reported did=${String(result['did'])}, settlement=${String(result['settlement'])}, effectStatus=${status}.`,
      `It still puts you on '${String(result['youAreOn'])}'.`,
    ].join('\n');
  }
  return [
    `I could not ${what}, and I am not going to pretend otherwise.`,
    `The desk refused '${String(result['did'] ?? result['action'] ?? '')}' with ${String(result['reason'])}.`,
    ...(typeof result['why'] === 'string' ? [String(result['why'])] : []),
  ].join('\n');
}

function confirmAnswer(result: Record<string, unknown> | null): string {
  if (result?.['judgment'] !== 'needs-confirm') return firedAnswer(result, 'clear the archive');
  const receipts = result['receipts'] as { willDo?: { does?: string; writes?: string[] }; youAreOn?: string } | undefined;
  const willDo = receipts?.willDo;
  return [
    'I am not doing that without you saying yes. Here is what the desk says it would do:',
    `  • ${String(willDo?.does ?? result['does'])}`,
    ...(willDo?.writes ? [`  • it claims to write: ${willDo.writes.join(', ')}`] : []),
    `  • you are on: ${String(receipts?.youAreOn ?? result['youAreOn'])}`,
    '',
    'Say "yes, clear it" and I will confirm the ask.',
  ].join('\n');
}

function replyAnswer(req: LLMRequest): string {
  const fire = lastResult(req, DO_ACTION);
  if (!fire) return 'I never got a result back from the desk, so nothing was sent.';
  if (fire['ok'] !== true) return firedAnswer(fire, 'send that reply');
  const produced = fire['produced'] as { ticketId?: string; to?: string; subject?: string; message?: string } | undefined;
  if (!produced?.ticketId) {
    return `The desk accepted the reply (${String(fire['did'])}, effectStatus=${String(fire['effectStatus'])}) but handed nothing back to quote.`;
  }
  // Whether that row was one of the ones the desk LISTED is not an assumption:
  // it is a lookup in the instance list whats_here actually returned.
  const listed = actionsOf(lastResult(req, WHATS_HERE)).find((line) => line.action.endsWith('.reply-to-ticket'));
  const shown = listed?.instances ?? [];
  const capLine = shown.includes(produced.ticketId)
    ? `That row was among the ${String(shown.length)} the desk listed.`
    : `That row was NOT among the ${String(shown.length)} rows the desk listed — and firing it by id worked anyway.`;
  return [
    `Replied to ${String(produced.ticketId)} — ${String(produced.to)}, "${String(produced.subject)}".`,
    `What went out: "${String(produced.message)}"`,
    `The desk reported settlement=${String(fire['settlement'])}, effectStatus=${String(fire['effectStatus'])}.`,
    capLine,
  ].join('\n');
}

function noListingAnswer(actions: ActionLine[]): string {
  return [
    'I cannot answer a ticket by name from here: the desk offers no action that lists them.',
    `What it does offer: ${actions.map((line) => line.action).join(', ') || 'nothing'}.`,
  ].join('\n');
}

function noTicketAnswer(question: string, listing: { matched: number; tickets: readonly TicketLine[] }): string {
  return [
    `No open ticket matches "${question}", so there is nothing for me to reply to.`,
    listing.tickets.length > 0
      ? `The desk matched ${String(listing.matched)} and showed me ${String(listing.tickets.length)}, from: ${[
          ...new Set(listing.tickets.map((ticket) => ticket.from)),
        ].join(', ')}.`
      : 'The desk matched none.',
  ].join('\n');
}
