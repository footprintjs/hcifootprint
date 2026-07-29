/**
 * The panel wall.
 *
 * THE LAW OF THIS FILE: no panel states a fact the session did not return. Every
 * number, marker, refusal and receipt below is read from a live call — and each
 * panel header names the call it came from, so anything on screen can be checked
 * against the API by hand. Where a field was absent, nothing is rendered: an
 * absent marker is information too.
 */
import { identityOf } from '../app/actions.js';
import type { Desk } from '../desk/wiring.js';
import { backlogOf } from '../panels/backlog.js';
import { rackOf } from '../panels/rack.js';
import { confirmLinesOf, receiptsOf } from '../panels/receipts.js';
import { useSessionTick } from './hooks.js';

const RECENT = 12;

export function PanelWall({ desk }: { desk: Desk }): React.JSX.Element {
  // One subscription for the whole wall: every panel below re-reads the live
  // API on each session event, so nothing here can be a beat stale.
  useSessionTick(desk);
  return (
    <div className="wall">
      <PositionPanel desk={desk} />
      <SourcesPanel desk={desk} />
      <ToolRackPanel desk={desk} />
      <BacklogPanel desk={desk} />
      <ReceiptsPanel desk={desk} />
    </div>
  );
}

function PositionPanel({ desk }: { desk: Desk }): React.JSX.Element {
  const brief = desk.session.contextBrief();
  return (
    <section className="panel">
      <h2>
        Where the agent thinks it is <code>contextBrief()</code>
      </h2>
      <pre className="brief">{brief.text}</pre>
      <p className="meta">
        node <code>{desk.session.node}</code> · cursor version <code>{desk.session.version}</code> · structure
        version <code>{desk.session.structureVersion}</code>
      </p>
    </section>
  );
}

function SourcesPanel({ desk }: { desk: Desk }): React.JSX.Element {
  const published = desk.store.actions();
  const publishedIds = [...new Set(published.map((action) => `${action.node}.${action.name}`))].sort();
  const offered = new Set(desk.session.available().edges.map((edge) => edge.affordanceId));
  const notServedHere = publishedIds.filter((id) => !offered.has(id));

  return (
    <section className="panel">
      <h2>
        The live source <code>store.actions()</code> vs <code>available()</code>
      </h2>
      <p className="meta">
        the store publishes <strong>{published.length}</strong> actions right now (
        {publishedIds.length} distinct, the rest are rows) · the session offers{' '}
        <strong>{offered.size}</strong> at this position · sources{' '}
        <strong>{desk.sourcesAttached() ? 'attached' : 'detached'}</strong> ·{' '}
        {desk.structureBeats.length} structure {desk.structureBeats.length === 1 ? 'beat' : 'beats'}
      </p>
      {notServedHere.length > 0 ? (
        <p className="meta">
          published but not served here: {notServedHere.map((id) => <code key={id}>{id}</code>)} — they live on
          another page, inside a hidden tab, or behind the open modal.
        </p>
      ) : null}
      <div className="row-actions">
        <button type="button" onClick={() => desk.detachSources()} disabled={!desk.sourcesAttached()}>
          detachSources()
        </button>
        <button type="button" onClick={() => desk.reattachSources()} disabled={desk.sourcesAttached()}>
          fromLiveStore(store).attach(session)
        </button>
      </div>
      <details>
        <summary>the identities the store is publishing</summary>
        <ul className="ids">
          {published.slice(0, 24).map((action) => (
            <li key={identityOf(action)}>
              <code>{identityOf(action)}</code>
              {action.handler ? '' : ' — no handler'}
            </li>
          ))}
          {published.length > 24 ? <li className="meta">…and {published.length - 24} more</li> : null}
        </ul>
      </details>
    </section>
  );
}

function ToolRackPanel({ desk }: { desk: Desk }): React.JSX.Element {
  const rack = rackOf(desk.session.available());
  return (
    <section className="panel">
      <h2>
        What the agent can reach <code>available()</code>
      </h2>
      {rack.rows.length === 0 ? <p className="meta">Nothing is offered here.</p> : null}
      <ul className="rack">
        {rack.rows.map((row) => (
          <li key={row.id}>
            <div className="rack-head">
              <code>{row.id}</code>
              <span className="role">{row.role}</span>
            </div>
            <p className="does">{row.does}</p>
            <p className="chips">
              {row.markers.map((marker) => (
                <span className={marker.wanting ? 'chip want' : 'chip'} key={marker.label}>
                  {marker.label}: {marker.value}
                </span>
              ))}
            </p>
          </li>
        ))}
      </ul>
      <p className="note">
        Markers describe the ACTION id. A ticket row is wired per instance
        (<code>…reply-to-ticket[t-51]</code>), which the bare id knows nothing about — so a rows-only action reads
        <code> materialized: false</code> here while its rows fire perfectly. Per-row truth shows up where it is
        known: in the fire's own result.
      </p>
    </section>
  );
}

function BacklogPanel({ desk }: { desk: Desk }): React.JSX.Element {
  const backlog = backlogOf(desk.session.gaps());
  return (
    <section className="panel">
      <h2>
        What is missing <code>gaps()</code>
      </h2>
      {backlog.clusters.length === 0 ? (
        <p className="meta">Nothing has been refused yet.</p>
      ) : (
        <ul className="clusters">
          {backlog.clusters.map((cluster) => (
            <li key={`${cluster.gesture}:${cluster.reason}`}>
              <span className="chip want">gesture: {cluster.gesture}</span>
              <span className="chip">{cluster.reason}</span>
              <span className="chip">×{cluster.count}</span>
              <div className="ids">
                {cluster.actions.map((action) => (
                  <code key={action}>{action}</code>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="note">
        {backlog.total} rows. A cluster with a gesture is a work item — that gesture has no wiring. A cluster with
        gesture <code>none</code> is not: the desk refused for a reason of its own.
      </p>
    </section>
  );
}

function ReceiptsPanel({ desk }: { desk: Desk }): React.JSX.Element {
  const receipts = receiptsOf(desk.session.transitions()).slice(-RECENT).reverse();
  const confirms = confirmLinesOf(desk.session.confirms()).slice(-4).reverse();
  return (
    <section className="panel">
      <h2>
        What happened <code>transitions()</code> · <code>confirms()</code>
      </h2>
      {confirms.length > 0 ? (
        <ul className="confirms">
          {confirms.map((line) => (
            <li key={`${line.askId}:${line.kind}`}>
              <span className="chip">{line.kind}</span> <code>{line.affordanceId}</code>
              <ul>
                {line.willDo.map((said) => (
                  <li key={said}>{said}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}
      {receipts.length === 0 ? <p className="meta">Nothing has happened yet.</p> : null}
      <ul className="receipts">
        {receipts.map((receipt) => (
          <li key={receipt.id}>
            <span className={receipt.who === 'agent' ? 'chip agent' : 'chip'}>{receipt.who}</span>
            <code>{receipt.what}</code>
            <span className="chip">{receipt.outcome}</span>
            {receipt.flags.map((flag) => (
              <span className="chip" key={flag}>
                {flag}
              </span>
            ))}
            {receipt.produced !== undefined ? (
              <details>
                <summary>produced</summary>
                <pre>{JSON.stringify(receipt.produced, null, 2)}</pre>
              </details>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
