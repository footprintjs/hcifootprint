/**
 * `blockedBecause` — THE APP'S OWN REASON A CONTROL IS OFF, AND WHO CLEARS IT.
 *
 * `enabled: false` says a control is switched off. `unblockedBy` says which
 * action the app CLAIMS would free it. Neither says the thing the component
 * doing the greying already knows in words — "waiting for the upload", "this
 * order is already cancelled", "the amount is above your limit" — and neither
 * says the half that decides the reader's next turn: WHO clears it. A reason
 * cleared by the app means wait. By a person means interrupt them. Invalid
 * means stop waiting for a state that is not coming and report a validation
 * problem. Those are three different turns, and no sentence implies which.
 *
 * A production integration carried a hand-rolled equivalent for months, because
 * the library offered nowhere to put it; three live incidents shaped `clearedBy`
 * into three words rather than free text.
 *
 * THE LAWS THIS FILE PINS, each one a way the feature could have been built
 * dishonestly:
 *
 * - PRESENCE-ONLY, AND ONLY WHILE BLOCKED. A live control carries no blocked
 *   sentence however the app declared one. An app that declares nothing serves
 *   BYTE-IDENTICAL rows.
 * - RIDES BESIDE, NEVER INSIDE. The refusal's authored sentence is unchanged to
 *   the byte; the app's words arrive as a DATA field next to it. App text in an
 *   authored channel is the injection this library exists to refuse.
 * - READ LATE, NEVER CACHED. A reader is called at row assembly, so the row
 *   carries the reason that is true now, not the one that was true last turn.
 * - ABSENCE OVER A GUESS. A reader that throws, or answers a shape this library
 *   cannot read as a reason, serves NO KEY plus one dev warning per action —
 *   never a plausible wrong reason, and never a broken `whats_here`.
 * - ONE READING, THREE PLACES. Both authoring doors refuse a written sentence
 *   with the same words; a reader is judged by the same three questions at read
 *   time, because a build-time refusal cannot reach it.
 * - ROWS ARE RESULTS, NOT TOOLS. Declaring it changes no tool bytes.
 *
 * And the second half of the release, which is what makes the field discover
 * the first: a control switched off imperatively with NEITHER `enabledWhen` nor
 * `blockedBecause` declared warns once, naming both doors. A disable with no
 * declared cause serves a refusal with no evidence — the agent is told no and
 * taught nothing.
 *
 * MUTATION PROOFS (each one run; the counts are what it actually did):
 * - Serve `blockedBecause` on every row instead of the switched-off ones → 3
 *   red: the presence law, the byte-identity pin, and the enabled-row pin.
 * - Cache the reader's first answer → 1 red: the row stops following the app.
 * - Splice `says` into the refusal's `why` → 2 red: the byte-identical sentence
 *   and the authored-channel pin.
 * - Serve a malformed reader answer anyway → 4 red: one per fault arm.
 * - Let the reader's throw escape → 1 red: `whats_here` itself throws.
 * - Warn per served row instead of once per action → 1 red: the flood.
 * - Drop the mount door's validation → 1 red: the two doors stop agreeing.
 * - Compare live-store sentences by object identity → 1 red: a chatty store
 *   re-declares its actions on every emission.
 * - Warn on a switch-off even where a cause IS declared → 2 red: both doors.
 * - Warn every time instead of once per action → 1 red: the second flip.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, fromLiveStore, serveToAgent } from '../src/index.js';
import { readDocPage } from './docs/doc-page.js';
import type {
  BlockedBecause,
  LiveAction,
  LiveActionStore,
  NavigationGraph,
  ServeResult,
  Session,
} from '../src/index.js';

/** The one authored sentence a switched-off control has always carried. */
const DISABLED_WHY =
  'The app has this control switched off right now — on screen and not clickable, the way a greyed ' +
  'button is for a person. That is a STATE, not a verdict on what you asked for: it can change, and ' +
  'nothing here knows what would change it. Do not invent a reason it is off. Call whats_here to see ' +
  'where things stand — a switched-off control is served there with enabled: false — and if it is ' +
  'still off, tell the human it is not available yet.';

