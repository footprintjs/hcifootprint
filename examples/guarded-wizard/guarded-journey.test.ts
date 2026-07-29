/**
 * The guarded-journey pattern, proven end to end (Convention 2: examples are
 * mandatory integration tests). Every behaviour the docs page claims is
 * asserted here against the REAL app object the transcript runs on.
 *
 * Mutation proofs, per behaviour:
 * - `when` hiding an out-of-order step: delete it and 'pick-recipe' is served
 *   (and fires) with no project named — the first two assertions flip.
 * - `enabledWhen`: remove it and the greyed edge carries no `enabled: false`
 *   and the fire is accepted — pre-0.6.0 code has no such field at all.
 * - `verify`: remove it and the silent no-op settles 'performed' with
 *   `verifyHeld` absent, which is exactly the field bug (the agent looped).
 * - `crossLinks` + the dead-end row: pre-0.6.0 code has neither, so the spine
 *   assertions fail on the missing tools and the control case records nothing.
 * - `input: 'none'`: without it `{ value: '' }` reaches the handler instead of
 *   being refused.
 */
import { describe, expect, it } from 'vitest';
import type { FireSettlement, GapRecord } from '../../src/index.js';
import { buildNavigationGraph, fromRoutes, skillsAsTools } from '../../src/index.js';
import { PATHS } from './app.js';
import { wireWizard } from './wire.js';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** Fire and wait for the app's side — the settlement is the only final answer. */
async function fireAndSettle(
  wired: ReturnType<typeof wireWizard>,
  id: string,
  payload?: unknown,
): Promise<FireSettlement> {
  const fired = wired.session.fire(id, { source: 'agent', payload });
  if (!fired.ok) throw new Error(`expected ${id} to fire, got ${fired.reason}`);
  const settlement = await fired.whenSettled;
  await flush();
  return settlement;
}

describe('the guard: a step whose precondition has not happened is not offered', () => {
  it('hides pick-recipe until the project has a name, and refuses the fire with evidence', () => {
    const wired = wireWizard();
    const offered = wired.session.available().edges.map((edge) => edge.affordanceId);
    expect(offered).not.toContain('wizard.pick-recipe');

    const refused = wired.session.fire('wizard.pick-recipe', {
      source: 'agent',
      payload: { recipe: 'dose-response' },
    });
    expect(refused).toMatchObject({ ok: false, reason: 'GUARD_FAILED' });
    // The refusal is a demand row, so the block a model reads can show it.
    expect(wired.session.gaps().map((row: GapRecord) => row.rejectionReason)).toEqual(['GUARD_FAILED']);
  });
});

describe('enabledWhen: the Next button is SERVED greyed, never hidden', () => {
  it('carries enabled:false while the recipe is unset, and refuses execution as TOOL_DISABLED', async () => {
    const wired = wireWizard();
    const next = () =>
      wired.session.available().edges.find((edge) => edge.affordanceId === 'wizard.next-to-review');

    expect(next()).toMatchObject({ enabled: false }); // visible to the agent, like a human sees it
    expect(wired.session.fire('wizard.next-to-review', { source: 'agent' })).toMatchObject({
      ok: false,
      reason: 'TOOL_DISABLED',
    });

    await fireAndSettle(wired, 'wizard.name-it', { name: 'Ion channel screen' });
    await fireAndSettle(wired, 'wizard.pick-recipe', { recipe: 'dose-response' });

    // The app's own condition now holds, so the button un-greys: no marker.
    expect(next()?.enabled).toBeUndefined();
    expect(wired.session.fire('wizard.next-to-review', { source: 'agent' })).toMatchObject({ ok: true });
  });
});

