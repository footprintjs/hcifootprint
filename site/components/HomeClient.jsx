'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import HeroScene, { HeroCaption } from './HeroScene';
import MapCanvas from './MapCanvas';
import { BASE } from '../site.config';

const GITHUB = 'https://github.com/footprintjs/hcifootprint';
const CHANGELOG = `${GITHUB}/blob/main/CHANGELOG.md`;
const DOCS = `${BASE}/docs/`;
const STORY = `${BASE}/story/`;

const SCENES = [
  {
    n: '01 — THE MAP',
    h: 'Your app is already a map.',
    p: <>Pages are places. Routes are roads. hcifootprint reads the map your app already has — its route table — and draws nothing you did not declare.</>,
    add: '+ places, + roads',
  },
  {
    n: '02 — THE JOURNEY',
    h: 'A session is a path, not a log line.',
    p: <>A traveller walks. Each step is written as it happens: where it started, where it went, what it touched. The trail <em>is</em> the transcript — there is no second version of events.</>,
    add: '+ a trail, + a ledger',
  },
  {
    n: "03 — WHAT'S POSSIBLE HERE",
    h: "Arrive somewhere, and only that place's actions exist.",
    p: <>The model is handed the four things it can do here. Not the four hundred it could do somewhere else. Nobody hands a tourist every restaurant in the country.</>,
    add: '+ stops at this place',
  },
  {
    n: '04 — THE BOUNDARY',
    h: 'Your app owns meaning. The library owns mechanism.',
    p: <>Rules, validation and routing stay exactly where they are. hcifootprint sits outside them: it observes, it reports, it refuses. Nothing is injected. Remove it and the app is untouched.</>,
    add: '+ a membrane, not a wrapper',
    tone: 'is-agent',
  },
  {
    n: '05 — GAPS',
    h: 'It cannot do this, so it says so.',
    p: <>The agent reaches for something that was never declared. There is no fallback, no improvised click, no cheerful summary. A row appears: what it wanted, why it couldn&rsquo;t. Honest absence is the feature.</>,
    add: '+ a second traveller, + a refusal',
    tone: 'is-refuse',
    id: 'gaps',
  },
  {
    n: '06 — THE CONFIRM GATE',
    h: 'Consequential steps stop and ask.',
    p: <>Allow, always allow, or prevent — with the receipts attached. What it read. What it intends to write. Observed on screen, never inferred. Answer the card on the map; the journey waits for you.</>,
    add: '+ a gate, + a decision',
  },
  {
    n: '07 — BRING YOUR OWN',
    h: 'The map was never hand-drawn.',
    p: <>It grew from three things your app already has: the router, the journeys you name, the controls you expose. Three plugs snap in. Everything above was drawn from them.</>,
    add: '+ three declared sources',
    tone: 'is-agent',
  },
];

/* The code panel is generated from the real, compiled integration file so the
   page can never drift from something that typechecks. See site/content/agent-map.js. */
function CodeLine({ line, n }) {
  return (
    <>
      <span className="ln">{String(n).padStart(2, '0')}  </span>
      {line.map((tok, i) => (
        <span key={i} className={tok.c || undefined}>{tok.t}</span>
      ))}
      {'\n'}
    </>
  );
}

