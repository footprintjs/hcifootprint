/**
 * ActionRegistry — the answers the main registry suites never ask for.
 *
 * Each test pins a contract the class states in its own doc comments
 * (src/registry/registry.ts · ActionRegistry): a structured binding needs an
 * identity; a "no change" is `false` and bumps nothing; a change to a structured
 * binding bumps its `revision` exactly once whichever door made it; a removed
 * sibling never moves the action-level projection off a live newer binding; and
 * `undefined` in an update DELETES the key — absence is how this library spells
 * "not said".
 */
import { describe, expect, it } from 'vitest';
import type { ActionBindingRef, ActionDefinitionRef } from '../src/index.js';
import { ActionRegistry } from '../src/registry/registry.js';

const definition: ActionDefinitionRef<'orders.archive'> = Object.freeze({
  kind: 'action-definition',
  definitionId: 'orders.archive',
});

const binding = (bindingId: string, instance?: string): ActionBindingRef<'orders.archive'> => ({
  kind: 'action-binding',
  bindingId,
  definition,
  node: 'orders.rows',
  ...(instance !== undefined ? { instance } : {}),
});

const quiet = () => new ActionRegistry(() => undefined);

describe('a structured binding needs an identity', () => {
  it('an empty bindingId is refused, and nothing is registered', () => {
    const registry = quiet();
    expect(() => registry.registerBinding('row', binding(''), () => undefined)).toThrow(
      new TypeError('hcifootprint: a structured action binding needs a non-empty bindingId.'),
    );
    expect(registry.hasAny()).toBe(false);
    expect(registry.isRegistered('orders.archive')).toBe(false);
  });
});

describe('a busy label said at registration', () => {
  it('rides the structured row and the action-level projection', () => {
    const registry = quiet();
    const ref = binding('binding#1');
    registry.registerBinding('row', ref, () => undefined, true, 'Archiving…');
    expect(registry.registrationFor(ref)?.busy).toBe('Archiving…');
    expect(registry.busyOf('orders.archive')).toBe('Archiving…');
  });

  it('and an unsaid one is an ABSENT key, not a stored undefined', () => {
    const registry = quiet();
    const ref = binding('binding#1');
    registry.registerBinding('row', ref, () => undefined);
    expect('busy' in registry.registrationFor(ref)!).toBe(false);
  });
});

describe('the action-level doors bump a structured binding’s revision', () => {
  it('setEnabled on a projection that is a structured binding', () => {
    const registry = quiet();
    const ref = binding('binding#1');
    registry.registerBinding('row', ref, () => undefined);
    const before = registry.registrationFor(ref)!.revision;
    expect(registry.setEnabled('orders.archive', false)).toBe(true);
    expect(registry.registrationFor(ref)).toMatchObject({ enabled: false, revision: before + 1 });
  });

  it('setBusy on a projection that is a structured binding — set, then cleared', () => {
    const registry = quiet();
    const ref = binding('binding#1');
    registry.registerBinding('row', ref, () => undefined);
    const before = registry.registrationFor(ref)!.revision;
    expect(registry.setBusy('orders.archive', 'Saving')).toBe(true);
    expect(registry.registrationFor(ref)).toMatchObject({ busy: 'Saving', revision: before + 1 });
    expect(registry.setBusy('orders.archive', undefined)).toBe(true);
    const cleared = registry.registrationFor(ref)!;
    expect('busy' in cleared).toBe(false);
    expect(cleared.revision).toBe(before + 2);
  });
});

describe('unregisterGroup removes a structured sibling without disturbing the projection', () => {
  it('an OLDER binding leaving keeps the newer one as the action-level answer', () => {
    const registry = quiet();
    const older = binding('binding#1', 'o-57');
    const newer = binding('binding#2', 'o-60');
    const newerHandler = () => 'newer';
    registry.registerBinding('row-57', older, () => 'older');
    registry.registerBinding('row-60', newer, newerHandler);

    expect(registry.unregisterGroup('row-57')).toEqual(['orders.archive']);
    expect(registry.handlerFor('orders.archive')).toBe(newerHandler);
    expect(registry.registrationFor(older)).toBeUndefined();
    expect(registry.registrationFor(newer)?.group).toBe('row-60');
  });

  it('a structured row leaving never erases the legacy door’s own winner', () => {
    const registry = quiet();
    const legacy = () => 'legacy';
    registry.register('page', 'orders.archive', legacy);
    const ref = binding('binding#1');
    registry.registerBinding('row', ref, () => 'structured');

    registry.unregisterGroup('row');
    // The legacy row is promoted back and is still the legacy winner: a fresh
    // legacy registration replaces it rather than stacking a second one.
    expect(registry.handlerFor('orders.archive')).toBe(legacy);
    registry.register('page', 'orders.archive', () => 'legacy-2');
    expect(registry.registrations()).toHaveLength(1);
  });
});

