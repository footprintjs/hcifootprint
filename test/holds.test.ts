/**
 * `holds` — WHAT A CONTROL IS HOLDING RIGHT NOW, served on the action row.
 *
 * The gap it closes: a model could see that an action takes a value and could
 * see the app's committed state, and could not see the one thing a person
 * looking at the screen sees for free — the draft already sitting in the box. So
 * it asked the human to retype it, or it made one up.
 *
 * THE FEATURE IS A LEAK WITHOUT ITS SECOND HALF, which is why both halves are in
 * this one file. What a control holds IS the value the next fire will carry, one
 * turn early — so `redactedFields.payload` governs it too (REDACTION POINT 4),
 * or a `payload`-hidden field simply rides out a turn sooner, in the clear, on
 * the row a model reads before it fires anything.
 *
 * THE DISHONEST IMPLEMENTATIONS THIS SUITE EXISTS TO CATCH, each with its own
 * test: a cached previous read served as current; a fallback to the app's state
 * (or, in a DOM host, to the node) when nothing was declared; a throwing getter
 * rendered as `holds: null`, because null is a value and the honest answer is
 * absence; a redacted key riding `whats_here` in the clear; and a guessed
 * instance on a row that stands for many.
 *
 * MUTATION PROOFS (each one run, and the counts are what it actually did):
 * - Drop the `redactFields()` call in `#holdsFor` → 3 red, all three under
 *   REDACTION POINT 4: the leak test, the record symmetry, the nested paths.
 * - Serve `edge.holds` from a cache instead of reading late → 3 red: the
 *   read-late test, the declaration stack, and the sensor's own late read.
 * - Let every absence arm answer a value instead (throw → `null`, `undefined`
 *   and a dropped function → `holds: undefined`) → 3 red, each asserting on the
 *   KEY rather than the value, because `toEqual` cannot tell them apart.
 * - Make `servesHolds` always true → 1 red: the repeats row.
 * - Read the registration reader before the declaration → 1 red: precedence.
 * - Drop the `unregisterGroup` release → 1 red: the unmounted component.
 * - Drop the `noInput` arm → 1 red: the action the author declared 'none'.
 * - Stop the sensor forwarding the getter → 3 red, all under the sensor block.
 * - Forward a per-INSTANCE declaration too → 1 red: the door files one reader
 *   per action.
 * - Leave `holdsReleases` undrained in `stop()` → 1 red: the watcher's teardown.
 * - Drop the spread in `edgeData` → 3 red: everything that reads the wire.
 * - Bound the value OUTSIDE the reader's try/catch → 1 red: the poisoned getter,
 *   with `available()` itself throwing.
 * - Serve the bounded copy of a Map/Date anyway → 1 red: `holds: {}` on a box
 *   that is full.
 * - Warn per served row instead of once per action → 1 red: the flood.
 */
