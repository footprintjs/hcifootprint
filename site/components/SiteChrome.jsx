import SiteHeader from './SiteHeader';
import { BASE, AUTHOR, AUTHOR_URL } from '../site.config';
import { version } from '../content/agent-map';

/* The shared header/footer, opted into by the pages that want it — today that
 * is /story/. The homepage builds its own footer (it carries the page's own
 * sign-off) but wears the SAME header, from <SiteHeader>. */
export function SiteChrome({ children }) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteHeader version={version} here={`${BASE}/story/`} />
      {children}
      <footer className="site-ft">
        <span className="built">Built by <a href={AUTHOR_URL}>{AUTHOR}</a></span> · open source ·{' '}
        <a href="https://github.com/footprintjs/hcifootprint/blob/main/LICENSE">MIT</a> · a{' '}
        <a href="https://footprintjs.github.io/">footprintjs</a> library
      </footer>
    </>
  );
}
