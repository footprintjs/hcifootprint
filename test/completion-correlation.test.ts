/**
 * HOW A COMPLETION FINDS ITS FIRE — by CALL PATH, never by recency.
 *
 * Two rails carry a fire's completion back, and each one carries its own
 * identity with it:
 *
 *  - The HANDLER rail. `fire()` invokes one handler per invocation and holds
 *    that invocation's own promise. What it returns or throws belongs to that
 *    fire because it IS that fire — nothing is matched, so nothing can be
 *    mismatched, whatever order the handlers finish in.
 *  - The STATE rail. The app reports a delta from wherever it reports things,
 *    and identity has to travel with it: `updateState(delta, { transitionId })`.
 *    That is the recommendation, and the only exact form.
 *
 * Without the id the library falls back to FIFO — the OLDEST pending fire whose
 * handler is not still in flight. Oldest, not newest, and the choice is stated
 * rather than incidental: a queue answers in the order it was joined, and
 * out-of-order completion is ordinary. FIFO can therefore mis-attribute, which
 * is why the docs ask for the id — but it mis-attributes predictably, and a
 * caller can reason about it.
 *
 * Recency would be worse than wrong; it would be unfalsifiable. "Attribute to
 * the most recent fire" is right exactly when handlers finish in the order they
 * started — the one case where FIFO is right too — and wrong precisely when the
 * timing is interesting, silently, with a plausible answer. A clock is not
 * evidence of causation any more than it is evidence of a verdict.
 *
 * Written down as law in docs/design/answer-grammar.md, "How completion is
 * correlated". Pinned here so an optimization to "the latest one" fails loudly.
 *
 * MUTATION PROOF: turn the bare-FIFO `findIndex` into a `findLastIndex` in
 * `src/traverse/session.ts` and 'the OLDEST pending fire' goes red immediately —
 * with the two ids swapped, which is what a mis-attributed completion looks
 * like in a trace.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildNavigationGraph } from '../src/index.js';
import type { InteractionSession, NavigationGraph } from '../src/index.js';
import { okUpdate } from './fixture.js';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Two actions writing the SAME key — the shape where attribution has to choose. */
function editorMap(): NavigationGraph {
  return buildNavigationGraph('editor', {
    pages: {
      doc: {
        tools: {
          'save-draft': { does: 'Save the draft', writes: ['doc'] },
          publish: { does: 'Publish the document', writes: ['doc'] },
          ping: { does: 'Ping the server' }, // declares no writes: the handler rail alone
          pong: { does: 'Pong the server' },
        },
      },
    },
  });
}

function editor(handlers?: Record<string, () => unknown>): InteractionSession {
  const session = editorMap().createSession({
    node: 'doc',
    state: { doc: 'empty' },
    onWarn: () => undefined,
  });
  session.registerToolGroup('doc', {
    handlers: {
      'save-draft': handlers?.['save-draft'] ?? (() => undefined),
      publish: handlers?.['publish'] ?? (() => undefined),
      ping: handlers?.['ping'] ?? (() => undefined),
      pong: handlers?.['pong'] ?? (() => undefined),
    },
  });
  return session;
}

/** Fire it and hand back the transition id, loudly on refusal. */
function fireId(session: InteractionSession, action: string): string {
  return fireIdOn(session, `doc.${action}`);
}

/** The same, by fully qualified id — for the maps that are not the editor. */
function fireIdOn(session: InteractionSession, affordanceId: string): string {
  const fired = session.fire(affordanceId, { source: 'agent' });
  if (!fired.ok) throw new Error(`fire refused: ${JSON.stringify(fired)}`);
  return fired.transition.id;
}

