import { useState, type ReactElement } from 'react';

import type { ProviderKind } from '../agent/providers.js';
import { clearAllKeys, presence, setKey, type KeySlot } from '../keys/keyStore.js';

/**
 * Bring your own key — the only place a key is typed, and it goes straight into
 * the one module allowed to hold it.
 *
 * The custody sentence below is the truth about this app, not marketing: there
 * is no backend to send anything to. The default is the scripted model, which
 * exercises exactly the same code path — the key changes who answers, nothing
 * else.
 */
export function Keys({
  provider,
  onProvider,
}: {
  provider: ProviderKind;
  onProvider: (kind: ProviderKind) => void;
}): ReactElement {
  const [held, setHeld] = useState(presence);
  const [draft, setDraft] = useState<Record<KeySlot, string>>({ anthropic: '', openai: '' });

  const save = (slot: KeySlot): void => {
    setKey(slot, draft[slot]);
    setDraft((prior) => ({ ...prior, [slot]: '' })); // never keep it in component state
    setHeld(presence());
  };

  return (
    <section className="keys" aria-label="Model">
      <div className="row">
        <label>
          Model
          <select value={provider} onChange={(event) => onProvider(event.target.value as ProviderKind)}>
            <option value="mock">scripted (no key, deterministic)</option>
            <option value="anthropic">Anthropic{held.anthropic ? '' : ' — no key'}</option>
            <option value="openai">OpenAI{held.openai ? '' : ' — no key'}</option>
          </select>
        </label>
        <button type="button" onClick={() => { clearAllKeys(); setHeld(presence()); }}>
          Forget my keys
        </button>
      </div>

      <details>
        <summary>Bring your own key</summary>
        {(['anthropic', 'openai'] as KeySlot[]).map((slot) => (
          <div className="row" key={slot}>
            <label>
              {slot}
              <input
                type="password"
                value={draft[slot]}
                onChange={(event) => setDraft((prior) => ({ ...prior, [slot]: event.target.value }))}
                placeholder={held[slot] ? 'a key is held for this tab' : 'paste a key'}
              />
            </label>
            <button type="button" onClick={() => save(slot)}>
              Save
            </button>
          </div>
        ))}
        <p className="foot">
          The key stays in this browser tab’s sessionStorage and is sent directly to the provider’s
          host. It reaches no backend, because this app has none. Closing the tab forgets it. No
          environment variable is ever read — a build-time key would be baked into the bundle and
          published to every visitor.
        </p>
      </details>
    </section>
  );
}
