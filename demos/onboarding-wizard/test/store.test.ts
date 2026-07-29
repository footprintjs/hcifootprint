import { describe, expect, it, vi } from 'vitest';

import { createWizardStore } from '../src/app/store.js';

describe('the wizard store', () => {
  it('projects ONLY the guard keys, not the person’s details', () => {
    const store = createWizardStore();
    store.saveProfile({ name: 'Ada Lovelace', role: 'Engineer' });
    expect(Object.keys(store.projected()).sort()).toEqual([
      'emailVerified',
      'plan',
      'profileComplete',
      'signedUp',
    ]);
    // The name is in the app; it is deliberately not in what the session sees.
    expect(JSON.stringify(store.projected())).not.toContain('Ada');
  });

  it('leaves `googleLinked` out on purpose — the app has nothing honest to say about it', () => {
    expect(createWizardStore().projected()).not.toHaveProperty('googleLinked');
  });

  it('notifies on a real change and stays silent on a repeat', () => {
    const store = createWizardStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.verifyEmail();
    store.verifyEmail(); // already verified — nothing changed
    expect(listener).toHaveBeenCalledTimes(1);

    store.choosePlan('pro');
    store.choosePlan('pro');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('enforces the rules the schema cannot: a blank profile and an unknown plan are refused', () => {
    const store = createWizardStore();
    expect(() => store.saveProfile({ name: '  ', role: 'Engineer' })).toThrow(/name and a role/);
    // The declared schema announces the enum; the structural payload check
    // deliberately does not judge enums, so the store is the belt.
    expect(() => store.choosePlan('enterprise')).toThrow(/Unknown plan/);
    expect(() => store.confirmSignup()).toThrow(/before the profile and plan/);
  });

  it('hands out a copy, never the live object', () => {
    const store = createWizardStore();
    const snapshot = store.snapshot();
    snapshot.plan = 'tampered';
    expect(store.snapshot().plan).toBe('');
  });
});
