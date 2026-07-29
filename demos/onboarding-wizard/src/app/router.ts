/**
 * The app's own router. Twenty lines, no dependencies, no DOM — which is the
 * point: `navigate` hands the session THIS, and the library never learns what
 * a router is.
 *
 * It is also what makes the demo's navigation honest. The agent fires a
 * goTo-only tool with no handler anywhere; the session derives the literal
 * address from the target page's route and calls `push` here. The app moves
 * because the app moved it.
 */
export interface Router {
  /** The current path, always normalized ('' and '/foo/' both read as '/foo'). */
  path(): string;
  /** Navigate. A push to where we already are is a no-op — no notify, no churn. */
  push(href: string): void;
  subscribe(onChange: (path: string) => void): () => void;
}

/**
 * '' → '/', 'profile' → '/profile', '/plan/' → '/plan'. Query and hash survive
 * untouched: they are the caller's business, and matchRoute cuts them itself.
 */
export function normalizePath(href: string): string {
  const raw = String(href ?? '').trim();
  if (raw === '' || raw === '/') return '/';
  const withLeading = raw.startsWith('/') ? raw : `/${raw}`;
  const cut = withLeading.search(/[?#]/);
  const bare = cut === -1 ? withLeading : withLeading.slice(0, cut);
  const rest = cut === -1 ? '' : withLeading.slice(cut);
  const trimmed = bare.length > 1 && bare.endsWith('/') ? bare.slice(0, -1) : bare;
  return `${trimmed}${rest}`;
}

export function createRouter(initialPath = '/'): Router {
  let current = normalizePath(initialPath);
  const listeners = new Set<(path: string) => void>();

  return {
    path: () => current,

    push(href) {
      const next = normalizePath(href);
      if (next === current) return;
      current = next;
      // Copy before iterating: a listener that unsubscribes (a component
      // unmounting mid-navigation) must not skip its neighbours.
      for (const listener of [...listeners]) listener(current);
    },

    subscribe(onChange) {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },
  };
}
