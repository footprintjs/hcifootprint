/* The relay hero: one journey, two travellers, one baton pass.
 *
 * ── ONE MAP, ONE CLOCK ──────────────────────────────────────────────────────
 * Two constants describe the whole scene: PLACES (every point the journey
 * stops at) and ROADS (which places are joined, and who drives each one).
 * EVERYTHING else on this canvas is computed from those two:
 *
 *   • the road drawn on the plate            → the segment between two PLACES
 *   • the path each traveller rides          → CSS offset-path over the SAME
 *                                              points, so the car is ON the road
 *   • when a road reveals                    → exactly while its driver crosses
 *                                              it: same start, same duration,
 *                                              same easing, so the leading edge
 *                                              of the trail IS the traveller
 *   • when a mark pops                       → the moment its traveller arrives
 *                                              at that place
 *   • the camera lean-in, the gate bar       → read off the same schedule
 *   • the caption under the stage            → in on a beat, out on the next
 *                                              beat, both read off the schedule
 *
 * There is no second timeline to keep in step by hand, so the trail can no
 * longer drift away from the car. That is the whole point of this rewrite.
 *
 * ── THE STORY ───────────────────────────────────────────────────────────────
 *   the plate and three pages rise
 *   the human presses a control on PAGE A and drives A → B
 *   THE BATON PASS — one shared stop, the dot is literally half human / half
 *     agent, and the camera leans in while both travellers stand still
 *   the agent drives B → C, filling fields on the way
 *   the gate catches the consequential submit — the trail stops AT the barrier
 *   the dimmed human is called back, walks over and approves (the tick)
 *   the agent finishes the last leg; the final control carries BOTH marks
 *
 * Every animation uses fill `both`, so the end state IS the static frame.
 * The parent freezes it by setting --hd to a delay past the end and
 * --hpPlay: paused (see HomeClient). Nothing here needs JS to settle.
 */
const PLAY = 'hs-a'; // carries animation-play-state: var(--hpPlay, running)

const TOTAL = 13.6; // the whole relay, in seconds
const EASE = 'cubic-bezier(.4,.02,.32,1)'; // one pull-away-and-settle for every leg

const r4 = (n) => Number(n.toFixed(4));
const d = (t) => `calc(var(--hd, 0s) + ${r4(t)}s)`;
const pctOf = (t) => `${r4((t / TOTAL) * 100)}%`;
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/* ── PLACES ────────────────────────────────────────────────────────────────
   Plate coordinates — the same space the pages are laid out in. Each one is
   somewhere the journey actually stops, and the ones that are controls carry
   a mark afterwards. */
const PLACES = {
  press: [168, 114], // PAGE A — the control the human presses
  bendA: [276, 173], // the corner out of page A
  baton: [286, 245], // THE BATON PASS — the human stops here, the agent starts here
  form: [362, 292], // PAGE B — the form the agent fills
  bendB: [440, 327], // the corner out of page B
  bendC: [448, 397], // the corner into page C
  fieldA: [476, 422], // PAGE C — first field
  fieldB: [545, 422], // PAGE C — second field
  gate: [524, 441], // THE GATE — the consequential submit stops here
  submit: [503, 462], // PAGE C — the control that carries both marks
  aside: [250, 205], // off-road: where the human stands back and dims
  answer: [566, 462], // off-road: where the human stands to answer the gate
};

/* ── ROADS ─────────────────────────────────────────────────────────────────
   The drawn polyline, in the order it is travelled. One speed for the whole
   map (plus a small fixed cost for pulling away), so a long road takes longer
   than a short one — the way a road does. */
const SPEED = 240; // plate px per second
const PULL_AWAY = 0.18; // seconds spent leaving and arriving at a stop

const ROADS = [
  { from: 'press', to: 'bendA', by: 'human' },
  { from: 'bendA', to: 'baton', by: 'human', dashed: true },
  { from: 'baton', to: 'form', by: 'agent' },
  { from: 'form', to: 'bendB', by: 'agent' },
  { from: 'bendB', to: 'bendC', by: 'agent', dashed: true },
  { from: 'bendC', to: 'fieldA', by: 'agent' },
  { from: 'fieldA', to: 'fieldB', by: 'agent' },
  { from: 'fieldB', to: 'gate', by: 'agent' },
  { from: 'gate', to: 'submit', by: 'agent' },
].map((r) => {
  const a = PLACES[r.from];
  const b = PLACES[r.to];
  const len = dist(a, b);
  return { ...r, a, b, len, dur: PULL_AWAY + len / SPEED, d: `M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}` };
});

