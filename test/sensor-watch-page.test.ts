/**
 * @vitest-environment jsdom
 *
 * watchPage — the whole thing, driven by real DOM events against a real session.
 *
 * These tests dispatch events on real elements rather than calling the sensor's
 * internals, because the claim being tested is end-to-end: a human clicks, and a
 * row appears that nobody wired.
 *
 * WHY `trust: () => true` ON THE POSITIVE PATHS: jsdom can never mint a trusted
 * event, so the production predicate would refuse every one of them. The seam is
 * itself under test — "the default predicate refuses an untrusted event" proves
 * the shipped behaviour, and everything else injects past it.
 *
 * MUTATION PROOFS (each run, then reverted):
 * - Register listeners with `{ capture: false }` → "an app handler that navigates
 *   first cannot make the sensor's own report illegal" fails with NOT_ON_NODE.
 * - Drop the removeEventListener loop from stop() → "attach → stop → attach nets
 *   to one listener set" fails with two rows for one click.
 * - Pass `invoke: true` on the fire → "the app's handler is not run again" fails.
 * - Debounce repeated clicks → "two clicks are two rows" fails.
 * - Report off-graph for a click that touched no control → "a click on prose is
 *   not a report" fails and every page click becomes noise.
 */
import { describe, expect, it, vi } from 'vitest';
import { watchPage } from '../src/sensor/index.js';
import type { SensorReport, SensorSession } from '../src/sensor/index.js';
import type { InteractionSession, TransitionRecord } from '../src/index.js';
import { deskMap, dispatch, mount } from './sensor-fixture.js';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function deskSession(node = 'inbox', state: Record<string, unknown> = {}): InteractionSession {
  return deskMap().createSession({ node, state, onWarn: () => undefined });
}

/** Only the rows a human caused — sync hops and refusals are asserted separately. */
function firedBy(session: InteractionSession, principal: string): TransitionRecord[] {
  return session.transitions().filter((t) => t.cause.kind === 'fired' && t.cause.principal === principal);
}

describe('the whole claim, in one test', () => {
  it('a human clicks a declared button and a row appears that nobody wired', async () => {
    const session = deskSession();
    const root = mount('<button id="compose"><span>Compose</span></button>');
    const handler = vi.fn();
    session.registerToolGroup('inbox', { handlers: { compose: handler } });

    const watcher = watchPage(session, { root, trust: () => true });
    dispatch('#compose', 'click');

    const rows = firedBy(session, 'user');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.cause).toMatchObject({ kind: 'fired', principal: 'user', affordanceId: 'inbox.compose' });
    // Record-only: the browser already ran the app's onClick, so the session's
    // copy of it must NOT run again.
    expect(handler).not.toHaveBeenCalled();
    await tick();
    // Nothing on our side executed and the tool declares no writes, so the honest
    // settlement is 'unobservable' — never a guessed 'performed'.
    expect(session.transitions()[0]?.effectVerified).toBe('unobservable');
    watcher.stop();
  });

  it('the payload the fire carries is nothing at all', () => {
    const session = deskSession();
    const root = mount('<button id="compose">Compose</button>');
    const watcher = watchPage(session, { root, trust: () => true });
    dispatch('#compose', 'click');
    expect(firedBy(session, 'user')[0]?.payload).toBeUndefined();
    watcher.stop();
  });
});

describe('the gestures it recognizes', () => {
  it('Enter on a press-actuated control is a press; an ordinary letter is nothing', () => {
    const session = deskSession();
    const root = mount('<button id="refresh">Refresh</button>');
    const watcher = watchPage(session, { root, trust: () => true });

    dispatch('#refresh', 'keydown', { key: 'a' });
    expect(firedBy(session, 'user')).toHaveLength(0);

    dispatch('#refresh', 'keydown', { key: 'Enter' });
    dispatch('#refresh', 'keydown', { key: ' ' });
    expect(firedBy(session, 'user')).toHaveLength(2);
    watcher.stop();
  });

  it('a change on a value-committing control with no value contract is reported', () => {
    const session = deskSession();
    const root = mount('<input id="unread" type="checkbox" aria-label="Unread only">');
    const watcher = watchPage(session, { root, trust: () => true });
    dispatch('#unread', 'change');
    expect(firedBy(session, 'user').map((t) => t.cause.affordanceId)).toEqual(['inbox.unread-only']);
    watcher.stop();
  });

  it('two clicks are two rows — the sensor does not debounce', () => {
    const session = deskSession();
    const root = mount('<button id="compose">Compose</button>');
    const watcher = watchPage(session, { root, trust: () => true });
    dispatch('#compose', 'click');
    dispatch('#compose', 'click');
    expect(firedBy(session, 'user')).toHaveLength(2);
    watcher.stop();
  });

  it('only the event classes the live watch-list needs are listened for', () => {
    const session = deskSession();
    const root = mount('<div></div>');
    const added = vi.spyOn(root as unknown as HTMLElement, 'addEventListener');
    const watcher = watchPage(session, { root, trust: () => true });
    // The inbox declares a click, a press and a select-on-a-checkbox — and no
    // hover or drag listener, because no live binding could commit one.
    expect(added.mock.calls.map((c) => c[0]).sort()).toEqual(['change', 'click', 'keydown']);
    added.mockRestore();
    watcher.stop();
  });
});

