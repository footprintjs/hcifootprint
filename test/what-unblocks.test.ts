/**
 * WHAT WOULD FREE THIS CONTROL — the answer a greyed button could not give.
 *
 * `enabled: false` says a control is off. It does not say what would turn it
 * on, and that hole is where a reader starts guessing. The field incident is on
 * the record: an agent met a greyed control, was told only that it was greyed,
 * re-fired it in a loop to find out what would change, and then reported the
 * app broken. Nothing had failed.
 *
 * The answer was already in the graph, declared twice for other reasons: an
 * action says what it `writes` (that powers verification), and a control says
 * what it waits on (`guard` / `enabledWhen`, which power availability). Overlap
 * those two and the dependency falls out. So this is DERIVED, NEVER AUTHORED —
 * there is no edge to declare, and therefore nothing that can drift from the
 * graph.
 *
 * The rule itself is not new here: `step-deps.ts` has computed exactly this for
 * a journey's steps since journeys existed, deliberately shared with the testing
 * linter so the two can never disagree. This widens the SCOPE (any declared
 * action, not one journey's list) and the CONDITIONS it reads (`enabledWhen` as
 * well as `guard` — a disabled control is usually blocked by the second, so a
 * version reading only the first would stay silent in exactly the case a reader
 * most needs an answer).
 *
 * It also narrows one thing, and that narrowing is load-bearing: the keys are
 * the conjuncts that DID NOT HOLD against live state, never the declared ones.
 * The second describe block below is why.
 *
 * FOUR LIMITS, each pinned below:
 * - ONLY WHAT IS ACTUALLY HOLDING IT BACK. A satisfied condition's writers are
 *   the actions that would destroy it, not free it.
 * - A CLAIM, NOT A PROMISE. `writes` is the app's claim. Firing the other
 *   action is never promised to free this one.
 * - SILENCE OVER GUESSING. Nobody claiming to write the key ⇒ no key on the
 *   row, not an invented suggestion. Nor does a condition the library could not
 *   evaluate become a named cause.
 * - NEVER A PLAN. The list is unordered and unranked; ordering intent is a
 *   journey, which is declared.
 *
 * MUTATION PROOFS (each one run; the counts are what it actually did):
 * - Read `guard` alone, dropping `enabledWhen` → 6 red: the widened rule is the
 *   whole point, and a greyed control held only by `enabledWhen` goes back to
 *   being answered with silence.
 * - Serve `unblockedBy` on every row instead of only switched-off ones → 1 red:
 *   a live control answering "what would free it" invites a reader to treat a
 *   dependency list as a plan.
 * - Emit `inFlight: false` when nothing is running, instead of omitting the key
 *   → 3 red: the polite form of claiming to know a control is idle.
 * - Drop the pending-fire signal, leaving only `busy` → 1 red: an app that
 *   never wired a busy label still has the library's own record of a fire
 *   awaiting its report, and that is the honest half it would lose.
 * - Read the DECLARED condition keys instead of the ones that did not hold →
 *   4 red: the inversion described below.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { ServeResult } from '../src/index.js';

/**
 * An expense flow: Continue is greyed until the receipt is attached, and the
 * attach control is the thing that claims to write the key it waits on.
 */
function expenses(opts?: { uploaded?: boolean; withWriter?: boolean }) {
  const map = buildNavigationGraph('expenses', {
    pages: {
      categorise: {
        actions: {
          'attach-receipt': {
            does: 'Attach the receipt',
            ...(opts?.withWriter === false ? {} : { writes: ['receipt.uploaded'] }),
          },
          next: {
            does: 'Continue to review',
            enabledWhen: { 'receipt.uploaded': { eq: true } },
          },
          cancel: { does: 'Cancel the report' },
        },
      },
      details: {
        actions: {
          'set-cost-centre': { does: 'Choose a cost centre', writes: ['order.costCentre'] },
        },
      },
    },
  });
  const session = map.createSession({
    node: 'categorise',
    state: { 'receipt.uploaded': opts?.uploaded ?? false },
    onWarn: () => undefined,
  });
  session.registerActions('categorise', {
    handlers: {
      'attach-receipt': () => undefined,
      next: () => undefined,
      cancel: () => undefined,
    },
  });
  return { session, port: serveToAgent(session) };
}