/** The clause appended where `enabledWhen` is what proved it. */
const DISABLED_EVIDENCE_WHY =
  'This control also declares a condition for being clickable, and the app’s own state does not meet ' +
  'it — the parts that did not hold ride this result as evidence, named by the app’s own declaration ' +
  'and not guessed here. whats_here may also carry unblockedBy for this control: the actions the app ' +
  'claims write those same parts. That is what the app declared, not a promise: firing one is not ' +
  'promised to free this, and meeting the condition may still leave the control off for a reason ' +
  'nothing here can see. Say what the evidence says, and no more.';

/**
 * A wizard whose Next button is greyed until a recipe is chosen — the same
 * fixture shape the `enabled` suite uses, one declaration wider.
 */
function wizard(opts?: {
  blockedBecause?: unknown;
  recipe?: string;
  warnings?: string[];
}): { session: Session; port: ReturnType<typeof serveToAgent> } {
  const map = buildNavigationGraph('wizard', {
    pages: {
      setup: {
        actions: {
          next: {
            does: 'Go on to the review step',
            enabledWhen: { recipe: { ne: '' } },
            ...(opts?.blockedBecause !== undefined
              ? { blockedBecause: opts.blockedBecause as BlockedBecause }
              : {}),
          },
          restart: { does: 'Start over' },
        },
      },
    },
  });
  const session = map.createSession({
    node: 'setup',
    state: { recipe: opts?.recipe ?? '' },
    onWarn: (message) => opts?.warnings?.push(message),
  });
  session.registerActions('setup', { handlers: { next: () => undefined, restart: () => undefined } });
  return { session, port: serveToAgent(session) };
}

/** One served action row, by qualified id. */
function actionRow(port: ReturnType<typeof serveToAgent>, id: string): ServeResult {
  const rows = port.call('wizard.whats_here', {})['actions'] as ServeResult[];
  return rows.find((row) => row['action'] === id)!;
}

const WAITING: BlockedBecause = { says: 'Choose a recipe first', clearedBy: 'user' };

describe('presence — only while the control is off, and only where the app said so', () => {
  it('a switched-off control carries the app’s own reason, and who clears it', () => {
    const { port } = wizard({ blockedBecause: WAITING });
    expect(actionRow(port, 'setup.next')).toHaveProperty('blockedBecause', WAITING);
  });

  it('an ENABLED control carries none, even though the app declared one', () => {
    // The attack this refuses: serving the declaration wherever it exists. A
    // reason on an open door tells a reader to wait for something that already
    // happened — the same failure `unblockedBy` refuses on the same row.
    const { port } = wizard({ blockedBecause: WAITING, recipe: 'sourdough' });
    expect(actionRow(port, 'setup.next')).not.toHaveProperty('blockedBecause');
    expect(actionRow(port, 'setup.next')).not.toHaveProperty('enabled');
  });

  it('follows the world — the reason arrives and leaves with the marker beside it', () => {
    const { session, port } = wizard({ blockedBecause: WAITING });
    expect(actionRow(port, 'setup.next')).toHaveProperty('blockedBecause');
    session.updateState({ recipe: 'sourdough' }, { stimulus: 'push' });
    expect(actionRow(port, 'setup.next')).not.toHaveProperty('blockedBecause');
  });

  it('AN APP THAT DECLARES NOTHING SERVES BYTE-IDENTICAL ROWS', () => {
    // The whole additive claim, measured rather than asserted: the same app,
    // the same position, one declaration apart — and the bytes a model reads
    // are the same, because the declared control here is clickable.
    const bare = wizard({ recipe: 'sourdough' });
    const declaring = wizard({ blockedBecause: WAITING, recipe: 'sourdough' });
    expect(JSON.stringify(declaring.port.call('wizard.whats_here', {}))).toBe(
      JSON.stringify(bare.port.call('wizard.whats_here', {})),
    );
  });

  it('an app that declares nothing never grows the key, not even on a greyed row', () => {
    const { port } = wizard();
    expect(actionRow(port, 'setup.next')).toHaveProperty('enabled', false);
    expect(actionRow(port, 'setup.next')).not.toHaveProperty('blockedBecause');
  });

  it('rides whichever wire switched the control off — including an imperative one', () => {
    // `enabledWhen` is not the only door to `enabled: false`, and the app's own
    // sentence is most useful exactly where there is no declared condition to
    // derive evidence from.
    const map = buildNavigationGraph('shop', {
      pages: {
        catalog: {
          actions: {
            'add-to-cart': {
              does: 'Add the dress to the cart',
              blockedBecause: { says: 'This size is out of stock', clearedBy: 'app' },
            },
          },
        },
      },
    });
    const session = map.createSession({ node: 'catalog', onWarn: () => undefined });
    const group = session.registerActions('catalog', { handlers: { 'add-to-cart': () => undefined } });
    const row = (): ServeResult | undefined =>
      session.available().edges.find((edge) => edge.affordanceId === 'catalog.add-to-cart') as
        | ServeResult
        | undefined;

    expect(row()).not.toHaveProperty('blockedBecause');
    group.setEnabled('add-to-cart', false);
    expect(row()).toHaveProperty('blockedBecause', { says: 'This size is out of stock', clearedBy: 'app' });
  });

  it('the row owns its bytes — a consumer mutating one cannot rewrite the graph', () => {
    const { port } = wizard({ blockedBecause: WAITING });
    const served = actionRow(port, 'setup.next')['blockedBecause'] as BlockedBecause;
    served.says = 'something the app never said';
    expect(actionRow(port, 'setup.next')).toHaveProperty('blockedBecause', WAITING);
  });
});

