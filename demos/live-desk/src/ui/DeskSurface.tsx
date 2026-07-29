/**
 * The app itself — a support desk that does not know it is a demo.
 *
 * Every component that owns a control declares it with `useControl`, and that
 * is the ONLY registration anywhere in this app: when the compose button stops
 * rendering, its action stops existing; when the modal mounts, its actions
 * appear. Human clicks go through `humanFire` (report, then act).
 */
import { useState } from 'react';
import { openTickets, archivedTickets } from '../app/state.js';
import type { Desk } from '../desk/wiring.js';
import { humanFire } from './act.js';
import { useControl, useDeskState } from './hooks.js';

/** How many rows this list renders. The desk has sixty; a list shows a window. */
const RENDERED_ROWS = 12;

export function DeskSurface({ desk }: { desk: Desk }): React.JSX.Element {
  const { state } = useDeskState(desk);
  return (
    <section className="surface" aria-label="Support desk">
      <nav className="surface-nav">
        <strong>Support desk</strong>
        <div className="spacer" />
        <button
          type="button"
          className={state.page === 'desk' ? 'nav on' : 'nav'}
          onClick={() => desk.store.commands.goToPage('desk')}
        >
          Desk
        </button>
        <button
          type="button"
          className={state.page === 'settings' ? 'nav on' : 'nav'}
          onClick={() => desk.store.commands.goToPage('settings')}
        >
          Settings
        </button>
      </nav>
      {state.page === 'desk' ? <DeskPage desk={desk} /> : <SettingsPage desk={desk} />}
    </section>
  );
}

function DeskPage({ desk }: { desk: Desk }): React.JSX.Element {
  const { state } = useDeskState(desk);
  const [refusal, setRefusal] = useState<string | null>(null);

  const switchTab = (tab: 'inbox' | 'archive'): void => {
    const id = tab === 'archive' ? 'desk.switch-to-archive' : 'desk.switch-to-inbox';
    setRefusal(humanFire(desk, id, () => desk.store.commands.switchTab(tab)).refusal);
  };

  return (
    <div className="page">
      <div className="tabbar">
        <button type="button" className={state.tab === 'inbox' ? 'tab on' : 'tab'} onClick={() => switchTab('inbox')}>
          Inbox <span className="count">{openTickets(state).length}</span>
        </button>
        <button
          type="button"
          className={state.tab === 'archive' ? 'tab on' : 'tab'}
          onClick={() => switchTab('archive')}
        >
          Archive <span className="count">{archivedTickets(state).length}</span>
        </button>
        <div className="spacer" />
        {state.showComposeButton ? <ComposeButton desk={desk} /> : null}
      </div>
      {refusal ? <p className="refusal">the session refused this: {refusal}</p> : null}
      {state.tab === 'inbox' ? <InboxList desk={desk} /> : <ArchivePanel desk={desk} />}
      {state.composeOpen ? <ComposeModal desk={desk} /> : null}
    </div>
  );
}

function ComposeButton({ desk }: { desk: Desk }): React.JSX.Element {
  useControl(desk, 'compose-button');
  return (
    <button
      type="button"
      className="primary"
      onClick={() => humanFire(desk, 'desk.open-compose', () => desk.store.commands.openCompose())}
    >
      Compose
    </button>
  );
}

function InboxList({ desk }: { desk: Desk }): React.JSX.Element {
  useControl(desk, 'inbox-list');
  const { state } = useDeskState(desk);
  const [refusal, setRefusal] = useState<string | null>(null);
  const open = openTickets(state);
  const shown = open.slice(0, RENDERED_ROWS);

  return (
    <div className="list">
      {shown.map((ticket) => (
        <div className="row" key={ticket.id}>
          <div className="row-main">
            <span className="who">{ticket.from}</span>
            <span className="subject">{ticket.subject}</span>
          </div>
          <span className="id">{ticket.id}</span>
          <button
            type="button"
            onClick={() =>
              setRefusal(
                humanFire(
                  desk,
                  'desk.inbox.tickets.reply-to-ticket',
                  () => desk.store.commands.reply(ticket.id, { message: 'Thanks — looking into it now.' }),
                  { instance: ticket.id, payload: { message: 'Thanks — looking into it now.' } },
                ).refusal,
              )
            }
          >
            {ticket.replied ? 'Reply again' : 'Reply'}
          </button>
          <button
            type="button"
            /* The desk's rule, rendered: you may only archive what you answered.
               The same rule reaches an agent as `enabled: false` on the row,
               and a fire of it as a typed TOOL_DISABLED. */
            disabled={!ticket.replied}
            title={ticket.replied ? 'Archive this ticket' : 'Answer it first'}
            onClick={() =>
              setRefusal(
                humanFire(desk, 'desk.inbox.tickets.archive-ticket', () => desk.store.commands.archive(ticket.id), {
                  instance: ticket.id,
                }).refusal,
              )
            }
          >
            Archive
          </button>
        </div>
      ))}
      <p className="note">
        Showing {shown.length} of {open.length}. The rest are real: the store publishes an action for every open
        ticket, so ticket <code>t-51</code> can be acted on by id without ever being rendered.
      </p>
      {refusal ? <p className="refusal">the session refused this: {refusal}</p> : null}
    </div>
  );
}

