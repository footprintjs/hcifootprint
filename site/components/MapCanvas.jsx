'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/* The sticky map the seven scroll scenes drive.
 *
 * Every scene ADDS to the drawing — `s >= n` throughout, never `s === n` (the
 * one exception is the veil, which belongs to scene 3 alone). Scrolling back up
 * removes layers in the same order it added them; nothing is ever wiped and
 * redrawn.
 *
 * The gate card in scene 6 is really interactive: ALLOW / ALWAYS ALLOW /
 * PREVENT move the gate arm, extend or stop the agent's road, and write a
 * different row into the ledger. It is the one place on the page where the
 * reader gets to be the human in the loop.
 */

const STEP = (pts, base) =>
  pts.map((p, i) => ({
    x: p[0],
    y: p[1],
    o: `${p[0]}px ${p[1]}px`,
    d: `${(base + i * 0.16).toFixed(2)}s`,
  }));

const HUMAN_STEPS = STEP(
  [[185, 646], [252, 592], [320, 547], [372, 516], [420, 486], [492, 508], [562, 528], [632, 543], [700, 551]],
  0.15,
);
const AGENT_STEPS = STEP(
  [[196, 668], [266, 612], [338, 556], [416, 508], [492, 532], [566, 548], [642, 563], [706, 572], [762, 554], [812, 528]],
  0.12,
);

const GATE_TEXT = {
  pending: 'Paused. The journey does not continue without you.',
  prevented: 'Prevented. Recorded as refused — nothing was written.',
  always: 'Allowed for every future step of this journey.',
  allowed: 'Allowed once. Written, then verified on screen.',
};

function ledgerRows(s, gate) {
  const rows = [];
  if (s >= 2) {
    rows.push({ t: 'enter  /', c: 'var(--hp-ink2)' });
    rows.push({ t: 'nav    /projects', c: 'var(--hp-human)' });
    rows.push({ t: 'open   /projects/:id', c: 'var(--hp-human)' });
  }
  if (s >= 3) rows.push({ t: 'scope  4 controls here', c: 'var(--hp-ink2)' });
  if (s >= 5) {
    rows.push({ t: 'agent  joins session', c: 'var(--hp-agent)' });
    rows.push({ t: 'nav    /projects/:id', c: 'var(--hp-agent)' });
    rows.push({ t: 'refuse export.csv — no control declared', c: 'var(--hp-refuse)' });
  }
  if (s >= 6) {
    if (gate === 'prevented') rows.push({ t: 'gate   prevented by human', c: 'var(--hp-refuse)' });
    else if (gate === 'pending') rows.push({ t: 'gate   awaiting human', c: 'var(--hp-gate)' });
    else rows.push({ t: 'gate   allowed by human', c: 'var(--hp-gate)' });
  }
  if (s >= 6 && (gate === 'allowed' || gate === 'always')) {
    rows.push({ t: 'write  /billing plan=scale', c: 'var(--hp-agent)' });
  }
  if (s >= 7) rows.push({ t: 'close  9 steps, 0 claims unobserved', c: 'var(--hp-ink2)' });
  return rows.map((r, i) => ({ ...r, n: String(i + 1).padStart(2, '0') }));
}

const NODES = [
  { x: 185, y: 655, r: 15 },
  { x: 420, y: 495, r: 17 },
  { x: 700, y: 560, r: 21 },
  { x: 955, y: 400, r: 15 },
  { x: 790, y: 215, r: 15 },
  { x: 450, y: 250, r: 14 },
];

const HERE_CONTROLS = [
  { x: 520, y: 545, w: 82, tx: 561, ty: 565, label: 'open' },
  { x: 650, y: 468, w: 104, tx: 702, ty: 488, label: 'rename' },
  { x: 790, y: 596, w: 92, tx: 836, ty: 616, label: 'share' },
  { x: 522, y: 620, w: 110, tx: 577, ty: 640, label: 'archive' },
];

