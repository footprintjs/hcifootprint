/**
 * ONE SETTLED ANSWER, TWO DOORS.
 *
 * "How did this fire come to rest?" had two implementations. `did_it_work`
 * assembled the full picture — the receipt, the three axes, the later truths
 * riding alongside it, the tour marker, the produced data. The MCP server, folding
 * the settled word into the result of the call that fired, hand-patched three
 * fields it picked out by name. So a remote agent learned LESS from a folded
 * result than the same agent learned one poll later: no `outcome`, no
 * `verifyHeld`, no `writesObserved`, no `arrival`, and — worst of the set — no
 * marker at all on a fire nothing in the app had executed, which reads as "it
 * worked".
 *
 * Now there is one builder, exposed as `port.settledAnswer(transitionId)`, and
 * the transport SPREADS it. Whatever this library knows about a settled fire, it
 * says the same way wherever it is asked.
 *
 * What the builder must never become is a second place where a verdict can be
 * minted. It reads the RETAINED settlement for the receipt and reads live only
 * the two facts the grammar says ride alongside it (`outcomeNow`, `arrival`) —
 * docs/design/answer-grammar.md, "the receipt is never rewritten".
 *
 * MUTATION PROOFS:
 * - 'the two doors answer with the same bytes' — let either side grow a field of
 *   its own and the wire and the poll start teaching two different things about
 *   one fire.
 * - 'the settled facts WIN' — assign the other way round and the fold puts the
 *   fire-time word 'pending' back over an action that has finished.
 * - 'the outcome-moved instruction wins over the frame hint' — keep the frame's
 *   generic next-step line and a model is told to carry on, about an order the
 *   server took back.
 * - 'a missed ceiling mints nothing' — let any settled field through on the
 *   timeout arm and a clock has produced a verdict.
 * - 'the fold never rewrites the retained settlement' — fold onto the session's
 *   own copy and first-settlement-wins is gone.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import { mcpServer } from '../src/mcp.js';
import { readDocPage } from './docs/doc-page.js';
import type {
  NavigationGraph,
  ServeResult,
  Session,
  JourneyToolsPort,
  JourneyToolsPortWithSettlement,
} from '../src/index.js';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function shopMap(): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: {
      catalog: {
        actions: {
          search: { does: 'Search the dresses', writes: ['n'] },
          'go-checkout': { does: 'Go to checkout', goTo: 'checkout' },
        },
      },
      checkout: { actions: { 'place-order': { does: 'Place the order', writes: ['orders'] } } },
    },
    journeys: { browse: { does: 'Look around', steps: ['search', 'go-checkout'] } },
  });
}

/** A wired shop whose handlers do nothing on their own — the tap reports later. */
function wiredPort(handlers?: Record<string, () => unknown>) {
  const session = shopMap().createSession({
    node: 'catalog',
    state: { n: 0, orders: [] },
    onWarn: () => undefined,
  });
  session.registerActions('catalog', {
    handlers: {
      search: handlers?.['search'] ?? (() => undefined),
      'go-checkout': handlers?.['go-checkout'] ?? (() => undefined),
    },
  });
  return { session, port: serveToAgent(session) };
}

/**
 * A desk whose action is called 'ask' — the graph shape where one string names
 * BOTH a fire and a human's approval card. Transition ids are `<action>#<n>`
 * and approval cards are `ask#<n>` from a different counter, so an action with
 * that name collides sooner or later. The app team is warned about it at mint
 * time; nothing in the graph refuses the name.
 *
 * Callers line the two counters up themselves — `await flush()` first, so the
 * mount's own structure row takes `#0` and the next FIRE takes `#1`, which is
 * the number the first card carries.
 */
function twinIdDesk(): { session: Session; port: JourneyToolsPortWithSettlement } {
  const graph = buildNavigationGraph('desk', {
    does: 'A desk',
    pages: {
      home: {},
    },
    actions: {
      ask: {
        on: 'home',
        does: 'Ask the assistant something',
        binding: { kind: 'element', locator: { role: 'button', name: 'Ask' }, actuation: 'click' },
      },
      wipe: {
        on: 'home',
        does: 'Wipe everything',
        confirm: true,
        binding: { kind: 'element', locator: { role: 'button', name: 'Wipe' }, actuation: 'click' },
      },
    },
  });
  const session = graph.createSession({
    node: 'home',
    state: {},
    requireHumanApproval: true,
    onWarn: () => undefined,
  });
  session.registerHandlers({ group: 'app', handlers: { ask: () => undefined, wipe: () => undefined } });
  return { session, port: serveToAgent(session) };
}