describe('bindingRegistrations lists structured bindings only', () => {
  it('a legacy compatibility row is not a binding', () => {
    const registry = quiet();
    registry.register('page', 'orders.archive', () => 'legacy');
    const ref = binding('binding#1');
    registry.registerBinding('row', ref, () => 'structured');
    expect(registry.registrations()).toHaveLength(2);
    expect(registry.bindingRegistrations().map((row) => row.binding)).toEqual([ref]);
  });
});

describe('per-binding setters: false means nothing changed, and nothing was bumped', () => {
  it('setBindingEnabled on a disconnected binding, and to the value it already has', () => {
    const registry = quiet();
    const ref = binding('binding#1');
    expect(registry.setBindingEnabled(ref, false)).toBe(false);
    registry.registerBinding('row', ref, () => undefined);
    const before = registry.registrationFor(ref)!.revision;
    expect(registry.setBindingEnabled(ref, true)).toBe(false);
    expect(registry.registrationFor(ref)!.revision).toBe(before);
  });

  it('setBindingBusy on a disconnected binding, and to the label it already has', () => {
    const registry = quiet();
    const ref = binding('binding#1');
    expect(registry.setBindingBusy(ref, 'Saving')).toBe(false);
    registry.registerBinding('row', ref, () => undefined, true, 'Saving');
    const before = registry.registrationFor(ref)!.revision;
    expect(registry.setBindingBusy(ref, 'Saving')).toBe(false);
    expect(registry.registrationFor(ref)!.revision).toBe(before);
  });

  it('setBindingBusy(undefined) DELETES the label and bumps once', () => {
    const registry = quiet();
    const ref = binding('binding#1');
    registry.registerBinding('row', ref, () => undefined, true, 'Saving');
    const before = registry.registrationFor(ref)!.revision;
    expect(registry.setBindingBusy(ref, undefined)).toBe(true);
    const row = registry.registrationFor(ref)!;
    expect('busy' in row).toBe(false);
    expect(row.revision).toBe(before + 1);
  });

  it('touchBinding on a disconnected binding', () => {
    const registry = quiet();
    expect(registry.touchBinding(binding('binding#1'))).toBe(false);
  });
});

describe('updateBinding', () => {
  it('on a disconnected binding is false', () => {
    const registry = quiet();
    expect(registry.updateBinding(binding('binding#1'), { attached: true })).toBe(false);
  });

  it('an update that names no field changes nothing and bumps nothing', () => {
    const registry = quiet();
    const ref = binding('binding#1');
    registry.registerBinding('row', ref, () => undefined);
    const before = registry.registrationFor(ref)!;
    expect(registry.updateBinding(ref, {})).toBe(false);
    expect(registry.registrationFor(ref)).toEqual(before);
  });

  it('an update without coverage still applies the fields it names', () => {
    const registry = quiet();
    const ref = binding('binding#1');
    registry.registerBinding('row', ref, () => undefined);
    const before = registry.registrationFor(ref)!;
    expect(registry.updateBinding(ref, { attached: true })).toBe(true);
    expect(registry.registrationFor(ref)).toMatchObject({
      attached: true,
      coverage: before.coverage,
      revision: before.revision + 1,
    });
  });

  it('`input: undefined` and `readEnabled: undefined` DELETE the reader', () => {
    const registry = quiet();
    const ref = binding('binding#1');
    registry.registerBinding('row', ref, () => undefined, true, undefined, {
      input: () => 'payload',
      readEnabled: () => true,
    });
    const before = registry.registrationFor(ref)!.revision;
    expect(registry.updateBinding(ref, { input: undefined, readEnabled: undefined })).toBe(true);
    const row = registry.registrationFor(ref)!;
    expect('input' in row).toBe(false);
    expect('readEnabled' in row).toBe(false);
    expect(row.revision).toBe(before + 1);
  });

  it('a new readBusy reader replaces the old one', () => {
    const registry = quiet();
    const ref = binding('binding#1');
    const first = () => 'first';
    const second = () => 'second';
    registry.registerBinding('row', ref, () => undefined, true, undefined, { readBusy: first });
    expect(registry.updateBinding(ref, { readBusy: second })).toBe(true);
    expect(registry.registrationFor(ref)?.readBusy).toBe(second);
    // The same reader again is no change.
    expect(registry.updateBinding(ref, { readBusy: second })).toBe(false);
  });
});
