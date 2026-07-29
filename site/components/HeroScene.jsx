/* The relay hero: one journey, two travellers, one baton pass.
 *
 * Timeline (seconds from --hd):
 *   0.0–1.4  the plate, three risers, three pages rise
 *   2.5–3.6  the human presses a control on PAGE A and drives A → B
 *   4.4–4.7  THE BATON PASS — one shared seam, warm trail becomes cool,
 *            the dot is literally half human / half agent, camera leans in
 *   5.5–9.3  the agent drives B → C, filling fields on the way
 *   10.4     the gate catches the consequential submit; the journey stops
 *   12.2     the dimmed human returns and approves (the tick)
 *   13.1     the final control carries BOTH marks
 *
 * Every animation uses fill `both`, so the end state IS the static frame.
 * The parent freezes it by setting --hd to a delay past the end and
 * --hpPlay: paused (see HomeClient). Nothing here needs JS to settle.
 */
const PLAY = 'hs-a'; // carries animation-play-state: var(--hpPlay, running)

const d = (s) => `calc(var(--hd, 0s) + ${s})`;

const page = {
  position: 'absolute',
  width: 180,
  height: 120,
  background: 'var(--hp-panel)',
  boxShadow: '0 0 0 1px var(--hp-rule), 0 30px 56px -28px var(--hp-shadow)',
};
const chrome = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  height: 21,
  boxShadow: 'inset 0 -1px 0 var(--hp-rule)',
  display: 'flex',
  alignItems: 'center',
  padding: '0 10px',
};
const tag = {
  marginLeft: 'auto',
  fontFamily: 'var(--mono)',
  fontSize: 8.5,
  letterSpacing: '.16em',
  color: 'var(--hp-ink2)',
  opacity: .85,
};
const riser = {
  position: 'absolute',
  width: 2,
  height: 90,
  background: 'var(--hp-rule)',
  transformOrigin: 'top center',
  transform: 'rotateX(-90deg)',
};
// a road segment: rotated + scaled in along its own axis
const road = (left, top, width, colour, dashed) => ({
  position: 'absolute',
  left,
  top,
  width,
  height: 2,
  transformOrigin: '0 50%',
  ...(dashed
    ? { background: `repeating-linear-gradient(90deg, ${colour} 0 7px, transparent 7px 13px)` }
    : { background: colour, boxShadow: `0 0 8px 0 ${colour}` }),
});
// text that lies flat on the plate has to be counter-rotated to read straight
const flat = {
  position: 'absolute',
  transform: 'rotateZ(42deg) rotateX(-58deg)',
  transformOrigin: 'center center',
  fontFamily: 'var(--mono)',
  fontSize: 10,
  letterSpacing: '.14em',
  color: 'var(--hp-ink2)',
  whiteSpace: 'nowrap',
};
const anchor = (left, top, z = 97) => ({
  position: 'absolute',
  left,
  top,
  width: 0,
  height: 0,
  transform: `translateZ(${z}px)`,
  transformStyle: 'preserve-3d',
});
const humanMark = {
  position: 'absolute',
  width: 12,
  height: 12,
  borderRadius: '50%',
  background: 'var(--hp-human)',
  boxShadow: '0 0 12px 2px var(--hp-human)',
};
const agentMark = {
  position: 'absolute',
  width: 10,
  height: 10,
  background: 'var(--hp-agent)',
  transform: 'rotate(45deg)',
  boxShadow: '0 0 12px 2px var(--hp-agent)',
};

