import { useEffect, useRef, useState, type ReactElement } from 'react';

import { buildProvider, type ProviderKind } from '../agent/providers.js';
import { createConversation, type Conversation } from '../agent/runAgent.js';
import { APPROVAL_HINT, STARTER_MESSAGES } from '../agent/systemPrompt.js';
import type { WizardApp } from '../app/wizard.js';
import { getKey } from '../keys/keyStore.js';
import type { ToolCallRecord } from '../agent/tools.js';

/**
 * The chat. It operates the app on the left — the same session, the same
 * store, the same router — through Mode B's tool surface.
 *
 * The provider is chosen here and rebuilt only when the choice changes, so the
 * conversation (and its static tool array) survives every turn. Switching
 * provider starts a NEW conversation, deliberately: a mid-conversation swap
 * would change the model behind a history it did not produce.
 */
export interface ChatMessage {
  who: 'you' | 'assistant' | 'system';
  text: string;
  calls?: ToolCallRecord[];
}

export function Chat({ app, provider }: { app: WizardApp; provider: ProviderKind }): ReactElement {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ mode: string; model: string; problem: string | null } | null>(null);
  const conversation = useRef<Conversation | null>(null);

  useEffect(() => {
    // The key VALUE is read here, once, and handed straight to the factory.
    const built = buildProvider({
      kind: provider,
      key: provider === 'mock' ? '' : getKey(provider),
    });
    conversation.current = createConversation({ session: app.session, provider: built });
    // Which model is answering is a CURRENT FACT, so it is rendered as one —
    // not appended to the transcript. (StrictMode runs this effect twice on
    // mount; a fact that is set twice reads the same, an event appended twice
    // does not.)
    setStatus({ mode: built.mode, model: built.modelLabel, problem: built.problem });
  }, [app, provider]);

  const send = async (text: string): Promise<void> => {
    const chat = conversation.current;
    if (!chat || busy || text.trim().length === 0) return;
    setDraft('');
    setBusy(true);
    setMessages((prior) => [...prior, { who: 'you', text }]);
    const turn = await chat.ask(text);
    setMessages((prior) => [
      ...prior,
      ...(turn.trouble ? [{ who: 'system' as const, text: turn.trouble }] : []),
      { who: 'assistant' as const, text: turn.text || '(no reply)', calls: turn.calls },
    ]);
    setBusy(false);
  };

  return (
    <section className="chat" aria-label="Assistant">
      {status && (
        <p className="foot status">
          {status.problem
            ? `${status.problem} Running the scripted model instead.`
            : `Answering: ${status.model} (${status.mode}).`}
        </p>
      )}
      <div className="transcript">
        {messages.length === 0 && (
          <p className="empty">
            Ask the assistant to sign you up. It will walk the wizard on the left and stop for your
            approval before it creates the account.
          </p>
        )}
        {messages.map((message, index) => (
          <article key={index} className={`bubble ${message.who}`}>
            <div className="who">{message.who}</div>
            <div className="text">{message.text}</div>
            {message.calls && message.calls.length > 0 && (
              <details>
                <summary>{message.calls.length} tool calls</summary>
                <ol className="calls">
                  {message.calls.map((call, callIndex) => (
                    <li key={callIndex}>
                      <code>{call.routedTo}</code>
                      <pre>{JSON.stringify(call.args)}</pre>
                      <pre>{JSON.stringify(call.result, null, 1)}</pre>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </article>
        ))}
      </div>

      <div className="starters">
        {STARTER_MESSAGES.map((starter) => (
          <button key={starter} type="button" disabled={busy} onClick={() => void send(starter)}>
            {starter}
          </button>
        ))}
        <button type="button" disabled={busy} onClick={() => void send(APPROVAL_HINT)}>
          {APPROVAL_HINT}
        </button>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={busy ? 'thinking…' : 'Say something'}
          disabled={busy}
          aria-label="Message the assistant"
        />
        <button type="submit" className="primary" disabled={busy}>
          Send
        </button>
      </form>
    </section>
  );
}