describe('the reader form — a reason that changes while the page is open', () => {
  /** A wizard whose blocked reason is read from a variable the app moves. */
  function reading(read: () => BlockedBecause | undefined, warnings: string[] = []) {
    const map = buildNavigationGraph('wizard', {
      pages: {
        setup: {
          actions: {
            next: { does: 'Go on to the review step', enabledWhen: { recipe: { ne: '' } }, blockedBecause: read },
          },
        },
      },
    });
    const session = map.createSession({
      node: 'setup',
      state: { recipe: '' },
      onWarn: (message) => warnings.push(message),
    });
    session.registerActions('setup', { handlers: { next: () => undefined } });
    return { session, port: serveToAgent(session), warnings };
  }

  it('IS READ FRESH AT EVERY ROW ASSEMBLY — never cached', () => {
    // The dishonest implementation this catches: read once, keep the answer.
    // The row would then report the sentence that was true last turn, which is
    // the stale-value class every reading surface here refuses.
    let reason: BlockedBecause = { says: 'Uploading the receipt…', clearedBy: 'app' };
    const { port } = reading(() => reason);
    expect(actionRow(port, 'setup.next')['blockedBecause']).toEqual({
      says: 'Uploading the receipt…',
      clearedBy: 'app',
    });

    reason = { says: 'The receipt was rejected — pick another file', clearedBy: 'user' };

    expect(actionRow(port, 'setup.next')['blockedBecause']).toEqual({
      says: 'The receipt was rejected — pick another file',
      clearedBy: 'user',
    });
  });

  it('answering undefined says NOTHING — absence, spelled the way it is everywhere else', () => {
    const { port, warnings } = reading(() => undefined);
    expect(actionRow(port, 'setup.next')).not.toHaveProperty('blockedBecause');
    expect(warnings).toEqual([]);
  });

  it('A READER THAT THROWS serves nothing, warns once, and whats_here still answers', () => {
    const { port, warnings } = reading(() => {
      throw new Error('the store was torn down');
    });
    const rows = port.call('wizard.whats_here', {})['actions'] as ServeResult[];
    expect(rows.map((row) => row['action'])).toEqual(['setup.next']);
    expect(rows[0]).toHaveProperty('enabled', false);
    expect(rows[0]).not.toHaveProperty('blockedBecause');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("the blockedBecause reader for 'setup.next' threw");
  });

  it('warns ONCE PER ACTION however many rows are served — this runs on a hot path', () => {
    const { port, warnings } = reading(() => {
      throw new Error('the store was torn down');
    });
    port.call('wizard.whats_here', {});
    port.call('wizard.whats_here', {});
    port.call('wizard.do_action', { action: 'next' }); // a refused fire assembles rows too
    expect(warnings).toHaveLength(1);
  });

  it('an answer whose own getter throws is caught too — the read is call, judge and copy', () => {
    // The reader returned; reading its fields did not. Outside the one guard, a
    // single app object takes down available() and every refused fire with it.
    const { port, warnings } = reading(
      () =>
        ({
          get says(): string {
            throw new Error('revoked proxy');
          },
          clearedBy: 'app',
        }) as unknown as BlockedBecause,
    );
    expect(actionRow(port, 'setup.next')).not.toHaveProperty('blockedBecause');
    expect(warnings).toHaveLength(1);
  });

  const unusable: Array<[string, unknown]> = [
    ['a bare string', 'waiting for the upload'],
    ['null', null],
    ['an array', [{ says: 'x', clearedBy: 'app' }]],
    ['a says that is not a string', { says: 42, clearedBy: 'app' }],
    ['an empty says', { says: '   ', clearedBy: 'app' }],
    ['a clearedBy nobody implements', { says: 'Waiting', clearedBy: 'later' }],
    ['a clearedBy that is not a word at all', { says: 'Waiting', clearedBy: 3 }],
  ];

  it.each(unusable)('a reader answering %s serves nothing, and says why once', (_label, answer) => {
    // The same three questions both authoring doors ask, asked one turn later:
    // whatever the compiler would have refused, a reader is refused for.
    const { port, warnings } = reading(() => answer as BlockedBecause);
    expect(actionRow(port, 'setup.next')).not.toHaveProperty('blockedBecause');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('cannot read as a reason');
  });
});