export default function HeroScene() {
  return (
    <div
      className="hs-root"
      style={{
        position: 'relative',
        width: 820,
        height: 560,
        transform: 'scale(var(--hscale, 1))',
        transformOrigin: 'center center',
        opacity: 'calc(1 - 0.85 * var(--f, 0))',
      }}
    >
      <div
        className={PLAY}
        style={{
          position: 'absolute',
          inset: 0,
          perspective: '1600px',
          perspectiveOrigin: '50% 42%',
          animation: `hsCam 13.6s cubic-bezier(.45,0,.35,1) ${d('0s')} both`,
        }}
      >
        {/* --f flattens the whole object into the map as the reader scrolls */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transform: 'rotateX(calc(-58deg * var(--f, 0))) rotateZ(calc(42deg * var(--f, 0)))',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transformStyle: 'preserve-3d',
              transform: 'rotateX(58deg) rotateZ(-42deg)',
            }}
          >
            {/* the plate */}
            <div
              className={PLAY}
              style={{
                position: 'absolute',
                left: 100,
                top: 50,
                width: 620,
                height: 460,
                background: 'var(--hp-bg)',
                backgroundImage:
                  'repeating-linear-gradient(0deg, var(--hp-grid) 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, var(--hp-grid) 0 1px, transparent 1px 40px)',
                boxShadow: '0 0 0 1px var(--hp-rule)',
                animation: `hsPlateIn .9s cubic-bezier(.2,.8,.3,1) ${d('0s')} both`,
              }}
            />

            <div className={PLAY} style={{ ...riser, left: 112, top: 66, animation: `hsRiser .7s ease ${d('.6s')} both` }} />
            <div className={PLAY} style={{ ...riser, left: 276, top: 220, animation: `hsRiser .7s ease ${d('1.0s')} both` }} />
            <div className={PLAY} style={{ ...riser, left: 440, top: 374, animation: `hsRiser .7s ease ${d('1.35s')} both` }} />

            {/* PAGE A — the human's screen */}
            <div className={PLAY} style={{ ...page, left: 108, top: 62, animation: `hsPage .8s cubic-bezier(.2,.8,.3,1) ${d('.6s')} both` }}>
              <div style={{ ...chrome, gap: 6 }}>
                <div style={{ width: 16, height: 4, background: 'var(--hp-ink2)', opacity: .5 }} />
                <div style={{ width: 30, height: 4, background: 'var(--hp-rule)' }} />
                <div style={tag}>PAGE A</div>
              </div>
              <div style={{ position: 'absolute', left: 16, top: 40, width: 88, height: 26, boxShadow: 'inset 0 0 0 1px var(--hp-rule)', display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
                <div style={{ width: 42, height: 4, background: 'var(--hp-ink2)', opacity: .6 }} />
              </div>
              {/* the human presses it */}
              <div className={PLAY} style={{ position: 'absolute', left: 16, top: 40, width: 88, height: 26, background: 'var(--hp-human)', animation: `hsTint .5s ease ${d('2.55s')} both` }} />
              <div className={PLAY} style={{ position: 'absolute', left: 16, top: 40, width: 88, height: 26, boxShadow: 'inset 0 0 0 1.5px var(--hp-human), 0 0 16px -3px var(--hp-human)', animation: `hsLit .5s ease ${d('2.55s')} both` }} />
              <div style={{ position: 'absolute', left: 16, top: 80, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ width: 132, height: 3, background: 'var(--hp-rule)' }} />
                <div style={{ width: 98, height: 3, background: 'var(--hp-rule)' }} />
                <div style={{ width: 116, height: 3, background: 'var(--hp-rule)' }} />
              </div>
            </div>

            {/* PAGE B — the agent fills the form */}
            <div className={PLAY} style={{ ...page, left: 272, top: 216, animation: `hsPage .8s cubic-bezier(.2,.8,.3,1) ${d('1.0s')} both` }}>
              <div style={chrome}>
                <div style={{ width: 48, height: 4, background: 'var(--hp-ink2)', opacity: .5 }} />
                <div style={tag}>PAGE B</div>
              </div>
              <div style={{ position: 'absolute', left: 18, top: 58, width: 144, height: 18, boxShadow: 'inset 0 0 0 1px var(--hp-rule)', overflow: 'hidden' }}>
                <div className={PLAY} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 0, background: 'var(--hp-agent)', opacity: .14, animation: `hsFill .5s cubic-bezier(.3,.9,.3,1) ${d('6.75s')} both` }} />
                <div className={PLAY} style={{ position: 'absolute', left: 8, top: 7, height: 4, width: 0, maxWidth: 88, background: 'var(--hp-agent)', animation: `hsFill .5s cubic-bezier(.3,.9,.3,1) ${d('6.75s')} both` }} />
              </div>
              <div style={{ position: 'absolute', left: 18, top: 82, width: 144, height: 18, boxShadow: 'inset 0 0 0 1px var(--hp-rule)', overflow: 'hidden' }}>
                <div className={PLAY} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 0, background: 'var(--hp-agent)', opacity: .14, animation: `hsFill .5s cubic-bezier(.3,.9,.3,1) ${d('6.98s')} both` }} />
                <div className={PLAY} style={{ position: 'absolute', left: 8, top: 7, height: 4, width: 0, maxWidth: 58, background: 'var(--hp-agent)', animation: `hsFill .5s cubic-bezier(.3,.9,.3,1) ${d('6.98s')} both` }} />
              </div>
              <div className={PLAY} style={{ position: 'absolute', left: 10, top: 48, width: 160, height: 58, boxShadow: 'inset 0 0 0 1.5px var(--hp-agent)', animation: `hsLit .5s ease ${d('7.25s')} both` }} />
              <div style={{ position: 'absolute', left: 10, top: 36, width: 36, height: 3, background: 'var(--hp-rule)' }} />
            </div>

            {/* PAGE C — the agent acts, the gate catches the submit */}
            <div className={PLAY} style={{ ...page, left: 436, top: 370, animation: `hsPage .8s cubic-bezier(.2,.8,.3,1) ${d('1.35s')} both` }}>
              <div style={chrome}>
                <div style={{ width: 54, height: 4, background: 'var(--hp-ink2)', opacity: .5 }} />
                <div style={tag}>PAGE C</div>
              </div>
              <div style={{ position: 'absolute', left: 12, top: 44, width: 56, height: 18, boxShadow: 'inset 0 0 0 1px var(--hp-rule)' }} />
              <div className={PLAY} style={{ position: 'absolute', left: 12, top: 44, width: 56, height: 18, background: 'var(--hp-agent)', animation: `hsTint .45s ease ${d('9.15s')} both` }} />
              <div className={PLAY} style={{ position: 'absolute', left: 12, top: 44, width: 56, height: 18, boxShadow: 'inset 0 0 0 1.5px var(--hp-agent)', animation: `hsLit .45s ease ${d('9.15s')} both` }} />
              <div style={{ position: 'absolute', left: 78, top: 44, width: 62, height: 18, boxShadow: 'inset 0 0 0 1px var(--hp-rule)' }} />
              <div className={PLAY} style={{ position: 'absolute', left: 78, top: 44, width: 62, height: 18, background: 'var(--hp-agent)', animation: `hsTint .45s ease ${d('10.1s')} both` }} />
              <div className={PLAY} style={{ position: 'absolute', left: 78, top: 44, width: 62, height: 18, boxShadow: 'inset 0 0 0 1.5px var(--hp-agent)', animation: `hsLit .45s ease ${d('10.1s')} both` }} />
              {/* the consequential control — ends up carrying BOTH marks */}
              <div style={{ position: 'absolute', left: 12, top: 80, width: 112, height: 26, background: 'var(--hp-ink2)', opacity: .2 }} />
              <div style={{ position: 'absolute', left: 12, top: 80, width: 112, height: 26, boxShadow: 'inset 0 0 0 1px var(--hp-ink2)', display: 'flex', alignItems: 'center', paddingLeft: 11 }}>
                <div style={{ width: 48, height: 4, background: 'var(--hp-ink)', opacity: .7 }} />
              </div>
              <div className={PLAY} style={{ position: 'absolute', left: 12, top: 80, width: 112, height: 26, background: 'var(--hp-human)', animation: `hsTint .5s ease ${d('12.95s')} both` }} />
              <div className={PLAY} style={{ position: 'absolute', left: 12, top: 80, width: 112, height: 26, boxShadow: 'inset 0 0 0 1.5px var(--hp-human), 0 0 20px -4px var(--hp-human)', animation: `hsLit .5s ease ${d('12.95s')} both` }} />
              <div className={PLAY} style={{ position: 'absolute', left: 15, top: 83, width: 106, height: 20, boxShadow: 'inset 0 0 0 1px var(--hp-agent)', opacity: .6, animation: `hsLit .5s ease ${d('13.02s')} both` }} />
            </div>

            {/* the roads — warm while the human drives, cool after the pass */}
            <div className={PLAY} style={{ ...road(168, 114, 123, 'var(--hp-human)', false), animation: `hsK1 .45s ease ${d('3.15s')} both` }} />
            <div className={PLAY} style={{ ...road(276, 173, 73, 'var(--hp-human)', true), animation: `hsK2 .5s ease ${d('3.6s')} both` }} />
            <div className={PLAY} style={{ ...road(286, 245, 89, 'var(--hp-agent)', false), animation: `hsK3 .5s ease ${d('6.15s')} both` }} />
            <div className={PLAY} style={{ ...road(362, 292, 86, 'var(--hp-agent)', false), animation: `hsK4 .45s ease ${d('7.45s')} both` }} />
            <div className={PLAY} style={{ ...road(440, 327, 71, 'var(--hp-agent)', true), animation: `hsK5 .5s ease ${d('7.9s')} both` }} />
            <div className={PLAY} style={{ ...road(448, 397, 38, 'var(--hp-agent)', false), animation: `hsK6 .35s ease ${d('8.7s')} both` }} />
            <div className={PLAY} style={{ ...road(476, 422, 69, 'var(--hp-agent)', false), animation: `hsK7 .4s ease ${d('9.6s')} both` }} />
            <div className={PLAY} style={{ ...road(545, 422, 58, 'var(--hp-agent)', false), animation: `hsK8 .4s ease ${d('12.7s')} both` }} />

            <div className={PLAY} style={{ ...anchor(238, 182, 96), animation: `hsFade .5s ease ${d('3.9s')} both` }}>
              <div style={flat}>A → B</div>
            </div>
            <div className={PLAY} style={{ ...anchor(404, 338, 96), animation: `hsFade .5s ease ${d('8.2s')} both` }}>
              <div style={flat}>B → C</div>
            </div>

            {/* marks left on the controls each traveller actually touched */}
            <div style={anchor(200, 115)}>
              <div className={PLAY} style={{ ...humanMark, left: -6, top: -6, animation: `hsPop .45s cubic-bezier(.2,1.5,.4,1) ${d('2.72s')} both` }} />
            </div>
            <div style={anchor(428, 300)}>
              <div className={PLAY} style={{ ...agentMark, left: -5, top: -5, animation: `hsPop .45s cubic-bezier(.2,1.5,.4,1) ${d('7.4s')} both` }} />
            </div>
            <div style={anchor(492, 423)}>
              <div className={PLAY} style={{ ...agentMark, left: -5, top: -5, animation: `hsPop .4s cubic-bezier(.2,1.5,.4,1) ${d('9.28s')} both` }} />
            </div>
            <div style={anchor(562, 423)}>
              <div className={PLAY} style={{ ...agentMark, left: -5, top: -5, animation: `hsPop .4s cubic-bezier(.2,1.5,.4,1) ${d('10.22s')} both` }} />
            </div>
            {/* the final control carries BOTH marks, side by side */}
            <div style={anchor(528, 463)}>
              <div className={PLAY} style={{ ...humanMark, left: -13, top: -6, animation: `hsPop .45s cubic-bezier(.2,1.5,.4,1) ${d('13.1s')} both` }} />
              <div className={PLAY} style={{ ...agentMark, left: 2, top: -5, animation: `hsPop .45s cubic-bezier(.2,1.5,.4,1) ${d('13.18s')} both` }} />
            </div>

            {/* THE BATON PASS — one seam, one shared point, two colours */}
            <div style={anchor(286, 246, 98)}>
              <div className={PLAY} style={{ position: 'absolute', left: -56, top: -56, width: 112, height: 112, borderRadius: '50%', background: 'radial-gradient(circle, var(--hp-human) 0%, transparent 62%)', animation: `hsSeam 2.3s ease-out ${d('4.4s')} both` }} />
              <div className={PLAY} style={{ position: 'absolute', left: -7, top: -7, width: 14, height: 14, borderRadius: '50%', background: 'linear-gradient(132deg, var(--hp-human) 0 50%, var(--hp-agent) 50% 100%)', boxShadow: '0 0 14px 1px var(--hp-agent)', animation: `hsPop .5s cubic-bezier(.2,1.5,.4,1) ${d('4.6s')} both` }} />
              <div className={PLAY} style={{ position: 'absolute', left: -25, top: -25, width: 50, height: 50, borderRadius: '50%', boxShadow: '0 0 0 1px var(--hp-agent)', animation: `hsRing 1.9s linear ${d('4.7s')} both` }} />
            </div>

            {/* THE GATE — it stops, the human returns and approves */}
            <div style={anchor(525, 443)}>
              <div
                className={PLAY}
                style={{
                  position: 'absolute',
                  transformStyle: 'preserve-3d',
                  animation: `hsPop .5s cubic-bezier(.2,1.4,.4,1) ${d('10.4s')} both, hsDim .7s linear ${d('13.2s')} both`,
                }}
              >
                <div style={{ position: 'absolute', transform: 'rotateZ(42deg) rotateX(-58deg)', transformOrigin: 'center bottom' }}>
                  <div style={{ position: 'absolute', left: -19, bottom: 0, width: 4, height: 36, background: 'var(--hp-human)' }} />
                  <div style={{ position: 'absolute', left: 16, bottom: 0, width: 4, height: 36, background: 'var(--hp-human)' }} />
                  <div className={PLAY} style={{ position: 'absolute', left: -19, bottom: 24, width: 39, height: 6, background: 'var(--hp-human)', boxShadow: '0 0 16px 2px var(--hp-human)', transformOrigin: 'left center', animation: `hsBar 2.6s cubic-bezier(.3,1.2,.4,1) ${d('10.55s')} both` }} />
                  {/* the approval tick */}
                  <div className={PLAY} style={{ position: 'absolute', left: -10, bottom: 48, width: 22, height: 20, animation: `hsPop .5s cubic-bezier(.2,1.5,.4,1) ${d('12.2s')} both` }}>
                    <div style={{ position: 'absolute', left: 0, bottom: 6, width: 9, height: 2.5, background: 'var(--hp-human)', transform: 'rotate(48deg)', transformOrigin: 'left center' }} />
                    <div style={{ position: 'absolute', left: 6, bottom: 9, width: 16, height: 2.5, background: 'var(--hp-human)', transform: 'rotate(-50deg)', transformOrigin: 'left center' }} />
                  </div>
                </div>
                <div className={PLAY} style={{ position: 'absolute', left: -36, top: -36, width: 72, height: 72, borderRadius: '50%', boxShadow: '0 0 0 1px var(--hp-human)', animation: `hsRing 1.7s linear ${d('11.0s')} both` }} />
              </div>
            </div>
          </div>

          {/* the human traveller — dims away after the pass, returns for the gate */}
          <div className={PLAY} style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformStyle: 'preserve-3d', animation: `hsHuman 12.1s cubic-bezier(.42,0,.58,1) ${d('1.5s')} both` }}>
            <div style={{ position: 'absolute', left: -42, top: -42, width: 84, height: 84, borderRadius: '50%', background: 'radial-gradient(circle, var(--hp-human) 0%, transparent 68%)', opacity: .15 }} />
            <div style={{ position: 'absolute', transform: 'rotateZ(42deg) rotateX(-58deg)', transformOrigin: 'center bottom' }}>
              <div style={{ position: 'absolute', left: -1, bottom: 0, width: 2, height: 34, background: 'var(--hp-human)', opacity: .55 }} />
              <div style={{ position: 'absolute', left: -9, bottom: 30, width: 18, height: 18, borderRadius: '50%', background: 'var(--hp-human)', boxShadow: '0 0 20px 5px var(--hp-human)' }} />
            </div>
          </div>

          {/* the agent traveller — picks up exactly where the human stopped */}
          <div className={PLAY} style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformStyle: 'preserve-3d', animation: `hsAgent 8.1s cubic-bezier(.42,0,.58,1) ${d('5.5s')} both` }}>
            <div style={{ position: 'absolute', left: -40, top: -40, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, var(--hp-agent) 0%, transparent 68%)', opacity: .15 }} />
            <div style={{ position: 'absolute', transform: 'rotateZ(42deg) rotateX(-58deg)', transformOrigin: 'center bottom' }}>
              <div style={{ position: 'absolute', left: -1, bottom: 0, width: 2, height: 34, background: 'var(--hp-agent)', opacity: .55 }} />
              <div style={{ position: 'absolute', left: -8, bottom: 28, width: 16, height: 16, background: 'var(--hp-agent)', transform: 'rotate(45deg)', boxShadow: '0 0 18px 4px var(--hp-agent)' }} />
              <div style={{ position: 'absolute', left: -16, bottom: 20, width: 32, height: 32, opacity: .7 }}>
                <div style={{ position: 'absolute', left: 0, top: 0, width: 9, height: 9, borderTop: '1.5px solid var(--hp-agent)', borderLeft: '1.5px solid var(--hp-agent)' }} />
                <div style={{ position: 'absolute', right: 0, top: 0, width: 9, height: 9, borderTop: '1.5px solid var(--hp-agent)', borderRight: '1.5px solid var(--hp-agent)' }} />
                <div style={{ position: 'absolute', left: 0, bottom: 0, width: 9, height: 9, borderBottom: '1.5px solid var(--hp-agent)', borderLeft: '1.5px solid var(--hp-agent)' }} />
                <div style={{ position: 'absolute', right: 0, bottom: 0, width: 9, height: 9, borderBottom: '1.5px solid var(--hp-agent)', borderRight: '1.5px solid var(--hp-agent)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
