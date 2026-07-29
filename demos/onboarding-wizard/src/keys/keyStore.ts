/**
 * SECURITY-CRITICAL — the ONLY module in this app that touches an API key.
 *
 * The rules it exists to enforce, carried over verbatim from the Cited demo's
 * key discipline:
 *   • The rest of the app sees `KeyPresence { anthropic: boolean; openai: boolean }`
 *     and nothing else. `get()` is called exactly once per conversation, inside
 *     provider construction, and the value goes straight into the factory.
 *   • A key is never logged, never put on a panel, never in the URL, never in a
 *     tool result, never in the trace.
 *   • sessionStorage ONLY — gone when the tab closes. There is no localStorage
 *     opt-in here, because a wizard demo has no reason to outlive its tab.
 *   • "Forget my keys" wipes BOTH storages for every slot, so a key written by
 *     an older build cannot survive in the one nobody is looking at.
 *   • NO `VITE_*` environment variable is ever read. Vite inlines those into the
 *     built bundle, which would publish the key to every visitor of the static
 *     site. The absence is the feature.
 *
 * Custody, stated to the visitor on the panel: the key stays in this browser and
 * is sent directly to the provider's host. It reaches no backend, because this
 * app has none.
 */

export type KeySlot = 'anthropic' | 'openai';

export interface KeyPresence {
  anthropic: boolean;
  openai: boolean;
}

const STORAGE_PREFIX = 'onboarding-wizard:key:';
const SLOTS: readonly KeySlot[] = ['anthropic', 'openai'];

function slotKey(slot: KeySlot): string {
  return `${STORAGE_PREFIX}${slot}`;
}

/**
 * Storage access is wrapped: Safari private mode throws on access, and a demo
 * that white-screens because someone opened a private window is a worse
 * outcome than a demo that quietly runs on the mock.
 */
function safely<T>(read: () => T, fallback: T): T {
  try {
    return read();
  } catch {
    return fallback;
  }
}

/** Both storages, when they exist at all (this module also loads under node). */
function stores(): readonly Storage[] {
  return safely(() => {
    if (typeof window === 'undefined') return [];
    return [window.sessionStorage, window.localStorage];
  }, []);
}

function writeStore(): Storage | null {
  return safely(() => (typeof window === 'undefined' ? null : window.sessionStorage), null);
}

/** Store a key for this tab. A blank value CLEARS the slot rather than persisting nothing. */
export function setKey(slot: KeySlot, value: string): void {
  const trimmed = value.trim();
  // Remove from both first, so a slot can never hold two different values.
  clearKey(slot);
  if (trimmed.length === 0) return;
  const store = writeStore();
  if (store) safely(() => store.setItem(slotKey(slot), trimmed), undefined);
}

/**
 * Read a key. Called once per conversation, at provider construction, and the
 * result is passed directly into the provider factory — never retained.
 */
export function getKey(slot: KeySlot): string {
  for (const store of stores()) {
    const value = safely(() => store.getItem(slotKey(slot)), null);
    if (value && value.length > 0) return value;
  }
  return '';
}

/** The presence-only view — this is what the whole rest of the app may see. */
export function presence(): KeyPresence {
  return { anthropic: getKey('anthropic').length > 0, openai: getKey('openai').length > 0 };
}

/** Remove one slot from BOTH storages. */
export function clearKey(slot: KeySlot): void {
  for (const store of stores()) {
    safely(() => store.removeItem(slotKey(slot)), undefined);
  }
}

/** "Forget my keys" — every slot, both storages, no survivors. */
export function clearAllKeys(): void {
  for (const slot of SLOTS) clearKey(slot);
}
