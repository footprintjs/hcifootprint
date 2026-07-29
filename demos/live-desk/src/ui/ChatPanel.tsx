/**
 * The chat — an agentfootprint Agent working the desk through Mode B.
 *
 * Mock-first: with no key at all this runs a scripted model whose answers are
 * assembled from the desk's real tool results, so the demo is identical on every
 * visit and nothing leaves the tab. Paste a key and the same tools, the same
 * session and the same panels are driven by a real model instead.
 *
 * Every tool call the turn made is printed underneath the answer, verbatim —
 * the model's claims and the session's answers side by side.
 */
import { useState } from 'react';
import { runTurn } from '../agent/chat.js';
import type { DeskBridge, ToolCallRecord } from '../agent/bridge.js';
import { buildProvider, type ProviderChoice } from '../agent/providers.js';
import * as keys from '../keys/keyStore.js';
import type { Desk } from '../desk/wiring.js';

const STARTERS = [
  'Reply to Priya’s ticket about the refund.',
  'Switch to the archive tab.',
  'What can I do here?',
  'Clear the archive.',
  'Why is repliedCount 1?',
];

interface Line {
  readonly who: 'you' | 'assistant';
  readonly text: string;
  readonly calls?: readonly ToolCallRecord[];
  readonly mode?: 'mock' | 'live';
}

export function ChatPanel({ desk, bridge }: { desk: Desk; bridge: DeskBridge }): React.JSX.Element {
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [choice, setChoice] = useState<ProviderChoice>('mock');
  const [presence, setPresence] = useState(() => keys.presence());
  const [sinceVersion, setSinceVersion] = useState<number | undefined>(undefined);
  const [problem, setProblem] = useState<string | null>(null);

  const send = async (message: string): Promise<void> => {
    if (busy || message.trim().length === 0) return;
    setBusy(true);
    setDraft('');
    setLines((all) => [...all, { who: 'you', text: message }]);
    // The key is read HERE and goes straight into the provider — it is never
    // held in component state, never logged, never put on a record.
    const built = buildProvider(choice, choice === 'mock' ? '' : keys.read(choice));
    setProblem(built.problem);
    try {
      const turn = await runTurn(
        { desk, bridge, provider: built.provider, model: built.modelLabel, sinceVersion },
        message,
      );
      setSinceVersion(turn.version);
      setLines((all) => [...all, { who: 'assistant', text: turn.reply, calls: turn.calls, mode: built.mode }]);
    } catch (error) {
      setLines((all) => [
        ...all,
        { who: 'assistant', text: `The run failed: ${String(error)}`, mode: built.mode },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel chat">
      <h2>
        Ask the desk assistant <code>skillsAsTools()</code>
      </h2>

      <div className="provider">
        <label>
          model
          <select value={choice} onChange={(event) => setChoice(event.target.value as ProviderChoice)}>
            <option value="mock">scripted (no key, deterministic)</option>
            <option value="anthropic">Anthropic {presence.anthropic ? '· key held' : ''}</option>
            <option value="openai">OpenAI {presence.openai ? '· key held' : ''}</option>
          </select>
        </label>
        {choice !== 'mock' ? (
          <>
            <input
              type="password"
              placeholder={`paste your ${choice} key`}
              /* Uncontrolled on purpose: the value lives in exactly one place,
                 the key store, and never in React state. */
              onChange={(event) => {
                keys.write(choice, event.target.value);
                setPresence(keys.presence());
              }}
            />
            <button
              type="button"
              onClick={() => {
                keys.forgetAll();
                setPresence(keys.presence());
              }}
            >
              Forget my keys
            </button>
          </>
        ) : null}
      </div>
      {choice !== 'mock' ? (
        <p className="note">
          The key stays in this tab’s sessionStorage and is sent straight to the provider — this app has no backend
          to send it to. It is gone when you close the tab.
        </p>
      ) : null}
      {problem ? <p className="refusal">{problem}</p> : null}

      <div className="starters">
        {STARTERS.map((starter) => (
          <button type="button" key={starter} disabled={busy} onClick={() => void send(starter)}>
            {starter}
          </button>
        ))}
      </div>

      <div className="transcript">
        {lines.map((line, index) => (
          <div className={line.who === 'you' ? 'line you' : 'line assistant'} key={index}>
            <span className="who">{line.who === 'you' ? 'you' : `assistant${line.mode === 'live' ? ' · live' : ''}`}</span>
            <pre>{line.text}</pre>
            {line.calls && line.calls.length > 0 ? (
              <details>
                <summary>{line.calls.length} tool calls, verbatim</summary>
                {line.calls.map((call, callIndex) => (
                  <pre className="call" key={callIndex}>
                    {call.name}({JSON.stringify(call.args)})
                    {'\n→ '}
                    {JSON.stringify(call.result, null, 2)}
                  </pre>
                ))}
              </details>
            ) : null}
          </div>
        ))}
        {busy ? <p className="meta">working…</p> : null}
      </div>

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <input
          value={draft}
          placeholder="ask for something the desk can do"
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" className="primary" disabled={busy}>
          Ask
        </button>
      </form>
    </section>
  );
}
