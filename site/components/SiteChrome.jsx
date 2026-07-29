import { ThemeToggle } from 'storydeck';
import { BASE, AUTHOR, AUTHOR_URL } from '../site.config';

/* The site's shared header/footer.
 *
 * These used to live in the root layout, wrapping every page. The homepage
 * brings its own chrome (its header and footer are part of the design), so the
 * shared chrome moved here and is opted into by the pages that want it —
 * today that is /story/. */
export function SiteChrome({ children }) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-hd">
        <a className="brand" href={`${BASE}/`}>
          <img src={`${BASE}/logo-foot.png`} alt="" width={26} height={26} />
          <span>H<span className="a">A</span>CI&nbsp;Footprint</span>
        </a>
        <span className="sp" />
        <a className="nav" href="https://github.com/footprintjs/hcifootprint">GitHub</a>
        <a className="nav" href="https://www.npmjs.com/package/hcifootprint">npm</a>
        <a className="nav" href="https://footprintjs.github.io/">footprintjs</a>
        <ThemeToggle />
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