import { describe, expect, it } from 'vitest';
import { REDACTED, buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { AvailableEdge, NavigationGraph } from '../src/index.js';
import { watchPage } from '../src/sensor/index.js';
import type { RecordOnlyFire, SensorSession } from '../src/sensor/index.js';
import { desk, el, humanCommit, mountDesk } from './sensor-fixture.js';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** An obvious fake — this suite never carries a real credential. */
const SECRET = 'hunter2-not-a-real-password';

function deskMap(): NavigationGraph {
  return buildNavigationGraph('desk', {
    pages: {
      compose: {
        route: '/compose',
        actions: {
          save: {
            does: 'Save the draft',
            input: { type: 'object', properties: { body: { type: 'string' } }, required: ['body'] },
            writes: ['draft'],
          },
          'sign-in': {
            does: 'Sign in',
            confirm: true,
            input: { type: 'object', properties: { password: { type: 'string' } }, required: ['password'] },
            writes: ['account'],
          },
          send: { does: 'Send it', input: 'none', writes: ['sent'] },
        },
        areas: {
          row: {
            repeats: true,
            instances: (state) => (state['rowIds'] as string[]) ?? [],
            actions: {
              rename: {
                does: 'Rename this row',
                input: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
                writes: ['names'],
              },
            },
          },
        },
      },
    },
  });
}

type LiveSession = ReturnType<NavigationGraph['createSession']>;

interface Desk {
  session: LiveSession;
  /** Every dev warning this session emitted, in order. */
  warnings: string[];
}

function desk_(opts?: {
  state?: Record<string, unknown>;
  redactedFields?: { payload?: string[]; produced?: string[] };
  enforce?: boolean;
}): Desk {
  const warnings: string[] = [];
  const session = deskMap().createSession({
    node: 'compose',
    state: opts?.state ?? {},
    onWarn: (message) => warnings.push(message),
    ...(opts?.redactedFields ? { redactedFields: opts.redactedFields } : {}),
    ...(opts?.enforce ? { requireHumanApproval: true as const } : {}),
  });
  return { session, warnings };
}

/** The served row for one action, or undefined — every assertion below reads one. */
function row(session: LiveSession, affordanceId: string): AvailableEdge | undefined {
  return session.available().edges.find((edge) => edge.affordanceId === affordanceId);
}

/**
 * The record for ONE fire, by id. Never `transitions().at(-1)`: a fire that
 * changes the served structure is followed by a structure-swap stimulus row, so
 * the last row is routinely not the one the test just made.
 */
function recordFor(session: LiveSession, transitionId: string): { payload?: unknown } {
  return session.transitions().find((record) => record.id === transitionId)!;
}

// ---------------------------------------------------------------------------
// The value door — the app hands over a way to READ, never a copy
// ---------------------------------------------------------------------------

describe('the value door', () => {
  it('a registration-time reader puts the draft on the row', () => {
    const { session } = desk_();
    let body = 'ship it';
    session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { save: () => ({ body }) },
    });
    expect(row(session, 'compose.save')!.holds).toEqual({ body: 'ship it' });
    expect(body).toBe('ship it'); // reading changed nothing
  });

  it('READ LATE: the row carries what the box holds NOW, never a cached first read', () => {
    // The dishonest implementation this forbids: read the getter once (at
    // registration, or on the first available()) and serve that copy forever. It
    // looks identical on turn one and lies on every turn after.
    const { session } = desk_();
    let body = 'first';
    session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { save: () => ({ body }) },
    });
    expect(row(session, 'compose.save')!.holds).toEqual({ body: 'first' });
    body = 'second';
    expect(row(session, 'compose.save')!.holds).toEqual({ body: 'second' });
  });

  it('a qualified id and a leaf name are the SAME declaration — one canonical key', () => {
    const { session } = desk_();
    session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { 'compose.save': () => ({ body: 'qualified' }) },
    });
    expect(row(session, 'compose.save')!.holds).toEqual({ body: 'qualified' });
  });

  it('a reader for an action that is not here is refused BY NAME, not filed quietly', () => {
    const { session } = desk_();
    expect(() =>
      session.registerActions('compose', { holds: { 'not-an-action': () => 'x' } }),
    ).toThrow(/unknown action 'not-an-action'/);
  });

  it('the value is BOUNDED exactly like a handler’s return', () => {
    const { session } = desk_();
    session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { save: () => ({ body: 'x'.repeat(300) }) },
    });
    const held = row(session, 'compose.save')!.holds as { body: string };
    expect(held.body).toHaveLength(201); // 200 chars plus the ellipsis
    expect(held.body.endsWith('…')).toBe(true);
  });

  it('null RIDES — "explicitly nothing" is a value the app chose', () => {
    const { session } = desk_();
    session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { save: () => null },
    });
    expect(row(session, 'compose.save')).toHaveProperty('holds', null);
  });
});

// ---------------------------------------------------------------------------
// Absence — and every assertion is on the KEY, because `holds: undefined`
// is the same mistake in a friendlier costume
// ---------------------------------------------------------------------------

