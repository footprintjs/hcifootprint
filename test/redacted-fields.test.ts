/**
 * redactedFields — the redaction `redactedKeys` never did.
 *
 * THE HOLE, verified before it was closed. `redactedKeys` was consulted for STATE
 * KEYS and nowhere else (three call sites in session.ts, all of them
 * `#redacted.has(key)`). So the DATA channels rode out untouched: a handler's
 * return value reached the model through `producedFor()`, the settlement and the
 * wire; `TransitionRecord.payload` reached every export door; and 0.7.0's
 * `willUse.input` put the fire's input on the receipts the model relays and into
 * the exported confirm journal. The library said so itself, in `ConfirmWillUse`:
 * "redactedKeys governs state keys, never payloads".
 *
 * THE TENSION THIS FILE PINS DOWN. That same passage calls the receipts exposure
 * DELIBERATE — "the input now rides the receipts to the model, to the human, and
 * into the journal export. That is the point of it" — because a receipt that hides
 * the amount is worse than useless, and 0.7.0's gate recomputes its comparison
 * from those values. So the fix is aimed, opt-in, and per channel; and the gate
 * keeps comparing the REAL values, because it binds to `bound-input.ts`'s
 * detached copy and never to what is rendered. Both halves are tested here: the
 * secret is gone from every audience, and the approval still proves what it
 * proved.
 *
 * MUTATION PROOFS (each one run, and the counts are what it actually did):
 * - Drop redaction point 1 (the record's `payload`, session.ts fire()) → 4 red:
 *   all three under "a fire's payload", plus the widen-after-construction test.
 * - Drop point 2 (the record's `produced`, #invokeHandler) → 3 red: the model's
 *   door, the settlement's own copy, and the wire.
 * - Drop point 3 (the receipts, #willUse) → 4 red: both under "the approval card"
 *   and the two gate tests that assert the marker rode the card.
 * - Return `value` unchanged from `redactFields` → 16 red of 30; the 14 that stay
 *   green are the ones asserting nothing was supposed to change.
 * - Make the option default to something non-empty and "the default path" goes
 *   red — that block asserts the 0.7.0 exposure verbatim, because reproducing what
 *   a consumer signed up for is the only honest non-breaking proof.
 * - Redact inside the gate's copies instead of the rendered ones (swap
 *   `#openAsks`'s `input: bound` for a redacted one) and "the gate still proves the
 *   real values" goes red: the approved fire is refused APPROVAL_MISMATCH.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REDACTED, buildNavigationGraph, skillsAsTools } from '../src/index.js';
import { redactFields } from '../src/traverse/redact-fields.js';
import type { NavigationGraph, Session, TransitionRecord } from '../src/index.js';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** An obvious fake — this suite never carries a real credential. */
const CARD = '4111-1111-1111-9999';
const TOKEN = 'sk-test-not-a-real-key';

function shopMap(): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: {
      checkout: {
        tools: {
          'place-order': { does: 'Place the order', confirm: true, writes: ['orders'] },
          lookup: { does: 'Look up the order', writes: ['found'] },
          // No declared writes: this is the fire whose SETTLEMENT carries
          // `produced` (the handler finishing is the only event that can answer
          // it), so the settlement channel gets its own honest test.
          peek: { does: 'Peek at the order' },
        },
      },
    },
  });
}

interface Wired {
  session: Session;
  /** What the handler was actually handed — redaction may never change this. */
  seen: unknown[];
}

/**
 * A wired session, optionally redacting and optionally enforcing. The handler
 * records its argument and returns a payload carrying a fake credential.
 */
function wired(opts?: {
  redactedFields?: { payload?: string[]; produced?: string[] };
  enforce?: boolean;
}): Wired {
  const seen: unknown[] = [];
  const session = shopMap().createSession({
    node: 'checkout',
    state: { orders: [], found: null },
    onWarn: () => undefined,
    ...(opts?.redactedFields ? { redactedFields: opts.redactedFields } : {}),
    ...(opts?.enforce ? { requireHumanApproval: true as const } : {}),
  });
  session.registerToolGroup('checkout', {
    handlers: {
      'place-order': (input?: unknown) => {
        seen.push(input);
        return undefined;
      },
      lookup: (input?: unknown) => {
        seen.push(input);
        return { orderId: 'o-77', apiToken: TOKEN, nested: { apiToken: TOKEN } };
      },
      peek: (input?: unknown) => {
        seen.push(input);
        return { orderId: 'o-77', apiToken: TOKEN };
      },
    },
  });
  return { session, seen };
}