describe('the handler rail — one invocation, one promise, no matching at all', () => {
  it('each fire settles with ITS OWN completion, however the handlers interleave', async () => {
    const finished: string[] = [];
    const session = editor({
      ping: async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        finished.push('ping');
        return 'from ping';
      },
      pong: async () => {
        finished.push('pong');
        return 'from pong';
      },
    });

    const pinged = session.fire('doc.ping', { source: 'agent' });
    const ponged = session.fire('doc.pong', { source: 'agent' });
    if (!pinged.ok || !ponged.ok) throw new Error('fire refused');

    const [pingSettled, pongSettled] = await Promise.all([pinged.whenSettled, ponged.whenSettled]);

    // The second one finished FIRST — the interesting case, and the one recency
    // gets wrong.
    expect(finished).toEqual(['pong', 'ping']);
    expect(pingSettled.transition.id).toBe(pinged.transition.id);
    expect(pongSettled.transition.id).toBe(ponged.transition.id);
    // …and the data each handler returned went home with its own fire.
    expect(session.producedFor(pinged.transition.id)).toBe('from ping');
    expect(session.producedFor(ponged.transition.id)).toBe('from pong');
  });
});

describe('the state rail — the id is the recommendation because it is exact', () => {
  it('threading transitionId settles THAT fire, whatever order they were fired in', async () => {
    const session = editor();
    const draft = fireId(session, 'save-draft');
    const published = fireId(session, 'publish');
    await flush(); // both handlers are done; neither has reported

    const result = okUpdate(session.updateState({ doc: 'published' }, { transitionId: published }));

    expect(result.attributed).toBe(true);
    expect(result.transition.id).toBe(published);
    // The older fire is untouched — still waiting for its own report.
    expect(session.pending().map((p) => p.id)).toEqual([draft]);
  });

  it('an explicit stimulus is never stolen by a pending fire', async () => {
    // The app pushing its own news is not somebody's action completing, and
    // the ladder says so before FIFO is ever consulted.
    const session = editor();
    const draft = fireId(session, 'save-draft');
    await flush();

    session.updateState({ doc: 'from the server' }, { stimulus: 'push' });

    expect(session.pending().map((p) => p.id)).toEqual([draft]);
  });
});

describe('bare FIFO is OLDEST-first — stated, not incidental', () => {
  it('a report with no id settles the OLDEST pending fire, not the newest', async () => {
    const session = editor();
    const draft = fireId(session, 'save-draft');
    const published = fireId(session, 'publish');
    await flush();
    expect(session.pending().map((p) => p.id)).toEqual([draft, published]);

    const first = okUpdate(session.updateState({ doc: 'v1' }));
    expect(first.transition.id).toBe(draft);
    expect(first.transition.id).not.toBe(published); // recency would have said this one

    const second = okUpdate(session.updateState({ doc: 'v2' }));
    expect(second.transition.id).toBe(published);
    expect(session.pending()).toEqual([]);
  });

  it('and it mis-attributes PREDICTABLY when the completions arrive out of order', async () => {
    // The honest half. The newer action is the one that actually finished, and
    // a bare report cannot say so: FIFO hands it to the older fire. That is a
    // wrong answer a caller can reason about — and the cure is one argument,
    // which the next assertion uses on the identical setup.
    const session = editor();
    const draft = fireId(session, 'save-draft');
    const published = fireId(session, 'publish');
    await flush();

    const guessed = okUpdate(session.updateState({ doc: 'published!' }));
    expect(guessed.transition.id).toBe(draft); // …though `publish` is what finished

    const cured = editor();
    const draft2 = fireId(cured, 'save-draft');
    const published2 = fireId(cured, 'publish');
    await flush();
    const exact = okUpdate(cured.updateState({ doc: 'published!' }, { transitionId: published2 }));
    expect(exact.transition.id).toBe(published2);
    expect(cured.pending().map((p) => p.id)).toEqual([draft2]);
  });

  it('a handler still in flight is skipped — it has first claim on its own record', async () => {
    // FIFO's one exception, and it is a call-path rule rather than a clock
    // rule: a record whose handler has not returned is that handler's to
    // settle, so a neighbour's report cannot take it.
    const session = editor({
      'save-draft': async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
      },
    });
    const draft = fireId(session, 'save-draft'); // handler still running
    const published = fireId(session, 'publish');
    await flush(); // publish's handler is done; save-draft's is not

    const settled = okUpdate(session.updateState({ doc: 'v1' }));

    expect(settled.transition.id).toBe(published);
    expect(session.pending().map((p) => p.id)).toEqual([draft]);
  });
});

