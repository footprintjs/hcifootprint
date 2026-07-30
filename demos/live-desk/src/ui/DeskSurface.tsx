/**
 * The app itself — a support desk that does not know it is a demo.
 *
 * Every component that owns a control declares it TWICE, and the two say
 * different things:
 *
 * - `useRenderedControl` tells the STORE the control is on screen, which is what
 *   publishes the action at all. When the compose button stops rendering, its
 *   action stops existing.
 * - `useControl` (hcifootprint/react) hands the ELEMENT to the sensor, so a human
 *   clicking it lands on the ledger as a human. There is no reporting call in this
 *   file for those controls: the browser runs the app's own onClick, and the
 *   sensor records that it happened.
 *
 * Three controls still go through `humanFire` — the two tab switches and Send —
 * and ui/act.ts says why each keeps its own door. Those three are named to
 * `watchPage` as `reportedElsewhere`, so one human act still writes one row.
 */
import { useState } from 'react';
import { useControl } from 'hcifootprint/react';
import { openTickets, archivedTickets } from '../app/state.js';
import type { Ticket } from '../app/tickets.js';
import type { Desk } from '../desk/wiring.js';
import { humanFire } from './act.js';
import { useRenderedControl, useDeskState } from './hooks.js';

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

  // Kept on the app's own door: a tab flip is reported by this desk's visibility
  // wire, not by any DOM listener, and the refusal has to arrive before the tab
  // moves. See ui/act.ts.
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
  useRenderedControl(desk, 'compose-button');
  const open = useControl({ edge: 'desk.open-compose' });
  return (
    <button type="button" className="primary" ref={open} onClick={() => desk.store.commands.openCompose()}>
      Compose
    </button>
  );
}

function InboxList({ desk }: { desk: Desk }): React.JSX.Element {
  useRenderedControl(desk, 'inbox-list');
  const { state } = useDeskState(desk);
  const open = openTickets(state);
  const shown = open.slice(0, RENDERED_ROWS);

  return (
    <div className="list">
      {shown.map((ticket) => (
        <TicketRow desk={desk} ticket={ticket} key={ticket.id} />
      ))}
      <p className="note">
        Showing {shown.length} of {open.length}. The rest are real: the store publishes an action for every open
        ticket, so ticket <code>t-51</code> can be acted on by id without ever being rendered.
      </p>
    </div>
  );
}

/**
 * One row — and a row is why a control has to be HANDED OVER rather than found.
 *
 * Sixty rows render the same two buttons with the same two names, so a role and
 * an accessible name cannot tell one ticket's Reply from another's. The
 * declaration carries the `instance`, which is the only thing that can.
 */
function TicketRow({ desk, ticket }: { desk: Desk; ticket: Ticket }): React.JSX.Element {
  // The value this desk sends, written once and used twice: the app DECLARES it
  // to the sensor and hands the same thing to its own command. The sensor never
  // goes looking for it — not in the row, not in the button, not anywhere.
  const message = `Thanks ${ticket.from} — looking into it now.`;
  const reply = useControl({
    edge: 'desk.inbox.tickets.reply-to-ticket',
    instance: ticket.id,
    value: () => ({ message }),
  });
  const archive = useControl({ edge: 'desk.inbox.tickets.archive-ticket', instance: ticket.id });

  return (
    <div className="row">
      <div className="row-main">
        <span className="who">{ticket.from}</span>
        <span className="subject">{ticket.subject}</span>
      </div>
      <span className="id">{ticket.id}</span>
      <button type="button" ref={reply} onClick={() => desk.store.commands.reply(ticket.id, { message })}>
        {ticket.replied ? 'Reply again' : 'Reply'}
      </button>
      <button
        type="button"
        ref={archive}
        /* The desk's rule, rendered: you may only archive what you answered.
           The same rule reaches an agent as `enabled: false` on the row,
           and a fire of it as a typed TOOL_DISABLED. */
        disabled={!ticket.replied}
        title={ticket.replied ? 'Archive this ticket' : 'Answer it first'}
        onClick={() => desk.store.commands.archive(ticket.id)}
      >
        Archive
      </button>
    </div>
  );
}

function ArchivePanel({ desk }: { desk: Desk }): React.JSX.Element {
  useRenderedControl(desk, 'archive-panel');
  const { state } = useDeskState(desk);
  const [armed, setArmed] = useState(false);
  const archived = archivedTickets(state);
  const clear = useControl({ edge: 'desk.archive.clear-archive' });

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
        /* The declaration follows what this button IS right now. Unarmed it asks a
           question, and a click on it clears nothing — so it is not the clear
           control yet and the sensor is not handed it. Armed, it is. */
        ref={armed ? clear : null}
        disabled={archived.length === 0}
        onClick={() => {
          if (!armed) {
            setArmed(true);
            return;
          }
          setArmed(false);
          desk.store.commands.clearArchive();
        }}
      >
        {armed ? `Really clear ${archived.length}?` : 'Clear archive'}
      </button>
    </div>
  );
}

function ComposeModal({ desk }: { desk: Desk }): React.JSX.Element {
  useRenderedControl(desk, 'compose-modal');
  const { state } = useDeskState(desk);
  const [refusal, setRefusal] = useState<string | null>(null);
  const close = useControl({ edge: 'desk.compose.close-compose' });

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
          /* Kept on the app's own door: this is the desk's one guarded action, and
             an empty draft must be refused BEFORE the message is sent rather than
             recorded alongside it. See ui/act.ts. */
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
        <button type="button" ref={close} onClick={() => desk.store.commands.closeCompose()}>
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
  useRenderedControl(desk, 'settings-panel');
  const { state } = useDeskState(desk);
  const wire = useControl({ edge: 'settings.wire-tab-switch' });
  const toggle = useControl({ edge: 'settings.toggle-compose-button' });
  return (
    <div className="page settings">
      <label className="switch">
        {/* The desk's own graph calls these switches; a checkbox reads as a
            checkbox. Handing the element over settles it — a declaration is the
            app's statement and needs no name to agree with. */}
        <input
          type="checkbox"
          ref={wire}
          checked={state.tabSwitcherWired}
          onChange={(event) => desk.store.commands.setTabSwitcherWired(event.target.checked)}
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
          ref={toggle}
          checked={state.showComposeButton}
          onChange={() => desk.store.commands.toggleComposeButton()}
        />
        <span>
          <strong>Compose button</strong>
          <em>Hide it and the action stops existing — the control is what publishes it.</em>
        </span>
      </label>
    </div>
  );
}
