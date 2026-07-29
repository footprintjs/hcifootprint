import { buildNavigationGraph, fromRoutes, fromJourneys, fromLiveStore, type LiveActionStore } from 'hcifootprint';
import { ROUTES, router } from './router.js';
import { JOURNEYS } from './funnels.js';
import { legacyStore } from './actionStore.js';

// Publish the controls the app already shows.
const controls: LiveActionStore = {
  subscribe: (onChange) => legacyStore.on('change', onChange),
  actions: () =>
    legacyStore.visibleControls().map((c) => ({
      node: c.pageId,
      name: c.id,
      does: c.label,
      handler: c.perform,
      enabled: !c.disabled,
    })),
};

// The router table and the journey list ARE the graph.
export const graph = buildNavigationGraph('poc-app', {
  sources: [fromRoutes(ROUTES), fromJourneys(JOURNEYS), fromLiveStore(controls)],
});

// One session, driving the app's real router.
export const session = graph.createSession({
  node: 'home',
  navigate: (href) => router.push(href),
});
