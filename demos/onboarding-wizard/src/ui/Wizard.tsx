import { useState, type ReactElement } from 'react';

import { PLANS } from '../app/store.js';
import type { WizardApp } from '../app/wizard.js';
import { PAGE_ORDER, ROUTES } from '../app/routes.js';

/**
 * THE APP ITSELF — five ordinary screens a human can drive with a mouse.
 *
 * Every control here fires through the session with `source: 'user'`, so a
 * person clicking and an agent calling land in the SAME trace, distinguishable
 * only by who did it. That interleaving is the point: the panels on the right
 * never have to ask which of the two moved the app.
 *
 * Navigation buttons fire the graph's goTo-only tools — the ones with no
 * handler anywhere — so the human's clicks travel the same url gesture the
 * agent's calls do.
 */
export function Wizard({ app }: { app: WizardApp }): ReactElement {
  const page = app.session.node;
  const data = app.store.snapshot();

  const fire = (id: string, payload?: unknown): void => {
    app.session.fire(id, { source: 'user', payload });
  };

  return (
    <section className="wizard" aria-label="Signup wizard">
      <ol className="stepper">
        {PAGE_ORDER.map((id) => (
          <li key={id} className={id === page ? 'step current' : 'step'}>
            <span className="step-name">{id}</span>
            <code className="step-route">{ROUTES[id].route}</code>
          </li>
        ))}
      </ol>

      <div className="screen">
        {page === 'welcome' && (
          <>
            <h2>Welcome</h2>
            <p>Verify the signup email, then start.</p>
            <button type="button" onClick={() => fire('welcome.verify-email')} disabled={data.emailVerified}>
              {data.emailVerified ? 'Email verified' : 'Verify email'}
            </button>
            <button type="button" className="primary" onClick={() => fire('welcome.to-profile')}>
              Start
            </button>
            {/* Declared, drawn, and deliberately not wired — see pages.ts. */}
            <button type="button" onClick={() => fire('welcome.import-from-google')}>
              Import from Google
            </button>
          </>
        )}

        {page === 'profile' && <ProfileScreen app={app} />}

        {page === 'plan' && (
          <>
            <h2>Plan</h2>
            <p>Pick a subscription.</p>
            <div className="row">
              {PLANS.map((plan) => (
                <button
                  key={plan}
                  type="button"
                  className={data.plan === plan ? 'primary' : ''}
                  onClick={() => fire('plan.choose-plan', { plan })}
                >
                  {plan}
                </button>
              ))}
            </div>
            <div className="row">
              <button type="button" onClick={() => fire('plan.back-to-profile')}>
                Back
              </button>
              <button type="button" className="primary" onClick={() => fire('plan.to-review')}>
                Continue
              </button>
            </div>
          </>
        )}

        {page === 'review' && (
          <>
            <h2>Review</h2>
            <dl className="review">
              <dt>Name</dt>
              <dd>{data.profileName || '—'}</dd>
              <dt>Role</dt>
              <dd>{data.profileRole || '—'}</dd>
              <dt>Plan</dt>
              <dd>{data.plan || '—'}</dd>
            </dl>
            <div className="row">
              <button type="button" onClick={() => fire('review.back-to-plan')}>
                Back
              </button>
              <button type="button" className="primary" onClick={() => fire('review.confirm-signup')}>
                Create account
              </button>
            </div>
          </>
        )}

        {page === 'done' && (
          <>
            <h2>Done</h2>
            <p>
              {data.signedUp
                ? `The account exists: ${data.profileName} (${data.profileRole}) on the ${data.plan} plan.`
                : 'You reached this page without creating an account.'}
            </p>
          </>
        )}

        {!PAGE_ORDER.includes(page as (typeof PAGE_ORDER)[number]) && (
          <>
            <h2>Off the graph</h2>
            <p>
              The router is at <code>{app.router.path()}</code>, which matches no page in the route
              table. The session recorded it as an off-graph position rather than guessing a page.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function ProfileScreen({ app }: { app: WizardApp }): ReactElement {
  const data = app.store.snapshot();
  const [name, setName] = useState(data.profileName);
  const [role, setRole] = useState(data.profileRole);

  return (
    <>
      <h2>Profile</h2>
      <label>
        Name
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Role
        <input value={role} onChange={(event) => setRole(event.target.value)} />
      </label>
      <div className="row">
        <button
          type="button"
          onClick={() => app.session.fire('profile.save-profile', { source: 'user', payload: { name, role } })}
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => app.session.fire('profile.back-to-welcome', { source: 'user' })}
        >
          Back
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => app.session.fire('profile.to-plan', { source: 'user' })}
        >
          Continue
        </button>
      </div>
    </>
  );
}