describe('honesty — everything it will not attribute', () => {
  it('a click on an undeclared control is off-graph, and writes no session row', () => {
    const session = deskSession();
    const root = mount('<button id="archive">Archive</button>');
    const reports: SensorReport[] = [];
    const watcher = watchPage(session, { root, trust: () => true, onReport: (r) => reports.push(r) });
    const before = watcher.coverage().reports['off-graph'];

    dispatch('#archive', 'click');

    expect(reports.at(-1)).toEqual({ kind: 'off-graph', role: 'button', name: 'Archive', actuation: 'click' });
    expect(watcher.coverage().reports['off-graph']).toBe(before + 1);
    expect(session.transitions()).toHaveLength(0);
    watcher.stop();
  });

  it('a click on prose is not a report — it was never an interaction', () => {
    const session = deskSession();
    const root = mount('<p id="prose">Just words</p>');
    const reports: SensorReport[] = [];
    const watcher = watchPage(session, { root, trust: () => true, onReport: (r) => reports.push(r) });
    const before = reports.length;
    dispatch('#prose', 'click');
    expect(reports).toHaveLength(before);
    watcher.stop();
  });

  it('two live rows answering to one label are refused, not guessed', () => {
    const session = deskSession('tickets', { ticketIds: ['t-1', 't-2'] });
    const root = mount('<button id="reply">Reply</button>');
    const reports: SensorReport[] = [];
    const watcher = watchPage(session, { root, trust: () => true, onReport: (r) => reports.push(r) });

    dispatch('#reply', 'click');

    expect(reports.at(-1)).toEqual({
      kind: 'ambiguous',
      candidates: ['tickets.row.reply[t-1]', 'tickets.row.reply[t-2]'],
    });
    expect(session.transitions()).toHaveLength(0);
    watcher.stop();
  });

  it('one live row is attributed to that row', () => {
    const session = deskSession('tickets', { ticketIds: ['t-9'] });
    const root = mount('<button id="reply">Reply</button>');
    const watcher = watchPage(session, { root, trust: () => true });
    dispatch('#reply', 'click');
    expect(firedBy(session, 'user')).toHaveLength(1);
    watcher.stop();
  });

  it('the DEFAULT trust predicate refuses an untrusted event — code is not a person', () => {
    const session = deskSession();
    const root = mount('<button id="compose">Compose</button>');
    const reports: SensorReport[] = [];
    // No `trust` override: this is the shipped behaviour, and jsdom events are
    // exactly the synthetic clicks an agent driving the page would produce.
    const watcher = watchPage(session, { root, onReport: (r) => reports.push(r) });

    dispatch('#compose', 'click');

    expect(reports.at(-1)).toEqual({ kind: 'synthetic-event' });
    expect(session.transitions()).toHaveLength(0);
    watcher.stop();
  });

  it('an action that takes a value is announced once, with the sentence saying why', () => {
    const session = deskSession();
    const root = mount('<div></div>');
    const reports: SensorReport[] = [];
    const watcher = watchPage(session, { root, trust: () => true, onReport: (r) => reports.push(r) });

    const opaque = reports.filter((r) => r.kind === 'payload-opaque');
    expect(opaque.map((r) => (r as { edge: string }).edge).sort()).toEqual([
      'inbox.pick-folder',
      'inbox.search-notes',
    ]);
    expect((opaque[0] as { reason: string }).reason).toContain('never reads one off the DOM');

    // Said ONCE: a rebuild must not re-announce a static property of the edge.
    const beforeRebuild = reports.length;
    session.registerToolGroup('inbox', { handlers: { compose: () => undefined } });
    expect(reports.filter((r) => r.kind === 'payload-opaque')).toHaveLength(opaque.length);
    expect(reports.length).toBe(beforeRebuild);
    watcher.stop();
  });

  it('a gesture it cannot recognize is announced as unwatched, separately from a value', () => {
    const session = deskSession();
    const root = mount('<div></div>');
    const reports: SensorReport[] = [];
    const watcher = watchPage(session, { root, trust: () => true, onReport: (r) => reports.push(r) });
    const unwatched = reports.filter((r) => r.kind === 'unwatched').map((r) => (r as { edge: string }).edge);
    expect(unwatched).toContain('inbox.drag-to-folder');
    expect(unwatched).toContain('inbox.open-help');
    expect(unwatched).toContain('inbox.no-gesture');
    watcher.stop();
  });
});

