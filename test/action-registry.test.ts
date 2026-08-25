import { describe, expect, it } from 'vitest';
import type { ActionBindingRef, ActionDefinitionRef } from '../src/index.js';
import { ActionRegistry } from '../src/registry/registry.js';

const definition: ActionDefinitionRef<'orders.archive'> = Object.freeze({
  kind: 'action-definition',
  definitionId: 'orders.archive',
});

const binding = (
  bindingId: string,
  instance?: string,
): ActionBindingRef<'orders.archive'> => ({
  kind: 'action-binding',
  bindingId,
  definition,
  node: 'orders.rows',
  ...(instance !== undefined ? { instance } : {}),
});

describe('the canonical registry stores live bindings, not one mutable site per action', () => {
  it('keeps two simultaneous bindings of one definition independently addressable', () => {
    const registry = new ActionRegistry(() => undefined);
    const first = () => 'o-57';
    const second = () => 'o-60';
    const firstRef = binding('binding#1', 'o-57');
    const secondRef = binding('binding#2', 'o-60');

    registry.registerBinding('row-57', firstRef, first);
    registry.registerBinding('row-60', secondRef, second);

    expect(registry.handlerForBinding(firstRef)).toBe(first);
    expect(registry.handlerForBinding(secondRef)).toBe(second);
    expect(
      registry
        .bindingsFor(firstRef.definition)
        .map((row) => row.binding.bindingId),
    ).toEqual(['binding#1', 'binding#2']);
    // The legacy action-level projection remains last-wins for existing callers.
    expect(registry.handlerFor('orders.archive')).toBe(second);
  });

  it('round-trips an opaque instance without encoding or parsing it', () => {
    const registry = new ActionRegistry(() => undefined);
    const instance = 'customer[west].order/#57|retry';
    const ref = binding('binding#opaque', instance);

    registry.registerBinding('opaque-row', ref, () => undefined);

    expect(registry.registrationFor(ref)?.binding.instance).toBe(instance);
    expect(registry.bindingsFor(ref.definition)[0]?.binding.instance).toBe(
      instance,
    );
  });

  it('disconnects by binding token, idempotently, without touching its sibling', () => {
    const registry = new ActionRegistry(() => undefined);
    const firstRef = binding('binding#1', 'o-57');
    const secondRef = binding('binding#2', 'o-60');
    registry.registerBinding('row-57', firstRef, () => 'first');
    registry.registerBinding('row-60', secondRef, () => 'second');

    expect(registry.unregisterBinding(firstRef)).toBe(true);
    expect(registry.unregisterBinding(firstRef)).toBe(false);
    expect(registry.handlerForBinding(firstRef)).toBeUndefined();
    expect(registry.handlerForBinding(secondRef)?.()).toBe('second');
    expect(registry.handlerFor('orders.archive')?.()).toBe('second');
  });

  it('tracks enabled and busy state on the exact binding', () => {
    const registry = new ActionRegistry(() => undefined);
    const firstRef = binding('binding#1', 'o-57');
    const secondRef = binding('binding#2', 'o-60');
    registry.registerBinding('row-57', firstRef, () => 'first');
    registry.registerBinding('row-60', secondRef, () => 'second');

    expect(registry.setBindingEnabled(firstRef, false)).toBe(true);
    expect(registry.setBindingBusy(secondRef, 'Archiving…')).toBe(true);

    expect(registry.registrationFor(firstRef)?.enabled).toBe(false);
    expect(registry.registrationFor(secondRef)?.enabled).toBe(true);
    expect(registry.registrationFor(secondRef)?.busy).toBe('Archiving…');
  });

  it('keeps structured siblings when the legacy last-wins projection changes', () => {
    const registry = new ActionRegistry(() => undefined);
    const firstRef = binding('binding#1', 'o-57');
    const secondRef = binding('binding#2', 'o-60');
    registry.registerBinding('row-57', firstRef, () => 'first');
    registry.register('legacy-a', 'orders.archive', () => 'legacy-a');
    registry.registerBinding('row-60', secondRef, () => 'second');
    registry.register('legacy-b', 'orders.archive', () => 'legacy-b');

    expect(registry.bindingsFor(firstRef.definition)).toHaveLength(2);
    expect(registry.handlerForBinding(firstRef)?.()).toBe('first');
    expect(registry.handlerForBinding(secondRef)?.()).toBe('second');
    expect(registry.handlerFor('orders.archive')?.()).toBe('legacy-b');
    expect(
      registry
        .registrations()
        .filter(
          (row) =>
            row.binding === undefined && row.affordanceId === 'orders.archive',
        ),
    ).toHaveLength(1);
  });

  it('does not accept a lookalike ref from another isolated runtime', () => {
    const registry = new ActionRegistry(() => undefined);
    const local = binding('binding#1', 'o-57');
    const lookalike = binding('binding#1', 'o-57');
    registry.registerBinding('row-57', local, () => 'local');

    expect(registry.registrationFor(lookalike)).toBeUndefined();
    expect(registry.unregisterBinding(lookalike)).toBe(false);
    expect(registry.handlerForBinding(local)?.()).toBe('local');
  });

  it('rejects lookalike re-registration without stealing the canonical row', () => {
    const registry = new ActionRegistry(() => undefined);
    const local = binding('binding#1', 'o-57');
    const lookalike = binding('binding#1', 'o-57');
    registry.registerBinding('row-57', local, () => 'local');

    expect(() =>
      registry.registerBinding('foreign-row', lookalike, () => 'foreign'),
    ).toThrow(/already owned/);
    expect(registry.registrationFor(local)?.binding).toBe(local);
    expect(registry.handlerForBinding(local)?.()).toBe('local');
  });

  it('uses exact re-registration recency when promoting a fallback', () => {
    const registry = new ActionRegistry(() => undefined);
    const first = binding('binding#1', 'o-57');
    const second = binding('binding#2', 'o-60');
    const newest = binding('binding#3', 'o-63');
    registry.registerBinding('first', first, () => 'first');
    registry.registerBinding('second', second, () => 'second');
    registry.registerBinding('first-new-owner', first, () => 'first-again');
    registry.registerBinding('newest', newest, () => 'newest');

    expect(registry.unregisterBinding(newest)).toBe(true);
    expect(registry.handlerFor('orders.archive')?.()).toBe('first-again');
  });

  it('fails closed on unknown coverage at registry ingress', () => {
    const registry = new ActionRegistry(() => undefined);
    const ref = binding('binding#1');

    expect(() =>
      registry.registerBinding('row', ref, () => undefined, true, undefined, {
        coverage: 'bogus' as never,
      }),
    ).toThrow(/invalid coverage/);
    expect(registry.registrationFor(ref)).toBeUndefined();
  });
});