/* ── the scheduler ─────────────────────────────────────────────────────────
   Walks one traveller's script and returns everything anyone needs to know
   about it: the motion path, the offset-distance keyframes, the clock time
   each road is crossed, and the clock time each place is reached. Because the
   road times come OUT of the ride rather than being written next to it, a road
   cannot be drawn at a different moment than it is driven. */
function ride({ start, from, beats }) {
  const pts = [PLACES[from]];
  const stops = [{ t: 0, along: 0 }, { t: start, along: 0 }];
  const road = {};
  const arrive = { [from]: start };
  let t = start;
  let along = 0;

  for (const b of beats) {
    if (b.hold !== undefined || b.until !== undefined) {
      t = b.until !== undefined ? b.until : t + b.hold;
      stops.push({ t, along });
      continue;
    }
    const leg = b.road !== undefined ? ROADS[b.road] : null;
    const to = leg ? leg.to : b.walk;
    const dur = leg ? leg.dur : b.dur;
    if (leg) road[b.road] = { t0: t, dur: leg.dur };
    const p = PLACES[to];
    along += dist(pts[pts.length - 1], p);
    pts.push(p);
    t += dur;
    stops.push({ t, along });
    arrive[to] = t;
  }
  if (t < TOTAL - 1e-6) stops.push({ t: TOTAL, along });

  // The easing belongs to the interval that STARTS at a stop: a leg eases, a
  // wait does not. The trail reads the very same easing for the very same leg.
  const body = stops
    .map((s, i) => {
      const next = stops[i + 1];
      const moving = next && next.along > s.along;
      const tf = moving ? `; animation-timing-function: ${EASE}` : '';
      return `  ${pctOf(s.t)} { offset-distance: ${r4((s.along / along) * 100)}%${tf} }`;
    })
    .join('\n');

  return { path: `M ${pts.map((p) => p.join(' ')).join(' L ')}`, body, road, arrive, end: t };
}

/* ── the script ────────────────────────────────────────────────────────────
   Waits are choreography (how long a traveller lingers); every MOVE is timed
   by the map. The human's return is cued by the agent reaching the gate, so
   the agent has to be scheduled first — hence the two passes below. */
const HUMAN_START = 2.2;
const HUMAN_OUT = [
  { hold: 0.9 }, // stands on the control and presses it
  { road: 0 },
  { hold: 0.26 },
  { road: 1 },
  { hold: 0.46 }, // the hand-over: long enough to see the seam, short enough
  { walk: 'aside', dur: 0.5 }, // that the agent is alone on it before it drives
];

const BATON = ride({ start: HUMAN_START, from: 'press', beats: HUMAN_OUT }).arrive.baton;

const AGENT = ride({
  start: BATON + 0.1,
  from: 'baton',
  beats: [
    { hold: 1.27 }, // takes the baton — the camera is leaning in here
    { road: 2 },
    { hold: 1.0 }, // fills the form
    { road: 3 },
    { hold: 0.15 },
    { road: 4 },
    { hold: 0.13 },
    { road: 5 },
    { hold: 0.5 }, // first field
    { road: 6 },
    { hold: 0.45 }, // second field
    { road: 7 },
    { hold: 1.75 }, // STOPPED by the gate, waiting for the human
    { road: 8 },
  ],
});

const GATE_AT = AGENT.arrive.gate;

const HUMAN = ride({
  start: HUMAN_START,
  from: 'press',
  // called back the instant the gate stops the agent, and walks up to it
  beats: [...HUMAN_OUT, { until: GATE_AT }, { walk: 'answer', dur: 1.25 }],
});

/* ── the cue sheet ─────────────────────────────────────────────────────────
   Read off the ride, never typed in twice. */
