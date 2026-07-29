import { useMemo, useState, type ReactElement, type ReactNode } from 'react';

import { HAND_PAGES } from '../app/pages.js';
import type { WizardApp } from '../app/wizard.js';
import { readGapBacklog } from '../panels/gapBacklog.js';
import { readJourneys } from '../panels/journeyReadiness.js';
import { readGuardKeys, readMarkers } from '../panels/markers.js';
import { readReceipts } from '../panels/receipts.js';
import { describeSourcesContribution } from '../panels/sourcesContribution.js';
import { probeUrl } from '../panels/urlProbe.js';

/**
 * THE PANELS.
 *
 * The law this file obeys: no panel states a fact the session did not return.
 * Every number, every marker, every refusal sentence below is read off a live
 * API return value, and each panel carries the `from` chip naming the call it
 * came from. Nothing is hardcoded, counted by hand, or paraphrased — including
 * the library's refusal messages, which are printed in the library's own words.
 */

function Panel({ title, from, children }: { title: string; from: string; children: ReactNode }): ReactElement {
  return (
    <section className="panel">
      <header>
        <h3>{title}</h3>
        <code className="from" title="the call this panel is rendered from">
          {from}
        </code>
      </header>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------

export function SourcesPanel({ app }: { app: WizardApp }): ReactElement {
  // The comparison builds are pure and depend on nothing that moves, so they
  // are computed once rather than on every render.
  const reading = useMemo(
    () => describeSourcesContribution({ compiled: app.graph, handPages: HAND_PAGES }),
    [app],
  );

  return (
    <Panel title="What the sources contributed" from={reading.from}>
      <p className="lead">
        The graph grew from a route table and a journey list this app already owned. These are set
        differences over the compiled graph, taken now.
      </p>
      <ul className="facts">
        <li>
          Pages that exist only because a source said so:{' '}
          <strong>{reading.pagesFromSources.join(', ') || 'none'}</strong>
        </li>
        <li>
          Addresses backfilled into hand-authored pages:{' '}
          <strong>
            {reading.routesBackfilled.map((fact) => `${fact.page} → ${fact.route}`).join(', ') || 'none'}
          </strong>
        </li>
        <li>
          Addresses declared by hand (hand-authored wins):{' '}
          <strong>
            {reading.routesDeclaredByHand.map((fact) => `${fact.page} → ${fact.route}`).join(', ') ||
              'none'}
          </strong>
        </li>
        <li>
          Skills the journey list contributed: <strong>{reading.skillsFromJourneys.join(', ')}</strong>
        </li>
      </ul>

      <h4>Compiled live, right now, to prove the sources are load-bearing</h4>
      <ProbeResult label="The same hand-authored blocks with NO sources" probe={reading.withoutSources} />
      <ProbeResult label="One page declared at two addresses" probe={reading.routeContradiction} />
    </Panel>
  );
}

function ProbeResult({
  label,
  probe,
}: {
  label: string;
  probe: { compiled: true; pages: string[] } | { compiled: false; refusal: string };
}): ReactElement {
  return (
    <div className={probe.compiled ? 'probe ok' : 'probe refused'}>
      <div className="probe-label">{label}</div>
      {probe.compiled ? (
        <div>compiled, pages: {probe.pages.join(', ')}</div>
      ) : (
        <blockquote>{probe.refusal}</blockquote>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function ActionSurfacePanel({ app }: { app: WizardApp }): ReactElement {
  const reading = readMarkers(app.session.available());
  const guards = readGuardKeys(app.graph.requiredStateKeys(), app.store.projected());

  return (
    <Panel title="What is possible here" from={reading.from}>
      <p className="lead">
        Position <code>{reading.node}</code>, cursor version <code>{reading.version}</code>.
      </p>
      {reading.rows.length === 0 && <p className="empty">Nothing is offered at this position.</p>}
      <ul className="edges">
        {reading.rows.map((row) => (
          <li key={row.affordanceId}>
            <code>{row.affordanceId}</code>
            <span className="does">{row.does}</span>
            <span className="chips">
              {row.materialized === true && <em className="chip good">wired</em>}
              {row.materialized === false && <em className="chip warn">nothing bound</em>}
              {row.gestureKind && <em className="chip">gesture: {row.gestureKind}</em>}
              {row.activation && <em className="chip">activation: {row.activation}</em>}
              {row.enabled === false && <em className="chip warn">disabled</em>}
              {row.highEffect && <em className="chip">high-effect</em>}
              {row.declaresInput && <em className="chip">declares input</em>}
              {row.guardUnevaluated && (
                <em className="chip warn">unevaluated: {row.guardUnevaluated.join(', ')}</em>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="foot">
        Guard keys this app seeds: <code>{guards.seeded.join(', ') || 'none'}</code>. Not seeded:{' '}
        <code>{guards.unseeded.join(', ') || 'none'}</code> — which is why any{' '}
        <em>unevaluated</em> chip above says what it says.
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------

export function JourneysPanel({ app }: { app: WizardApp }): ReactElement {
  const reading = readJourneys(app.session.availableSkills().skills, app.session.available());
  const [refusal, setRefusal] = useState<string | null>(null);

  /**
   * The ONLY panel control that changes anything. commitSkill has consequences
   * — it opens a frame, or lands a gap row — so it is a button a person
   * presses, never something a render does. What comes back is printed as the
   * library returned it.
   */
  const tryCommit = (skillId: string): void => {
    const result = app.session.commitSkill(skillId, { source: 'agent' });
    setRefusal(JSON.stringify(result, null, 1));
  };

  return (
    <Panel title="Journeys, and whether they can start" from={reading.from}>
      <ul className="journeys">
        {reading.rows.map((row) => (
          <li key={row.skillId}>
            <code>{row.skillId}</code>
            <span className="does">{row.does}</span>
            <span className="chips">
              <em className={row.preconditionPassed ? 'chip good' : 'chip warn'}>
                precondition {row.preconditionPassed ? 'holds' : 'fails'}
              </em>
              <em className={row.entryAvailable ? 'chip good' : 'chip'}>
                entry {row.entryAvailable ? 'available' : 'not here'}
              </em>
              <em
                className={
                  row.entryWiring === 'wired' ? 'chip good' : row.entryWiring === 'not-wired' ? 'chip warn' : 'chip'
                }
              >
                entry {row.entryWiring}
              </em>
              {row.entryGestureKind && <em className="chip">gesture: {row.entryGestureKind}</em>}
            </span>
            <button type="button" onClick={() => tryCommit(row.skillId)}>
              Try to commit as the agent
            </button>
          </li>
        ))}
      </ul>
      {refusal && (
        <>
          <h4>What commitSkill returned</h4>
          <pre>{refusal}</pre>
        </>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------

export function ReceiptsPanel({ app }: { app: WizardApp }): ReactElement {
  const reading = readReceipts(app.session.transitions(), app.session.commitLog());
  return (
    <Panel title="Receipts" from={reading.from}>
      <p className="lead">
        {reading.committed} committed transitions, {reading.bundles} commit bundles —{' '}
        {reading.logJoinsCleanly ? 'they join one to one.' : 'they DO NOT join, which is a bug.'}
      </p>
      <table className="receipts">
        <thead>
          <tr>
            <th>what</th>
            <th>who</th>
            <th>outcome</th>
            <th>effect verified</th>
            <th>moved to</th>
            <th>bundle</th>
          </tr>
        </thead>
        <tbody>
          {reading.rows.map((row) => (
            <tr key={row.id}>
              <td>
                <code>{row.what}</code>
              </td>
              <td>{row.principal}</td>
              <td>{row.outcome}</td>
              <td>{row.effectVerified === undefined ? '—' : String(row.effectVerified)}</td>
              <td>
                {row.toNode ?? '—'}
                {row.toNodeClaimed && <em className="chip warn">claimed</em>}
              </td>
              <td>{row.hasCommitBundle ? 'yes' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

// ---------------------------------------------------------------------------

export function BacklogPanel({ app }: { app: WizardApp }): ReactElement {
  const backlog = readGapBacklog(app.session.gaps());
  return (
    <Panel title="Demand backlog" from={backlog.from}>
      <p className="lead">
        {backlog.total === 0
          ? 'Nothing has been asked for that could not be served.'
          : `${backlog.total} unmet asks. Clustered by the wiring that is missing:`}
      </p>
      {backlog.byGesture.length > 0 && (
        <ul className="clusters">
          {backlog.byGesture.map((cluster) => (
            <li key={cluster.label}>
              <strong>{cluster.count}×</strong> {cluster.label}
            </li>
          ))}
        </ul>
      )}
      <ul className="gaps">
        {backlog.rows.map((row, index) => (
          <li key={`${row.affordanceId ?? row.kind}-${index}`}>
            <code>{row.affordanceId ?? row.kind}</code>
            {row.rejectionReason && <em className="chip warn">{row.rejectionReason}</em>}
            {row.skillId && <em className="chip">for skill {row.skillId}</em>}
            {row.gestureKind && <em className="chip">needs {row.gestureKind} wiring</em>}
            {row.principal && <em className="chip">{row.principal}</em>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ---------------------------------------------------------------------------

export function UrlProbePanel({ app }: { app: WizardApp }): ReactElement {
  const [typed, setTyped] = useState(app.router.path());
  const reading = probeUrl(app.graph.spec.pages, typed);

  return (
    <Panel title="URL round-trip" from={reading.from}>
      <p className="lead">
        The route table and the matcher share one segment law — type any path and see exactly what
        this app would do with it.
      </p>
      <input
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        aria-label="A URL path to resolve"
      />
      <ul className="facts">
        <li>
          normalized by the router: <code>{reading.normalized}</code>
        </li>
        <li>
          matchRoute says: <code>{reading.page ?? 'nothing'}</code>
        </li>
        <li>
          handed to sync(): <code>{reading.handedToSync}</code>
          {reading.offGraph && <em className="chip warn">raw path — recorded off-graph</em>}
        </li>
      </ul>
      <button type="button" onClick={() => app.router.push(typed)}>
        Actually go there
      </button>
    </Panel>
  );
}

// ---------------------------------------------------------------------------

export function WarningsPanel({ app }: { app: WizardApp }): ReactElement | null {
  const warnings = app.warnings();
  if (warnings.length === 0) return null;
  return (
    <Panel title="Dev warnings" from="the session’s onWarn sink">
      <ul className="gaps">
        {warnings.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </Panel>
  );
}
