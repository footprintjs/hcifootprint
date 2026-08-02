/**
 * The VERIFY CONTRACT — the app's own answer to "did that actually happen?".
 *
 * Reported from a production integration: a radio fire came back
 * `effectStatus: 'performed'` while nothing had been selected, and a wizard's
 * next-button came back 'performed' while the button it clicked was disabled.
 * The agent looped five times — correctly, on the information it was given.
 * Their cure was ~60 lines of before/after DOM signature comparison, a disabled
 * pre-check and a validation-text scrape, per action, outside the library.
 *
 * Here the app declares the check once, next to the action, and the library
 * asks it at settlement. The word it can produce is 'refused' — an EXISTING
 * word (nothing was renamed for this), because to a caller a handler that threw
 * and a handler that did nothing mean the same thing.
 *
 * THE ASYMMETRY under test: a refusal needs proof, a confirmation needs
 * everything. One false conjunct proves a conjunction false whatever the
 * unknown keys hold; a filter whose evaluable half merely passed has NOT been
 * checked. A wrong rejection is worse than a miss — it blocks an action the app
 * would have accepted and the caller has no appeal.
 *
 * MUTATION PROOFS:
 * - 'a contract that does not hold refuses' — resolve 'performed' anyway and
 *   the reported bug is back verbatim: a click that did nothing reads as done.
 * - 'a commit backed by a real report STANDS' — roll it back too and a state
 *   change the app actually made is erased from the log.
 * - 'an unknown key never refuses' — read unevaluable as false and every action
 *   in a session whose projection is incomplete refuses itself.
 * - 'the evaluable half still proves a failure' — skip the conjunction rule and
 *   one unknown key silently disarms the whole contract.
 * - 'a throwing predicate is unevaluable' — let it refuse and app code with a
 *   bug in it starts denying actions the app performed.
 * - 'a predicate is handed a DETACHED snapshot' — hand it the live state and a
 *   predicate that touches it corrupts every in-flight read.
 * - 'nothing ran, nothing is verified' — ask the contract on the tour path and
 *   a no-op fire earns a verdict about an action nobody performed.
 */
import { describe, expect, it, vi } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import { VERIFY_FAILED_EXPLANATION, checkVerify, filterVerdict } from '../src/traverse/verify.js';
import type {
  FireResult,
  FireSettlement,
  NavigationGraph,
  TransitionRecord,
  VerifyContract,
} from '../src/index.js';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** A one-page wizard whose 'pick' action claims a recipe gets selected. */
function wizard(verify: VerifyContract, opts?: { writes?: string[] }): NavigationGraph {
  return buildNavigationGraph('wizard', {
    pages: {
      setup: {
        actions: {
          pick: {
            does: 'Pick the recipe',
            verify,
            ...(opts?.writes ? { writes: opts.writes } : {}),
          },
        },
      },
      review: { actions: { submit: { does: 'Submit it', writes: ['submitted'] } } },
    },
  });
}

function settledOf(fired: FireResult): Promise<FireSettlement> {
  if (!fired.ok) throw new Error(`fire refused: ${JSON.stringify(fired)}`);
  return fired.whenSettled;
}

/** The fire's own row, found by id — the log's tail is whatever moved last. */
function recordFor(session: { transitions(): readonly TransitionRecord[] }, fired: FireResult) {
  if (!fired.ok) throw new Error('fire refused');
  return session.transitions().find((row) => row.id === fired.transition.id);
}

// ---------------------------------------------------------------------------
// The three settlement points
// ---------------------------------------------------------------------------