const CUE = {
  plate: 0,
  pageA: 0.6,
  pageB: 1.0,
  pageC: 1.35,
  press: HUMAN_START + 0.35, // the human presses the control on page A
  baton: BATON,
  agentIn: BATON + 0.1,
  form: AGENT.arrive.form,
  fieldA: AGENT.arrive.fieldA,
  fieldB: AGENT.arrive.fieldB,
  gate: GATE_AT,
  approve: HUMAN.arrive.answer + 0.15, // the tick, once the human has walked back
  submit: AGENT.arrive.submit,
  legAB: HUMAN.road[1].t0, // the "A → B" label rides its own leg
  legBC: AGENT.road[3].t0,
  barDur: AGENT.road[8].t0 - GATE_AT, // the barrier is down for exactly the wait
};

/* ── the words ─────────────────────────────────────────────────────────────
   One line under the stage that says what is happening while it happens.
   Every caption comes IN on a beat the schedule already knows about and goes
   OUT on the next one's — so a caption cannot describe a moment the travellers
   are not in, and there is no second timeline to keep in step by hand. Short
   beats get short lines; where a beat was too brief to read, the beats are
   merged rather than flashed. */
const SAY_FADE = 0.24; // in and out, the same quick dissolve for all of them
const SAY = [
  { at: HUMAN_START, tone: 'human', text: 'A human interacts, then navigates — every step recorded.' },
  { at: BATON, tone: 'ink', text: 'The agent takes over — where the human stopped.' },
  { at: CUE.form, tone: 'agent', text: 'It fills the form.' },
  { at: CUE.legBC, tone: 'agent', text: 'Agent navigates. Same map, same rules.' },
  { at: CUE.fieldA, tone: 'agent', text: 'Agent interacts — recorded, attributed.' },
  { at: CUE.gate, tone: 'gate', text: 'A consequential step — it stops and asks.' },
  // the last one holds: it is the sentence the still frame is left with
  { at: CUE.approve, tone: 'ink', text: 'Approved. One journey, two travellers.' },
];

/* ── generated motion ──────────────────────────────────────────────────────
   The only CSS on this page that has to know the schedule. */
const fade = (marks) => marks.map(([t, o]) => `  ${pctOf(t)} { opacity: ${o} }`).join('\n');

/* one keyframe set per caption, cut at its own beat and at the next caption's:
   the out-time is never written down, it is read off the line that follows. */
const sayCSS = SAY.map((s, i) => {
  const next = SAY[i + 1];
  const marks = [[0, 0], [s.at, 0], [s.at + SAY_FADE, 1]];
  marks.push(...(next ? [[next.at - SAY_FADE, 1], [next.at, 0], [TOTAL, 0]] : [[TOTAL, 1]]));
  return `@keyframes hsSay${i} {\n${fade(marks)}\n}`;
}).join('\n');

const CSS = `
${sayCSS}
@keyframes hsRideH {
${HUMAN.body}
}
@keyframes hsRideA {
${AGENT.body}
}
@keyframes hsLampH {
${fade([
  [0, 0],
  [HUMAN_START, 0],
  [HUMAN_START + 0.32, 1],
  [BATON + 0.42, 1],
  [BATON + 0.92, 0.26], // one driver prominent at a time
  [GATE_AT - 0.32, 0.26],
  [GATE_AT, 1], // called back by the gate
  [TOTAL, 1],
])}
}
@keyframes hsLampA {
${fade([
  [0, 0],
  [CUE.agentIn, 0],
  [CUE.agentIn + 0.4, 1],
  [TOTAL, 1],
])}
}
@keyframes hsCam {
  0%, ${pctOf(BATON - 0.55)} { transform: scale(1) translate(0, 62px) }
  ${pctOf(BATON + 0.2)}, ${pctOf(BATON + 1.2)} { transform: scale(1.22) translate(24px, 86px) }
  ${pctOf(BATON + 2.2)}, 100% { transform: scale(1) translate(0, 62px) }
}
@keyframes hsBar {
  0% { transform: rotate(-84deg) }
  ${r4((0.3 / CUE.barDur) * 100)}% { transform: rotate(0deg) }
  ${r4(((CUE.approve - GATE_AT) / CUE.barDur) * 100)}% { transform: rotate(0deg) }
  100% { transform: rotate(-84deg) }
}
`;