describe('the watch-list follows the app, never a stale copy of it', () => {
  it('a control registered mid-watch is matched by the very next click', () => {
    const session = deskSession();
    const root = mount('<button id="quick">Quick reply</button>');
    const watcher = watchPage(session, { root, trust: () => true });

    dispatch('#quick', 'click');
    expect(firedBy(session, 'user')).toHaveLength(0);

    const handle = session.registerToolGroup('inbox', {
      tools: {
        'quick-reply': {
          does: 'Send a one-line reply',
          input: 'none',
          binding: { kind: 'element', locator: { role: 'button', name: 'Quick reply' }, actuation: 'click' },
        },
      },
    });
    dispatch('#quick', 'click');
    expect(firedBy(session, 'user').map((t) => t.cause.affordanceId)).toEqual(['inbox.quick-reply']);

    handle.unregister();
    const reports: SensorReport[] = [];
    const watcher2 = watchPage(session, { root, trust: () => true, onReport: (r) => reports.push(r) });
    dispatch('#quick', 'click');
    // The control is gone from the graph, so the same click is now real human
    // motion the graph does not declare.
    expect(reports.at(-1)).toMatchObject({ kind: 'off-graph', name: 'Quick reply' });
    watcher.stop();
    watcher2.stop();
  });

  it('a greyed-out button a human really clicked still writes a row', () => {
    const session = deskSession();
    const root = mount('<button id="compose" disabled>Compose</button>');
    const handle = session.registerToolGroup('inbox', { handlers: { compose: () => undefined } });
    handle.setEnabled('compose', false);
    const watcher = watchPage(session, { root, trust: () => true });

    dispatch('#compose', 'click');

    // TOOL_DISABLED only gates EXECUTION fires (session.ts:896-903): the
    // record-only sensor logs whatever actually happened.
    expect(firedBy(session, 'user')).toHaveLength(1);
    watcher.stop();
  });

  it('an edge the app already reports itself is left alone — one act, one row', () => {
    const session = deskSession();
    const root = mount('<button id="compose">Compose</button>');
    const watcher = watchPage(session, {
      root,
      trust: () => true,
      reportedElsewhere: ['inbox.compose'],
    });

    dispatch('#compose', 'click');

    expect(session.transitions()).toHaveLength(0);
    const row = watcher.coverage().bindings.find((b) => b.edge === 'inbox.compose');
    expect(row).toMatchObject({ status: 'unwatched', blocked: 'door' });
    watcher.stop();
  });
});

describe('capture phase — the report lands before the app moves the world', () => {
  it('an app handler that navigates first cannot make the sensor own report illegal', () => {
    const session = deskSession();
    const root = mount('<button id="compose">Compose</button>');
    const watcher = watchPage(session, { root, trust: () => true });
    // The app's own onClick, in the bubble phase, flips the page — exactly what a
    // router-driven button does.
    document.querySelector('#compose')?.addEventListener('click', () => {
      session.sync('profile');
    });

    dispatch('#compose', 'click');

    const rows = firedBy(session, 'user');
    expect(rows).toHaveLength(1);
    // Judged against the page the human was actually on.
    expect(rows[0]?.fromNode).toBe('inbox');
    expect(session.available().node).toBe('profile');
    watcher.stop();
  });
});

describe('teardown — a stopped watcher is inert', () => {
  it('stop() is idempotent, and a click after it writes nothing and says nothing', () => {
    const session = deskSession();
    const root = mount('<button id="compose">Compose</button>');
    const reports: SensorReport[] = [];
    const watcher = watchPage(session, { root, trust: () => true, onReport: (r) => reports.push(r) });

    watcher.stop();
    watcher.stop(); // idempotent — the second finds nothing to release
    const after = reports.length;

    dispatch('#compose', 'click');
    expect(session.transitions()).toHaveLength(0);
    expect(reports).toHaveLength(after);
  });

  it('attach → stop → attach nets to one listener set (the StrictMode shape)', () => {
    const session = deskSession();
    const root = mount('<button id="compose">Compose</button>');

    const first = watchPage(session, { root, trust: () => true });
    first.stop();
    const second = watchPage(session, { root, trust: () => true });

    dispatch('#compose', 'click');
    expect(firedBy(session, 'user')).toHaveLength(1);
    second.stop();
  });

  it('a stopped watcher stops following the session too', () => {
    const session = deskSession();
    const root = mount('<button id="compose">Compose</button>');
    const watcher = watchPage(session, { root, trust: () => true });
    const before = watcher.coverage().bindings.length;
    watcher.stop();
    session.registerToolGroup('inbox', {
      tools: {
        'quick-reply': {
          does: 'Send a one-line reply',
          binding: { kind: 'element', locator: { role: 'button', name: 'Quick reply' }, actuation: 'click' },
        },
      },
    });
    expect(watcher.coverage().bindings).toHaveLength(before);
  });
});