describe('the refusal — beside the authored sentence, never inside it', () => {
  it('THE REFUSAL CARRIES IT AS DATA, and the authored sentence is byte-identical', () => {
    const { port } = wizard({ blockedBecause: WAITING });
    const refused = port.call('wizard.do_action', { action: 'next' });
    expect(refused['reason']).toBe('TOOL_DISABLED');
    expect(refused['retriable']).toBe(true);
    expect(refused['blockedBecause']).toEqual(WAITING);
    // Unchanged to the byte from the release before this field existed: the
    // app's words ride the data rails and never the authored channel.
    expect(refused['why']).toBe(`${DISABLED_WHY} ${DISABLED_EVIDENCE_WHY}`);
  });

  it('the sentence stays an authored constant — no app text is spliced into it', () => {
    const { port } = wizard({ blockedBecause: WAITING });
    expect(String(port.call('wizard.do_action', { action: 'next' })['why'])).not.toContain(WAITING.says);
  });

  it('a refusal with nothing declared is exactly what it was — no key, same sentence', () => {
    const { port } = wizard();
    const refused = port.call('wizard.do_action', { action: 'next' });
    expect(refused).not.toHaveProperty('blockedBecause');
    expect(refused['why']).toBe(`${DISABLED_WHY} ${DISABLED_EVIDENCE_WHY}`);
  });

  it('CLEAREDBY REACHES THE AGENT VERBATIM — on the row and on the refusal alike', () => {
    // The half no sentence implies. Three words, three different turns: wait,
    // interrupt a person, report a validation problem. It crosses as data and
    // this library authors no reading of it.
    for (const clearedBy of ['app', 'user', 'invalid'] as const) {
      const { port } = wizard({ blockedBecause: { says: 'A reason', clearedBy } });
      expect((actionRow(port, 'setup.next')['blockedBecause'] as BlockedBecause).clearedBy).toBe(clearedBy);
      const refused = port.call('wizard.do_action', { action: 'next' });
      expect((refused['blockedBecause'] as BlockedBecause).clearedBy).toBe(clearedBy);
    }
  });

  it('the page teaches all three words, and the live-store page says the door is open', () => {
    // Two findability gaps this release closes, pinned so they cannot re-open:
    // the three clearedBy moves, and the fact — true for releases, written down
    // nowhere — that a live store row may DECLARE, not only bind.
    const guards = readDocPage('guards');
    for (const word of ["'app'", "'user'", "'invalid'"]) expect(guards).toContain(word);
    const liveBindings = readDocPage('live-bindings');
    expect(liveBindings).toContain('enabledWhen');
    expect(liveBindings).toContain('only bind');
  });

  it('the journey surface says the same thing — one edge, never two readings', () => {
    // The regression this refuses: serving the sentence on `whats_here` only.
    // A step listed as switched-off with the reason stripped is the action row
    // minus the one fact that decides whether to wait or fetch a person — the
    // same split `unblockedBy` was fixed for, one release after it shipped.
    const map = buildNavigationGraph('signup', {
      pages: {
        step1: {
          actions: {
            upload: { does: 'Upload the document', writes: ['uploaded'] },
            next: {
              does: 'Continue',
              enabledWhen: { uploaded: { eq: true } },
              blockedBecause: { says: 'Waiting for the document to upload', clearedBy: 'app' },
            },
          },
        },
      },
      journeys: { signup: { does: 'Sign up', steps: ['step1.upload', 'step1.next'] } },
    });
    const session = map.createSession({ node: 'step1', state: { uploaded: false }, onWarn: () => undefined });
    session.registerActions('step1', { handlers: { upload: () => undefined, next: () => undefined } });
    const port = serveToAgent(session);
    const later = port.call('signup.journey.signup', {})['laterSteps'] as ServeResult[];
    expect(later.find((step) => step['step'] === 'step1.next')).toHaveProperty('blockedBecause', {
      says: 'Waiting for the document to upload',
      clearedBy: 'app',
    });
  });

  it('THE TOOL ARRAY IS A CONTRACT: declaring a reason changes no tool bytes', () => {
    // Rows are RESULTS. If a declaration ever grew the served tool array, every
    // consumer's prompt would change underneath them.
    const bare = wizard();
    const declaring = wizard({ blockedBecause: WAITING });
    expect(declaring.port.tools().length).toBeGreaterThan(0);
    expect(JSON.stringify(declaring.port.tools())).toBe(JSON.stringify(bare.port.tools()));
  });
});

