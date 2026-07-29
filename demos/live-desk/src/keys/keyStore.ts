/**
 * SECURITY-CRITICAL — the ONLY module in this app that touches an API key.
 *
 * The rules it exists to enforce:
 *   • The rest of the app sees `KeyPresence { anthropic: boolean; openai: boolean }`
 *     and nothing more. `read()` is called once per turn, inside the provider
 *     factory, and the value goes straight into the provider.
 *   • A key is never logged, never put on a session record, never in the URL.
 *   • sessionStorage ONLY — it is gone when the tab closes. `forceSessionOnly()`
 *     runs at mount and wipes any copy a previous build left in localStorage,
 *     so "session only" is enforced rather than promised.
 *   • No `VITE_*` variable is ever read: Vite inlines those into the built
 *     bundle, which would publish the key to every visitor.
 *
 * Custody, stated to the visitor in the panel: the key stays in this browser and
 * is sent directly to the provider's host. It reaches no backend, because this
 * app has none.
 */
export type KeySlot = 'anthropic' | 'openai';

export interface KeyPresence {
  readonly anthropic: boolean;
  readonly openai: boolean;
}

const PREFIX = 'live-desk:key:';
const SLOTS: readonly KeySlot[] = ['anthropic', 'openai'];

/** Storage access throws in Safari private mode — every touch is wrapped. */
function safely<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function session(): Storage | null {
  return safely(() => window.sessionStorage, null);
}

export function write(slot: KeySlot, value: string): void {
  const trimmed = value.trim();
  const store = session();
  if (!store) return;
  if (trimmed.length === 0) {
    safely(() => store.removeItem(PREFIX + slot), undefined);
    return;
  }
  safely(() => store.setItem(PREFIX + slot, trimmed), undefined);
}

/** Read a key. Called only where a provider is being built. */
export function read(slot: KeySlot): string {
  return safely(() => session()?.getItem(PREFIX + slot) ?? '', '');
}

/** What the rest of the app is allowed to know. */
export function presence(): KeyPresence {
  return { anthropic: read('anthropic').length > 0, openai: read('openai').length > 0 };
}

/** "Forget my keys" — clears every slot from both storages. */
export function forgetAll(): void {
  for (const slot of SLOTS) {
    safely(() => window.sessionStorage.removeItem(PREFIX + slot), undefined);
    safely(() => window.localStorage.removeItem(PREFIX + slot), undefined);
  }
}

/**
 * Called once at mount: session storage is the only place this app keeps a key,
 * so anything sitting in localStorage under our prefix is removed on sight.
 */
export function forceSessionOnly(): void {
  for (const slot of SLOTS) {
    safely(() => window.localStorage.removeItem(PREFIX + slot), undefined);
  }
}