describe('verify — a handler that RAN is not the same as an action that HAPPENED', () => {
  it('holds: the settlement performs, and says so on its own axis', async () => {
    const session = wizard({ recipe: { ne: '' } }).createSession({
      node: 'setup',
      state: { recipe: '' },
      onWarn: () => undefined,
    });
    session.registerActions('setup', {
      handlers: { pick: () => session.updateState({ recipe: 'sourdough' }, { stimulus: 'push' }) },
    });

    const settled = await settledOf(session.fire('setup.pick', { source: 'agent' }));
    expect(settled).toMatchObject({ effectStatus: 'performed', outcome: 'committed', verifyHeld: true });
    expect(settled.error).toBeUndefined();
  });

  it('fails on the synchronous-commit path: refused, rolled back, and the reason teaches', async () => {
    // THE REPORTED BUG, reproduced: a click-only action (no declared writes)
    // whose handler runs to completion while nothing gets selected.
    const session = wizard({ recipe: { ne: '' } }).createSession({
      node: 'setup',
      state: { recipe: '' },
      onWarn: () => undefined,
    });
    session.registerActions('setup', { handlers: { pick: () => undefined } });

    const fired = session.fire('setup.pick', { source: 'agent' });
    const settled = await settledOf(fired);
    expect(settled).toMatchObject({ effectStatus: 'refused', outcome: 'rolled-back', verifyHeld: false });
    const failure = settled.error as { reason: string; explanation: string; evidence: unknown[] };
    expect(failure.reason).toBe('VERIFY_FAILED');
    expect(failure.explanation).toBe(VERIFY_FAILED_EXPLANATION);
    expect(failure.evidence).toEqual([
      expect.objectContaining({ key: 'recipe', op: 'ne', result: false }),
    ]);
    // The claims-only commit did not survive: the record says so too.
    expect(recordFor(session, fired)?.outcome).toBe('rolled-back');
  });

  it('fails on the tapless completion path — the same verdict with no state tap at all', async () => {
    const session = wizard({ recipe: { ne: '' } }, { writes: ['recipe'] }).createSession({
      node: 'setup',
      state: { recipe: '' },
      stateTap: false,
      onWarn: () => undefined,
    });
    session.registerActions('setup', { handlers: { pick: () => undefined } });

    const settled = await settledOf(session.fire('setup.pick', { source: 'agent' }));
    expect(settled).toMatchObject({ effectStatus: 'refused', outcome: 'rolled-back', verifyHeld: false });
  });

  it('fails on the attributed-report path — the settlement refuses while the COMMIT stands', async () => {
    // Both truths, neither averaged: the app really did report `recipe`, so the
    // commit is evidence-backed and survives; the contract asked for something
    // else and did not get it, so the settlement refuses.
    const session = wizard({ recipeConfirmed: { eq: true } }, { writes: ['recipe'] }).createSession({
      node: 'setup',
      state: { recipe: '', recipeConfirmed: false },
      onWarn: () => undefined,
    });
    session.registerActions('setup', { handlers: { pick: () => undefined } });

    const fired = session.fire('setup.pick', { source: 'agent' });
    session.updateState({ recipe: 'sourdough' }); // a REAL report, attributed
    const settled = await settledOf(fired);

    expect(settled).toMatchObject({ effectStatus: 'refused', verifyHeld: false, outcome: 'committed' });
    expect(settled.transition.effectVerified).toBe(true); // the STATE axis is untouched
    expect(recordFor(session, fired)?.outcome).toBe('committed'); // the landed effect is NOT erased
    expect(session.state()['recipe']).toBe('sourdough');
  });

  it('walks the cursor back when the refused action had CLAIMED a navigation', async () => {
    const graph = buildNavigationGraph('wizard', {
      pages: {
        setup: { actions: { next: { does: 'Go on', goTo: 'review', verify: { stepDone: { eq: true } } } } },
        review: {},
      },
    });
    const session = graph.createSession({ node: 'setup', state: { stepDone: false }, onWarn: () => undefined });
    session.registerActions('setup', { handlers: { next: () => undefined } });

    const fired = session.fire('setup.next', { source: 'agent' });
    expect(session.node).toBe('review'); // the claim moved the cursor optimistically
    await settledOf(fired);
    expect(session.node).toBe('setup'); // …and the refusal put it back
  });
});

// ---------------------------------------------------------------------------
// The honesty calculus
// ---------------------------------------------------------------------------