describe('both authoring doors refuse a written sentence with the same words', () => {
  /** Compile a graph whose one action declares this blockedBecause. */
  const compile = (blockedBecause: unknown): NavigationGraph =>
    buildNavigationGraph('shop', {
      pages: { catalog: { actions: { pay: { does: 'Pay', blockedBecause: blockedBecause as BlockedBecause } } } },
    });

  /** Mount-declare an action with this blockedBecause on a bare graph. */
  const mount = (blockedBecause: unknown): void => {
    const map = buildNavigationGraph('shop', { pages: { catalog: {} } });
    const session = map.createSession({ node: 'catalog', onWarn: () => undefined });
    session.registerActions('catalog', {
      actions: { pay: { does: 'Pay', blockedBecause: blockedBecause as BlockedBecause } },
    });
  };

  const EMPTY_SAYS =
    'blockedBecause.says is empty — it is your own sentence for why this control is off, and an empty ' +
    'one prints a reason nobody wrote. Write the sentence, or omit blockedBecause entirely.';
  const BAD_CLEARED_BY =
    "blockedBecause.clearedBy must be one of 'app', 'user', 'invalid' — 'app' means the agent waits, " +
    "'user' means interrupt the person, 'invalid' means report a validation problem. There is no fourth " +
    'word, because there is no fourth move.';
  const BAD_SHAPE =
    'blockedBecause must be an object { says, clearedBy } — or a function returning one (and undefined ' +
    'to say nothing).';

  it('an empty says dies at the compile door', () => {
    expect(() => compile({ says: '  ', clearedBy: 'app' })).toThrow(`action 'catalog.pay': ${EMPTY_SAYS}`);
  });

  it('…and at the mount door, in the same words', () => {
    expect(() => mount({ says: '', clearedBy: 'app' })).toThrow(
      `mount-declared action 'catalog.pay': ${EMPTY_SAYS}`,
    );
  });

  it('A FOURTH clearedBy WORD is refused, and the refusal names the three', () => {
    expect(() => compile({ says: 'Waiting on the bank', clearedBy: 'ops' })).toThrow(
      `action 'catalog.pay': ${BAD_CLEARED_BY}`,
    );
    // The three words a reader is sent to, spelled out where they can be read.
    expect(() => compile({ says: 'Waiting on the bank', clearedBy: 'ops' })).toThrow(/'app', 'user', 'invalid'/);
  });

  it('…and at the mount door, in the same words', () => {
    expect(() => mount({ says: 'Waiting on the bank', clearedBy: 'ops' })).toThrow(
      `mount-declared action 'catalog.pay': ${BAD_CLEARED_BY}`,
    );
  });

  it('something that is neither an object nor a reader is refused at both doors', () => {
    expect(() => compile('waiting on the bank')).toThrow(`action 'catalog.pay': ${BAD_SHAPE}`);
    expect(() => mount(null)).toThrow(`mount-declared action 'catalog.pay': ${BAD_SHAPE}`);
  });

  it('a READER is not judged at either door — it has no answer yet', () => {
    // The same split `holds` makes: a getter has nothing to refuse at authoring
    // time, so it is judged where it answers.
    expect(() => compile(() => undefined)).not.toThrow();
    expect(() => mount(() => undefined)).not.toThrow();
  });

  it('a mount-declared reason reaches the row it was declared for', () => {
    const map = buildNavigationGraph('shop', { pages: { catalog: {} } });
    const session = map.createSession({ node: 'catalog', onWarn: () => undefined });
    const group = session.registerActions('catalog', {
      actions: {
        pay: {
          does: 'Pay',
          handler: () => undefined,
          blockedBecause: { says: 'Waiting for the bank to confirm', clearedBy: 'app' },
        },
      },
    });
    group.setEnabled('pay', false);
    expect(session.available().edges[0]).toHaveProperty('blockedBecause', {
      says: 'Waiting for the bank to confirm',
      clearedBy: 'app',
    });
  });

  it('a mount-declared READER is read late, like a declared one', () => {
    let reason: BlockedBecause | undefined = { says: 'Waiting for the bank', clearedBy: 'app' };
    const map = buildNavigationGraph('shop', { pages: { catalog: {} } });
    const session = map.createSession({ node: 'catalog', onWarn: () => undefined });
    const group = session.registerActions('catalog', {
      actions: { pay: { does: 'Pay', handler: () => undefined, blockedBecause: () => reason } },
    });
    group.setEnabled('pay', false);
    expect(session.available().edges[0]).toHaveProperty('blockedBecause', reason);
    reason = undefined;
    expect(session.available().edges[0]).not.toHaveProperty('blockedBecause');
  });
});