export default function HomeClient({ version, code, lineCount, lineWord }) {
  const [scene, setScene] = useState(0);
  const [hscale, setHscale] = useState(1);
  const [wrapped, setWrapped] = useState(false);
  const [mapW, setMapW] = useState(620);
  const [copied, setCopied] = useState(false);

  const rootRef = useRef(null);
  const heroRef = useRef(null);
  const colRef = useRef(null);
  const rafRef = useRef(0);
  const copyTimer = useRef(null);
  const stateRef = useRef({ hscale: 1, wrapped: false, mapW: 620, colH: 380 });

  /* The hero freeze is done in CSS (see .hp-hero-stage under prefers-reduced-motion
     / max-width), so it is already correct on the first paint. JS only needs to
     know whether it should ALSO drive the scroll-flatten. */
  const stillRef = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce), (max-width: 760px)');
    const upd = () => {
      stillRef.current = mq.matches;
      if (mq.matches && heroRef.current) heroRef.current.style.removeProperty('--f');
    };
    upd();
    mq.addEventListener('change', upd);
    return () => mq.removeEventListener('change', upd);
  }, []);

  /* The relay is 13.6s long and the object sits below the fold on a laptop, so
     playing on load would spend the whole story before anyone saw it. Hold it
     paused at frame 0 and release it the first time it is actually on screen —
     still exactly once, still settling on the same end frame. Without JS the
     class is never added and the hero simply plays on load, as before. */
  useEffect(() => {
    const el = heroRef.current;
    if (!el || stillRef.current) return undefined;
    el.classList.add('is-waiting');
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        el.classList.remove('is-waiting');
        io.disconnect();
      },
      { rootMargin: '0px 0px -18% 0px', threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const measure = useCallback(() => {
    const next = {};
    const el = heroRef.current;
    if (el) {
      const w = el.clientWidth || 820;
      const s = Math.max(0.36, Math.min(1, (w - 8) / 820));
      if (Math.abs(s - stateRef.current.hscale) > 0.01) next.hscale = Number(s.toFixed(3));
    }
    const col = colRef.current;
    if (col && col.parentElement) {
      const colW = col.getBoundingClientRect().width;
      const par = col.parentElement;
      const pcs = getComputedStyle(par);
      const rowW = par.clientWidth - (parseFloat(pcs.paddingLeft) || 0) - (parseFloat(pcs.paddingRight) || 0);
      // the map column filling the whole row means the copy has wrapped below it
      const isWrapped = colW > rowW - 60;
      const vh = window.innerHeight || 800;
      // in one column the map shares the viewport with the copy, so cap it hard
      const budget = isWrapped ? Math.min(vh * 0.3, 280) : vh - 116;
      const w = Math.round(Math.max(240, Math.min(colW, budget * 1.4634)));
      if (isWrapped !== stateRef.current.wrapped) next.wrapped = isWrapped;
      if (Math.abs(w - stateRef.current.mapW) > 4) next.mapW = w;
    }
    if (!Object.keys(next).length) return;
    stateRef.current = { ...stateRef.current, ...next };
    if (next.hscale !== undefined) setHscale(next.hscale);
    if (next.wrapped !== undefined) setWrapped(next.wrapped);
    if (next.mapW !== undefined) setMapW(next.mapW);
  }, []);

  // scene sync — one observer over the seven copy blocks plus the hero
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const blocks = Array.from(root.querySelectorAll('[data-scene]'));
    let margin = '-45% 0px -45% 0px';
    const col = colRef.current;
    if (wrapped && col) {
      const vh = window.innerHeight || 800;
      const line = Math.min(vh - 8, Math.round(col.getBoundingClientRect().height) + 82);
      margin = `-${line}px 0px -${Math.max(2, vh - line - 2)}px 0px`;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          setScene(Number(e.target.getAttribute('data-scene')));
        });
      },
      { rootMargin: margin, threshold: 0 },
    );
    blocks.forEach((b) => io.observe(b));
    return () => io.disconnect();
  }, [wrapped]);

  useEffect(() => {
    const col = colRef.current;
    let ro;
    if (col && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(col);
    }
    const onScroll = () => {
      if (rafRef.current || stillRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const el = heroRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const f = Math.min(1, Math.max(0, (60 - r.top) / Math.max(120, r.height * 0.8)));
        el.style.setProperty('--f', f.toFixed(3));
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    measure();
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [measure]);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const copy = useCallback(() => {
    if (navigator.clipboard) navigator.clipboard.writeText('npm i hcifootprint').catch(() => {});
    setCopied(true);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1600);
  }, []);

  const toggleTheme = useCallback(() => {
    const el = document.documentElement;
    const next = el.classList.contains('dark') ? 'light' : 'dark';
    el.classList.remove('dark', 'light');
    el.classList.add(next);
    try { localStorage.setItem('theme', next); } catch { /* private mode */ }
  }, []);

  return (
    <div className="hp" ref={rootRef}>
      <header className="hp-hd">
        <div className="hp-hd-brand">
          <a className="hp-wordmark" href={`${BASE}/`}>hcifootprint</a>
          <span className="hp-ver">{version}</span>
        </div>
        <nav className="hp-nav">
          <a href={DOCS}>docs</a>
          <a className="is-sec" href="#integration">guide</a>
          <a className="is-sec" href="#gaps">honesty</a>
          {/* a page, not an anchor — so it stays in the bar at every width, next
              to the other two destinations that leave this page */}
          <a href={STORY}>story</a>
          <a className="is-out" href={GITHUB}>github ↗</a>
          <button type="button" className="hp-theme" onClick={toggleTheme} aria-label="Switch colour theme">
            <svg className="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
            <svg className="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
          </button>
        </nav>
      </header>

      <section className="hp-hero" data-scene="0" id="top">
        <div className="hp-hero-row">
          <div className="hp-hero-copy">
            <div className="hp-eyebrow"><i />MIT · ONE DEPENDENCY · TREE-SHAKEABLE</div>
            <h1 className="hp-h1">hcifootprint</h1>
            <p className="hp-lede">Put a map between your app and the agent.</p>
            <p className="hp-sub">It stands between your app and an AI agent. The agent operates your real screens. Your rules stay in charge. Everything that happens is recorded — and what cannot happen is recorded too.</p>
            <div className="hp-cta">
              <button type="button" className="hp-copy-btn" onClick={copy}>
                <span className="sig">$</span>npm i hcifootprint<span className="mark">{copied ? '✓' : '⧉'}</span>
              </button>
              <a className="hp-btn-solid" href={DOCS}>read the docs →</a>
            </div>
            <div className="hp-legend">
              <span><span className="hp-dot-h" />human — recorded</span>
              <span><span className="hp-dot-a" />agent — recorded, and gated</span>
            </div>
            {/* the story the object above tells, in plain prose — it is a
                description of a run, not a measurement, so it lives here and
                not in the numbers strip */}
            <p className="hp-legend-note">In one end-to-end example run, the agent typed, was stopped for approval, created, navigated, and configured.</p>
          </div>
          <div className="hp-hero-side">
            <div>one app</div>
            <div>two travellers</div>
            <div>two trails</div>
            <div className="gate">one gate</div>
          </div>
        </div>
        {/* stage + caption travel together: below the headline when stacked,
            beside it in the second grid column from 1200px up (see home.css).
            They stay SIBLINGS inside the wrapper, which is what keeps the
            hold-until-seen switch reaching the caption. */}
        <div className="hp-hero-scene">
          <div
            className="hp-hero-stage"
            ref={heroRef}
            style={{ '--hscale': hscale, height: `${Math.round(560 * hscale)}px` }}
          >
            <HeroScene />
          </div>
          {/* the relay in words, on the relay's own clock (see HeroScene) */}
          <HeroCaption />
        </div>
        <div className="hp-scrollcue">↓ SCROLL — THE OBJECT FLATTENS INTO THE MAP</div>
      </section>

      <section className="hp-story">
        <div className="hp-mapcol" ref={colRef}>
          <div style={{ width: `${mapW}px`, maxWidth: '100%', display: 'block' }}>
            <MapCanvas scene={scene} />
          </div>
        </div>
        <div
          className="hp-scenes"
          style={{
            '--blockPad': wrapped ? '16px' : '6vh',
            '--blockPadFirst': wrapped ? '16px' : '10vh',
            '--blockJustify': wrapped ? 'flex-start' : 'center',
          }}
        >
          {SCENES.map((sc, i) => (
            <div
              key={sc.n}
              id={sc.id}
              className="hp-scene"
              data-scene={i + 1}
              data-active={scene === i + 1 ? 'true' : 'false'}
            >
              <div className="hp-scene-n">{sc.n}</div>
              <h2>{sc.h}</h2>
              <p>{sc.p}</p>
              <div className={`hp-scene-add ${sc.tone || ''}`}>{sc.add}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="hp-code-sec" id="integration">
        <div className="hp-code-row">
          <div className="hp-code-copy">
            <div className="hp-kicker">THE WHOLE INTEGRATION</div>
            <h2 className="hp-h2">{lineWord} declared lines.</h2>
            <p>This is a real integration, rewritten against the current library and compiled before it was published here. It reads like a description of the app rather than a description of the library.</p>
            <p>Three declared sources, one session, one navigate. There is no wrapper to keep in sync and no generated file to regenerate.</p>
            <div className="hp-claims">
              <span>no wrappers</span>
              <span>no proxies</span>
              <span>no injected DOM</span>
              <span className="strong">delete this file and the app is unchanged</span>
            </div>
          </div>
          <div className="hp-panel">
            <div className="hp-panel-hd">
              <span>AGENT-MAP.TS</span><span>{lineCount} LINES</span>
            </div>
            <pre className="hp-code">{code.map((line, i) => <CodeLine key={i} line={line} n={i + 1} />)}</pre>
          </div>
        </div>
      </section>

      <section className="hp-num-sec" id="numbers">
        <div className="hp-wrap">
          <div className="hp-kicker">MEASURED, NOT ESTIMATED</div>
          <div className="hp-nums">
            <div className="hp-num">
              <b>{lineCount}</b>
              <p>the same integration, rewritten and compile-checked</p>
            </div>
            <div className="hp-num">
              <b>814 B</b>
              <p>measured against this release: <span className="mono">fromRoutes</span>, minified and gzipped — what one graph source adds to a bundle</p>
            </div>
            <div className="hp-num">
              <b>1 day</b>
              <p>a version migration, reported by a production integration</p>
            </div>
          </div>
          <div className="hp-num-cta">
            <a className="hp-btn-solid lg" href={DOCS}>read the docs →</a>
            <a className="hp-btn-line" href="#gaps">see it work ↗</a>
            <span className="hp-creed">no other numbers are claimed</span>
          </div>
        </div>
      </section>

      <footer className="hp-ft">
        <div className="hp-ft-row">
          <div className="hp-ft-id">
            <b>hcifootprint</b>
            <span>records what happened. nothing more.</span>
          </div>
          <div className="hp-ft-links">
            <a href={DOCS}>docs</a>
            <a href="#integration">guide</a>
            <a href={GITHUB}>github</a>
            <a href={CHANGELOG}>changelog</a>
            <a className="is-story" href={STORY}>the story deck ↗</a>
          </div>
          <div className="hp-ft-meta"><span>MIT</span><span>v{version}</span></div>
        </div>
      </footer>
    </div>
  );
}