const recordFor = (session: Session, id: string): TransitionRecord =>
  session.transitions().find((row) => row.id === id)!;

// ---------------------------------------------------------------------------
// The path grammar — one marker, and the honesty rules around it
// ---------------------------------------------------------------------------

describe('the path grammar', () => {
  it('replaces a named field with the marker and leaves its siblings alone', () => {
    expect(redactFields({ total: 42, cardNumber: CARD }, ['cardNumber'])).toEqual({
      total: 42,
      cardNumber: REDACTED,
    });
  });

  it('walks a dot path into nested objects', () => {
    expect(redactFields({ payment: { brand: 'visa', token: TOKEN } }, ['payment.token'])).toEqual({
      payment: { brand: 'visa', token: REDACTED },
    });
  });

  it('descends an array element-wise: one path hides the field in every item', () => {
    const value = { items: [{ sku: 'a', token: TOKEN }, { sku: 'b', token: TOKEN }] };
    expect(redactFields(value, ['items.token'])).toEqual({
      items: [
        { sku: 'a', token: REDACTED },
        { sku: 'b', token: REDACTED },
      ],
    });
  });

  it('a path that matches nothing returns the very same value — no copy, no change', () => {
    const value = { total: 42 };
    // Reference identity, not deep equality: this is what keeps the near-default
    // path byte-identical for a consumer who redacts a field they never send.
    expect(redactFields(value, ['cardNumber', 'payment.token'])).toBe(value);
    expect(redactFields(value, [])).toBe(value);
    expect(redactFields(value, undefined)).toBe(value);
    expect(redactFields(value, ['', '.'])).toBe(value);
  });

  it('ABSENT STAYS ABSENT: an undefined-valued field is not marked', () => {
    // A marker there would announce a secret that was never sent — and this
    // library reads undefined as absent everywhere else (sanitizeProduced and
    // sameInput both drop undefined-valued keys).
    const value = { total: 42, cardNumber: undefined };
    expect(redactFields(value, ['cardNumber'])).toBe(value);
  });

  it('null IS marked: "explicitly nothing" is a value the app chose to send', () => {
    expect(redactFields({ cardNumber: null }, ['cardNumber'])).toEqual({ cardNumber: REDACTED });
  });

  it('a primitive on the path is untouched — a string cannot hold a named field', () => {
    const value = { payment: 'visa' };
    expect(redactFields(value, ['payment.token'])).toBe(value);
  });

  it('FAIL CLOSED: a value we cannot read faithfully is hidden WHOLE, never reached into', () => {
    // A Map's entries live in internal slots and a getter can sit on a prototype,
    // so own-property enumeration cannot prove the secret is gone. Hiding the
    // whole value is visible and safe; reaching inside would be a guess.
    expect(redactFields({ payment: new Map([['token', TOKEN]]) }, ['payment.token'])).toEqual({
      payment: REDACTED,
    });
    class Wallet {
      constructor(readonly token: string) {}
    }
    expect(redactFields({ payment: new Wallet(TOKEN) }, ['payment.token'])).toEqual({
      payment: REDACTED,
    });
  });

  it('never mutates the value handed in — the handler is about to be given it', () => {
    const value = { payment: { token: TOKEN } };
    redactFields(value, ['payment.token']);
    expect(value.payment.token).toBe(TOKEN);
  });

  it('is the SAME marker a redacted state key already shows in guard evidence', () => {
    // One marker across both mechanisms and both sibling libraries, so a reader
    // who has seen it once knows what it means everywhere.
    const graph = buildNavigationGraph('gate', {
      pages: { home: { tools: { act: { does: 'Act', when: { secret: { eq: 'yes' } } } } } },
    });
    const session = graph.createSession({
      node: 'home',
      state: { secret: 'yes' },
      redactedKeys: ['secret'],
    });
    expect(session.available().edges[0]!.evidence[0]!.actualSummary).toBe(REDACTED);
  });
});

// ---------------------------------------------------------------------------
// THE HOLE, closed: a handler's return value
// ---------------------------------------------------------------------------