describe('the sensor is a guest — it never breaks the page it listens to', () => {
  it('a throwing onReport neither breaks dispatch nor the session', () => {
    const session = deskSession();
    const root = mount('<button id="compose">Compose</button>');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const appHandlerRan = vi.fn();
    document.querySelector('#compose')?.addEventListener('click', appHandlerRan);

    const watcher = watchPage(session, {
      root,
      trust: () => true,
      onReport: () => {
        throw new Error('a consumer bug');
      },
    });

    expect(() => dispatch('#compose', 'click')).not.toThrow();
    expect(appHandlerRan).toHaveBeenCalledTimes(1);
    expect(firedBy(session, 'user')).toHaveLength(1);
    // Loud once, then quiet: an every-click console flood is its own bug.
    dispatch('#compose', 'click');
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
    watcher.stop();
  });

  it('a throwing session is caught and reported, not propagated into the page', () => {
    const session = deskSession();
    const root = mount('<button id="compose">Compose</button>');
    const reports: SensorReport[] = [];
    // A stand-in rather than a patched session: the duck port is the whole
    // point, so a hand-built one is a first-class caller here.
    const broken: SensorSession = {
      available: () => session.available(),
      on: (event, listener) => session.on(event, listener),
      sync: (node, opts) => session.sync(node, opts),
      fire: () => {
        throw new Error('session exploded');
      },
    };

    const watcher = watchPage(broken, { root, trust: () => true, onReport: (r) => reports.push(r) });
    expect(() => dispatch('#compose', 'click')).not.toThrow();
    expect(reports.at(-1)?.kind).toBe('sensor-error');
    watcher.stop();
  });
});

describe('coverage — what is watched, and what has been said', () => {
  it('lists every live binding and tallies every report, over an injectable clock', () => {
    const session = deskSession();
    const root = mount('<button id="archive">Archive</button>');
    let clock = 100;
    const watcher = watchPage(session, { root, trust: () => true, now: () => clock });

    const served = session.available().edges.length;
    expect(watcher.coverage().bindings).toHaveLength(served);
    expect(watcher.coverage().since).toBe(100);

    clock = 250;
    dispatch('#archive', 'click');
    const coverage = watcher.coverage();
    expect(coverage.at).toBe(250);
    expect(coverage.since).toBe(100); // the window opens once, at attach
    expect(coverage.reports['off-graph']).toBe(1);
    expect(coverage.bindings.find((b) => b.edge === 'inbox.compose')).toEqual({
      edge: 'inbox.compose',
      status: 'watching',
    });
    watcher.stop();
  });
});

describe('url motion rides the session own observed-navigation path', () => {
  it('a popstate syncs the cursor, recorded as an unverified hop', () => {
    const session = deskSession();
    const root = mount('<div></div>');
    // OPT-IN, and this test turns it on precisely to show what it costs when the
    // app's page ids are NOT its paths — see the assertions at the end.
    const watcher = watchPage(session, { root, trust: () => true, watchLocation: true });

    window.history.pushState({}, '', '/profile');
    window.dispatchEvent(new PopStateEvent('popstate'));

    const hop = session.transitions().at(-1);
    expect(hop?.cause).toMatchObject({ kind: 'stimulus', stimulus: 'navigation' });
    // The hop passed no guard, and the record says so rather than inferring an
    // authorized edge nobody fired.
    expect(hop?.unverifiedEdge).toBe(true);
    // AND HERE IS WHY THE OPTION IS OPT-IN, in one assertion: page ids are
    // author-chosen NAMES, so the raw pathname '/profile' is not the page
    // 'profile'. The cursor follows reality off-graph and available() honestly
    // serves nothing there. Turning this on without a route->page mapping
    // switches your own agent surface off, which is exactly why it is not a
    // default (watch-location.ts).
    expect(session.available().node).toBe('/profile');
    expect(session.available().edges).toEqual([]);
    watcher.stop();
  });

  it('is OFF by default — an unasked-for sync could move the cursor to a page nobody wrote', () => {
    const session = deskSession();
    const root = mount('<div></div>');
    const watcher = watchPage(session, { root, trust: () => true });

    window.history.pushState({}, '', '/inbox');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(session.transitions()).toHaveLength(0);
    expect(session.available().node).toBe('inbox');
    watcher.stop();
  });

  it('a stopped watcher stops listening to the view as well', () => {
    const session = deskSession();
    const root = mount('<div></div>');
    const watcher = watchPage(session, { root, trust: () => true, watchLocation: true });
    watcher.stop();

    window.history.pushState({}, '', '/tickets');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(session.transitions()).toHaveLength(0);
  });
});
