/**
 * THE TRANSCRIPT — press a control whose effect is already true, and watch the
 * port answer instead of hang.
 *
 * `npm run example:already-true`. Deterministic by construction: no clock, no
 * network, no model. The only moving part is the app.
 *
 * The archived run this reproduces: an agent asked to open a domain view while
 * it was already inside that domain, the app's store published nothing because
 * nothing changed, and the fire waited for a state report that was never coming.
 * `did_it_work` could only answer 'still-pending' — so the model waited,
 * re-checked, waited, and spent fifteen of its thirty steps on it.
 */
import { serveToAgent } from '../../src/index.js';
import type { ServeResult } from '../../src/index.js';
import { wireDesk } from './app.js';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function section(title: string): void {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 74 - title.length))}`);
}

function show(result: ServeResult, keys: string[]): void {
  const picked: Record<string, unknown> = {};
  for (const key of keys) if (result[key] !== undefined) picked[key] = result[key];
  console.log(JSON.stringify(picked, null, 2));
}

export async function main(): Promise<void> {
  section('ALREADY TRUE — we are on billing, and the agent asks for billing');
  const here = serveToAgent(wireDesk('billing'), { source: 'agent' });
  const pressed = here.call('desk.do_action', { action: 'open-billing' });
  show(pressed, ['ok', 'did', 'transitionId', 'effectStatus', 'alreadyTrue', 'why']);

  await flush();
  console.log('\n  …and one poll ENDS, where before it repeated the same word forever:');
  show(here.call('desk.did_it_work', { transitionId: pressed['transitionId'] as string }), [
    'settled',
    'effectStatus',
    'outcome',
    'effectVerified',
    'verifyHeld',
    'alreadyTrue',
    'why',
  ]);

  section('THE ORDINARY CASE — we are on claims, and the agent asks for billing');
  const away = serveToAgent(wireDesk('claims'), { source: 'agent' });
  const real = away.call('desk.do_action', { action: 'open-billing' });
  show(real, ['ok', 'did', 'effectStatus', 'alreadyTrue', 'howToSettle']);
  await flush();
  show(away.call('desk.did_it_work', { transitionId: real['transitionId'] as string }), [
    'settled',
    'effectStatus',
    'effectVerified',
    'alreadyTrue',
  ]);

  section('THE HONEST LIMIT — the same press, on an action that declares no verify');
  const bare = serveToAgent(wireDesk('claims'), { source: 'agent' });
  const unclaimable = bare.call('desk.do_action', { action: 'open-claims' });
  show(unclaimable, ['ok', 'did', 'effectStatus', 'alreadyTrue', 'howToSettle']);
  await flush();
  console.log(
    '\n  `writes` is key NAMES only, so nothing here can know the value this handler\n' +
      '  would set. Declaring verify beside it is the whole cure — one line.',
  );
  show(bare.call('desk.did_it_work', { transitionId: unclaimable['transitionId'] as string }), [
    'settled',
    'judgment',
    'howToAct',
  ]);
}

/* v8 ignore next 3 -- the CLI arm: the suite imports main() and calls it directly, so this branch is only taken by `npm run example:already-true`. */
if (process.argv[1] !== undefined && import.meta.url.endsWith(process.argv[1].split('/').pop() ?? '')) {
  void main();
}
