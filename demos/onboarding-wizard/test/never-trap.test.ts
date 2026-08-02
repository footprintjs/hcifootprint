import { describe, expect, it } from 'vitest';

import { settle } from '../src/app/settle.js';
import { createWizardApp } from '../src/app/wizard.js';
import { readGapBacklog } from '../src/panels/gapBacklog.js';
import { readJourneys } from '../src/panels/journeyReadiness.js';

/**
 * t3 — THE NEVER-TRAP INVARIANT, both halves.
 *
 *   "Page actions are always reachable regardless of skill state, and a skill
 *    whose first step cannot materialise is never constructed nor committed to."
 *
 * The demo's broken journey is `import-signup`: design shipped an "Import from
 * Google" button and nobody wired it. Its gesture is a click, which no address
 * can stand in for, so its entry can never act — and the frame that could never
 * act is never opened.
 */
describe('the never-trap commit gate', () => {
  it('refuses an agent commit whose entry step could never act, naming the missing wiring', () => {
    const app = createWizardApp();
    const refused = app.session.commitJourney('import-signup', { source: 'agent' });

    // Narrowed by a throw rather than an assertion, so the fields below are
    // read off the arm the union actually returned — and a surprise arm fails
    // loudly, carrying what came back instead of a bare undefined.
    if (refused.ok || refused.reason !== 'ENTRY_NOT_MATERIALIZED') {
      throw new Error(`expected ENTRY_NOT_MATERIALIZED, got ${JSON.stringify(refused)}`);
    }
    expect(refused.affordanceId).toBe('welcome.import-from-google');
    expect(refused.gesture).toEqual({
      kind: 'element',
      locator: { role: 'button', name: 'Import from Google' },
      actuation: 'click',
    });

    // The frame that could never act was never opened.
    expect(app.session.journeyFrame()).toBeNull();
    expect(app.session.frames()).toEqual([]);
    app.destroy();
  });

  it('lands exactly ONE gap row for it — naming the skill, the step and the gesture kind', () => {
    const app = createWizardApp();
    app.session.commitJourney('import-signup', { source: 'agent' });

    const backlog = readGapBacklog(app.session.gaps());
    expect(backlog.total).toBe(1);
    expect(backlog.rows[0]).toMatchObject({
      kind: 'fire-rejected',
      rejectionReason: 'ENTRY_NOT_MATERIALIZED',
      affordanceId: 'welcome.import-from-google',
      journeyId: 'import-signup',
      gestureKind: 'element',
      principal: 'agent',
    });
    // The backlog says WHICH wiring is missing — that is the product question.
    expect(backlog.byGesture).toEqual([{ label: 'element', count: 1 }]);
    app.destroy();
  });

  it('touches nothing: no transition, no commit bundle, no state', () => {
    const app = createWizardApp();
    const before = {
      transitions: app.session.transitions().length,
      bundles: app.session.commitLog().length,
      state: app.store.snapshot(),
    };
    app.session.commitJourney('import-signup', { source: 'agent' });

    expect(app.session.transitions()).toHaveLength(before.transitions);
    expect(app.session.commitLog()).toHaveLength(before.bundles);
    expect(app.store.snapshot()).toEqual(before.state);
    app.destroy();
  });

  it('says the same thing read-only, so a panel can show it without triggering it', () => {
    const app = createWizardApp();
    const reading = readJourneys(app.session.availableJourneys().journeys, app.session.available());

    const broken = reading.rows.find((row) => row.journeyId === 'import-signup');
    expect(broken?.entryWiring).toBe('not-wired');
    expect(broken?.entryGestureKind).toBe('element');
    // Reading it left no trace at all — that is the point of asking this way.
    expect(app.session.gaps()).toEqual([]);
    app.destroy();
  });

  it('lets a HUMAN commit the same journey — the gate is about the agent’s actuator, not the app’s', () => {
    const app = createWizardApp();
    const committed = app.session.commitJourney('import-signup', { source: 'user' });
    expect(committed.ok).toBe(true);
    expect(app.session.journeyFrame()?.journeyId).toBe('import-signup');
    app.destroy();
  });

  it('keeps every page action reachable while a journey frame is open', async () => {
    const app = createWizardApp();
    app.session.fire('welcome.verify-email', { source: 'agent' });
    await settle();
    app.session.fire('welcome.to-profile', { source: 'agent' });
    await settle();

    const opened = app.session.commitJourney('signup', { source: 'agent' });
    expect(opened.ok).toBe(true);

    // The frame narrows what is DISCLOSED, never what exists. The page's own
    // actions — including the way out — are still served.
    const served = app.session.available().edges.map((edge) => edge.affordanceId);
    const steps = app.session.journeyPlan('signup').steps.map((step) => step.affordanceId);
    const notSteps = served.filter((id) => !steps.includes(id));
    expect(notSteps).toContain('profile.back-to-welcome');
    expect(notSteps.length).toBeGreaterThan(0);
    app.destroy();
  });
});