describe('verify — what it cannot check, it does not judge', () => {
  it('an unknown state key is unevaluable, never a refusal', async () => {
    const session = wizard({ neverProjected: { eq: true } }).createSession({
      node: 'setup',
      state: { recipe: '' }, // the verify key is not in the projection at all
      onWarn: () => undefined,
    });
    session.registerActions('setup', { handlers: { pick: () => undefined } });

    const settled = await settledOf(session.fire('setup.pick', { source: 'agent' }));
    expect(settled).toMatchObject({ effectStatus: 'performed', verifyHeld: 'unevaluable' });
    expect(settled.error).toBeUndefined();
  });

  it('a KNOWN half that fails still proves the whole contract false', async () => {
    // A conjunction with one false conjunct is false whatever the unknown one
    // holds. Refusing here is a proof, not a guess — and skipping it would let
    // one unseeded key disarm every contract that mentions it.
    const session = wizard({ recipe: { ne: '' }, neverProjected: { eq: true } }).createSession({
      node: 'setup',
      state: { recipe: '' },
      onWarn: () => undefined,
    });
    session.registerActions('setup', { handlers: { pick: () => undefined } });

    const settled = await settledOf(session.fire('setup.pick', { source: 'agent' }));
    expect(settled).toMatchObject({ effectStatus: 'refused', verifyHeld: false });
  });

  it('no contract declared: the settlement carries no verdict at all', async () => {
    const graph = buildNavigationGraph('wizard', {
      pages: { setup: { actions: { pick: { does: 'Pick the recipe' } } } },
    });
    const session = graph.createSession({ node: 'setup', state: {}, onWarn: () => undefined });
    session.registerActions('setup', { handlers: { pick: () => undefined } });

    const settled = await settledOf(session.fire('setup.pick', { source: 'agent' }));
    expect(settled.effectStatus).toBe('performed');
    // Silence, not a passing grade: absent cannot be misread as "verified".
    expect(settled).not.toHaveProperty('verifyHeld');
  });

  it('nothing ran, so nothing is verified — a tour fire keeps its honest word', async () => {
    const session = wizard({ recipe: { ne: '' } }).createSession({
      node: 'setup',
      state: { recipe: '' },
      allowUnmaterializedFires: true, // nothing is bound; nothing executes
      onWarn: () => undefined,
    });

    const settled = await settledOf(session.fire('setup.pick', { source: 'agent' }));
    expect(settled.effectStatus).toBe('unobservable');
    expect(settled).not.toHaveProperty('verifyHeld');
  });
});

// ---------------------------------------------------------------------------
// The predicate form — the ~60 lines the field wrote, collapsed to one
// ---------------------------------------------------------------------------

describe('verify — the predicate the app owns', () => {
  it('answers from whatever the app can see, and its answer decides', async () => {
    let selected = false;
    const session = wizard(() => selected).createSession({
      node: 'setup',
      state: { recipe: '' },
      onWarn: () => undefined,
    });
    session.registerActions('setup', {
      handlers: {
        pick: () => {
          selected = true; // stands in for the app's own DOM/store
        },
      },
    });

    const settled = await settledOf(session.fire('setup.pick', { source: 'agent' }));
    expect(settled).toMatchObject({ effectStatus: 'performed', verifyHeld: true });
  });

  it('is handed a DETACHED snapshot — a predicate cannot reach the live state', async () => {
    let handed: Record<string, unknown> | null = null;
    const session = wizard((state) => {
      handed = state;
      (state as Record<string, unknown>)['recipe'] = 'mutated by the predicate';
      return true;
    }).createSession({ node: 'setup', state: { recipe: 'sourdough' }, onWarn: () => undefined });
    session.registerActions('setup', { handlers: { pick: () => undefined } });

    await settledOf(session.fire('setup.pick', { source: 'agent' }));
    expect(handed).not.toBeNull();
    expect(session.state()['recipe']).toBe('sourdough'); // untouched
  });

  it('a predicate that THROWS is unevaluable — it never refuses on the app’s behalf', async () => {
    const warn = vi.fn();
    const session = wizard(() => {
      throw new Error('the DOM node was gone');
    }).createSession({ node: 'setup', state: { recipe: '' }, onWarn: warn });
    session.registerActions('setup', { handlers: { pick: () => undefined } });

    const settled = await settledOf(session.fire('setup.pick', { source: 'agent' }));
    expect(settled).toMatchObject({ effectStatus: 'performed', verifyHeld: 'unevaluable' });
    expect(warn.mock.calls.flat().join(' ')).toContain('verify predicate threw');
  });

  it('an ASYNC predicate is unevaluable and SAYS so — a pending Promise is truthy', async () => {
    const warn = vi.fn();
    const session = wizard((() => Promise.resolve(true)) as unknown as VerifyContract).createSession({
      node: 'setup',
      state: { recipe: '' },
      onWarn: warn,
    });
    session.registerActions('setup', { handlers: { pick: () => undefined } });

    const settled = await settledOf(session.fire('setup.pick', { source: 'agent' }));
    expect(settled).toMatchObject({ effectStatus: 'performed', verifyHeld: 'unevaluable' });
    expect(warn.mock.calls.flat().join(' ')).toContain('must answer synchronously');
  });
});

// ---------------------------------------------------------------------------
// Over the wire
// ---------------------------------------------------------------------------