describe('a live store’s own sentence', () => {
  /** A minimal subscribe+read-current store handing out FRESH objects every read. */
  function fakeStore(initial: LiveAction[]): LiveActionStore & { set(next: LiveAction[]): void } {
    let current = initial;
    const listeners = new Set<() => void>();
    return {
      subscribe(onChange) {
        listeners.add(onChange);
        return () => listeners.delete(onChange);
      },
      actions: () => current.map((action) => ({ ...action })),
      set(next) {
        current = next;
        for (const listener of listeners) listener();
      },
    };
  }

  function deskSession(store: LiveActionStore, warnings: string[] = []) {
    const graph = buildNavigationGraph('desk', {
      pages: { inbox: {} },
      sources: [fromLiveStore(store)],
    });
    const session = graph.createSession({ node: 'inbox', onWarn: (m) => warnings.push(m) });
    return { session, warnings };
  }

  const row = (session: Session): ServeResult =>
    session.available().edges.find((edge) => edge.affordanceId === 'inbox.archive') as unknown as ServeResult;

  it('A CHANGED SENTENCE IS PICKED UP ON RECONCILE, and the next serve says it', () => {
    const store = fakeStore([
      {
        node: 'inbox',
        name: 'archive',
        does: 'Archive this thread',
        handler: () => undefined,
        enabled: false,
        blockedBecause: { says: 'Syncing with the mail server', clearedBy: 'app' },
      },
    ]);
    const { session } = deskSession(store);
    expect(row(session)).toHaveProperty('blockedBecause', {
      says: 'Syncing with the mail server',
      clearedBy: 'app',
    });

    store.set([
      {
        node: 'inbox',
        name: 'archive',
        does: 'Archive this thread',
        handler: () => undefined,
        enabled: false,
        blockedBecause: { says: 'This thread is locked by your admin', clearedBy: 'invalid' },
      },
    ]);

    expect(row(session)).toHaveProperty('blockedBecause', {
      says: 'This thread is locked by your admin',
      clearedBy: 'invalid',
    });
    // The rest of the identity survived the re-declaration: same row, still off.
    expect(row(session)).toHaveProperty('enabled', false);
  });

  it('a chatty store republishing the SAME sentence re-declares nothing', () => {
    // Object identity is meaningless across store reads — every real store
    // hands out fresh objects — so the comparison is by value. Comparing by
    // identity would tear down and rebuild every action on every emission.
    const action: LiveAction = {
      node: 'inbox',
      name: 'archive',
      does: 'Archive this thread',
      handler: () => undefined,
      enabled: false,
      blockedBecause: { says: 'Syncing with the mail server', clearedBy: 'app' },
    };
    const store = fakeStore([action]);
    const { session, warnings } = deskSession(store);
    store.set([{ ...action, blockedBecause: { says: 'Syncing with the mail server', clearedBy: 'app' } }]);
    store.set([{ ...action, blockedBecause: { says: 'Syncing with the mail server', clearedBy: 'app' } }]);
    expect(warnings).toEqual([]);
    expect(row(session)).toHaveProperty('blockedBecause', {
      says: 'Syncing with the mail server',
      clearedBy: 'app',
    });
  });

  it('a store that says nothing grows no key — and is told once where to say it', () => {
    const store = fakeStore([
      { node: 'inbox', name: 'archive', does: 'Archive this thread', handler: () => undefined, enabled: false },
    ]);
    const { session, warnings } = deskSession(store);
    store.set([
      { node: 'inbox', name: 'archive', does: 'Archive this thread', handler: () => undefined, enabled: false },
    ]);
    expect(row(session)).not.toHaveProperty('blockedBecause');
    // The second half of this release, arriving where the field met it: a live
    // store greying a control with no cause declared is a disable that serves a
    // refusal with no evidence, and it is told so exactly once.
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('was switched off with nothing declared about why');
  });

  it('a READER on a live row is never re-declared — it already answers fresh', () => {
    // A store handing out a new closure each read has changed nothing a reader
    // can see, because the reader is called at every row assembly anyway.
    let reason: BlockedBecause = { says: 'Syncing with the mail server', clearedBy: 'app' };
    const make = (): LiveAction => ({
      node: 'inbox',
      name: 'archive',
      does: 'Archive this thread',
      handler: () => undefined,
      enabled: false,
      blockedBecause: () => reason,
    });
    const store = fakeStore([make()]);
    const { session, warnings } = deskSession(store);
    store.set([make()]);
    reason = { says: 'Your admin locked this thread', clearedBy: 'invalid' };
    expect(row(session)).toHaveProperty('blockedBecause', reason);
    expect(warnings).toEqual([]);
  });
});