describe('absence is a key that is not there', () => {
  it('NO FALLBACK: nothing declared means nothing served, even when the state holds a same-named key', () => {
    // The dishonest implementation this forbids is the DOM-scraper's cousin:
    // with no getter, reach for something that looks like the answer — the
    // committed state here, `element.value` in a browser. A plausible wrong
    // value is indistinguishable, on the row, from a right one.
    const { session } = desk_({ state: { body: 'the state is not the box', draft: 'nor is this' } });
    session.registerActions('compose', { handlers: { save: () => undefined } });
    expect(row(session, 'compose.save')).not.toHaveProperty('holds');
  });

  it('a getter answering undefined serves NO KEY, never holds: undefined', () => {
    const { session } = desk_();
    session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { save: () => undefined },
    });
    // `toEqual` cannot tell these apart — only the key can.
    expect(row(session, 'compose.save')).not.toHaveProperty('holds');
  });

  it('a THROWING getter is absence plus a warning — never holds: null', () => {
    // null is a value. Stamping it for a failed read would report a box the
    // human never cleared.
    const { session, warnings } = desk_();
    session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: {
        save: () => {
          throw new Error('the component is mid-teardown');
        },
      },
    });
    expect(row(session, 'compose.save')).not.toHaveProperty('holds');
    expect(warnings.some((w) => w.includes('holds reader') && w.includes('threw'))).toBe(true);
  });

  it('a getter answering a FUNCTION is absence — the bound copy drops it, and nothing is invented', () => {
    const { session } = desk_();
    session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { save: () => () => 'not a value' },
    });
    expect(row(session, 'compose.save')).not.toHaveProperty('holds');
  });

  it("an action the author declared 'none' never holds anything, reader or no reader", () => {
    // A real payload on a no-input action is refused PAYLOAD_INVALID at fire
    // time; a control-level getter must not be able to re-open that door one
    // turn earlier.
    const { session } = desk_();
    session.registerActions('compose', {
      handlers: { send: () => undefined },
      holds: { send: () => ({ body: 'ignored' }) },
    });
    expect(row(session, 'compose.send')).not.toHaveProperty('holds');
  });

  it('a value whose OWN getter throws is absence too — the read is not just the call', () => {
    // The reader returns normally and the throw happens one level down, when the
    // value's properties are read (a revoked proxy, a component mid-teardown).
    // Outside the guard this took down `available()` itself — so `whats_here`,
    // every gap row and every REFUSED fire went with it, because a refusal builds
    // the same rows for its gap context.
    const { session, warnings } = desk_();
    session.registerActions('compose', {
      handlers: { save: () => undefined, send: () => undefined },
      holds: {
        save: () =>
          Object.defineProperty({}, 'body', {
            enumerable: true,
            get() {
              throw new Error('poisoned getter');
            },
          }),
      },
    });
    expect(() => session.available()).not.toThrow();
    expect(row(session, 'compose.save')).not.toHaveProperty('holds');
    // …and the rest of the surface is untouched: the OTHER rows still serve.
    expect(row(session, 'compose.send')).toBeDefined();
    // …and a refused fire of a DIFFERENT action still returns its typed refusal.
    const refused = session.fire('compose.save', { source: 'agent', payload: { body: 1 } });
    expect(refused.ok).toBe(false);
    expect(warnings.some((w) => w.includes('holds reader') && w.includes('threw'))).toBe(true);
  });

  it('a Map or a Date is absence, not an EMPTY BOX — `{}` would say the box is empty', () => {
    // These have no own enumerable fields, so bounding one produces `{}`. Serving
    // that says THE BOX IS EMPTY about a box that is full — the plausible wrong
    // value this whole surface refuses. An app's genuinely empty object still
    // serves, because there `{}` is the truth.
    const { session, warnings } = desk_();
    session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { save: () => new Map([['body', 'the real draft']]) },
    });
    expect(row(session, 'compose.save')).not.toHaveProperty('holds');
    expect(warnings.some((w) => w.includes('cannot carry') && w.includes('EMPTY box'))).toBe(true);

    const dated = desk_();
    dated.session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { save: () => new Date('2026-07-27T00:00:00.000Z') },
    });
    expect(row(dated.session, 'compose.save')).not.toHaveProperty('holds');

    const empty = desk_();
    empty.session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { save: () => ({}) },
    });
    expect(row(empty.session, 'compose.save')).toEqual(expect.objectContaining({ holds: {} }));
  });

  it('a broken reader warns ONCE per action, not once per served row', () => {
    // This path runs on every available() — twice per whats_here, and again
    // inside every refused fire's gap context. An every-turn console flood is its
    // own bug (watch-page.ts says so in those words about its own sink).
    const { session, warnings } = desk_();
    session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: {
        save: () => {
          throw new Error('still broken');
        },
      },
    });
    session.available();
    session.available();
    session.available();
    expect(warnings.filter((w) => w.includes('holds reader') && w.includes('threw'))).toHaveLength(1);
  });

  it('a bigint crosses as its digits — JSON.stringify would have thrown away the whole answer', () => {
    // A bigint survives structuredClone (this library's usual wire bar) and then
    // throws in JSON.stringify, which is how every MCP result crosses. One app
    // value of that type cost the model facts, actions AND journeys.
    const { session } = desk_();
    session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { save: () => ({ amountCents: 123n }) },
    });
    expect(row(session, 'compose.save')!.holds).toEqual({ amountCents: '123' });
    const port = serveToAgent(session);
    expect(() => JSON.stringify(port.call('whats_here'))).not.toThrow();
  });

  it('a REPEATS row holds nothing this library can name — silence, and it says why once', () => {
    // One row, many mounted cards, one reader: there is no arithmetic that turns
    // the one into the other, and a guessed instance on a VALUE is a lie about
    // which card the human is looking at.
    const { session, warnings } = desk_({ state: { rowIds: ['r-1', 'r-2'] } });
    session.registerActions('compose.row', {
      instance: 'r-1',
      handlers: { rename: () => undefined },
      holds: { rename: () => ({ name: 'r-1 draft' }) },
    });
    const rename = row(session, 'compose.row.rename')!;
    expect(rename.instances).toEqual(['r-1', 'r-2']); // the row IS being served
    expect(rename).not.toHaveProperty('holds');

    session.available();
    session.available();
    expect(warnings.filter((w) => w.includes('repeats container') && w.includes('holds'))).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Precedence and lifetime
// ---------------------------------------------------------------------------

describe('precedence and lifetime', () => {
  it('the per-element DECLARATION outranks the registration reader', () => {
    const { session } = desk_();
    session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { save: () => ({ body: 'from the registration' }) },
    });
    session.declareHolds('compose.save', () => ({ body: 'from the element on screen' }));
    expect(row(session, 'compose.save')!.holds).toEqual({ body: 'from the element on screen' });
  });

  it('releasing the declaration hands the row back to the registration reader', () => {
    const { session } = desk_();
    session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { save: () => ({ body: 'from the registration' }) },
    });
    const release = session.declareHolds('compose.save', () => ({ body: 'from the element' }));
    release();
    release(); // idempotent
    expect(row(session, 'compose.save')!.holds).toEqual({ body: 'from the registration' });
  });

  it('two declarations stack: the newest serves, and releasing it restores the older', () => {
    // A mobile button and a desktop one, or a StrictMode double-invoke. Silence
    // while a declaration is still live would be a regression dressed as honesty.
    const { session } = desk_();
    const releaseFirst = session.declareHolds('compose.save', () => ({ body: 'first' }));
    const releaseSecond = session.declareHolds('compose.save', () => ({ body: 'second' }));
    expect(row(session, 'compose.save')!.holds).toEqual({ body: 'second' });
    releaseSecond();
    expect(row(session, 'compose.save')!.holds).toEqual({ body: 'first' });
    releaseFirst();
    expect(row(session, 'compose.save')).not.toHaveProperty('holds');
  });

  it('an UNMOUNTED component stops answering: unregister releases its reader with its handlers', () => {
    // The stale-closure bug this whole surface exists to avoid — a reader that
    // outlived its component answering with the last render's state.
    const { session } = desk_();
    const handle = session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { save: () => ({ body: 'still here' }) },
    });
    expect(row(session, 'compose.save')!.holds).toEqual({ body: 'still here' });
    handle.unregister();
    expect(row(session, 'compose.save')).not.toHaveProperty('holds');
  });

  it('two groups claiming one control: last write wins, and the library says so once', () => {
    // The same event the handler registry already warns about, one field over.
    // It matters more here: the handler side stacks back to a survivor, while a
    // silently replaced reader takes the row's value with it when the newer group
    // unmounts — and the older component is still on screen holding the draft.
    const { session, warnings } = desk_();
    // Two mounts, two groups — the library mints the ids, so this is exactly the
    // shape a desktop component and a mobile one produce.
    session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { save: () => ({ body: 'desktop draft' }) },
    });
    const mobile = session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { save: () => ({ body: 'mobile draft' }) },
    });
    expect(warnings.some((w) => w.includes('value reader') && w.includes('replaced'))).toBe(true);
    expect(row(session, 'compose.save')!.holds).toEqual({ body: 'mobile draft' });
    // …and the consequence the warning names is real: the row goes bare, rather
    // than back to the group that is still mounted.
    mobile.unregister();
    expect(row(session, 'compose.save')).not.toHaveProperty('holds');
  });

  it('a reader for an id no action answers to is filed and simply never served', () => {
    // Not a refusal: a control can be handed over before its action mounts, and
    // shouting at a mount race would teach nothing true.
    const { session, warnings } = desk_();
    expect(() => session.declareHolds('compose.not-yet-mounted', () => 'x')).not.toThrow();
    expect(warnings).toHaveLength(0);
    expect(session.available().edges.some((edge) => 'holds' in edge)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The row a model reads
// ---------------------------------------------------------------------------

describe('the row a model reads', () => {
  it('whats_here carries holds on the action row, beside what the action expects', () => {
    const { session } = desk_();
    session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { save: () => ({ body: 'ship it' }) },
    });
    const here = serveToAgent(session).call('desk.whats_here') as {
      actions: Array<Record<string, unknown>>;
    };
    const save = here.actions.find((action) => action['action'] === 'compose.save')!;
    expect(save['holds']).toEqual({ body: 'ship it' });
    expect(save['expects']).toBeDefined();
  });

  it('no reader means no key on the wire either — the model is told nothing, not "empty"', () => {
    const { session } = desk_();
    session.registerActions('compose', { handlers: { save: () => undefined } });
    const here = serveToAgent(session).call('desk.whats_here') as {
      actions: Array<Record<string, unknown>>;
    };
    expect(here.actions.find((action) => action['action'] === 'compose.save')).not.toHaveProperty('holds');
  });

  it('null crosses the wire — the test is against undefined, not truthiness', () => {
    const { session } = desk_();
    session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { save: () => null },
    });
    const here = serveToAgent(session).call('desk.whats_here') as {
      actions: Array<Record<string, unknown>>;
    };
    expect(here.actions.find((action) => action['action'] === 'compose.save')).toHaveProperty('holds', null);
  });

  it('it is a READING, not a binding: the fire still sends the caller’s own input', async () => {
    const { session } = desk_();
    const sent: unknown[] = [];
    session.registerActions('compose', {
      handlers: { save: (input?: unknown) => void sent.push(input) },
      holds: { save: () => ({ body: 'what the box holds' }) },
    });
    const fired = session.fire('compose.save', { source: 'agent', payload: { body: 'what the caller sent' } });
    await tick();
    expect(sent).toEqual([{ body: 'what the caller sent' }]);
    expect(fired.ok).toBe(true);
    expect(recordFor(session, fired.ok ? fired.transition.id : '').payload).toEqual({
      body: 'what the caller sent',
    });
  });
});