describe("a handler's return value", () => {
  it('a secret in the return reaches neither the model, the settlement, nor an export', async () => {
    const { session } = wired({ redactedFields: { produced: ['apiToken', 'nested.apiToken'] } });
    const fired = session.fire('checkout.lookup', { source: 'agent' });
    expect(fired.ok).toBe(true);
    const id = fired.ok ? fired.transition.id : '';
    session.updateState({ found: true });
    await tick();

    // 1. the model's door
    const produced = session.producedFor(id) as { orderId: string; apiToken: string; nested: { apiToken: string } };
    expect(produced.apiToken).toBe(REDACTED);
    expect(produced.nested.apiToken).toBe(REDACTED);
    // The data the agent actually needs is untouched — this is the act → get
    // data back channel, and blanking it would break the feature, not secure it.
    expect(produced.orderId).toBe('o-77');

    // 2. any export of the log (an audit sink, a 'transition' listener)
    expect((recordFor(session, id).produced as { apiToken: string }).apiToken).toBe(REDACTED);
  });

  it('the SETTLEMENT’s own copy carries the marker (the no-declared-writes fire)', async () => {
    const { session } = wired({ redactedFields: { produced: ['apiToken'] } });
    const fired = session.fire('checkout.peek', { source: 'agent' });
    const settled = await session.settlementOf(fired.ok ? fired.transition.id : '');
    expect((settled.produced as { orderId: string; apiToken: string })).toEqual({
      orderId: 'o-77',
      apiToken: REDACTED,
    });
  });

  it('the secret is gone from the WIRE — did_it_work carries the marker, not the key', async () => {
    const { session } = wired({ redactedFields: { produced: ['apiToken', 'nested.apiToken'] } });
    const port = skillsAsTools(session);
    const fired = port.call('shop.do_action', { action: 'lookup' });
    session.updateState({ found: true });
    await tick();

    const answer = port.call('shop.did_it_work', { transitionId: fired['transitionId'] as string });
    const data = answer['data'] as { orderId: string; apiToken: string };
    expect(data.orderId).toBe('o-77');
    expect(data.apiToken).toBe(REDACTED);
    expect(JSON.stringify(answer)).not.toContain(TOKEN);
  });

  it("the app's own returned object is untouched — redaction observes, it never rewrites", async () => {
    const returned: { apiToken: string }[] = [];
    const session = shopMap().createSession({
      node: 'checkout',
      state: { found: null },
      onWarn: () => undefined,
      redactedFields: { produced: ['apiToken'] },
    });
    session.registerToolGroup('checkout', {
      handlers: {
        lookup: () => {
          const value = { apiToken: TOKEN };
          returned.push(value);
          return value;
        },
      },
    });
    session.fire('checkout.lookup', { source: 'agent' });
    session.updateState({ found: true });
    await tick();
    expect(returned[0]!.apiToken).toBe(TOKEN);
  });
});

// ---------------------------------------------------------------------------
// THE HOLE, closed: a fire's payload
// ---------------------------------------------------------------------------

describe("a fire's payload", () => {
  it('a secret in the payload is marked on the record while the HANDLER still gets it', async () => {
    const { session, seen } = wired({ redactedFields: { payload: ['cardNumber'] } });
    const fired = session.fire('checkout.place-order', {
      source: 'user',
      payload: { total: 42, cardNumber: CARD },
    });
    await tick();

    const record = recordFor(session, fired.ok ? fired.transition.id : '');
    expect(record.payload).toEqual({ total: 42, cardNumber: REDACTED });
    // The one thing an observability dial may never do is change what the app
    // does. The handler is handed the caller's own object, unredacted.
    expect(seen[0]).toEqual({ total: 42, cardNumber: CARD });
  });

  it('nothing exported from the session carries the secret', async () => {
    const { session } = wired({ redactedFields: { payload: ['cardNumber'] } });
    const fired = session.fire('checkout.place-order', {
      source: 'user',
      payload: { total: 42, cardNumber: CARD },
    });
    const id = fired.ok ? fired.transition.id : '';
    session.updateState({ orders: [1] });
    await tick();

    const settled = await session.settlementOf(id);
    expect(JSON.stringify(settled.transition)).not.toContain(CARD);
    expect(JSON.stringify(session.transitions())).not.toContain(CARD);
    expect(JSON.stringify(session.confirms())).not.toContain(CARD);
  });

  it('a live transition listener sees the marker too — one capture point, every door', () => {
    const { session } = wired({ redactedFields: { payload: ['cardNumber'] } });
    const seenByListener: unknown[] = [];
    session.on('transition', (record) => seenByListener.push(record.payload));
    session.fire('checkout.place-order', { source: 'user', payload: { total: 42, cardNumber: CARD } });
    expect(seenByListener[0]).toEqual({ total: 42, cardNumber: REDACTED });
  });
});

