import { useEffect, useState } from 'react';

import { createWizardApp, type WizardApp } from '../app/wizard.js';

/**
 * One app instance for the life of the page, and one re-render whenever
 * anything the panels read has moved.
 *
 * The subscriptions here are for RENDERING ONLY. The app's real wiring — the
 * store tap, the route tap, the mount controller — lives inside
 * createWizardApp() and runs whether or not React is looking, which is why the
 * whole test suite can drive the same object with no DOM.
 */
export function useApp(): { app: WizardApp; tick: number } {
  const [app] = useState(createWizardApp);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = (): void => setTick((n) => n + 1);
    const offs = [
      app.session.on('transition', bump),
      app.session.on('state', bump),
      app.session.on('structure', bump),
      app.session.on('gap', bump),
      app.session.on('confirm', bump),
      app.store.subscribe(bump),
      app.router.subscribe(bump),
    ];
    return () => {
      for (const off of offs) off();
    };
  }, [app]);

  return { app, tick };
}

/**
 * Mirror the hash into the app's router and back.
 *
 * Hash routing, not path routing: the built demo is a static bundle that may be
 * opened from any directory (or from file://), and a path router there would
 * 404 on refresh. The hash is a TRANSPORT detail — everything above it, the
 * route table included, speaks in plain paths.
 */
export function useHashRouting(app: WizardApp): void {
  useEffect(() => {
    const pathFromHash = (): string => {
      const raw = window.location.hash.replace(/^#/, '');
      return raw.length > 0 ? raw : '/';
    };
    // Adopt whatever the address bar already says (a shared deep link).
    app.router.push(pathFromHash());

    const onHashChange = (): void => app.router.push(pathFromHash());
    window.addEventListener('hashchange', onHashChange);

    const off = app.router.subscribe((path) => {
      const next = `#${path}`;
      if (window.location.hash !== next) window.location.hash = next;
    });

    return () => {
      window.removeEventListener('hashchange', onHashChange);
      off();
    };
  }, [app]);
}