describe('verify — the refusal crosses the wire as words, not [object Object]', () => {
  it('did_it_work reports refused and carries the contract’s own sentence', async () => {
    const session = wizard({ recipe: { ne: '' } }).createSession({
      node: 'setup',
      state: { recipe: '' },
      onWarn: () => undefined,
    });
    session.registerActions('setup', { handlers: { pick: () => undefined } });
    const port = serveToAgent(session);

    const fired = port.call('wizard.do_action', { action: 'pick' });
    await flush();
    const poll = port.call('wizard.did_it_work', { transitionId: fired['transitionId'] as string });

    expect(poll).toMatchObject({ settled: true, effectStatus: 'refused', outcome: 'rolled-back' });
    expect(poll['error']).toBe(VERIFY_FAILED_EXPLANATION);
    expect(() => structuredClone(poll)).not.toThrow();
  });

  it('the sentence fits the wire’s cap, so it is never chopped mid-clause', () => {
    expect(VERIFY_FAILED_EXPLANATION.length).toBeLessThanOrEqual(200);
  });
});

// ---------------------------------------------------------------------------
// The authoring doors — an empty contract, refused by its own name
// ---------------------------------------------------------------------------

describe('verify — an empty {} is refused at every door, in the author’s own word', () => {
  it('the compiler names the field the author wrote, not the one it shares code with', () => {
    // The compiler runs ONE empty-filter refusal for when/enabledWhen/verify.
    // While its sentence was hard-coded to 'when', a `verify: {}` author was
    // told to "Omit 'when' entirely" — a correction pointing at a field that is
    // not in their graph. Every refusal teaches, or it is not worth throwing.
    expect(() =>
      buildNavigationGraph('wizard', {
        pages: { setup: { actions: { pick: { does: 'Pick', verify: {} } } } },
      }),
    ).toThrow(/empty verify \{\}[\s\S]*Omit 'verify' entirely/);
  });

  it('and the mount door says the same thing — one law, both doors', () => {
    const session = buildNavigationGraph('wizard', { pages: { setup: {} } }).createSession({
      node: 'setup',
      state: {},
      onWarn: () => undefined,
    });
    expect(() =>
      session.registerActions('setup', {
        actions: { bad: { does: 'Bad', verify: {}, handler: () => undefined } },
      }),
    ).toThrow(/empty verify/);
  });
});

// ---------------------------------------------------------------------------
// The leaf module, on its own
// ---------------------------------------------------------------------------

describe('grading a proof: held, failed, or a question nobody can answer', () => {
  const evaluate = () => ({ matched: true, conditions: [], unevaluable: [] });
  const noWarn = () => undefined;
  const noState = () => ({});

  it('an absent contract is silence, not a verdict', () => {
    expect(checkVerify(undefined, evaluate, noState, noWarn)).toEqual({ verdict: 'none' });
  });

  it('filterVerdict grades a filter the way a refusal must be graded', () => {
    expect(filterVerdict({ matched: true, unevaluable: [] })).toBe('held');
    expect(filterVerdict({ matched: false, unevaluable: [] })).toBe('failed');
    expect(filterVerdict({ matched: false, unevaluable: ['x'] })).toBe('failed'); // a proof survives unknowns
    expect(filterVerdict({ matched: true, unevaluable: ['x'] })).toBe('unevaluable'); // …a pass does not
  });

  it('a predicate failure carries NO evidence — it has none to give', () => {
    const check = checkVerify(() => false, evaluate, noState, noWarn);
    expect(check.verdict).toBe('failed');
    if (check.verdict !== 'failed') return;
    expect(check.failure).not.toHaveProperty('evidence');
  });

  it('an answer that is not true or false is unevaluable, and the warning NAMES what came back', () => {
    // The dangerous one is first: a pending Promise is truthy, so reading it as
    // a pass would certify every action forever. The warning has to be specific
    // enough that the author sees their missing `await` in it.
    const said: string[] = [];
    const warn = (message: string): void => void said.push(message);
    const answering = (value: unknown): string => {
      said.length = 0;
      expect(checkVerify(() => value as boolean, evaluate, noState, warn).verdict).toBe('unevaluable');
      return said.join('');
    };

    expect(answering(Promise.resolve(true))).toMatch(/returned a Promise instead of true or false/);
    expect(answering(null)).toMatch(/returned null instead/);
    expect(answering(['ok'])).toMatch(/returned an array instead/);
    expect(answering('yes')).toMatch(/returned a string instead/);
    expect(answering(1)).toMatch(/returned a number instead/);
  });
});