describe('a switch-off with no declared cause is said once, to the developer', () => {
  const NO_CAUSE =
    "hcifootprint: 'inbox.archive' was switched off with nothing declared about why — no enabledWhen " +
    'and no blockedBecause — so a caller that reaches for it is refused with the state and no evidence ' +
    'at all: told no, and taught nothing. Declare enabledWhen for derived evidence, or blockedBecause ' +
    'for your own sentence.';

  /** A desk whose archive button the app greys by hand. */
  function desk(declaration: Record<string, unknown> = {}) {
    const warnings: string[] = [];
    const map = buildNavigationGraph('desk', {
      pages: { inbox: { actions: { archive: { does: 'Archive this thread', ...declaration } } } },
    });
    const session = map.createSession({ node: 'inbox', onWarn: (m) => warnings.push(m) });
    const group = session.registerActions('inbox', { handlers: { archive: () => undefined } });
    return { session, group, warnings };
  }

  it('THE WARNING IS AUTHORED, NAMES BOTH DOORS, AND FIRES ONCE', () => {
    const { group, warnings } = desk();
    group.setEnabled('archive', false);
    expect(warnings).toEqual([NO_CAUSE]);
  });

  it('the second flip is silent — one action, one line, for the session’s life', () => {
    const { group, warnings } = desk();
    group.setEnabled('archive', false);
    group.setEnabled('archive', true);
    group.setEnabled('archive', false);
    expect(warnings).toEqual([NO_CAUSE]);
  });

  it('declaring enabledWhen prevents it entirely — the refusal now carries evidence', () => {
    const { group, warnings } = desk({ enabledWhen: { synced: { eq: true } } });
    group.setEnabled('archive', false);
    expect(warnings).toEqual([]);
  });

  it('declaring blockedBecause prevents it entirely — the refusal now carries a sentence', () => {
    const { group, warnings } = desk({
      blockedBecause: { says: 'Syncing with the mail server', clearedBy: 'app' },
    });
    group.setEnabled('archive', false);
    expect(warnings).toEqual([]);
  });

  it('switching a control ON says nothing — this is about a door that was shut', () => {
    const { group, warnings } = desk();
    group.setEnabled('archive', true); // already enabled: not even a change
    group.setEnabled('archive', false);
    group.setEnabled('archive', true);
    expect(warnings).toEqual([NO_CAUSE]);
  });

  it('greying twenty cards of one repeats container is ONE action’s mistake', () => {
    // A registration is instance-keyed; a declaration is not. The complaint is
    // about what the app declared, so it is asked — and answered — per action.
    const warnings: string[] = [];
    const map = buildNavigationGraph('shop', {
      pages: { orders: { areas: { list: { repeats: true, actions: { cancel: { does: 'Cancel this order' } } } } } },
    });
    const session = map.createSession({ node: 'orders', onWarn: (m) => warnings.push(m) });
    for (const instance of ['o-1', 'o-2']) {
      const group = session.registerActions('orders.list', { handlers: { cancel: () => undefined }, instance });
      group.setEnabled('cancel', false);
    }
    expect(warnings).toEqual([
      "hcifootprint: 'orders.list.cancel' was switched off with nothing declared about why — no " +
        'enabledWhen and no blockedBecause — so a caller that reaches for it is refused with the state ' +
        'and no evidence at all: told no, and taught nothing. Declare enabledWhen for derived evidence, ' +
        'or blockedBecause for your own sentence.',
    ]);
  });

  it('THE PAGE QUOTES THE WARNING — a sentence in prose and a sentence in code, one text', () => {
    // Prose compared as prose: wrapping and markdown markers are formatting.
    const flatten = (text: string): string => text.replace(/[*>"`]/g, ' ').replace(/\s+/g, ' ').trim();
    const page = flatten(readDocPage('guards'));
    expect(page).toContain(
      flatten(
        'was switched off with nothing declared about why — no enabledWhen and no blockedBecause — so a ' +
          'caller that reaches for it is refused with the state and no evidence at all: told no, and taught ' +
          'nothing. Declare enabledWhen for derived evidence, or blockedBecause for your own sentence.',
      ),
    );
  });

  it('a live store’s own disabled row reaches the same door, and is told the same thing', () => {
    const warnings: string[] = [];
    const store: LiveActionStore = {
      subscribe: () => () => undefined,
      actions: () => [
        { node: 'inbox', name: 'archive', does: 'Archive this thread', handler: () => undefined, enabled: false },
      ],
    };
    const map = buildNavigationGraph('desk', { pages: { inbox: {} }, sources: [fromLiveStore(store)] });
    map.createSession({ node: 'inbox', onWarn: (m) => warnings.push(m) });
    expect(warnings).toEqual([NO_CAUSE]);
  });
});
