import { ThemeToggle } from 'storydeck';
import { BASE, AUTHOR, AUTHOR_URL } from '../site.config';
import { version } from '../content/agent-map';

/* The site's shared header/footer — the SAME bar the homepage carries.
 *
 * The homepage builds its chrome inline (it is part of that page's design); this
 * is that chrome for the pages that opt in, today /story/. It carries the same
 * wordmark, the same version badge, the same five destinations in the same order
 * and the same theme control, and globals.css draws all of it from the brand
 * tokens — so crossing home → story changes the content and nothing else.
 *
 * `guide` and `honesty` are sections OF the homepage, so from here they are
 * absolute links back into it. */
const GITHUB = 'https://github.com/footprintjs/hcifootprint';

export function SiteChrome({ children }) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-hd">
        <a className="brand" href={`${BASE}/`}>
          <span className="wordmark">hcifootprint</span>
          <span className="ver">{version}</span>
        </a>
        <nav className="nav-row">
          <a className="nav" href={`${BASE}/docs/`}>docs</a>
          <a className="nav is-sec" href={`${BASE}/#integration`}>guide</a>
          <a className="nav is-sec" href={`${BASE}/#gaps`}>honesty</a>
          <a className="nav" href={`${BASE}/story/`} aria-current="page">story</a>
          <a className="nav is-out" href={GITHUB}>github ↗</a>
          <ThemeToggle />
        </nav>
      </header>
      {children}
      <footer className="site-ft">
        <span className="built">Built by <a href={AUTHOR_URL}>{AUTHOR}</a></span> · open source ·{' '}
        <a href="https://github.com/footprintjs/hcifootprint/blob/main/LICENSE">MIT</a> · a{' '}
        <a href="https://footprintjs.github.io/">footprintjs</a> library
      </footer>
    </>
  );
}
