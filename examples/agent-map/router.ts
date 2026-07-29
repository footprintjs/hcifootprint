// The app's own router module — unchanged by the integration. Stands in here
// for whatever table your app already keeps.
export const ROUTES = {
  home: '/',
  projects: '/projects',
  project: '/projects/:id',
  billing: { route: '/billing', does: 'Billing settings' },
} as const;

export const router = { push: (_href: string) => {} };