/** The `whats_here` row for one action, as the model reads it. */
function actionRow(port: ReturnType<typeof expenses>['port'], action: string): ServeResult {
  const actions = port.call('expenses.whats_here', {})['actions'] as ServeResult[];
  return actions.find((row) => row['action'] === action)!;
}

describe('session.whatUnblocks — the derived answer', () => {
  it('names the action whose declared writes free this one, with the key', () => {
    const { session } = expenses();
    expect(session.whatUnblocks('categorise.next')).toEqual([
      { affordanceId: 'categorise.attach-receipt', viaKeys: ['receipt.uploaded'] },
    ]);
  });

  it('reads enabledWhen, not only guard — the condition a greyed control is actually held by', () => {
    // `next` declares NO guard; its block is entirely `enabledWhen`. A rule that
    // read guards alone would answer [] here, which is the one case that matters.
    const { session } = expenses();
    expect(session.whatUnblocks('categorise.next')).toHaveLength(1);
  });

  it('SILENCE OVER GUESSING: nobody claims the key, so nothing is offered', () => {
    const { session } = expenses({ withWriter: false });
    expect(session.whatUnblocks('categorise.next')).toEqual([]);
  });

  it('an action waiting on nothing has no dependencies', () => {
    const { session } = expenses();
    expect(session.whatUnblocks('categorise.cancel')).toEqual([]);
  });

  it('never names itself, even when it writes what it waits on', () => {
    const map = buildNavigationGraph('loop', {
      pages: {
        here: {
          actions: {
            toggle: { does: 'Toggle it', writes: ['flag'], enabledWhen: { flag: { eq: false } } },
          },
        },
      },
    });
    const session = map.createSession({ node: 'here', state: { flag: false }, onWarn: () => undefined });
    expect(session.whatUnblocks('here.toggle')).toEqual([]);
  });

  it('an unknown id is answered honestly, not thrown at', () => {
    const { session } = expenses();
    expect(session.whatUnblocks('categorise.nope')).toEqual([]);
  });

  it('reaches actions on OTHER pages — hiding a true answer to keep the list short would be the wrong trade', () => {
    const map = buildNavigationGraph('cross', {
      pages: {
        review: {
          actions: { submit: { does: 'Submit', enabledWhen: { 'order.costCentre': { ne: '' } } } },
        },
        details: {
          actions: { 'set-cost-centre': { does: 'Choose a cost centre', writes: ['order.costCentre'] } },
        },
      },
    });
    const session = map.createSession({
      node: 'review',
      state: { 'order.costCentre': '' },
      onWarn: () => undefined,
    });
    expect(session.whatUnblocks('review.submit')).toEqual([
      { affordanceId: 'details.set-cost-centre', viaKeys: ['order.costCentre'] },
    ]);
  });
});

