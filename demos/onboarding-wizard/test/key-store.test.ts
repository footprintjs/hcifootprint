import { afterEach, describe, expect, it } from 'vitest';

import { clearAllKeys, clearKey, getKey, presence, setKey } from '../src/keys/keyStore.js';

/** A Storage stand-in — the browser API this module is allowed to touch, and no more. */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

function installWindow(): { sessionStorage: Storage; localStorage: Storage } {
  const win = { sessionStorage: fakeStorage(), localStorage: fakeStorage() };
  (globalThis as { window?: unknown }).window = win;
  return win;
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe('the key store', () => {
  it('writes to sessionStorage ONLY — a key must not outlive the tab', () => {
    const win = installWindow();
    setKey('anthropic', 'sk-ant-test');
    expect(win.sessionStorage.getItem('onboarding-wizard:key:anthropic')).toBe('sk-ant-test');
    expect(win.localStorage.getItem('onboarding-wizard:key:anthropic')).toBeNull();
  });

  it('exposes presence, which is all the rest of the app is allowed to see', () => {
    installWindow();
    expect(presence()).toEqual({ anthropic: false, openai: false });
    setKey('openai', 'sk-test');
    expect(presence()).toEqual({ anthropic: false, openai: true });
  });

  it('treats a blank value as a clear rather than persisting nothing', () => {
    installWindow();
    setKey('anthropic', 'sk-ant-test');
    setKey('anthropic', '   ');
    expect(getKey('anthropic')).toBe('');
  });

  it('forgets from BOTH storages, so an older build’s copy cannot survive', () => {
    const win = installWindow();
    // Simulate a key written by a build that used localStorage.
    win.localStorage.setItem('onboarding-wizard:key:openai', 'sk-legacy');
    expect(getKey('openai')).toBe('sk-legacy');
    clearAllKeys();
    expect(getKey('openai')).toBe('');
    expect(win.localStorage.getItem('onboarding-wizard:key:openai')).toBeNull();
  });

  it('never touches an environment variable — a VITE_* key would ship in the bundle', () => {
    installWindow();
    process.env.VITE_ANTHROPIC_API_KEY = 'sk-should-never-be-read';
    expect(getKey('anthropic')).toBe('');
    delete process.env.VITE_ANTHROPIC_API_KEY;
  });

  it('degrades quietly where there is no window at all (this suite runs in node)', () => {
    expect(getKey('anthropic')).toBe('');
    expect(presence()).toEqual({ anthropic: false, openai: false });
    expect(() => {
      setKey('anthropic', 'x');
      clearKey('anthropic');
      clearAllKeys();
    }).not.toThrow();
  });
});