// ---------------------------------------------------------------------------
// REDACTION POINT 4 — the leak this feature would otherwise be
// ---------------------------------------------------------------------------

describe('REDACTION POINT 4 — a hidden field cannot ride the row instead', () => {
  it('THE LEAK TEST: the password reads [REDACTED] on the row while the approved fire still crosses', async () => {
    const { session } = desk_({ redactedFields: { payload: ['password'] }, enforce: true });
    session.registerActions('compose', {
      handlers: { 'sign-in': () => undefined },
      holds: { 'sign-in': () => ({ password: SECRET }) },
    });
    const port = serveToAgent(session);

    // 1. The row a model reads BEFORE anything fires.
    const here = port.call('desk.whats_here') as { actions: Array<Record<string, unknown>> };
    const signIn = here.actions.find((action) => action['action'] === 'compose.sign-in')!;
    expect(signIn['holds']).toEqual({ password: REDACTED });
    expect(JSON.stringify(here)).not.toContain(SECRET);

    // 2. …and the real value still does everything it always did: the human's
    //    approval binds to it, and the fire that spends the approval crosses.
    const { askId } = session.confirmAsk('compose.sign-in', {
      source: 'agent',
      input: { password: SECRET },
    });
    session.approveAsk(askId, { by: 'alice@ops' });
    const fired = session.fire('compose.sign-in', {
      source: 'agent',
      payload: { password: SECRET },
      askId,
    });
    await tick();
    expect(fired.ok).toBe(true);
    expect(session.confirms().map((confirm) => confirm.kind)).toEqual(['ask', 'approved', 'used']);
  });

  it('the row and the record hide the SAME field the same way — one value, two homes', async () => {
    const { session } = desk_({ redactedFields: { payload: ['password'] } });
    session.registerActions('compose', {
      handlers: { 'sign-in': () => undefined },
      holds: { 'sign-in': () => ({ password: SECRET }) },
    });
    const held = row(session, 'compose.sign-in')!.holds;
    const fired = session.fire('compose.sign-in', { source: 'agent', payload: { password: SECRET } });
    await tick();
    expect(held).toEqual({ password: REDACTED });
    expect(recordFor(session, fired.ok ? fired.transition.id : '').payload).toEqual(held);
  });

  it('the aim holds both ways: the produced list does not govern what a control holds', () => {
    // Two lists rather than one, because the two channels have opposite duties.
    const { session } = desk_({ redactedFields: { produced: ['password'] } });
    session.registerActions('compose', {
      handlers: { 'sign-in': () => undefined },
      holds: { 'sign-in': () => ({ password: SECRET }) },
    });
    expect(row(session, 'compose.sign-in')!.holds).toEqual({ password: SECRET });
  });

  it('nested paths and array elements are hidden on the row, exactly as on the record', () => {
    const { session } = desk_({ redactedFields: { payload: ['auth.token', 'items.token'] } });
    session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { save: () => ({ auth: { token: SECRET }, items: [{ token: SECRET }, { token: SECRET }] }) },
    });
    expect(row(session, 'compose.save')!.holds).toEqual({
      auth: { token: REDACTED },
      items: [{ token: REDACTED }, { token: REDACTED }],
    });
  });

  it('with no option the row carries the raw value — the feature is opt-in, like its three siblings', () => {
    const { session } = desk_();
    session.registerActions('compose', {
      handlers: { 'sign-in': () => undefined },
      holds: { 'sign-in': () => ({ password: SECRET }) },
    });
    expect(row(session, 'compose.sign-in')!.holds).toEqual({ password: SECRET });
  });
});