function ArchivePanel({ desk }: { desk: Desk }): React.JSX.Element {
  useControl(desk, 'archive-panel');
  const { state } = useDeskState(desk);
  const [armed, setArmed] = useState(false);
  const archived = archivedTickets(state);

  return (
    <div className="list">
      {archived.length === 0 ? <p className="note">Nothing archived yet.</p> : null}
      {archived.slice(0, RENDERED_ROWS).map((ticket) => (
        <div className="row" key={ticket.id}>
          <div className="row-main">
            <span className="who">{ticket.from}</span>
            <span className="subject">{ticket.subject}</span>
          </div>
          <span className="id">{ticket.id}</span>
        </div>
      ))}
      <button
        type="button"
        className="danger"
        disabled={archived.length === 0}
        onClick={() => {
          if (!armed) {
            setArmed(true);
            return;
          }
          setArmed(false);
          humanFire(desk, 'desk.archive.clear-archive', () => desk.store.commands.clearArchive());
        }}
      >
        {armed ? `Really clear ${archived.length}?` : 'Clear archive'}
      </button>
    </div>
  );
}

function ComposeModal({ desk }: { desk: Desk }): React.JSX.Element {
  useControl(desk, 'compose-modal');
  const { state } = useDeskState(desk);
  const [refusal, setRefusal] = useState<string | null>(null);

  return (
    <div className="modal" role="dialog" aria-label="Compose">
      <h3>New message</h3>
      <textarea
        value={state.composeDraft}
        placeholder="Write something…"
        onChange={(event) => desk.store.commands.setDraft(event.target.value)}
      />
      <div className="modal-actions">
        <button
          type="button"
          className="primary"
          onClick={() =>
            setRefusal(
              humanFire(desk, 'desk.compose.send-message', () => desk.store.commands.sendMessage(), {
                payload: { message: state.composeDraft },
              }).refusal,
            )
          }
        >
          Send
        </button>
        <button type="button" onClick={() => humanFire(desk, 'desk.compose.close-compose', () => desk.store.commands.closeCompose())}>
          Close
        </button>
      </div>
      {refusal ? <p className="refusal">the session refused this: {refusal}</p> : null}
      <p className="note">
        Sending is guarded on <code>composeDraftLength &gt; 0</code>. With the box empty the send action is not
        offered at all, and firing it anyway comes back with the evidence.
      </p>
    </div>
  );
}

function SettingsPage({ desk }: { desk: Desk }): React.JSX.Element {
  useControl(desk, 'settings-panel');
  const { state } = useDeskState(desk);
  return (
    <div className="page settings">
      <label className="switch">
        <input
          type="checkbox"
          checked={state.tabSwitcherWired}
          onChange={(event) =>
            humanFire(desk, 'settings.wire-tab-switch', () =>
              desk.store.commands.setTabSwitcherWired(event.target.checked),
            )
          }
        />
        <span>
          <strong>Tab switch wired</strong>
          <em>
            Off: the desk still has tabs and still declares the gesture — nothing is wired behind it, so an agent's
            fire comes back NOT_MATERIALIZED naming a tab switch.
          </em>
        </span>
      </label>
      <label className="switch">
        <input
          type="checkbox"
          checked={state.showComposeButton}
          onChange={() => humanFire(desk, 'settings.toggle-compose-button', () => desk.store.commands.toggleComposeButton())}
        />
        <span>
          <strong>Compose button</strong>
          <em>Hide it and the action stops existing — the control is what publishes it.</em>
        </span>
      </label>
    </div>
  );
}
