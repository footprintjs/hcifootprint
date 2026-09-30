import { describe, expect, it } from 'vitest';
import {
  connectAction,
  createActionRuntime,
  defineAction,
} from '../src/index.js';

/**
 * Binding locators handed to connectAction are frozen once, per kind, by
 * `declarations.ts · freezeBinding` — every supported kind is retained as a
 * frozen copy, and a malformed one is refused at connect time with a
 * sentence naming what is wrong (never retained, never served in an offer).
 */

function connectWith(locators: unknown) {
  const action = defineAction('locators.probe', {
    does: 'Probe the locator law',
    invocation: 'inputless',
    mutate: () => 'done',
  });
  const runtime = createActionRuntime();
  const connection = Reflect.apply(connectAction, undefined, [
    runtime,
    action,
    { node: 'probe', locators },
  ]) as ReturnType<typeof connectAction>;
  return { runtime, connection };
}

describe('connectAction locators — every supported kind is retained as a frozen copy', () => {
  it('keeps keychord, url and tab locators, detached from the caller', () => {
    const keychord = { kind: 'keychord' as const, chord: 'Mod+S' };
    const url = { kind: 'url' as const, href: '/orders/57' };
    const tab = { kind: 'tab' as const, target: 'details' };
    const { runtime, connection } = connectWith([keychord, url, tab]);

    const locators = runtime.bindingFor(connection.binding)!.locators;
    expect(locators).toEqual([keychord, url, tab]);
    expect(Object.isFrozen(locators)).toBe(true);
    for (const [index, locator] of locators.entries()) {
      expect(Object.isFrozen(locator)).toBe(true);
      expect(locator).not.toBe([keychord, url, tab][index]);
    }
    (keychord as { chord: string }).chord = 'Mod+Q';
    expect(locators[0]).toEqual({ kind: 'keychord', chord: 'Mod+S' });
  });
});

describe('connectAction locators — a malformed locator is refused at connect time', () => {
  it('refuses a locator list that is not an array', () => {
    expect(() => connectWith({ kind: 'url', href: '/x' })).toThrow(
      'hcifootprint: binding locators must be an array.',
    );
  });

  it('refuses an entry that is not a record', () => {
    for (const entry of [null, 'button']) {
      expect(() => connectWith([entry])).toThrow(
        'hcifootprint: each binding locator must be a record.',
      );
    }
  });

  it('refuses an element locator without string role/name or with an unsupported actuation', () => {
    const cases = [
      { kind: 'element', locator: null },
      { kind: 'element', locator: 'button' },
      { kind: 'element', locator: { role: 1, name: 'Save' } },
      { kind: 'element', locator: { role: 'button', name: undefined } },
      {
        kind: 'element',
        locator: { role: 'button', name: 'Save' },
        actuation: 'teleport',
      },
    ];
    for (const entry of cases) {
      expect(() => connectWith([entry])).toThrow(
        'hcifootprint: an element locator needs string role/name fields and a supported actuation.',
      );
    }
  });

  it('refuses a known kind whose own field is not a string, naming the kind', () => {
    for (const [entry, kind] of [
      [{ kind: 'keychord', chord: 7 }, 'keychord'],
      [{ kind: 'programmatic', provider: {} }, 'programmatic'],
      [{ kind: 'url', href: null }, 'url'],
      [{ kind: 'tab', target: false }, 'tab'],
      [{ kind: 'hologram' }, 'hologram'],
    ] as const) {
      expect(() => connectWith([entry])).toThrow(
        `hcifootprint: unsupported or malformed binding locator '${kind}'.`,
      );
    }
  });

  it('a refused connection leaves no binding behind to be offered', () => {
    const action = defineAction('locators.refused', {
      does: 'Never connected',
      invocation: 'inputless',
      mutate: () => 'done',
    });
    const runtime = createActionRuntime();
    expect(() =>
      Reflect.apply(connectAction, undefined, [
        runtime,
        action,
        { node: 'probe', locators: [{ kind: 'url', href: 1 }] },
      ]),
    ).toThrow(/malformed binding locator 'url'/);
    expect(runtime.forPrincipal('system').offers(action)).toEqual([]);
  });
});
