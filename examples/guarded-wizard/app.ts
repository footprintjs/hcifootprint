/**
 * THE APP — a three-page project wizard that has never heard of an agent.
 *
 * DOM-free and library-free on purpose: it imports nothing from hcifootprint,
 * so the same object drives the tests, the transcript and (in a real app) the
 * browser, and none of the three can disagree with the others.
 *
 * One bug is deliberate and load-bearing: `pickRecipe` given an id the app does
 * not have selects NOTHING, returns normally, and still notifies its store.
 * That is the field failure this example is written around — a handler that RAN
 * is not an action that HAPPENED, and nothing downstream of the handler can
 * tell the difference. Only the app's own `verify` contract can.
 */

/** The recipes this app actually has. Anything else selects nothing. */
export const RECIPES = ['dose-response', 'time-course'] as const;

/** The addresses the app's own router navigates by — the single owner. */
export const PATHS = {
  projects: '/projects',
  wizard: '/projects/new',
  review: '/projects/new/review',
} as const;

export interface WizardApp {
  /** Where the app's router currently is — the truth the library cannot see. */
  readonly path: string;
  /** Subscribe to STORE changes (the shape a state tap is wired to). */
  onChange(listener: () => void): () => void;
  /**
   * Subscribe to ROUTER changes. A separate channel because they are separate
   * events: a navigation is not a state delta, and reporting one as if it were
   * hands the session an unattributed delta to guess an author for.
   */
  onNavigate(listener: () => void): () => void;
  /** The LEAN projection guards read — flat keys, never the whole app. */
  projection(): Record<string, unknown>;
  /** The router's own navigation — what the session's `navigate` option calls. */
  navigate(href: string): void;
  nameProject(input: unknown): void;
  pickRecipe(input: unknown): void;
  createProject(): { projectId: string };
}

export function createWizardApp(): WizardApp {
  let path: string = PATHS.wizard;
  let name = '';
  let recipe = '';
  let created = 0;
  const storeListeners = new Set<() => void>();
  const routerListeners = new Set<() => void>();
  // Every mutation notifies, whether or not it changed anything — that is what
  // an ordinary store does, and it is why a no-op handler still looks like work
  // from the outside.
  const notify = (): void => {
    for (const listener of [...storeListeners]) listener();
  };
  const notifyRoute = (): void => {
    for (const listener of [...routerListeners]) listener();
  };
  const text = (input: unknown, key: string): string => {
    const value = (input as Record<string, unknown> | undefined)?.[key];
    return typeof value === 'string' ? value : '';
  };

  return {
    get path() {
      return path;
    },
    onChange(listener) {
      storeListeners.add(listener);
      return () => storeListeners.delete(listener);
    },
    onNavigate(listener) {
      routerListeners.add(listener);
      return () => routerListeners.delete(listener);
    },
    projection() {
      return { 'project.name': name, 'project.recipe': recipe, 'projects.count': created };
    },
    navigate(href) {
      path = href;
      notifyRoute();
    },
    nameProject(input) {
      name = text(input, 'name');
      notify();
    },
    pickRecipe(input) {
      const asked = text(input, 'recipe');
      // THE DELIBERATE BUG. An unknown id leaves the radio unselected — and the
      // handler returns exactly as it does on success.
      if ((RECIPES as readonly string[]).includes(asked)) recipe = asked;
      notify();
    },
    createProject() {
      created += 1;
      notify();
      return { projectId: `prj-${created}` };
    },
  };
}