// ---------------------------------------------------------------------------
// The sensor forwards the declaration it already has
// ---------------------------------------------------------------------------

/** A port that watches the value door — the only place "did it forward?" is observable. */
function recordDeclarations(session: SensorSession): {
  port: SensorSession;
  declared: Array<{ edge: string; read: () => unknown }>;
} {
  const declared: Array<{ edge: string; read: () => unknown }> = [];
  const port: SensorSession = {
    available: () => session.available(),
    fire: (edge: string, opts: RecordOnlyFire) => session.fire(edge, opts),
    on: (event, listener) => session.on(event, listener),
    sync: (node, opts) => session.sync(node, opts),
    declareHolds: (edge, read) => {
      declared.push({ edge, read });
      return session.declareHolds!(edge, read);
    },
  };
  return { port, declared };
}

function messageField(): ReturnType<typeof el>[] {
  const label = el('label', { text: 'Message' });
  const input = el('input', { attrs: { type: 'text' }, labels: [label] });
  return [label, input];
}

describe('the sensor forwards the declaration it already has', () => {
  it('one getter, two readers of it: the payload of a gesture AND the row before any gesture', () => {
    const { session, surface } = mountDesk();
    const [label, input] = messageField();
    surface.mount(el('form', { children: [label!, input!] }));
    const draft = { text: 'ship it' };
    const watch = watchPage(session, { root: surface });
    watch.attach({ edge: desk.compose, element: input!, value: () => ({ message: draft.text }) });

    // The row, with nothing fired yet.
    expect(row(session, desk.compose)!.holds).toEqual({ message: 'ship it' });
    // …and the same getter still answers for the payload when the human commits.
    humanCommit(input!);
    expect(session.transitions().at(-1)?.payload).toEqual({ message: 'ship it' });
    watch.stop();
  });

  it('the forwarded reader is read LATE too — the row is never the attach-time copy', () => {
    const { session, surface } = mountDesk();
    const [label, input] = messageField();
    surface.mount(el('form', { children: [label!, input!] }));
    const draft = { text: 'first' };
    const watch = watchPage(session, { root: surface });
    watch.attach({ edge: desk.compose, element: input!, value: () => ({ message: draft.text }) });

    draft.text = 'second';
    expect(row(session, desk.compose)!.holds).toEqual({ message: 'second' });
    watch.stop();
  });

  it('detach takes the reader with it, and so does stop()', () => {
    const { session, surface } = mountDesk();
    const [label, input] = messageField();
    surface.mount(el('form', { children: [label!, input!] }));
    const watch = watchPage(session, { root: surface });

    const attachment = watch.attach({ edge: desk.compose, element: input!, value: () => ({ message: 'a' }) });
    expect(row(session, desk.compose)).toHaveProperty('holds');
    attachment.detach();
    expect(row(session, desk.compose)).not.toHaveProperty('holds');

    watch.attach({ edge: desk.compose, element: input!, value: () => ({ message: 'b' }) });
    expect(row(session, desk.compose)).toHaveProperty('holds');
    watch.stop();
    expect(row(session, desk.compose)).not.toHaveProperty('holds');
  });

  it('a declaration WITHOUT a getter forwards nothing — there is nothing to forward', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Archive' });
    surface.mount(button);
    const { port, declared } = recordDeclarations(session);
    const watch = watchPage(port, { root: surface });

    watch.attach({ edge: desk.archive, element: button });
    expect(declared).toEqual([]);
    watch.stop();
  });

  it('a PER-INSTANCE declaration is not forwarded: the door files one reader per action', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Reply' });
    surface.mount(button);
    const { port, declared } = recordDeclarations(session);
    const watch = watchPage(port, { root: surface });

    watch.attach({ edge: desk.reply, element: button, instance: 't-1', value: () => ({ body: 'ok' }) });
    expect(declared).toEqual([]);
    watch.stop();
  });

  it('SEVERABLE: a hand-built port without the door still records payloads exactly as before', () => {
    const { session, surface } = mountDesk();
    const [label, input] = messageField();
    surface.mount(el('form', { children: [label!, input!] }));
    // No `declareHolds` on this port at all — the optional-member contract.
    const port: SensorSession = {
      available: () => session.available(),
      fire: (edge: string, opts: RecordOnlyFire) => session.fire(edge, opts),
      on: (event, listener) => session.on(event, listener),
      sync: (node, opts) => session.sync(node, opts),
    };
    const watch = watchPage(port, { root: surface });
    watch.attach({ edge: desk.compose, element: input!, value: () => ({ message: 'ship it' }) });

    expect(row(session, desk.compose)).not.toHaveProperty('holds');
    humanCommit(input!);
    expect(session.transitions().at(-1)?.payload).toEqual({ message: 'ship it' });
    watch.stop();
  });
});