describe('the answer on the row a model reads', () => {
  it('a greyed control carries what would free it', () => {
    const { port } = expenses();
    const row = actionRow(port, 'categorise.next');
    expect(row['enabled']).toBe(false);
    expect(row['unblockedBy']).toEqual([
      { action: 'categorise.attach-receipt', writes: ['receipt.uploaded'] },
    ]);
  });

  it('PRESENCE-ONLY: a clickable control carries no key at all', () => {
    // Same graph, key satisfied — `next` is live, so the question does not arise.
    const { port } = expenses({ uploaded: true });
    const row = actionRow(port, 'categorise.next');
    expect(row['enabled']).toBeUndefined();
    expect('unblockedBy' in row).toBe(false);
  });

  it('a greyed control nobody claims to free says nothing rather than something', () => {
    const { port } = expenses({ withWriter: false });
    const row = actionRow(port, 'categorise.next');
    expect(row['enabled']).toBe(false);
    expect('unblockedBy' in row).toBe(false);
  });

  it('NEVER A PLAN: the entries carry no order, rank or instruction', () => {
    const { port } = expenses();
    const entries = actionRow(port, 'categorise.next')['unblockedBy'] as ServeResult[];
    for (const entry of entries) {
      // action + writes, and nothing that reads as "do this next".
      expect(Object.keys(entry).sort()).toEqual(['action', 'writes']);
    }
  });

  it('A CLAIM, NOT A PROMISE: firing the writer is not asserted to free the control', () => {
    // The app declares the write but never reports it. The row still names the
    // claim; the control stays honestly off. Nothing here promised otherwise —
    // and the fire being in flight is said as its own fact, not as an outcome.
    const { session, port } = expenses();
    session.fire('categorise.attach-receipt', { source: 'agent' });
    const row = actionRow(port, 'categorise.next');
    expect(row['enabled']).toBe(false);
    expect(row['unblockedBy']).toEqual([
      { action: 'categorise.attach-receipt', writes: ['receipt.uploaded'], inFlight: true },
    ]);
  });

  it('IN FLIGHT is observed, never assumed: an unfired writer carries no such key', () => {
    const { port } = expenses();
    const entries = actionRow(port, 'categorise.next')['unblockedBy'] as ServeResult[];
    // Nothing has been fired and nothing is busy, so the question has no answer
    // and the row does not invent "idle".
    expect('inFlight' in entries[0]!).toBe(false);
  });

  it('the app saying it is working is the other observed signal', () => {
    const { session, port } = expenses();
    const group = session.registerActions('categorise', {
      handlers: { 'attach-receipt': () => undefined, next: () => undefined, cancel: () => undefined },
    });
    group.setBusy('attach-receipt', 'Uploading the receipt…');
    const entries = actionRow(port, 'categorise.next')['unblockedBy'] as ServeResult[];
    expect(entries[0]).toEqual({
      action: 'categorise.attach-receipt',
      writes: ['receipt.uploaded'],
      inFlight: true,
    });
  });
});

/**
 * THE INVERSION THIS RULE MUST NOT HAVE.
 *
 * A control is served at all only once its `guard` HOLDS — `available()` drops
 * an edge whose guard failed. So on every row a reader can actually see, the
 * guard's keys name conditions that are currently TRUE, and the actions that
 * write them are the ones that would DESTROY the condition the control is
 * standing on: fire one and the control does not become clickable, it vanishes
 * from the surface entirely.
 *
 * It is worse than noise, because of WHICH actions write those keys. A guard is
 * how an app says "you may do this because you are logged in / a draft exists",
 * so the writers of its keys are `logout`, `discard`, `wipeAll` — the highest-
 * effect controls in the app. An answer to "what would free this?" that names
 * them, unranked and with no marker to prefer the real one by, is an invitation
 * to log the user out to un-grey a button.
 *
 * The rule therefore reads the conjuncts that DID NOT HOLD, evaluated against
 * live state. What is not holding a control back is not an answer to what would
 * free it.
 */