export default function MapCanvas({ scene = 7 }) {
  const [gate, setGate] = useState('pending');
  const [compact, setCompact] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const upd = () => setCompact((el.clientWidth || 0) < 600);
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    upd();
    return () => ro.disconnect();
  }, []);

  const s = Math.max(0, Math.min(7, Number(scene ?? 7)));
  const open = gate === 'allowed' || gate === 'always';
  const rows = ledgerRows(s, gate);
  const status = GATE_TEXT[gate];
  const ledgerCount = String(rows.length).padStart(2, '0');
  const last = rows.length ? rows[rows.length - 1] : null;

  const allow = useCallback(() => setGate('allowed'), []);
  const always = useCallback(() => setGate('always'), []);
  const prevent = useCallback(() => setGate('prevented'), []);

  const stripLine = !compact
    ? ''
    : s >= 6 && gate !== 'pending'
      ? status
      : s >= 4
        ? 'Nothing injected — remove the library and the app is untouched.'
        : s === 3
          ? 'The model sees only this place — not your whole app.'
          : '';

  const gateButtons = (
    <>
      <button type="button" onClick={allow} className="mc-btn is-primary">ALLOW</button>
      <button type="button" onClick={always} className="mc-btn">ALWAYS ALLOW</button>
      <button type="button" onClick={prevent} className="mc-btn is-refuse">PREVENT</button>
    </>
  );

  return (
    <div className="mc">
      <div ref={boxRef} className="mc-box">
        <svg viewBox="0 0 1200 820" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block', overflow: 'visible' }} role="img" aria-label={`Map of the app, scene ${s} of 7`}>
          <defs>
            <pattern id="mcGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0 L0 0 0 40" fill="none" stroke="var(--hp-grid)" strokeWidth="1" />
            </pattern>
            <radialGradient id="mcVeil" cx="58.3%" cy="68.3%" r="26%">
              <stop offset="0%" stopColor="#000" />
              <stop offset="72%" stopColor="#000" />
              <stop offset="100%" stopColor="#fff" />
            </radialGradient>
            <mask id="mcVeilMask">
              <rect x="0" y="0" width="1200" height="820" fill="url(#mcVeil)" />
            </mask>
            <marker id="mcArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M0 0 L10 5 L0 10 z" fill="var(--hp-agent)" />
            </marker>
          </defs>

          <rect x="0" y="0" width="1200" height="820" fill="url(#mcGrid)" />
          <g stroke="var(--hp-rule)" strokeWidth="1" opacity=".8">
            <path d="M0 40 H1200 M0 780 H1200 M40 0 V820 M1160 0 V820" opacity=".45" />
            <path d="M240 34 V46 M440 34 V46 M640 34 V46 M840 34 V46 M1040 34 V46 M240 774 V786 M440 774 V786 M640 774 V786 M840 774 V786 M1040 774 V786 M34 200 H46 M34 400 H46 M34 600 H46 M1154 200 H1166 M1154 400 H1166 M1154 600 H1166" />
          </g>
          <g fontFamily="var(--mono)" fontSize="13" fill="var(--hp-ink2)" letterSpacing=".14em">
            <text x="40" y="26">FIG. 1 — APP GRAPH</text>
            <text x="40" y="806">0</text>
            <text x="150" y="806" textAnchor="middle">1 ROUTE</text>
          </g>
          <path d="M62 798 H138" stroke="var(--hp-rule)" strokeWidth="2" />

          {/* 04 — the boundary: mechanism outside, meaning inside */}
          {s >= 4 && (
            <g style={{ animation: 'dcFade .7s ease both' }}>
              <rect x="26" y="26" width="1148" height="768" rx="20" fill="none" stroke="var(--hp-agent)" strokeWidth="1.5" strokeDasharray="14 8" opacity=".85" />
              <rect x="86" y="86" width="1028" height="648" rx="14" fill="none" stroke="var(--hp-ink2)" strokeWidth="1.5" opacity=".7" />
              <g fontFamily="var(--mono)" fontSize="14" letterSpacing=".12em">
                <rect x="86" y="46" width="336" height="26" fill="var(--hp-bg)" />
                <text x="94" y="65" fill="var(--hp-agent)">HCIFOOTPRINT — MECHANISM · HONESTY</text>
                <rect x="126" y="74" width="330" height="24" fill="var(--hp-bg)" />
                <text x="134" y="92" fill="var(--hp-ink2)">YOUR APP — ROUTES · RULES · VALIDATION</text>
              </g>
            </g>
          )}

          {/* 01 — the roads */}
          {s >= 1 && (
            <g fill="none" stroke="var(--hp-rule)" strokeWidth="7" strokeLinecap="round" opacity=".9" style={{ animation: 'dcFade .8s ease both' }}>
              <path d="M185 655 C 250 600 340 550 420 495" />
              <path d="M420 495 C 500 520 610 545 700 560" />
              <path d="M700 560 C 790 540 880 470 955 400" />
              <path d="M420 495 C 405 420 415 320 450 250" />
              <path d="M450 250 C 550 220 690 205 790 215" />
              <path d="M955 400 C 930 330 870 255 790 215" />
            </g>
          )}

          {/* 03 — everything but this place goes dark */}
          {s === 3 && (
            <rect x="0" y="0" width="1200" height="820" fill="var(--hp-bg)" mask="url(#mcVeilMask)" style={{ animation: 'dcVeil .8s ease both' }} />
          )}

          {/* 01 — the places */}
          {s >= 1 && (
            <g style={{ animation: 'dcRise .7s ease both' }} fontFamily="var(--mono)" fontSize="17" fill="var(--hp-ink)">
              <g fill="var(--hp-panel)" stroke="var(--hp-ink2)" strokeWidth="2">
                {NODES.map((n) => <circle key={`o${n.x}`} cx={n.x} cy={n.y} r={n.r} />)}
              </g>
              <g fill="var(--hp-ink2)" stroke="none">
                {NODES.map((n) => <circle key={`i${n.x}`} cx={n.x} cy={n.y} r={n.r > 15 ? 5 : 4} />)}
              </g>
              <text x="185" y="700" textAnchor="middle">/</text>
              <text x="420" y="452" textAnchor="middle">/projects</text>
              <text x="700" y="614" textAnchor="middle">/projects/:id</text>
              <text x="984" y="388" textAnchor="start">/settings</text>
              <text x="756" y="250" textAnchor="end">/billing</text>
              <text x="416" y="240" textAnchor="end">/invite</text>
            </g>
          )}

          {/* 03 — the four things possible HERE */}
          {s >= 3 && (
            <g style={{ transformOrigin: '700px 560px', animation: 'dcPop .5s cubic-bezier(.2,1.4,.4,1) both' }} fontFamily="var(--mono)" fontSize="15" fill="var(--hp-human)">
              <g stroke="var(--hp-human)" strokeWidth="1.5" strokeDasharray="3 4" fill="none" opacity=".7">
                <path d="M679 555 L606 560" />
                <path d="M700 538 L702 500" />
                <path d="M718 578 L790 610" />
                <path d="M681 578 L634 622" />
              </g>
              <g fill="var(--hp-panel)" stroke="var(--hp-human)" strokeWidth="1.5">
                {HERE_CONTROLS.map((c) => <rect key={c.label} x={c.x} y={c.y} width={c.w} height="30" rx="15" />)}
              </g>
              {HERE_CONTROLS.map((c) => (
                <text key={`t${c.label}`} x={c.tx} y={c.ty} textAnchor="middle">{c.label}</text>
              ))}
            </g>
          )}

          {/* 02 — the human's trail */}
          {s >= 2 && (
            <g>
              <path d="M185 655 C 250 600 340 550 420 495 C 500 520 610 545 700 560" transform="translate(0,-9)" fill="none" stroke="var(--hp-human)" strokeWidth="3.5" strokeLinecap="round" pathLength="1000" strokeDasharray="1000" style={{ animation: 'dcDraw 1.8s cubic-bezier(.4,0,.25,1) both' }} />
              {HUMAN_STEPS.map((p) => (
                <circle key={`h${p.x}`} cx={p.x} cy={p.y} r="6" fill="var(--hp-human)" style={{ transformOrigin: p.o, animation: 'dcPop .4s cubic-bezier(.2,1.5,.4,1) both', animationDelay: p.d }} />
              ))}
              {/* the translate lives on an OUTER group: an animated CSS transform
                  replaces the transform attribute outright, so a scale() keyframe
                  on this element would drop the translate and park it at 0,0 */}
              <g transform="translate(700,551)">
                <g style={{ animation: 'dcPop .5s 1.7s cubic-bezier(.2,1.5,.4,1) both' }}>
                  <circle r="15" fill="none" stroke="var(--hp-human)" strokeWidth="2.5" />
                  <circle r="5.5" fill="var(--hp-human)" />
                  <circle className="mc-pulse" r="24" fill="none" stroke="var(--hp-human)" strokeWidth="1.5" style={{ animation: 'dcPulse 2.4s 2s ease-in-out infinite' }} />
                </g>
              </g>
            </g>
          )}

          {/* 05 — the agent's trail, and the thing it will not improvise */}
          {s >= 5 && (
            <g>
              <path d="M185 655 C 250 600 340 550 420 495 C 500 520 610 545 700 560 C 745 557 790 531 833 504" transform="translate(0,11)" fill="none" stroke="var(--hp-agent)" strokeWidth="3.5" strokeLinecap="round" pathLength="1000" strokeDasharray="1000" style={{ animation: 'dcDraw 1.9s cubic-bezier(.4,0,.25,1) both' }} />
              {/* translate on the group, rotation baked INTO the keyframe — an
                  animated CSS transform would otherwise replace both outright */}
              {AGENT_STEPS.map((p) => (
                <g key={`a${p.x}`} transform={`translate(${p.x},${p.y})`}>
                  <rect x="-5" y="-5" width="10" height="10" fill="var(--hp-agent)" style={{ animation: 'dcPopRot .4s cubic-bezier(.2,1.5,.4,1) both', animationDelay: p.d }} />
                </g>
              ))}
              <g style={{ animation: 'dcFade .6s 1.5s ease both' }}>
                <path d="M712 578 C 812 654 906 700 1002 706" fill="none" stroke="var(--hp-refuse)" strokeWidth="2.5" strokeDasharray="9 9" markerEnd="url(#mcArrow)" opacity=".8" />
                <g transform="translate(1024,706)">
                  <circle r="15" fill="none" stroke="var(--hp-refuse)" strokeWidth="2" />
                  <path d="M-6 -6 L6 6 M6 -6 L-6 6" stroke="var(--hp-refuse)" strokeWidth="2.5" />
                </g>
                <text x="1046" y="712" fontFamily="var(--mono)" fontSize="15" fill="var(--hp-refuse)">no control</text>
                <text x="1046" y="732" fontFamily="var(--mono)" fontSize="15" fill="var(--hp-refuse)">declared</text>
              </g>
            </g>
          )}

          {/* 06 — the gate. The arm only lifts when the reader lifts it. */}
          {s >= 6 && (
            <g style={{ transformOrigin: '833px 499px', animation: 'dcPop .5s cubic-bezier(.2,1.4,.4,1) both' }}>
              {open && (
                <path d="M833 504 C 876 478 918 440 955 405" transform="translate(0,11)" fill="none" stroke="var(--hp-agent)" strokeWidth="3.5" strokeLinecap="round" pathLength="1000" strokeDasharray="1000" style={{ animation: 'dcDraw 1.1s cubic-bezier(.4,0,.25,1) both' }} />
              )}
              <path d="M824 476 V524 M846 476 V524" stroke="var(--hp-gate)" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M824 486 H846" stroke="var(--hp-gate)" strokeWidth="6" strokeLinecap="round" transform={`rotate(${open ? -78 : 0} 824 486)`} style={{ transition: 'transform .7s cubic-bezier(.3,1.3,.4,1)' }} />
              <circle className="mc-pulse" cx="835" cy="500" r="30" fill="none" stroke="var(--hp-gate)" strokeWidth="1.5" strokeDasharray="4 6" opacity={gate === 'pending' ? 1 : 0} style={{ animation: 'dcPulse 1.8s ease-in-out infinite' }} />
            </g>
          )}

          {/* 07 — the three declared sources the whole map grew from */}
          {s >= 7 && (
            <g style={{ animation: 'dcFade .7s ease both' }} fontFamily="var(--mono)" fontSize="15" fill="var(--hp-agent)" letterSpacing=".04em">
              <g stroke="var(--hp-agent)" strokeWidth="1.5" strokeDasharray="3 4" fill="none" opacity=".8">
                <path d="M140 307 L212 307 L212 452" />
                <path d="M140 369 L184 369 L184 470" />
                <path d="M140 431 L160 431 L160 500" />
              </g>
              <g fill="var(--hp-panel)" stroke="var(--hp-agent)" strokeWidth="1.5">
                <rect x="6" y="286" width="134" height="42" rx="4" />
                <rect x="6" y="348" width="134" height="42" rx="4" />
                <rect x="6" y="410" width="134" height="42" rx="4" />
              </g>
              <text x="22" y="313">router</text>
              <text x="22" y="375">journeys</text>
              <text x="22" y="437">controls</text>
              <g fill="var(--hp-ink2)" fontSize="13" letterSpacing=".12em">
                <text x="22" y="270">DECLARED SOURCES</text>
              </g>
            </g>
          )}
        </svg>

        <div className="mc-figtag">{`SCENE ${String(s).padStart(2, '0')} / 07`}</div>

        {!compact && s >= 2 && (
          <div className="mc-ledger">
            <div className="mc-ledger-hd">
              <span>LEDGER</span>
              <span>{ledgerCount}</span>
            </div>
            <div className="mc-ledger-rows">
              {rows.map((row) => (
                <div key={row.n} className="mc-ledger-row">
                  <span className="n">{row.n}</span>
                  <span style={{ color: row.c }}>{row.t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!compact && s >= 3 && (
          <div className="mc-caption">
            <div className="rule" />
            <p>The model sees <em>this</em> — not your whole app.</p>
          </div>
        )}

        {!compact && s >= 6 && (
          <div className="mc-gate">
            <div className="mc-gate-hd"><span className="pip" />AGENT REQUESTS</div>
            <p className="mc-gate-ask">Configure billing on <span className="mono">/billing</span></p>
            <div className="mc-gate-receipts">
              <span className="k">READ</span><span className="v">plan=team · seats=12 · renews 2026-08-01</span>
              <span className="k">INTENDS</span><span className="v">select #plan → &quot;scale&quot; · 1 write</span>
              <span className="k">PROOF</span><span className="v">observed on screen, not inferred</span>
            </div>
            <div className="mc-gate-btns">{gateButtons}</div>
            <p className="mc-gate-status" role="status">{status}</p>
          </div>
        )}

        {!compact && s >= 4 && (
          <div className="mc-note">
            <p>Nothing injected. Remove the library and the app is untouched.</p>
          </div>
        )}
      </div>

      {compact && (
        <div className="mc-strip">
          {s >= 2 && (
            <div className="mc-strip-ledger">
              <span className="lbl">LEDGER {ledgerCount}</span>
              <span className="val" style={{ color: last ? last.c : 'var(--hp-ink2)' }}>{last ? last.t : ''}</span>
            </div>
          )}
          {stripLine && (
            <p className="mc-strip-line" style={{ color: s >= 6 && gate !== 'pending' ? 'var(--hp-gate)' : 'var(--hp-ink2)' }}>{stripLine}</p>
          )}
        </div>
      )}

      {compact && s === 6 && gate === 'pending' && (
        <div className="mc-cgate">
          <div className="mc-cgate-in">
            <div className="mc-gate-hd"><span className="pip" />AGENT REQUESTS</div>
            <p className="mc-gate-ask">Configure billing on <span className="mono">/billing</span></p>
            <div className="mc-cgate-btns">{gateButtons}</div>
            <div className="mc-cgate-receipts">
              <div><span className="k">READ </span><span className="v">plan=team · seats=12 · renews 2026-08-01</span></div>
              <div><span className="k">INTENDS </span><span className="v">select #plan → &quot;scale&quot; · 1 write</span></div>
              <div><span className="k">PROOF </span><span className="v">observed on screen, not inferred</span></div>
              <p className="mc-gate-status" role="status">{status}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