/** A real MCP client over an in-memory pair, exactly as a host would connect. */
async function connect(
  session: ReturnType<typeof wiredPort>['session'],
  opts?: { settleWithinMs?: number },
) {
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  const server = mcpServer(session, opts);
  await server.connect(serverT);
  const client = new Client({ name: 'test-host', version: '0.0.0' });
  await client.connect(clientT);
  return client;
}

const text = (res: unknown): ServeResult =>
  JSON.parse((res as { content: { text: string }[] }).content[0].text) as ServeResult;

// ---------------------------------------------------------------------------
// The door itself
// ---------------------------------------------------------------------------

describe('port.settledAnswer — the settled truth as a RESULT, not a promise', () => {
  it('is undefined while the fire is still in flight — "no answer yet", never a guess', () => {
    const { port } = wiredPort();
    const fired = port.call('shop.do_action', { action: 'search' });
    expect(fired['effectStatus']).toBe('pending');

    expect(port.settledAnswer(fired['transitionId'] as string)).toBeUndefined();
  });

  it('answers with the facts once the app has reported', () => {
    const { session, port } = wiredPort();
    const fired = port.call('shop.do_action', { action: 'search' });
    session.updateState({ n: 1 }, { transitionId: fired['transitionId'] as string });

    expect(port.settledAnswer(fired['transitionId'] as string)).toMatchObject({
      effectStatus: 'performed',
      outcome: 'committed',
      effectVerified: true,
      writesObserved: true,
    });
  });

  it('refuses an id no settlement can ever exist for — BY NAME, synchronously', () => {
    // The same law `whenSettled` holds, and the reason both hold it: silence
    // about a mistyped id reads as "not finished yet", which is how a wrong id
    // becomes a confident wrong answer under somebody's ceiling.
    const { port } = wiredPort();
    expect(() => port.settledAnswer('catalog.search#404')).toThrow(/no transition/);
  });

  it('serves no envelope of its own — the arm that has one adds it', () => {
    // `settled: true` deliberately stays behind: the word answers a different
    // question from `settlement` (does a commit bundle exist?), and two names
    // one letter apart on one payload is something nobody can read. The fold
    // drops `settlement` rather than letting the pair meet at all.
    const { session, port } = wiredPort();
    const fired = port.call('shop.do_action', { action: 'search' });
    session.updateState({ n: 1 }, { transitionId: fired['transitionId'] as string });

    const answer = port.settledAnswer(fired['transitionId'] as string)!;
    expect(answer).not.toHaveProperty('ok');
    expect(answer).not.toHaveProperty('settled');
    expect(answer).not.toHaveProperty('youAreOn');
    expect(answer).not.toHaveProperty('version');
  });

  it('the two doors answer with the same bytes — one builder, or none', async () => {
    const { session, port } = wiredPort({ search: () => [{ id: 'd6' }] });
    const fired = port.call('shop.do_action', { action: 'search' });
    const id = fired['transitionId'] as string;
    await flush(); // the handler runs deferred; its return lands on the record
    session.updateState({ n: 1 }, { transitionId: id });

    const poll = port.call('shop.did_it_work', { transitionId: id });
    expect(poll['data']).toEqual([{ id: 'd6' }]); // the produced data is in scope here
    // did_it_work = the facts, in its own envelope. Strip the envelope and
    // nothing may be left over on either side.
    const { ok, settled, did, youAreOn, version, ...facts } = poll;
    expect(ok).toBe(true);
    expect(settled).toBe(true);
    expect(did).toBe('catalog.search');
    expect(youAreOn).toBe('catalog');
    expect(typeof version).toBe('number');
    expect(port.settledAnswer(id)).toEqual(facts);
  });

  it('every key the builder can serve is on the page a remote host reads', async () => {
    // The fold table in mcp.mdx is the surface an author writing an MCP host
    // reads, and it went stale the moment the builder learned a new key — it was
    // already missing `stillWorking` when a bound work row was open. Enumerated
    // from a RICH answer rather than from a list somebody remembers to update.
    const { session, port } = wiredPort({ search: () => [{ id: 'd6' }] });
    const fired = port.call('shop.do_action', { action: 'search' });
    const id = fired['transitionId'] as string;
    await flush();
    session.beginWork('Indexing the results', { transitionId: id });
    session.updateState({ n: 1 }, { transitionId: id });

    const answer = port.settledAnswer(id)!;
    expect(Object.keys(answer)).toEqual(
      expect.arrayContaining(['effectStatus', 'outcome', 'writesObserved', 'data', 'stillWorking']),
    );
    const page = readDocPage('mcp');
    const table = page.slice(page.indexOf('### What the fold rewrites'), page.indexOf('## The subpath'));
    for (const key of Object.keys(answer)) expect(table).toContain(`\`${key}\``);
    // …and the two words the fold DELETES are named there too, so a reader is
    // never left wondering where a key they had went.
    expect(table).toContain('`howToSettle`');
    expect(table).toContain('`settlement`');
  });

  it('one id, two objects: BOTH doors refuse — the builder never answers about one of them', async () => {
    // The id spaces really can meet (docs/design/answer-grammar.md): transition
    // ids are `<action>#<n>` and approval cards are `ask#<n>` from a different
    // counter, so an app with an action called 'ask' mints one string for two
    // objects. `did_it_work` has always refused it. The builder beside it did
    // not — it answered with the fire's settled facts, which is the exact wrong
    // answer that refusal exists to prevent: a settled fire reported as the fate
    // of a human's open card.
    const { session, port } = twinIdDesk();
    await flush();
    const askId = port.call('desk.do_action', { action: 'wipe' })['askId'] as string;
    expect(session.fire('ask', { source: 'agent' })).toMatchObject({ ok: true });
    await flush();
    expect(session.transitions().some((row) => row.id === askId)).toBe(true);

    expect(port.call('desk.did_it_work', { transitionId: askId })).toMatchObject({
      ok: false,
      reason: 'AMBIGUOUS_ID',
    });
    // Not `undefined` either — that is this door's word for "still in flight",
    // and a fire that has come to rest reported as unfinished is a second wrong
    // answer stacked on the first.
    expect(() => port.settledAnswer(askId)).toThrow(/names two different things/);
    // The card really is open and the fire really has settled: both answers
    // existed, and neither was given.
    expect(session.asks().some((row) => row.askId === askId && row.answer === undefined)).toBe(true);
    expect(session.settlementIfKnown(askId)?.effectStatus).toBe('performed');
  });

  it('a plain askId still gets the refusal it always got — the ambiguity arm invents none', () => {
    // An ask id that names NO transition is not ambiguous, it is simply not a
    // fire. The older sentence is the one that teaches there ("only fire() opens
    // a settlement"), so the new arm must sit past the old one, not in front.
    const { session, port } = wiredPort();
    port.call('shop.do_action', { action: 'place-order' }); // never fired: no such step here
    const asked = port.call('shop.do_action', { action: 'search' });
    expect(asked['askId']).toBeUndefined();
    expect(() => port.settledAnswer('ask#0')).toThrow(/no transition/);
    expect(session.asks()).toHaveLength(0);
  });
});

