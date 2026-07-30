'use client';

import { useCallback } from 'react';
import { BASE } from '../site.config';

const HOME = `${BASE}/`;
const GITHUB = 'https://github.com/footprintjs/hcifootprint';

/* The bar every page of this site wears.
 *
 * It is ONE component rather than one per page because the homepage and /story/
 * are separate designs that must read as the same product: a link added here
 * appears on both, and neither can drift.
 *
 * `mark` entries are sections OF the homepage. On the homepage they stay bare
 * fragments — an absolute href there would be a navigation, reloading the page
 * and restarting the 13.6s hero — and from any other page they are the same
 * fragments hung off the homepage URL. */
const LINKS = [
  { label: 'docs', href: `${BASE}/docs/` },
  { label: 'guide', mark: '#integration' },
  { label: 'honesty', mark: '#gaps' },
  { label: 'story', href: `${BASE}/story/` },
  { label: 'github ↗', href: GITHUB, out: true },
];

/** @param here - this page's own URL, so its link can say so and the marks know where they point. */
export default function SiteHeader({ version, here }) {
  /* Writes the class every stylesheet keys off, and the choice the pre-paint
     script in layout.jsx reads back on the next visit. The DOM is the state:
     nothing to hydrate, so the icon can never disagree with the page. */
  const toggleTheme = useCallback(() => {
    const el = document.documentElement;
    const next = el.classList.contains('dark') ? 'light' : 'dark';
    el.classList.remove('dark', 'light');
    el.classList.add(next);
    try { localStorage.setItem('theme', next); } catch { /* private mode */ }
  }, []);

  return (
    <header className="site-hd">
      <div className="brand">
        <a className="wordmark" href={HOME}>hcifootprint</a>
        <span className="ver">{version}</span>
      </div>
      <nav className="nav">
        {LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href ?? (here === HOME ? link.mark : HOME + link.mark)}
            className={link.out ? 'is-out' : link.mark ? 'is-sec' : undefined}
            aria-current={link.href === here ? 'page' : undefined}
          >
            {link.label}
          </a>
        ))}
        <button type="button" className="theme" onClick={toggleTheme} aria-label="Switch colour theme">
          <svg className="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          <svg className="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        </button>
      </nav>
    </header>
  );
}
