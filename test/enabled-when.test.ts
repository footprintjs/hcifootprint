/**
 * `enabledWhen` — declarative disabledness, declared once from the same
 * expression that renders `<button disabled={…}>`.
 *
 * Reported from a production integration: a wizard's next-button fire came back
 * 'performed' while the button it clicked was DISABLED. The library had the
 * refusal already — TOOL_DISABLED, typed and retriable — but no way to be told
 * it applied, because every existing wire ran through a live registration and
 * the app's disabledness lived in a render expression.
 *
 * THE DISTINCTION this rests on: a failed `when` HIDES the control (it is not
 * here), a false `enabledWhen` SERVES it greyed out (it is here, and it is not
 * clickable). An agent that cannot see a greyed button cannot tell a human why
 * it is stuck; one that is served a lie clicks it and loops.
 *
 * MUTATION PROOFS:
 * - 'serves the edge with the marker' — hide it instead and the agent loses the
 *   only evidence that would explain the wall it is standing at.
 * - 'refuses an execution fire' — serve it as clickable and the reported bug is
 *   back: a disabled button reports 'performed'.
 * - 'unknown keys never disable' — read unevaluable as false and a session whose
 *   projection is incomplete greys out its entire app.
 * - 'the declaration outranks an instance registration' — ask the registration
 *   first and one enabled row re-opens a door the app said was shut.
 * - 'the record-only sensor is not gated' — block invoke:false and a real human
 *   click stops being recorded, which is the one motion that definitely happened.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import type { WhereFilter } from 'footprintjs';
import type { InteractionSession, NavigationGraph } from '../src/index.js';

function wizard(): NavigationGraph {
  return buildNavigationGraph('wizard', {
    pages: {
      setup: {
        tools: {
          // Here whatever happens; clickable only once a recipe is chosen.
          next: { does: 'Go to the review step', enabledWhen: { recipe: { ne: '' } } },
          // The contrast: `when` decides whether it is here at all.
          reset: { does: 'Start over', when: { recipe: { ne: '' } } },
        },
      },
    },
  });
}

function wired(state: Record<string, unknown>): InteractionSession {
  const session = wizard().createSession({ node: 'setup', state, onWarn: () => undefined });
  session.registerToolGroup('setup', { handlers: { next: () => undefined, reset: () => undefined } });
  return session;
}

const edgeIds = (session: InteractionSession): string[] =>
  session.available().edges.map((edge) => edge.affordanceId);

describe('enabledWhen — a greyed button is served, not hidden', () => {
  it('carries enabled: false while the condition does not hold', () => {
    const session = wired({ recipe: '' });
    const next = session.available().edges.find((edge) => edge.affordanceId === 'setup.next');
    expect(next?.enabled).toBe(false);
  });

  it('…and says nothing at all once it does', () => {
    const session = wired({ recipe: 'sourdough' });
    const next = session.available().edges.find((edge) => edge.affordanceId === 'setup.next');
    expect(next).not.toHaveProperty('enabled');
  });

  it('is a DIFFERENT question from `when`, which removes the control entirely', () => {
    expect(edgeIds(wired({ recipe: '' }))).toEqual(['setup.next']); // reset is not here
    expect(edgeIds(wired({ recipe: 'sourdough' }))).toEqual(['setup.next', 'setup.reset']);
  });

  it('follows the world: a state report flips it back without any re-registration', () => {
    const session = wired({ recipe: '' });
    session.updateState({ recipe: 'sourdough' }, { stimulus: 'push' });
    expect(session.available().edges.find((e) => e.affordanceId === 'setup.next')).not.toHaveProperty('enabled');
  });
});

describe('enabledWhen — firing it is the refusal the library already had', () => {
  it('refuses an execution fire as TOOL_DISABLED, and lands the gap row', () => {
    const session = wired({ recipe: '' });
    expect(session.fire('setup.next', { source: 'agent' })).toEqual({
      ok: false,
      reason: 'TOOL_DISABLED',
      affordanceId: 'setup.next',
    });
    expect(session.gaps().at(-1)).toMatchObject({
      kind: 'fire-rejected',
      affordanceId: 'setup.next',
      rejectionReason: 'TOOL_DISABLED',
    });
  });

  it('is retriable, exactly like a registration-side disable', () => {
    const session = wired({ recipe: '' });
    expect(session.fire('setup.next', { source: 'agent' }).ok).toBe(false);
    session.updateState({ recipe: 'sourdough' }, { stimulus: 'push' });
    expect(session.fire('setup.next', { source: 'agent' }).ok).toBe(true);
  });

  it('never gates the record-only sensor — a real click is motion that happened', () => {
    const session = wired({ recipe: '' });
    // The browser already ran the app's own onClick; this fire only records it.
    expect(session.fire('setup.next', { source: 'user', invoke: false }).ok).toBe(true);
  });
});

describe('enabledWhen — never a GUESSED disabled', () => {
  it('a key the projection never held serves the edge unmarked, and fires', () => {
    const session = wired({}); // `recipe` is not in the projection at all
    const next = session.available().edges.find((edge) => edge.affordanceId === 'setup.next');
    expect(next).not.toHaveProperty('enabled');
    expect(session.fire('setup.next', { source: 'agent' }).ok).toBe(true);
  });

  it('but a KNOWN half that fails still disables — one false conjunct is a proof', () => {
    const graph = buildNavigationGraph('wizard', {
      pages: {
        setup: {
          tools: { next: { does: 'Go on', enabledWhen: { recipe: { ne: '' }, neverProjected: { eq: true } } } },
        },
      },
    });
    const session = graph.createSession({ node: 'setup', state: { recipe: '' }, onWarn: () => undefined });
    session.registerToolGroup('setup', { handlers: { next: () => undefined } });

    expect(session.available().edges[0]?.enabled).toBe(false);
    expect(session.fire('setup.next', { source: 'agent' })).toMatchObject({ reason: 'TOOL_DISABLED' });
  });
});

describe('enabledWhen — one of FOUR wires, all landing the same refusal', () => {
  it('outranks a per-instance registration: a declaration greys every row at once', () => {
    const graph = buildNavigationGraph('orders', {
      pages: {
        list: {
          areas: {
            cards: {
              repeats: true,
              instances: () => ['o-1', 'o-2'],
              tools: { cancel: { does: 'Cancel this order', enabledWhen: { frozen: { eq: false } } } },
            },
          },
        },
      },
    });
    const session = graph.createSession({ node: 'list', state: { frozen: true }, onWarn: () => undefined });
    // Registered ENABLED, per instance — and still refused, because the app's
    // own declaration says the control is shut.
    session.registerToolGroup('list.cards', {
      instance: 'o-1',
      handlers: { cancel: () => undefined },
      enabled: { cancel: true },
    });

    expect(session.fire('list.cards.cancel', { source: 'agent', instance: 'o-1' })).toMatchObject({
      reason: 'TOOL_DISABLED',
    });
  });

  it('a registration-side disable still works on its own (nothing was replaced)', () => {
    const graph = buildNavigationGraph('wizard', { pages: { setup: { tools: { go: { does: 'Go' } } } } });
    const session = graph.createSession({ node: 'setup', state: {}, onWarn: () => undefined });
    const handle = session.registerToolGroup('setup', { handlers: { go: () => undefined } });
    handle.setEnabled('go', false);

    expect(session.available().edges[0]?.enabled).toBe(false);
    expect(session.fire('setup.go', { source: 'agent' })).toMatchObject({ reason: 'TOOL_DISABLED' });
  });

  it('is declarable at the mount door too, and refuses empty/malformed shapes there', () => {
    const graph = buildNavigationGraph('wizard', { pages: { setup: {} } });
    const session = graph.createSession({ node: 'setup', state: { recipe: '' }, onWarn: () => undefined });
    session.registerToolGroup('setup', {
      tools: {
        next: { does: 'Go on', enabledWhen: { recipe: { ne: '' } }, handler: () => undefined },
      },
    });
    expect(session.available().edges[0]?.enabled).toBe(false);

    expect(() =>
      session.registerToolGroup('setup', {
        tools: { bad: { does: 'Bad', enabledWhen: {}, handler: () => undefined } },
      }),
    ).toThrow(/empty enabledWhen/);
  });

  it('the compiler refuses an empty or misspelt enabledWhen at build time', () => {
    expect(() =>
      buildNavigationGraph('wizard', {
        pages: { setup: { tools: { go: { does: 'Go', enabledWhen: {} } } } },
      }),
    ).toThrow(/empty when/);
    // A misspelt operator: the types already refuse it, so the cast is what a
    // JS caller (or a config file) really hands in — and the runtime refuses it
    // there too, by name.
    const misspelt = { recipe: { equals: '' } } as unknown as WhereFilter;
    expect(() =>
      buildNavigationGraph('wizard', {
        pages: { setup: { tools: { go: { does: 'Go', enabledWhen: misspelt } } } },
      }),
    ).toThrow(/enabledWhen/);
  });
});