/* ── flat pieces ───────────────────────────────────────────────────────────── */
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
// a traveller stands up off the plate; everything else lies flat on it
const upright = { position: 'absolute', transform: 'rotateZ(42deg) rotateX(-58deg)', transformOrigin: 'center bottom' };

const at = (place, z = 97) => ({
  position: 'absolute',
  left: PLACES[place][0],
  top: PLACES[place][1],
  width: 0,
  height: 0,
  transform: `translateZ(${z}px)`,
  transformStyle: 'preserve-3d',
});

/* A mark is paint on the plate: it pops at the instant its traveller arrives. */
function Mark({ place, who, when, dx = 0, dy = 0, dur = 0.45 }) {
  const human = who === 'human';
  const size = human ? 12 : 10;
  return (
    <div style={at(place)}>
      <div
        className={PLAY}
        style={{
          position: 'absolute',
          left: dx - size / 2,
          top: dy - size / 2,
          width: size,
          height: size,
          borderRadius: human ? '50%' : undefined,
          background: human ? 'var(--hp-human)' : 'var(--hp-agent)',
          boxShadow: `0 0 12px 2px ${human ? 'var(--hp-human)' : 'var(--hp-agent)'}`,
          animation: `${human ? 'hsPop' : 'hsPopRot'} ${dur}s cubic-bezier(.2,1.5,.4,1) ${d(when)} both`,
        }}
      />
    </div>
  );
}

/* A traveller: a lamp that rides the motion path, and a figure standing in it.
   The ride carries position only; the lamp carries brightness only — so the
   thing that must never drift (position) has exactly one source. */