describe('verify: a handler that RAN is not an action that HAPPENED', () => {
  it('refuses the silent no-op — while the commit that a real report backed still stands', async () => {
    const wired = wireWizard();
    await fireAndSettle(wired, 'wizard.name-it', { name: 'Ion channel screen' });

    // An id the app does not have: the radio selects nothing, the handler
    // returns, and the store still notifies — the field's exact failure.
    const settlement = await fireAndSettle(wired, 'wizard.pick-recipe', { recipe: 'not-a-recipe' });
    expect(settlement.effectStatus).toBe('refused');
    expect(settlement.verifyHeld).toBe(false);
    expect(settlement.error).toMatchObject({ reason: 'VERIFY_FAILED' });

    // THREE axes, none averaged: the declared write key DID appear in the
    // report (the store reported the projection), the app's own condition did
    // not hold, and the commit backed by that real report is not rolled back.
    expect(settlement.transition.effectVerified).toBe(true);
    expect(settlement.transition.outcome).toBe('committed');
    expect(wired.session.state()['project.recipe']).toBe('');

    // A real recipe settles the other way, through the same contract.
    const good = await fireAndSettle(wired, 'wizard.pick-recipe', { recipe: 'time-course' });
    expect(good.effectStatus).toBe('performed');
    expect(good.verifyHeld).toBe(true);
  });

  it('the PREDICATE form reads the app router the library cannot see', async () => {
    const wired = wireWizard();
    await fireAndSettle(wired, 'wizard.name-it', { name: 'Ion channel screen' });
    await fireAndSettle(wired, 'wizard.pick-recipe', { recipe: 'dose-response' });

    const moved = await fireAndSettle(wired, 'wizard.next-to-review');
    expect(moved.effectStatus).toBe('performed');
    expect(moved.verifyHeld).toBe(true);
    expect(wired.app.path).toBe(PATHS.review);
    expect(wired.session.node).toBe('review');
  });

  it('a router that silently drops the push is caught by that same predicate', async () => {
    // The app is untouched; only the wiring lies — a `navigate` that returns
    // without moving anything is the disabled-button case in another costume.
    const wired = wireWizard();
    const deaf = wired.graph.createSession({
      node: 'wizard',
      state: { 'project.name': 'x', 'project.recipe': 'dose-response', 'projects.count': 0 },
      navigate: () => {
        /* accepted, and dropped */
      },
    });
    const fired = deaf.fire('wizard.next-to-review', { source: 'agent' });
    expect(fired.ok).toBe(true);
    const settlement = await (fired as { whenSettled: Promise<FireSettlement> }).whenSettled;
    expect(settlement.effectStatus).toBe('refused');
    expect(settlement.verifyHeld).toBe(false);
    // The claimed navigation is walked back: a claims-only commit rolls back.
    expect(settlement.transition.outcome).toBe('rolled-back');
    expect(deaf.node).toBe('wizard');
  });
});

describe("input: 'none' — the click-only control", () => {
  it("refuses a relay's value:'' with the shape it sent, and never hands it to the handler", async () => {
    const wired = wireWizard();
    await fireAndSettle(wired, 'wizard.name-it', { name: 'Ion channel screen' });
    await fireAndSettle(wired, 'wizard.pick-recipe', { recipe: 'dose-response' });

    const refused = wired.session.fire('wizard.next-to-review', {
      source: 'agent',
      payload: { value: '' },
    });
    expect(refused).toMatchObject({
      ok: false,
      reason: 'PAYLOAD_INVALID',
      issues: 'this action takes no input — omit the payload (received { value: string })',
    });
    expect(wired.app.path).toBe(PATHS.wizard); // nothing ran

    // A BLANK payload is protocol residue, not intent: accepted and erased.
    const blank = await fireAndSettle(wired, 'wizard.next-to-review', '');
    expect(blank.effectStatus).toBe('performed');
  });
});

describe('crossLinks: the spine that keeps every page reachable', () => {
  it('offers the link to the Projects list from inside the wizard', () => {
    const wired = wireWizard();
    const offered = wired.session.available().edges.map((edge) => edge.affordanceId);
    expect(offered).toContain('go-to-projects');
    // Authored words only: the route table's own label, framed by a constant.
    expect(
      wired.session.available().edges.find((edge) => edge.affordanceId === 'go-to-projects')?.description,
    ).toBe('Go to the Projects list');
  });

  it('a page with no authored actions of its own is NOT a dead end — the links can act', () => {
    const wired = wireWizard();
    wired.session.sync('projects');
    expect(wired.session.gaps().filter((row) => row.kind === 'dead-end')).toEqual([]);
    expect(wired.warnings).toEqual([]);
  });

  it('CONTROL — the same wizard without the spine records the dead end and names the three fixes', () => {
    const wired = wireWizard({ crossLinks: false });
    wired.session.sync('projects');

    const deadEnds = wired.session.gaps().filter((row) => row.kind === 'dead-end');
    expect(deadEnds).toHaveLength(1);
    expect(deadEnds[0]).toMatchObject({ node: 'projects', availableActions: [] });
    expect(wired.warnings).toHaveLength(1);
    expect(wired.warnings[0]).toContain('has NO actions authored on it at all');
    expect(wired.warnings[0]).toContain('registerToolGroup');
    expect(wired.warnings[0]).toContain('navigate:');
    expect(wired.warnings[0]).toContain('crossLinks: true');
  });
});