describe('only what is actually holding it back', () => {
  /** Publish is offered because a draft exists; it is greyed by the app itself. */
  function draft(state: { draftExists: boolean }) {
    const map = buildNavigationGraph('posts', {
      pages: {
        post: {
          actions: {
            publish: { does: 'Publish the post', when: { draftExists: { eq: true } } },
            discard: { does: 'Discard the draft', writes: ['draftExists'] },
          },
        },
      },
    });
    const session = map.createSession({ node: 'post', state, onWarn: () => undefined });
    const group = session.registerActions('post', {
      handlers: { publish: () => undefined, discard: () => undefined },
    });
    group.setEnabled('publish', false);
    return { session, port: serveToAgent(session) };
  }

  it('never names the action that would DESTROY the condition the control stands on', () => {
    const { session } = draft({ draftExists: true });
    // `discard` writes draftExists — the very key publish's guard rests on.
    // Firing it does not free publish; it removes publish from the app.
    expect(session.whatUnblocks('post.publish')).toEqual([]);
  });

  it('and the row a model reads stays silent too', () => {
    const { port } = draft({ draftExists: true });
    const rows = port.call('posts.whats_here', {})['actions'] as ServeResult[];
    const row = rows.find((candidate) => candidate['action'] === 'post.publish')!;
    // Switched off, and honestly unable to say what would change it.
    expect(row['enabled']).toBe(false);
    expect('unblockedBy' in row).toBe(false);
  });

  it('the guard half still answers where the guard is what is failing', () => {
    // Same graph, no draft: publish is not offered at all, and now the writer of
    // `draftExists` genuinely is what stands between the reader and the action.
    const { session } = draft({ draftExists: false });
    expect(session.available().edges.map((edge) => edge.affordanceId)).not.toContain('post.publish');
    expect(session.whatUnblocks('post.publish')).toEqual([
      { affordanceId: 'post.discard', viaKeys: ['draftExists'] },
    ]);
  });

  it('a condition the library could not read is absence, not a block', () => {
    // `receipt.uploaded` is never seeded, so #evalGuard drops it before
    // evaluating: nothing here knows whether it is what holds the control, and
    // an unknown must not be dressed up as a named cause.
    const map = buildNavigationGraph('unseeded', {
      pages: {
        here: {
          actions: {
            go: { does: 'Go on', enabledWhen: { 'receipt.uploaded': { eq: true } } },
            upload: { does: 'Upload it', writes: ['receipt.uploaded'] },
          },
        },
      },
    });
    const session = map.createSession({ node: 'here', state: {}, onWarn: () => undefined });
    expect(session.whatUnblocks('here.go')).toEqual([]);
  });

  it('names only the conjunct that failed, not the whole condition', () => {
    const map = buildNavigationGraph('two', {
      pages: {
        here: {
          actions: {
            submit: {
              does: 'Submit',
              enabledWhen: { agreed: { eq: true }, amount: { gt: 0 } },
            },
            agree: { does: 'Agree to the terms', writes: ['agreed'] },
            setAmount: { does: 'Enter an amount', writes: ['amount'] },
          },
        },
      },
    });
    // `agreed` already holds; only `amount` is wanting.
    const session = map.createSession({
      node: 'here',
      state: { agreed: true, amount: 0 },
      onWarn: () => undefined,
    });
    expect(session.whatUnblocks('here.submit')).toEqual([
      { affordanceId: 'here.setAmount', viaKeys: ['amount'] },
    ]);
  });
});

/**
 * THE DEFAULT SURFACE. Mode B journey tools are what `mcpServer` wraps, so a
 * greyed step reaching the journey answer as an ordinary fireable option is the
 * re-fire loop this whole feature exists to end — the model picks it, gets
 * TOOL_DISABLED, and is back where it started.
 *
 * The plan and the live control are two facts and stay two (grammar rule 1):
 * `journeyPlan` says 'ready' because the DECLARED graph is satisfied, and that
 * is true and worth reading. `enabled: false` says the app switched the control
 * off. Averaging them into one word would hide which of the two diagnoses the
 * reader is looking at.
 */