function Traveller({ who, path, lamp, ride: rideName }) {
  const human = who === 'human';
  const colour = human ? 'var(--hp-human)' : 'var(--hp-agent)';
  return (
    <div
      className={PLAY}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        transformStyle: 'preserve-3d',
        transform: 'translateZ(98px)',
        offsetPath: `path("${path}")`,
        offsetRotate: '0deg',
        animation: `${rideName} ${TOTAL}s linear ${d(0)} both`,
      }}
    >
      {/* the pool of light the traveller drags along the road */}
      <div
        className={PLAY}
        style={{
          position: 'absolute',
          left: human ? -42 : -40,
          top: human ? -42 : -40,
          width: human ? 84 : 80,
          height: human ? 84 : 80,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colour} 0%, transparent 68%)`,
          opacity: .15,
          animation: `${lamp} ${TOTAL}s linear ${d(0)} both`,
        }}
      />
      <div className={PLAY} style={{ ...upright, animation: `${lamp} ${TOTAL}s linear ${d(0)} both` }}>
        <div style={{ position: 'absolute', left: -1, bottom: 0, width: 2, height: 34, background: colour, opacity: .55 }} />
        {human ? (
          <div style={{ position: 'absolute', left: -9, bottom: 30, width: 18, height: 18, borderRadius: '50%', background: colour, boxShadow: `0 0 20px 5px ${colour}` }} />
        ) : (
          <>
            <div style={{ position: 'absolute', left: -8, bottom: 28, width: 16, height: 16, background: colour, transform: 'rotate(45deg)', boxShadow: `0 0 18px 4px ${colour}` }} />
            <div style={{ position: 'absolute', left: -16, bottom: 20, width: 32, height: 32, opacity: .7 }}>
              <div style={{ position: 'absolute', left: 0, top: 0, width: 9, height: 9, borderTop: `1.5px solid ${colour}`, borderLeft: `1.5px solid ${colour}` }} />
              <div style={{ position: 'absolute', right: 0, top: 0, width: 9, height: 9, borderTop: `1.5px solid ${colour}`, borderRight: `1.5px solid ${colour}` }} />
              <div style={{ position: 'absolute', left: 0, bottom: 0, width: 9, height: 9, borderBottom: `1.5px solid ${colour}`, borderLeft: `1.5px solid ${colour}` }} />
              <div style={{ position: 'absolute', right: 0, bottom: 0, width: 9, height: 9, borderBottom: `1.5px solid ${colour}`, borderRight: `1.5px solid ${colour}` }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* THE NARRATION LINE. It sits below the stage rather than on it — the plate is
   rotated, scaled and shrunk on small screens, and words have to stay flat and
   legible — but it runs on the hero's clock: the same --hd and --hpPlay the
   stage is handed, so it freezes and settles exactly as the stage does, and its
   beats are cut from the schedule above. Decorative: the story is also on the
   page as ordinary prose, so nothing here needs announcing. */
export function HeroCaption() {
  return (
    <p className="hp-hero-caption" aria-live="off">
      {SAY.map((s, i) => (
        <span
          key={s.text}
          className={PLAY}
          data-tone={s.tone}
          style={{ animation: `hsSay${i} ${TOTAL}s linear ${d(0)} both` }}
        >
          {s.text}
        </span>
      ))}
    </p>
  );
}

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
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div
        className={PLAY}
        style={{
          position: 'absolute',
          inset: 0,
          perspective: '1600px',
          perspectiveOrigin: '50% 42%',
          animation: `hsCam ${TOTAL}s cubic-bezier(.45,0,.35,1) ${d(0)} both`,
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
          {/* THE PLATE SPACE. Roads, marks and travellers all live in here, in
              one coordinate system, so nothing can slide relative to anything
              else — including under the responsive --hscale. */}
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
                animation: `hsPlateIn .9s cubic-bezier(.2,.8,.3,1) ${d(CUE.plate)} both`,
              }}
            />

            <div className={PLAY} style={{ ...riser, left: 112, top: 66, animation: `hsRiser .7s ease ${d(CUE.pageA)} both` }} />
            <div className={PLAY} style={{ ...riser, left: 276, top: 220, animation: `hsRiser .7s ease ${d(CUE.pageB)} both` }} />
            <div className={PLAY} style={{ ...riser, left: 440, top: 374, animation: `hsRiser .7s ease ${d(CUE.pageC)} both` }} />

            {/* PAGE A — the human's screen */}
            <div className={PLAY} style={{ ...page, left: 108, top: 62, animation: `hsPage .8s cubic-bezier(.2,.8,.3,1) ${d(CUE.pageA)} both` }}>
              <div style={{ ...chrome, gap: 6 }}>
                <div style={{ width: 16, height: 4, background: 'var(--hp-ink2)', opacity: .5 }} />
                <div style={{ width: 30, height: 4, background: 'var(--hp-rule)' }} />
                <div style={tag}>PAGE A</div>
              </div>
              <div style={{ position: 'absolute', left: 16, top: 40, width: 88, height: 26, boxShadow: 'inset 0 0 0 1px var(--hp-rule)', display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
                <div style={{ width: 42, height: 4, background: 'var(--hp-ink2)', opacity: .6 }} />
              </div>
              {/* the human presses it */}
              <div className={PLAY} style={{ position: 'absolute', left: 16, top: 40, width: 88, height: 26, background: 'var(--hp-human)', animation: `hsTint .5s ease ${d(CUE.press)} both` }} />
              <div className={PLAY} style={{ position: 'absolute', left: 16, top: 40, width: 88, height: 26, boxShadow: 'inset 0 0 0 1.5px var(--hp-human), 0 0 16px -3px var(--hp-human)', animation: `hsLit .5s ease ${d(CUE.press)} both` }} />
              <div style={{ position: 'absolute', left: 16, top: 80, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ width: 132, height: 3, background: 'var(--hp-rule)' }} />
                <div style={{ width: 98, height: 3, background: 'var(--hp-rule)' }} />
                <div style={{ width: 116, height: 3, background: 'var(--hp-rule)' }} />
              </div>
            </div>

            {/* PAGE B — the agent fills the form, while it is standing on it */}
            <div className={PLAY} style={{ ...page, left: 272, top: 216, animation: `hsPage .8s cubic-bezier(.2,.8,.3,1) ${d(CUE.pageB)} both` }}>
              <div style={chrome}>
                <div style={{ width: 48, height: 4, background: 'var(--hp-ink2)', opacity: .5 }} />
                <div style={tag}>PAGE B</div>
              </div>
              <div style={{ position: 'absolute', left: 18, top: 58, width: 144, height: 18, boxShadow: 'inset 0 0 0 1px var(--hp-rule)', overflow: 'hidden' }}>
                <div className={PLAY} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 0, background: 'var(--hp-agent)', opacity: .14, animation: `hsFill .5s cubic-bezier(.3,.9,.3,1) ${d(CUE.form + 0.1)} both` }} />
                <div className={PLAY} style={{ position: 'absolute', left: 8, top: 7, height: 4, width: 0, maxWidth: 88, background: 'var(--hp-agent)', animation: `hsFill .5s cubic-bezier(.3,.9,.3,1) ${d(CUE.form + 0.1)} both` }} />
              </div>
              <div style={{ position: 'absolute', left: 18, top: 82, width: 144, height: 18, boxShadow: 'inset 0 0 0 1px var(--hp-rule)', overflow: 'hidden' }}>
                <div className={PLAY} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 0, background: 'var(--hp-agent)', opacity: .14, animation: `hsFill .5s cubic-bezier(.3,.9,.3,1) ${d(CUE.form + 0.33)} both` }} />
                <div className={PLAY} style={{ position: 'absolute', left: 8, top: 7, height: 4, width: 0, maxWidth: 58, background: 'var(--hp-agent)', animation: `hsFill .5s cubic-bezier(.3,.9,.3,1) ${d(CUE.form + 0.33)} both` }} />
              </div>
              <div className={PLAY} style={{ position: 'absolute', left: 10, top: 48, width: 160, height: 58, boxShadow: 'inset 0 0 0 1.5px var(--hp-agent)', animation: `hsLit .5s ease ${d(CUE.form + 0.55)} both` }} />
              <div style={{ position: 'absolute', left: 10, top: 36, width: 36, height: 3, background: 'var(--hp-rule)' }} />
            </div>

            {/* PAGE C — the agent acts, the gate catches the submit */}
            <div className={PLAY} style={{ ...page, left: 436, top: 370, animation: `hsPage .8s cubic-bezier(.2,.8,.3,1) ${d(CUE.pageC)} both` }}>
              <div style={chrome}>
                <div style={{ width: 54, height: 4, background: 'var(--hp-ink2)', opacity: .5 }} />
                <div style={tag}>PAGE C</div>
              </div>
              <div style={{ position: 'absolute', left: 12, top: 44, width: 56, height: 18, boxShadow: 'inset 0 0 0 1px var(--hp-rule)' }} />
              <div className={PLAY} style={{ position: 'absolute', left: 12, top: 44, width: 56, height: 18, background: 'var(--hp-agent)', animation: `hsTint .45s ease ${d(CUE.fieldA)} both` }} />
              <div className={PLAY} style={{ position: 'absolute', left: 12, top: 44, width: 56, height: 18, boxShadow: 'inset 0 0 0 1.5px var(--hp-agent)', animation: `hsLit .45s ease ${d(CUE.fieldA)} both` }} />
              <div style={{ position: 'absolute', left: 78, top: 44, width: 62, height: 18, boxShadow: 'inset 0 0 0 1px var(--hp-rule)' }} />
              <div className={PLAY} style={{ position: 'absolute', left: 78, top: 44, width: 62, height: 18, background: 'var(--hp-agent)', animation: `hsTint .45s ease ${d(CUE.fieldB)} both` }} />
              <div className={PLAY} style={{ position: 'absolute', left: 78, top: 44, width: 62, height: 18, boxShadow: 'inset 0 0 0 1.5px var(--hp-agent)', animation: `hsLit .45s ease ${d(CUE.fieldB)} both` }} />
              {/* the consequential control — ends up carrying BOTH marks */}
              <div style={{ position: 'absolute', left: 12, top: 80, width: 112, height: 26, background: 'var(--hp-ink2)', opacity: .2 }} />
              <div style={{ position: 'absolute', left: 12, top: 80, width: 112, height: 26, boxShadow: 'inset 0 0 0 1px var(--hp-ink2)', display: 'flex', alignItems: 'center', paddingLeft: 11 }}>
                <div style={{ width: 48, height: 4, background: 'var(--hp-ink)', opacity: .7 }} />
              </div>
              <div className={PLAY} style={{ position: 'absolute', left: 12, top: 80, width: 112, height: 26, background: 'var(--hp-human)', animation: `hsTint .5s ease ${d(CUE.submit)} both` }} />
              <div className={PLAY} style={{ position: 'absolute', left: 12, top: 80, width: 112, height: 26, boxShadow: 'inset 0 0 0 1.5px var(--hp-human), 0 0 20px -4px var(--hp-human)', animation: `hsLit .5s ease ${d(CUE.submit)} both` }} />
              <div className={PLAY} style={{ position: 'absolute', left: 15, top: 83, width: 106, height: 20, boxShadow: 'inset 0 0 0 1px var(--hp-agent)', opacity: .6, animation: `hsLit .5s ease ${d(CUE.submit + 0.07)} both` }} />
            </div>

            {/* ── THE TRAIL ────────────────────────────────────────────────
                One SVG over the plate, one path per road, each revealed with
                the leg's own start, duration and easing — the same three the
                traveller rides it with. Warm while the human drives, cool
                after the pass. */}
            <svg
              viewBox="0 0 820 560"
              width="820"
              height="560"
              aria-hidden="true"
              style={{ position: 'absolute', left: 0, top: 0, width: 820, height: 560, overflow: 'visible', transform: 'translateZ(96px)', pointerEvents: 'none' }}
            >
              <defs>
                {ROADS.map((rd, i) =>
                  rd.dashed ? (
                    <mask
                      key={i}
                      id={`hs-dash-${i}`}
                      maskUnits="userSpaceOnUse"
                      x={Math.min(rd.a[0], rd.b[0]) - 12}
                      y={Math.min(rd.a[1], rd.b[1]) - 12}
                      width={Math.abs(rd.b[0] - rd.a[0]) + 24}
                      height={Math.abs(rd.b[1] - rd.a[1]) + 24}
                    >
                      {/* the dashes are cut by a STATIC mask, so the reveal
                          below is free to own stroke-dashoffset outright */}
                      <path d={rd.d} fill="none" stroke="#fff" strokeWidth="8" strokeDasharray="7 6" />
                    </mask>
                  ) : null,
                )}
              </defs>
              {ROADS.map((rd, i) => {
                const clock = (rd.by === 'human' ? HUMAN : AGENT).road[i];
                const colour = rd.by === 'human' ? 'var(--hp-human)' : 'var(--hp-agent)';
                const reveal = {
                  strokeDasharray: 1,
                  strokeDashoffset: 1,
                  animation: `hsDraw ${r4(clock.dur)}s ${EASE} ${d(clock.t0)} both`,
                };
                return (
                  <g key={i} mask={rd.dashed ? `url(#hs-dash-${i})` : undefined}>
                    {!rd.dashed && (
                      <path className={PLAY} d={rd.d} pathLength="1" fill="none" stroke={colour} strokeWidth="7" opacity=".18" style={reveal} />
                    )}
                    <path className={PLAY} d={rd.d} pathLength="1" fill="none" stroke={colour} strokeWidth="2" style={reveal} />
                  </g>
                );
              })}
            </svg>

            <div className={PLAY} style={{ position: 'absolute', left: 238, top: 182, width: 0, height: 0, transform: 'translateZ(96px)', transformStyle: 'preserve-3d', animation: `hsFade .5s ease ${d(CUE.legAB)} both` }}>
              <div style={flat}>A → B</div>
            </div>
            <div className={PLAY} style={{ position: 'absolute', left: 404, top: 338, width: 0, height: 0, transform: 'translateZ(96px)', transformStyle: 'preserve-3d', animation: `hsFade .5s ease ${d(CUE.legBC)} both` }}>
              <div style={flat}>B → C</div>
            </div>

            {/* marks left on the controls each traveller actually touched —
                every one of them IS a stop on the polyline, and pops the
                moment its traveller gets there */}
            <Mark place="press" who="human" when={CUE.press} />
            <Mark place="form" who="agent" when={CUE.form} />
            <Mark place="fieldA" who="agent" when={CUE.fieldA} dur={0.4} />
            <Mark place="fieldB" who="agent" when={CUE.fieldB} dur={0.4} />
            {/* the final control carries BOTH marks, side by side */}
            <Mark place="submit" who="human" when={CUE.submit + 0.05} dx={-7} />
            <Mark place="submit" who="agent" when={CUE.submit + 0.13} dx={8} />

            {/* THE BATON PASS — one seam, one shared point, two colours.
                Above the travellers (z 100): the one frame that has to survive
                being seen on its own is the one where both of them stand on it. */}
            <div style={at('baton', 100)}>
              <div className={PLAY} style={{ position: 'absolute', left: -56, top: -56, width: 112, height: 112, borderRadius: '50%', background: 'radial-gradient(circle, var(--hp-human) 0%, transparent 62%)', animation: `hsSeam 2.3s ease-out ${d(BATON - 0.15)} both` }} />
              <div className={PLAY} style={{ position: 'absolute', left: -7, top: -7, width: 14, height: 14, borderRadius: '50%', background: 'linear-gradient(132deg, var(--hp-human) 0 50%, var(--hp-agent) 50% 100%)', boxShadow: '0 0 14px 1px var(--hp-agent)', animation: `hsPop .5s cubic-bezier(.2,1.5,.4,1) ${d(BATON)} both` }} />
              <div className={PLAY} style={{ position: 'absolute', left: -25, top: -25, width: 50, height: 50, borderRadius: '50%', boxShadow: '0 0 0 1px var(--hp-agent)', animation: `hsRing 1.9s linear ${d(BATON + 0.17)} both` }} />
            </div>

            {/* THE GATE — it stops the submit, the human returns and approves.
                The arrival and the fade-back sit on TWO elements on purpose: two
                opacity animations on ONE element compose, and the later one's
                backward fill would light the gate up from the very first frame. */}
            <div style={at('gate', 99)}>
              <div
                className={PLAY}
                style={{
                  position: 'absolute',
                  transformStyle: 'preserve-3d',
                  animation: `hsPop .5s cubic-bezier(.2,1.4,.4,1) ${d(CUE.gate)} both`,
                }}
              >
                <div
                  className={PLAY}
                  style={{
                    position: 'absolute',
                    transformStyle: 'preserve-3d',
                    animation: `hsDim .7s linear ${d(CUE.submit + 0.1)} both`,
                  }}
                >
                  <div style={{ position: 'absolute', transform: 'rotateZ(42deg) rotateX(-58deg)', transformOrigin: 'center bottom' }}>
                    <div style={{ position: 'absolute', left: -19, bottom: 0, width: 4, height: 36, background: 'var(--hp-human)' }} />
                    <div style={{ position: 'absolute', left: 16, bottom: 0, width: 4, height: 36, background: 'var(--hp-human)' }} />
                    <div className={PLAY} style={{ position: 'absolute', left: -19, bottom: 24, width: 39, height: 6, background: 'var(--hp-human)', boxShadow: '0 0 16px 2px var(--hp-human)', transformOrigin: 'left center', animation: `hsBar ${r4(CUE.barDur)}s cubic-bezier(.3,1.2,.4,1) ${d(CUE.gate)} both` }} />
                    {/* the approval tick */}
                    <div className={PLAY} style={{ position: 'absolute', left: -10, bottom: 48, width: 22, height: 20, animation: `hsPop .5s cubic-bezier(.2,1.5,.4,1) ${d(CUE.approve)} both` }}>
                      <div style={{ position: 'absolute', left: 0, bottom: 6, width: 9, height: 2.5, background: 'var(--hp-human)', transform: 'rotate(48deg)', transformOrigin: 'left center' }} />
                      <div style={{ position: 'absolute', left: 6, bottom: 9, width: 16, height: 2.5, background: 'var(--hp-human)', transform: 'rotate(-50deg)', transformOrigin: 'left center' }} />
                    </div>
                  </div>
                  <div className={PLAY} style={{ position: 'absolute', left: -36, top: -36, width: 72, height: 72, borderRadius: '50%', boxShadow: '0 0 0 1px var(--hp-human)', animation: `hsRing 1.7s linear ${d(CUE.gate + 0.2)} both` }} />
                </div>
              </div>
            </div>

            {/* the travellers — riding the very polyline the roads are drawn from */}
            <Traveller who="human" path={HUMAN.path} ride="hsRideH" lamp="hsLampH" />
            <Traveller who="agent" path={AGENT.path} ride="hsRideA" lamp="hsLampA" />
          </div>
        </div>
      </div>
    </div>
  );
}