// ---------------------------------------------------------------------------
// THE HOLE, closed: the approval card — and the gate that must survive it
// ---------------------------------------------------------------------------

describe('the approval card', () => {
  it('ONE list governs both homes of the one value: the receipts and the record', () => {
    const { session } = wired({ redactedFields: { payload: ['cardNumber'] } });
    const { receipts } = session.confirmAsk('checkout.place-order', {
      source: 'agent',
      input: { total: 42, cardNumber: CARD },
    });
    // What the serving layer relays to the model (and the model to the person)…
    expect(receipts.willUse!.input).toEqual({ total: 42, cardNumber: REDACTED });
    // …and what an auditor exports. A field hidden from the log that still rode
    // the card would not be hidden at all.
    expect(JSON.stringify(session.confirms())).not.toContain(CARD);
    // The amount the human must actually judge is still on the card.
    expect((receipts.willUse!.input as { total: number }).total).toBe(42);
  });

  it('the served ask carries the marker into the model’s result', () => {
    const { session } = wired({ redactedFields: { payload: ['cardNumber'] }, enforce: true });
    const port = skillsAsTools(session);
    const asked = port.call('shop.do_action', {
      action: 'place-order',
      input: { total: 42, cardNumber: CARD },
    });
    expect(asked['askId']).toBeDefined();
    expect(JSON.stringify(asked)).not.toContain(CARD);
    expect(JSON.stringify(asked)).toContain(REDACTED);
  });
});