describe('the journey narrows what it discloses — it never owns the actions', () => {
  it('keeps every page action in whats_here while the frame is open, plus the facts block', async () => {
    const wired = wireWizard();
    const port = skillsAsTools(wired.session);

    const opened = port.call('wizard.skill.new-project', {}) as Record<string, unknown>;
    expect(opened['frame']).toBe('open');
    expect(wired.session.skillFrame()?.skillId).toBe('new-project');

    const here = port.call('wizard.whats_here', {}) as {
      actions: Array<{ action: string; expects?: unknown }>;
      facts: string;
    };
    // The way out of the room is still offered — the frame narrowed the SKILL
    // tool's readySteps, not the page.
    expect(here.actions.map((row) => row.action)).toContain('go-to-projects');
    // And the input contract rides the row, before the model can guess wrong.
    expect(here.actions.find((row) => row.action === 'wizard.name-it')?.expects).toMatchObject({
      required: ['name'],
    });
  });
});

describe('groundTruth: the facts the model cannot argue with', () => {
  it('says outright that nothing has happened, then grades every attempt', async () => {
    const wired = wireWizard();
    expect(wired.session.groundTruth().text).toContain(
      'No actions have been performed in this app this session.',
    );

    wired.session.fire('wizard.pick-recipe', { source: 'agent', payload: { recipe: 'dose-response' } });
    await fireAndSettle(wired, 'wizard.name-it', { name: 'Ion channel screen' });
    await fireAndSettle(wired, 'wizard.pick-recipe', { recipe: 'not-a-recipe' });

    const facts = wired.session.groundTruth().text;
    // A refusal is as visible as a success — it is a gap row, not a transition,
    // which is precisely why the narrative brief could never show it.
    expect(facts).toContain("did NOT happen — agent's fire of wizard.pick-recipe was refused: GUARD_FAILED");
    expect(facts).toContain('DID happen — agent fired wizard.name-it');
    expect(facts).toContain("the app's own verify contract did not hold afterwards");
    // Facts are what happened: no options, no values, no payloads.
    expect(facts).not.toContain('Ion channel screen');
    expect(facts).not.toContain('go-to-projects');
  });
});

describe('the high-effect gate still stands at the end of the journey', () => {
  it('stops at needs-confirm with receipts, then creates on the confirmed call', async () => {
    const wired = wireWizard();
    const port = skillsAsTools(wired.session);
    await fireAndSettle(wired, 'wizard.name-it', { name: 'Ion channel screen' });
    await fireAndSettle(wired, 'wizard.pick-recipe', { recipe: 'dose-response' });
    await fireAndSettle(wired, 'wizard.next-to-review');

    const asked = port.call('wizard.do_action', { action: 'create-project' }) as Record<string, unknown>;
    expect(asked['judgment']).toBe('needs-confirm');
    expect(asked['receipts']).toMatchObject({ willDo: { does: 'Create the project' } });
    expect(wired.session.state()['projects.count']).toBe(0); // nothing crossed the gate

    const done = port.call('wizard.do_action', { action: 'create-project', confirm: true }) as Record<
      string,
      unknown
    >;
    expect(done['ok']).toBe(true);
    const settlement = await wired.session.settlementOf(String(done['transitionId']));
    expect(settlement.effectStatus).toBe('performed');
    expect(settlement.verifyHeld).toBe(true);
    expect(wired.session.state()['projects.count']).toBe(1);
  });
});

describe('the literal-address law the spine rests on', () => {
  it('refuses a NAMED crossLinks page whose route has a :param — at the factory, where the author is looking', () => {
    expect(() => fromRoutes({ project: '/projects/:id' }, { crossLinks: ['project'] })).toThrow(
      /never guesses params/,
    );
  });

  it('…while a blanket `true` FILTERS that same page: a blanket ask gets whatever is linkable', () => {
    const graph = buildNavigationGraph('two', {
      sources: [fromRoutes({ projects: '/projects', project: '/projects/:id' }, { crossLinks: true })],
    });
    expect(Object.keys(graph.spec.affordances)).toEqual(['go-to-projects']);
  });
});
