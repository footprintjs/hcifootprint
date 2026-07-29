import { describe, expect, it } from 'vitest';

import { settle } from '../src/app/settle.js';
import { createWizardApp } from '../src/app/wizard.js';
import { readGapBacklog } from '../src/panels/gapBacklog.js';
import { readGuardKeys, readMarkers } from '../src/panels/markers.js';
import { readReceipts } from '../src/panels/receipts.js';

/**
 * Every panel is a projection of a live return value. These tests assert the
 * projection copies rather than invents — an absent marker must stay absent,
 * because "the session did not stamp this" and "the session stamped false" are
 * different facts.
 */
describe('the marker panel', () => {
  it('copies each edge’s markers verbatim off available()', () => {
    const app = createWizardApp();
    const reading = readMarkers(app.session.available());

    expect(reading.from).toBe('session.available()');
    expect(reading.node).toBe('welcome');

    const wired = reading.rows.find((row) => row.affordanceId === 'welcome.verify-email');
    expect(wired).toMatchObject({ materialized: true, activation: 'synced' });
    expect(wired).not.toHaveProperty('guardUnevaluated');
    expect(wired).not.toHaveProperty('gestureKind');

    const unwired = reading.rows.find((row) => row.affordanceId === 'welcome.import-from-google');
    expect(unwired).toMatchObject({
      materialized: false,
      gestureKind: 'element',
      guardUnevaluated: ['googleLinked'],
    });
    app.destroy();
  });

  it('reports which guard keys the app seeds and which it does not', () => {
    const app = createWizardApp();
    const reading = readGuardKeys(app.graph.requiredStateKeys(), app.store.projected());
    expect(reading.seeded).toEqual(['emailVerified', 'plan', 'profileComplete', 'signedUp']);
    // The unseeded key is exactly the one behind the guardUnevaluated marker above.
    expect(reading.unseeded).toEqual(['googleLinked']);
    app.destroy();
  });

  it('marks the input contract the step advertises, without copying the schema into a claim', () => {
    const app = createWizardApp({ initialPath: '/profile' });
    const reading = readMarkers(app.session.available());
    expect(reading.rows.find((r) => r.affordanceId === 'profile.save-profile')?.declaresInput).toBe(true);
    expect(reading.rows.find((r) => r.affordanceId === 'profile.back-to-welcome')?.declaresInput).toBe(false);
    app.destroy();
  });
});

describe('the demand backlog', () => {
  it('is empty until something is actually refused', () => {
    const app = createWizardApp();
    expect(readGapBacklog(app.session.gaps())).toMatchObject({ total: 0, byGesture: [], rows: [] });
    app.destroy();
  });

  it('clusters by the wiring that is missing, count-desc then label-asc', () => {
    const app = createWizardApp();
    // Two reaches for the unwired click, one for a guard-blocked step.
    app.session.fire('welcome.import-from-google', { source: 'agent' });
    app.session.commitSkill('import-signup', { source: 'agent' });
    app.session.fire('welcome.to-profile', { source: 'agent', expectedVersion: -1 });

    const backlog = readGapBacklog(app.session.gaps());
    expect(backlog.total).toBe(3);
    expect(backlog.byGesture).toEqual([
      { label: 'element', count: 2 },
      { label: '(no declared gesture)', count: 1 },
    ]);
    expect(backlog.byReason.map((cluster) => cluster.label).sort()).toEqual([
      'ENTRY_NOT_MATERIALIZED',
      'NOT_MATERIALIZED',
      'STALE_CURSOR',
    ]);
    app.destroy();
  });
});

describe('the receipts panel', () => {
  it('keeps the three truths apart: outcome, verified effect, and a claimed move', async () => {
    const app = createWizardApp();
    app.session.fire('welcome.verify-email', { source: 'agent' });
    await settle();
    app.session.fire('welcome.to-profile', { source: 'agent' });
    await settle();

    const reading = readReceipts(app.session.transitions(), app.session.commitLog());

    const wrote = reading.rows.find((row) => row.what === 'welcome.verify-email');
    expect(wrote).toMatchObject({ outcome: 'committed', effectVerified: true, toNodeClaimed: false });

    const moved = reading.rows.find((row) => row.what === 'welcome.to-profile');
    // Nothing declared a write, so there is nothing to verify — and that is a
    // real answer, not a missing one.
    expect(moved).toMatchObject({
      outcome: 'committed',
      effectVerified: 'unobservable',
      toNode: 'profile',
      toNodeClaimed: true,
    });

    expect(reading.logJoinsCleanly).toBe(true);
    expect(reading.committed).toBe(reading.bundles);
    app.destroy();
  });

  it('notices when a handler refuses: the record rolls back and owns no bundle', async () => {
    const app = createWizardApp({ initialPath: '/profile' });
    // The store refuses a blank profile by throwing — the app did not do the
    // thing, so the transition must not be left claiming it did.
    const fired = app.session.fire('profile.save-profile', {
      source: 'agent',
      payload: { name: ' ', role: 'Engineer' },
    });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    expect((await fired.whenSettled).effectStatus).toBe('refused');
    await settle();

    const reading = readReceipts(app.session.transitions(), app.session.commitLog());
    const row = reading.rows.find((r) => r.what === 'profile.save-profile');
    expect(row?.outcome).toBe('rejected');
    expect(row?.hasCommitBundle).toBe(false);
    expect(app.store.snapshot().profileComplete).toBe(false);
    app.destroy();
  });
});