describe('the gate still proves the real values', () => {
  it('an approved fire crosses: the comparison runs on the payload, not on the card', async () => {
    const { session } = wired({ redactedFields: { payload: ['cardNumber'] }, enforce: true });
    const input = { total: 42, cardNumber: CARD };
    const { askId, receipts } = session.confirmAsk('checkout.place-order', { source: 'agent', input });
    session.approveAsk(askId, { by: 'alice@ops' });

    const fired = session.fire('checkout.place-order', { source: 'agent', payload: { ...input }, askId });
    await tick();

    expect(fired.ok).toBe(true);
    // The chain an auditor reads: ask → approved → used.
    expect(session.confirms().map((row) => row.kind)).toEqual(['ask', 'approved', 'used']);
    // And the card the human was shown carried the marker all along. Both facts
    // in one test on purpose: this pair IS the design decision.
    expect((receipts.willUse!.input as { cardNumber: string }).cardNumber).toBe(REDACTED);
  });

  it('laundering still refused: approve total 42, fire total 9999 → APPROVAL_MISMATCH on input', () => {
    const { session } = wired({ redactedFields: { payload: ['cardNumber'] }, enforce: true });
    const { askId } = session.confirmAsk('checkout.place-order', {
      source: 'agent',
      input: { total: 42, cardNumber: CARD },
    });
    session.approveAsk(askId, { by: 'alice@ops' });

    expect(
      session.fire('checkout.place-order', {
        source: 'agent',
        payload: { total: 9_999, cardNumber: CARD },
        askId,
      }),
    ).toMatchObject({ ok: false, reason: 'APPROVAL_MISMATCH', differs: 'input' });
  });

  it('echoing the redacted CARD back as the payload is refused — a rendering is not an input', () => {
    // The one new attack the marker creates: a caller that reads the receipts and
    // fires what it saw. The gate compares against the human's bound copy, so the
    // marker does not match the real card, and the refusal is the correct answer.
    const { session } = wired({ redactedFields: { payload: ['cardNumber'] }, enforce: true });
    const { askId } = session.confirmAsk('checkout.place-order', {
      source: 'agent',
      input: { total: 42, cardNumber: CARD },
    });
    session.approveAsk(askId, { by: 'alice@ops' });

    expect(
      session.fire('checkout.place-order', {
        source: 'agent',
        payload: { total: 42, cardNumber: REDACTED },
        askId,
      }),
    ).toMatchObject({ ok: false, reason: 'APPROVAL_MISMATCH', differs: 'input' });
  });

  it('redacting the AMOUNT is possible and the gate still holds — the cost is the human’s card', () => {
    // Stated rather than prevented: aim this list at the amount and the person
    // approves a card that no longer shows it. The library refuses to guess which
    // field a human needs, which is exactly why the option is opt-in and per
    // channel — but it will not pretend the gate broke, because it did not.
    const { session } = wired({ redactedFields: { payload: ['total'] }, enforce: true });
    const { askId, receipts } = session.confirmAsk('checkout.place-order', {
      source: 'agent',
      input: { total: 42 },
    });
    expect(receipts.willUse!.input).toEqual({ total: REDACTED });
    session.approveAsk(askId, { by: 'alice@ops' });
    expect(session.fire('checkout.place-order', { source: 'agent', payload: { total: 42 }, askId }).ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// THE NON-BREAKING PROOF — without the option, 0.7.0 byte for byte
// ---------------------------------------------------------------------------

describe('the default path', () => {
  it('with no option the payload, the card and the return carry the raw values', async () => {
    // The reproduction is deliberate: this is what a 0.7.0 consumer signed up for,
    // and it is why the fix is opt-in rather than on.
    const { session } = wired();
    const { receipts } = session.confirmAsk('checkout.place-order', {
      source: 'agent',
      input: { total: 42, cardNumber: CARD },
    });
    expect(receipts.willUse!.input).toEqual({ total: 42, cardNumber: CARD });

    const fired = session.fire('checkout.lookup', { source: 'agent', payload: { cardNumber: CARD } });
    const id = fired.ok ? fired.transition.id : '';
    session.updateState({ found: true });
    await tick();

    expect(recordFor(session, id).payload).toEqual({ cardNumber: CARD });
    expect((session.producedFor(id) as { apiToken: string }).apiToken).toBe(TOKEN);
  });

  it('an EMPTY option changes nothing either, and the payload keeps its identity', () => {
    const { session } = wired({ redactedFields: {} });
    const payload = { total: 42, cardNumber: CARD };
    const fired = session.fire('checkout.place-order', { source: 'user', payload });
    // Reference identity: with nothing to hide, the record holds the caller's own
    // object exactly as it always has (`#copyRecord` still clones at the door).
    expect(fired.ok && fired.transition.payload).toBe(payload);
  });

  it('a redacted PRODUCED path never touches the payload, and the reverse', async () => {
    // Two lists, aimed separately — that separation is the whole point of the
    // shape, so it gets its own proof.
    const { session } = wired({ redactedFields: { produced: ['cardNumber'] } });
    const fired = session.fire('checkout.lookup', { source: 'agent', payload: { cardNumber: CARD } });
    const id = fired.ok ? fired.transition.id : '';
    session.updateState({ found: true });
    await tick();
    expect(recordFor(session, id).payload).toEqual({ cardNumber: CARD });
    expect((session.producedFor(id) as { apiToken: string }).apiToken).toBe(TOKEN);
  });

  it('the option a consumer passed cannot be widened after construction', () => {
    const paths = ['cardNumber'];
    const { session } = wired({ redactedFields: { payload: paths } });
    paths.push('total'); // too late — the policy was read once, at construction
    const fired = session.fire('checkout.place-order', {
      source: 'user',
      payload: { total: 42, cardNumber: CARD },
    });
    expect(fired.ok && fired.transition.payload).toEqual({ total: 42, cardNumber: REDACTED });
  });
});

// ---------------------------------------------------------------------------
// The two homes of one sentence (the repo's content-drift convention)
// ---------------------------------------------------------------------------

describe('the docs say what the library says', () => {
  const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const read = (relative: string): string => readFileSync(path.join(REPO, relative), 'utf8');
  /** Prose compared as PROSE: wrapping and comment markers are formatting, not meaning. */
  const flatten = (text: string): string => text.replace(/[*>"`]/g, ' ').replace(/\s+/g, ' ').trim();

  const homes = ['src/atom/types.ts', 'docs-next/content/docs/serve/receipts.mdx'];

  it('the redactedKeys boundary is one sentence, identical in both homes', () => {
    // The sentence the 0.7.0 hole was DOCUMENTED with. It had to be reworded when
    // the payload half got an answer, and a reword that lands in one home only is
    // how a library starts lying about itself in its own reference.
    const sentence = 'redactedKeys governs state keys and never governed a payload';
    for (const home of homes) {
      expect(flatten(read(home)), `${home} lost the boundary sentence`).toContain(sentence);
    }
  });

  it('the docs quote the marker the code actually emits', () => {
    expect(read('docs-next/content/docs/serve/receipts.mdx')).toContain(REDACTED);
  });

  it('the docs name the option and both of its aimed channels', () => {
    const page = read('docs-next/content/docs/serve/receipts.mdx');
    for (const name of ['redactedFields', 'payload:', 'produced:']) {
      expect(page).toContain(name);
    }
  });
});