describe('a port hand-written against an earlier release still compiles', () => {
  // The published-interface law, held for the second door exactly as it was for
  // the first: `settledAnswer` is OPTIONAL on JourneyToolsPort. This file is in
  // tsconfig.test.json, so a required member would be a compile error here
  // before it was ever a red test.
  const double: JourneyToolsPort = {
    tools: () => [],
    call: (name: string): ServeResult => ({ ok: false, reason: 'UNKNOWN_TOOL', asked: name }),
  };

  it('is honest about the door it does not have — absent, never a stub that lies', () => {
    expect(double.settledAnswer).toBeUndefined();
  });

  it('…and the BUILT port always has it', () => {
    const { port } = wiredPort();
    expect(typeof port.settledAnswer).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// The fold — the transport spreading the same answer
// ---------------------------------------------------------------------------

describe('the MCP fold serves what the poll would have served', () => {
  /** A shop whose search reports its own delta after `delayMs`. */
  function slowShop(delayMs: number, fail?: string) {
    const session = shopMap().createSession({
      node: 'catalog',
      state: { n: 0, orders: [] },
      onWarn: () => undefined,
    });
    session.registerActions('catalog', {
      handlers: {
        search: async () => {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          if (fail) throw new Error(fail);
          session.updateState({ n: 1 });
          return [{ id: 'd6' }];
        },
        'go-checkout': () => undefined,
      },
    });
    return session;
  }

  it('the whole answer crosses, not three fields picked out by name', async () => {
    const session = slowShop(5);
    const client = await connect(session, { settleWithinMs: 200 });
    const folded = text(await client.callTool({ name: 'shop.do_action', arguments: { action: 'search' } }));

    // The settled facts a hand-patched fold never carried:
    expect(folded).toMatchObject({
      effectStatus: 'performed',
      outcome: 'committed',
      effectVerified: true,
      writesObserved: true,
    });
    // …and it is exactly what the model would have got by polling.
    const poll = text(
      await client.callTool({
        name: 'shop.did_it_work',
        arguments: { transitionId: folded['transitionId'] as string },
      }),
    );
    for (const key of ['effectStatus', 'outcome', 'effectVerified', 'writesObserved', 'data']) {
      expect(folded[key]).toEqual(poll[key]);
    }
  });

  it('the settled facts WIN over the fire-time words they overlap with', async () => {
    const session = slowShop(5);
    const client = await connect(session, { settleWithinMs: 200 });
    const folded = text(await client.callTool({ name: 'shop.do_action', arguments: { action: 'search' } }));

    // 'pending' was true when the port built the result and is not true now.
    expect(folded['effectStatus']).toBe('performed');
    // The fire's own identity is untouched — the builder does not serve it.
    expect(folded).toMatchObject({ ok: true, did: 'catalog.search' });
    expect(typeof folded['transitionId']).toBe('string');
    // The pointer told the model to go and poll; it just got the answer.
    expect(folded).not.toHaveProperty('howToSettle');
  });

  it('a fire-time word the settled facts supersede is DROPPED, never left saying the opposite', async () => {
    // `settlement` answers "does a commit bundle exist YET?" — a question whose
    // whole meaning is "as of return time". A folded payload no longer describes
    // return time, and leaving the word in put 'awaiting-state' on the same
    // object as `writesObserved: true`, a fact read FROM the bundle it says does
    // not exist. That is the collision class this codebase renamed
    // `verified` → `writesObserved` to kill, arriving through the one word the
    // settled builder has no twin for.
    const session = slowShop(5);
    const client = await connect(session, { settleWithinMs: 200 });
    const folded = text(await client.callTool({ name: 'shop.do_action', arguments: { action: 'search' } }));

    expect(folded).toMatchObject({ effectStatus: 'performed', writesObserved: true });
    expect(folded).not.toHaveProperty('settlement');
    // Nothing is invented in its place: the library stops saying, and the poll
    // has never carried the word either — so the two doors still agree.
    const poll = text(
      await client.callTool({
        name: 'shop.did_it_work',
        arguments: { transitionId: folded['transitionId'] as string },
      }),
    );
    expect(poll).not.toHaveProperty('settlement');
  });

  it('a refused answer costs the caller nothing it already had', async () => {
    // The builder refuses an ambiguous id by throwing. Relayed, that throw would
    // become `isError` and the model would lose the result of a fire that really
    // happened — over an app whose only mistake was naming an action 'ask'. So
    // the transport honours the refusal instead: fold nothing, remove nothing,
    // and leave the pointer that sends the model to the door with the sentence.
    const { session, port } = twinIdDesk();
    await flush();
    const askId = port.call('desk.do_action', { action: 'wipe' })['askId'] as string;
    const client = await connect(session as never, { settleWithinMs: 200 });
    const fired = text(await client.callTool({ name: 'desk.do_action', arguments: { action: 'ask' } }));

    expect(fired['ok']).toBe(true);
    expect(fired['transitionId']).toBe(askId); // the twin, minted by this very call
    expect(fired['settlement']).toBe('settled'); // untouched: nothing was folded
    expect(fired).toHaveProperty('howToSettle');
    expect(fired).not.toHaveProperty('outcome');
    // …and the door it points at answers the refusal in full words.
    const poll = text(await client.callTool({ name: 'desk.did_it_work', arguments: { transitionId: askId } }));
    expect(poll).toMatchObject({ ok: false, reason: 'AMBIGUOUS_ID' });
  });

  it('a MISSED ceiling leaves the fire-time word exactly as it was — nothing folded, nothing dropped', async () => {
    // The mirror of the test above, and the reason the delete lives inside the
    // fold rather than beside it: with no settled facts on the payload, the
    // fire-time word is still the truth at return time and still the caller's.
    const session = slowShop(80);
    const client = await connect(session, { settleWithinMs: 0 });
    const folded = text(await client.callTool({ name: 'shop.do_action', arguments: { action: 'search' } }));

    expect(folded).toMatchObject({ effectStatus: 'pending', settlement: 'awaiting-state' });
    expect(folded).toHaveProperty('howToSettle');
  });

  it('the outcome-moved instruction wins over the frame’s next-step hint', async () => {
    // A journey-step result carries frameData's "call this tool again with step
    // …". If the app took the action back in the meantime, that line is the
    // wrong move to be handed: the settled answer's own instruction — go and
    // look at whats_here — must be the one that survives the fold.
    const session = shopMap().createSession({
      node: 'catalog',
      state: { n: 0, orders: [] },
      onWarn: () => undefined,
    });
    session.registerActions('catalog', {
      handlers: {
        search: () => {
          session.updateState({ n: 1 }); // settles: performed / committed
          session.reject(session.transitions().at(-1)!.id); // …and the server says no
          return [{ id: 'd6' }];
        },
        'go-checkout': () => undefined,
      },
    });
    const client = await connect(session, { settleWithinMs: 200 });
    await client.callTool({ name: 'shop.journey.browse', arguments: {} }); // open the frame
    const folded = text(
      await client.callTool({ name: 'shop.journey.browse', arguments: { step: 'search' } }),
    );

    expect(folded).toMatchObject({
      effectStatus: 'performed', // the RECEIPT stands
      outcome: 'committed',
      outcomeNow: 'rolled-back', // …and the later word rides alongside it
    });
    expect(String(folded['howToAct'])).toContain('whats_here');
    expect(String(folded['howToAct'])).not.toContain('readySteps');
    // The frame is still open and still says so — only the instruction moved.
    expect(folded['frame']).toBe('open');
  });

  it('carries the tour marker — a fire nothing executed never reads as done', async () => {
    // The single worst thing a three-field fold left out: `materialized: false`
    // survived on the fire-time result but nothing re-stated it, and the poll
    // one call later did. Now both doors say it.
    const session = buildNavigationGraph('tour', {
      pages: { catalog: { actions: { save: { does: 'Save the dress', writes: ['saved'] } } } },
    }).createSession({
      node: 'catalog',
      state: { saved: false },
      allowUnmaterializedFires: true,
      onWarn: () => undefined,
    });
    const client = await connect(session as ReturnType<typeof wiredPort>['session'], {
      settleWithinMs: 50,
    });
    const folded = text(await client.callTool({ name: 'tour.do_action', arguments: { action: 'save' } }));

    expect(folded).toMatchObject({ materialized: false, executed: false, effectStatus: 'unobservable' });
    expect(String(folded['why'])).toContain('never performed');
  });

  it('a failure crosses as capped TEXT, from the one place that caps it', async () => {
    const session = slowShop(5, 'card declined');
    const client = await connect(session, { settleWithinMs: 200 });
    const folded = text(await client.callTool({ name: 'shop.do_action', arguments: { action: 'search' } }));

    expect(folded['effectStatus']).toBe('refused');
    expect(String(folded['error'])).toContain('card declined');
    expect(String(folded['error']).length).toBeLessThanOrEqual(201);
  });
});

// ---------------------------------------------------------------------------
// The two things this must never become
// ---------------------------------------------------------------------------

describe('a missed ceiling mints nothing', () => {
  it('pending STANDS and not one settled field appears', async () => {
    // A timeout is a ceiling on WAITING, never a verdict (answer-grammar rule
    // 2). The attack is a fold that "helpfully" fills in what it can when the
    // race is lost — every field below would then be a guess.
    const session = shopMap().createSession({
      node: 'catalog',
      state: { n: 0, orders: [] },
      onWarn: () => undefined,
    });
    session.registerActions('catalog', {
      handlers: {
        search: async () => {
          await new Promise((resolve) => setTimeout(resolve, 40));
          session.updateState({ n: 1 });
          return [{ id: 'd6' }];
        },
      },
    });
    const client = await connect(session, { settleWithinMs: 1 });
    const timedOut = text(await client.callTool({ name: 'shop.do_action', arguments: { action: 'search' } }));

    expect(timedOut['effectStatus']).toBe('pending');
    expect(String(timedOut['howToSettle'])).toContain('shop.did_it_work');
    for (const minted of [
      'outcome',
      'outcomeNow',
      'effectVerified',
      'writesObserved',
      'verifyHeld',
      'arrival',
      'arrivalMeans',
      'toNode',
      'error',
      'data',
    ]) {
      expect(timedOut).not.toHaveProperty(minted);
    }
    await flush();
  });

  it('no tool argument was grown to ask for a longer wait', () => {
    // The ceiling is the SERVER's, and `call()` is synchronous by contract. An
    // `awaitSettlement` or `timeoutMs` argument would put a promise behind a
    // tool schema — and change the tool array's bytes for every caller, which
    // is the one thing Mode B's whole design refuses.
    const { port } = wiredPort();
    const bytes = JSON.stringify(port.tools());
    expect(bytes).not.toContain('awaitSettlement');
    expect(bytes).not.toContain('timeoutMs');
    expect(bytes).not.toContain('settleWithin');
  });
});

describe('the fold never rewrites the retained settlement', () => {
  it('the session’s receipt is byte-identical after a folded call', async () => {
    const session = shopMap().createSession({
      node: 'catalog',
      state: { n: 0, orders: [] },
      onWarn: () => undefined,
    });
    session.registerActions('catalog', {
      handlers: {
        search: () => {
          session.updateState({ n: 1 });
          return [{ id: 'd6' }];
        },
      },
    });
    const client = await connect(session, { settleWithinMs: 50 });
    const folded = text(await client.callTool({ name: 'shop.do_action', arguments: { action: 'search' } }));
    const id = folded['transitionId'] as string;

    const receipt = session.settlementIfKnown(id)!;
    expect(receipt.effectStatus).toBe('performed');
    expect(receipt.outcome).toBe('committed');

    // The app takes it back. The RECEIPT still says what it said; only the
    // live record moved, and that is the fact that rides alongside.
    session.reject(id);
    const after = session.settlementIfKnown(id)!;
    expect(after.effectStatus).toBe('performed');
    expect(after.outcome).toBe('committed');
    expect(after.transition.outcome).toBe('committed');

    const poll = text(await client.callTool({ name: 'shop.did_it_work', arguments: { transitionId: id } }));
    expect(poll).toMatchObject({ effectStatus: 'performed', outcome: 'committed', outcomeNow: 'rolled-back' });
  });

  it('a consumer mutating the answer cannot reach the session’s copy', async () => {
    const { session, port } = wiredPort({ search: () => [{ id: 'd6' }] });
    const fired = port.call('shop.do_action', { action: 'search' });
    const id = fired['transitionId'] as string;
    await flush();
    session.updateState({ n: 1 }, { transitionId: id });

    const answer = port.settledAnswer(id)!;
    (answer['data'] as { id: string }[])[0].id = 'TAMPERED';
    answer['effectStatus'] = 'refused';

    expect(port.settledAnswer(id)).toMatchObject({ effectStatus: 'performed' });
    expect((port.settledAnswer(id)!['data'] as { id: string }[])[0].id).toBe('d6');
    expect(session.settlementIfKnown(id)!.effectStatus).toBe('performed');
  });
});