describe('a switched-off step on the journey surface', () => {
  function wizard(opts?: { uploaded?: boolean }) {
    const map = buildNavigationGraph('signup', {
      pages: {
        step1: {
          actions: {
            upload: { does: 'Upload the document', writes: ['uploaded'] },
            next: { does: 'Continue', enabledWhen: { uploaded: { eq: true } }, goTo: 'step2' },
          },
        },
        step2: { actions: { finish: { does: 'Finish' } } },
      },
      journeys: {
        signup: { does: 'Sign up', steps: ['step1.upload', 'step1.next', 'step2.finish'] },
      },
    });
    const session = map.createSession({
      node: 'step1',
      state: { uploaded: opts?.uploaded ?? false },
      onWarn: () => undefined,
    });
    session.registerActions('step1', {
      handlers: { upload: () => undefined, next: () => undefined },
    });
    return { session, port: serveToAgent(session) };
  }

  it('is NOT advertised as a ready step', () => {
    const { port } = wizard();
    const frame = port.call('signup.journey.signup', {});
    expect((frame['readySteps'] as ServeResult[]).map((step) => step['step'])).toEqual([
      'step1.upload',
    ]);
  });

  it('the judgment counts what can actually be fired', () => {
    const { port } = wizard();
    // Two steps are on this page; only one of them is clickable.
    expect(port.call('signup.journey.signup', {})['judgment']).toBe('one-ready-step');
  });

  it('lands in laterSteps carrying BOTH facts, and what would free it', () => {
    const { port } = wizard();
    const later = port.call('signup.journey.signup', {})['laterSteps'] as ServeResult[];
    expect(later.find((step) => step['step'] === 'step1.next')).toEqual({
      step: 'step1.next',
      status: 'ready',
      enabled: false,
      unblockedBy: [{ action: 'step1.upload', writes: ['uploaded'] }],
    });
  });

  it('and says the writer is in flight there too', () => {
    const { session, port } = wizard();
    session.fire('step1.upload', { source: 'agent' });
    const later = port.call('signup.journey.signup', {})['laterSteps'] as ServeResult[];
    expect(later.find((step) => step['step'] === 'step1.next')?.['unblockedBy']).toEqual([
      { action: 'step1.upload', writes: ['uploaded'], inFlight: true },
    ]);
  });

  it('the app saying it is working reaches the journey surface as well', () => {
    const { session, port } = wizard();
    const group = session.registerActions('step1', {
      handlers: { upload: () => undefined, next: () => undefined },
    });
    group.setBusy('upload', 'Uploading…');
    const answer = port.call('signup.journey.signup', {});
    const ready = answer['readySteps'] as ServeResult[];
    expect(ready.find((step) => step['step'] === 'step1.upload')?.['busy']).toBe('Uploading…');
    const later = answer['laterSteps'] as ServeResult[];
    expect(later.find((step) => step['step'] === 'step1.next')?.['unblockedBy']).toEqual([
      { action: 'step1.upload', writes: ['uploaded'], inFlight: true },
    ]);
  });

  it('a later step that is BOTH switched off and working says both', () => {
    // The two are independent — a Save button mid-save is greyed AND working —
    // and the journey surface must not pick one of them to report.
    const { session, port } = wizard();
    const group = session.registerActions('step1', {
      handlers: { upload: () => undefined, next: () => undefined },
    });
    group.setBusy('next', 'Checking the document…');
    const later = port.call('signup.journey.signup', {})['laterSteps'] as ServeResult[];
    expect(later.find((step) => step['step'] === 'step1.next')).toMatchObject({
      enabled: false,
      busy: 'Checking the document…',
    });
  });

  it('a busy step is still fireable — the label is advisory, not a refusal', () => {
    const { session, port } = wizard();
    const group = session.registerActions('step1', {
      handlers: { upload: () => undefined, next: () => undefined },
    });
    group.setBusy('upload', 'Uploading…');
    expect(
      (port.call('signup.journey.signup', {})['readySteps'] as ServeResult[]).map(
        (step) => step['step'],
      ),
    ).toContain('step1.upload');
  });

  it('once the key lands, the step is ready and carries no leftover marker', () => {
    const { port } = wizard({ uploaded: true });
    const answer = port.call('signup.journey.signup', {});
    const ready = answer['readySteps'] as ServeResult[];
    expect(ready.map((step) => step['step'])).toEqual(['step1.upload', 'step1.next']);
    expect(answer['judgment']).toBe('needs-choice');
    expect(ready.every((step) => !('enabled' in step))).toBe(true);
  });

  /**
   * GRAMMAR RULE 4: an instruction must name a move the library will accept.
   * "Pick one of readySteps" against an empty list is a loop built out of a
   * true sentence — and it is the exact shape the greyed control produces.
   */
  it('never tells the model to pick from an empty list', () => {
    const map = buildNavigationGraph('solo', {
      pages: {
        only: {
          actions: {
            go: { does: 'Go on', enabledWhen: { ready: { eq: true } } },
            prep: { does: 'Get ready', writes: ['ready'] },
          },
        },
      },
      journeys: { flow: { does: 'The flow', steps: ['only.go'] } },
    });
    const session = map.createSession({
      node: 'only',
      state: { ready: false },
      onWarn: () => undefined,
    });
    session.registerActions('only', { handlers: { go: () => undefined, prep: () => undefined } });
    const answer = serveToAgent(session).call('solo.journey.flow', {});
    expect(answer['readySteps']).toEqual([]);
    expect(answer['judgment']).toBe('navigate-or-wait');
    expect(String(answer['howToAct'])).not.toContain('one of readySteps');
    // It names the move that IS available, and points at where the reason lives.
    expect(String(answer['howToAct'])).toContain('laterSteps');
  });
});