// ---------------------------------------------------------------------------
// Scope — one reader per SERVED ACTION, and nothing that resembles a data bag
// ---------------------------------------------------------------------------

describe('one reader per served action, never a data bag', () => {
  it('holds rides the ACTION ROW and nowhere else — whats_here grows no data pillar', () => {
    // The declined fourth-pillar ask (LIBRARY_ASK.md): the app's own data,
    // declared for the model to answer from. This surface is deliberately not a
    // way back to it — a value is only ever a fact about one served control.
    const { session } = desk_();
    session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { save: () => ({ body: 'ship it' }) },
    });
    const here = serveToAgent(session).call('desk.whats_here') as Record<string, unknown>;
    expect(Object.keys(here).sort()).toEqual(
      ['actions', 'brief', 'facts', 'ok', 'journeys', 'version', 'youAreOn'].sort(),
    );
    expect(here).not.toHaveProperty('data');
    expect(here).not.toHaveProperty('holds');
  });

  it('a runtime value never enters the STATIC tool array — the same bytes every turn', () => {
    // The two-string-class invariant: descriptions and schemas are authored
    // constants, and `holds` is the most changeable value on the row. A tool
    // array that moved with the draft in a box would re-cost every turn and put
    // app data in the one channel that is meant to carry none.
    const { session } = desk_();
    let body = 'first';
    session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { save: () => ({ body }) },
    });
    const before = JSON.stringify(session.toMCPTools());
    body = 'second';
    expect(JSON.stringify(session.toMCPTools())).toBe(before);
    expect(before).not.toContain('first');
    expect(before).not.toContain('holds');
  });

  it('an action nobody serves here carries nothing, however much was declared for it', () => {
    // Keyed by action, gated by the same availability every other field is: a
    // reader cannot put a value on a page the human is not on.
    const { session } = desk_();
    session.registerActions('compose', {
      handlers: { save: () => undefined },
      holds: { save: () => ({ body: 'ship it' }) },
    });
    session.sync('compose'); // still here…
    expect(row(session, 'compose.save')).toHaveProperty('holds');
    expect(session.available().edges.filter((edge) => 'holds' in edge)).toHaveLength(1);
  });
});