describe('the write-match arm runs only when EVERY handler is still in flight', () => {
  /** Two actions writing DIFFERENT keys — the shape where a delta names its own fire. */
  function outbox(handlers?: Record<string, () => unknown>): InteractionSession {
    const session = buildNavigationGraph('outbox', {
      pages: {
        compose: {
          tools: {
            save: { does: 'Save the draft', writes: ['draft'] },
            upload: { does: 'Upload the attachment', writes: ['attachment'] },
          },
        },
      },
    }).createSession({
      node: 'compose',
      state: { draft: null, attachment: null },
      onWarn: () => undefined,
    });
    session.registerToolGroup('compose', {
      handlers: {
        save: handlers?.['save'] ?? (() => undefined),
        upload: handlers?.['upload'] ?? (() => undefined),
      },
    });
    return session;
  }

  it('settles the one whose declared writes the delta covers — all handlers still running', async () => {
    // The precise arm, in the only queue it governs: nothing is waiting on a
    // report, so a delta that names exactly one running handler's keys is that
    // handler reporting its own writes past its await.
    let releaseSave: (() => void) | undefined;
    let releaseUpload: (() => void) | undefined;
    const session = outbox({
      save: () => new Promise<void>((resolve) => (releaseSave = resolve)),
      upload: () => new Promise<void>((resolve) => (releaseUpload = resolve)),
    });
    const save = fireIdOn(session, 'compose.save');
    const upload = fireIdOn(session, 'compose.upload');
    await flush();

    const settled = okUpdate(session.updateState({ attachment: 'photo.png' }));

    expect(settled.transition.id).toBe(upload);
    expect(session.pending().map((p) => p.id)).toEqual([save]);
    releaseSave?.();
    releaseUpload?.();
  });

  it('but bare FIFO answers FIRST in a mixed queue — the keys are not consulted', async () => {
    // THE SHAPE THE PAGE MUST NOT OVERPROMISE. One fire is waiting on a report,
    // one handler is still running: the oldest not-in-flight record is settled
    // before the delta's keys are ever looked at, so the upload's own report
    // lands on the save. This is bare FIFO doing exactly what it says — and it
    // is why `waiting-for-the-app.mdx` scopes the write-match shape to "every
    // outstanding fire's handler is still in flight" rather than promising it
    // outright. The cure is the same one sentence: pass the id.
    let releaseUpload: (() => void) | undefined;
    const session = outbox({
      upload: () => new Promise<void>((resolve) => (releaseUpload = resolve)),
    });
    const save = fireIdOn(session, 'compose.save'); // handler done, awaiting a report
    const upload = fireIdOn(session, 'compose.upload'); // handler still running
    await flush();

    const settled = okUpdate(session.updateState({ attachment: 'photo.png' }));

    expect(settled.transition.id).toBe(save);
    expect(settled.transition.id).not.toBe(upload);
    // …and the designed detector fires, because the keys did not line up.
    expect(session.settlementIfKnown(save)?.transition.effectVerified).toBe(false);

    // The cure, on the identical setup.
    const cured = outbox({ upload: () => new Promise<void>(() => undefined) });
    fireIdOn(cured, 'compose.save');
    const upload2 = fireIdOn(cured, 'compose.upload');
    await flush();
    const exact = okUpdate(cured.updateState({ attachment: 'photo.png' }, { transitionId: upload2 }));
    expect(exact.transition.id).toBe(upload2);
    releaseUpload?.();
  });

  it('the page says so in the words the code holds', () => {
    const page = readFileSync(
      path.join(REPO, 'docs-next/content/docs/serve/waiting-for-the-app.mdx'),
      'utf8',
    );
    const flatten = (text: string): string => text.replace(/[*`]/g, ' ').replace(/\s+/g, ' ').trim();
    const flat = flatten(page);
    expect(flat).toContain(flatten("When **every** outstanding fire's handler is still in flight"));
    // The unscoped promise the page used to carry — a shape it told app authors
    // never needed the id.
    expect(flat).not.toContain('Two shapes never need it');
  });
});
