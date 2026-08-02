/**
 * THE TRANSCRIPT — one real run of the guarded journey, printed.
 *
 * `npm run example:wizard`. Every line the docs page shows comes out of this
 * script: it drives the same wiring the tests drive, through the Mode B port a
 * remote model actually holds, and prints what came back. Nothing is
 * hand-written into the page — if the library's words change, this output
 * changes with them and the page is rewritten from it.
 *
 * Deterministic by construction: no clock, no network, no model. The only
 * moving part is the app.
 */
import { serveToAgent } from '../../src/index.js';
import type { ServeResult } from '../../src/index.js';
import { wireWizard } from './wire.js';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function section(title: string): void {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 74 - title.length))}`);
}

/** One result, small enough to read: the fields a model would act on. */
function show(result: ServeResult, keys: string[]): void {
  const picked: Record<string, unknown> = {};
  for (const key of keys) if (result[key] !== undefined) picked[key] = result[key];
  console.log(JSON.stringify(picked));
}

function showActions(result: ServeResult): void {
  for (const row of result['actions'] as Array<Record<string, unknown>>) {
    const marks = [
      row['highEffect'] === true ? 'high-effect' : undefined,
      row['expects'] === undefined ? undefined : `expects ${describe(row['expects'])}`,
    ].filter(Boolean);
    console.log(`  ${String(row['action']).padEnd(22)} ${marks.join(' · ')}`.trimEnd());
  }
}

/** The expected input as one line — the shape a caller TYPES. */
function describe(expects: unknown): string {
  if (typeof expects === 'string') return expects;
  const schema = expects as { properties?: Record<string, { type?: string }>; required?: string[] };
  const required = new Set(schema.required ?? []);
  const fields = Object.entries(schema.properties ?? {}).map(
    ([name, property]) => `${name}${required.has(name) ? '' : '?'}: ${property.type ?? 'any'}`,
  );
  return `{ ${fields.join(', ')} }`;
}

async function main(): Promise<void> {
  const wired = wireWizard();
  const port = serveToAgent(wired.session);

  /**
   * Which controls the app currently says are greyed. Read off `available()`
   * — the IN-PROCESS surface — because that is where the marker lives; over
   * the Mode B wire the same fact arrives as the TOOL_DISABLED refusal below.
   */
  const greyedLine = (): string => {
    const greyed = wired.session
      .available()
      .edges.filter((edge) => edge.enabled === false)
      .map((edge) => edge.affordanceId);
    return `(available() marks greyed: ${greyed.length > 0 ? greyed.join(', ') : 'nothing'})`;
  };

  section('turn 1 · the model asks where it is');
  const here = port.call('wizard.whats_here', {});
  console.log((here['facts'] as string).split('\n').slice(-2).join('\n'));
  console.log('actions:');
  showActions(here);
  console.log('(wizard.pick-recipe is absent: its guard has not opened yet)');
  console.log(greyedLine());

  section('turn 2 · it opens the journey');
  const opened = port.call('wizard.journey.new-project', {});
  show(opened, ['frame', 'judgment', 'readySteps']);

  section('turn 3 · it reaches for Next while the button is greyed');
  show(port.call('wizard.journey.new-project', { step: 'next-to-review' }), [
    'judgment',
    'did',
    'reason',
  ]);

  section('turn 4 · it names the project — and the app agrees it happened');
  const named = port.call('wizard.journey.new-project', {
    step: 'name-it',
    input: { name: 'Ion channel screen' },
  });
  show(named, ['ok', 'did', 'effectStatus', 'howToSettle']);
  await flush();
  show(port.call('wizard.did_it_work', { transitionId: named['transitionId'] }), [
    'settled',
    'did',
    'effectStatus',
    'writesObserved',
    'verifyHeld',
  ]);

  section('turn 5 · it picks a recipe the app does not have');
  const picked = port.call('wizard.journey.new-project', {
    step: 'pick-recipe',
    input: { recipe: 'not-a-recipe' },
  });
  await flush();
  show(port.call('wizard.did_it_work', { transitionId: picked['transitionId'] }), [
    'settled',
    'did',
    'effectStatus',
    'outcome',
    'writesObserved',
    'verifyHeld',
    'error',
  ]);

  section('turn 6 · it picks a real one, and Next un-greys');
  port.call('wizard.journey.new-project', { step: 'pick-recipe', input: { recipe: 'dose-response' } });
  await flush();
  const afterRecipe = port.call('wizard.whats_here', {});
  showActions(afterRecipe);
  console.log(greyedLine());

  section('turn 7 · Next, through the app’s own router — no handler anywhere');
  const moved = port.call('wizard.journey.new-project', { step: 'next-to-review' });
  await flush();
  show(port.call('wizard.did_it_work', { transitionId: moved['transitionId'] }), [
    'settled',
    'did',
    'effectStatus',
    'verifyHeld',
    'toNode',
    'youAreOn',
  ]);
  console.log(`the app’s own router is at ${wired.app.path}`);

  section('turn 8 · the last step is high-effect: it stops and shows receipts');
  const asked = port.call('wizard.do_action', { action: 'create-project' });
  show(asked, ['judgment', 'action', 'does', 'askId']);
  console.log(JSON.stringify((asked['receipts'] as Record<string, unknown>)['willDo']));

  section('turn 9 · the human says yes');
  const created = port.call('wizard.do_action', { action: 'create-project', confirm: true });
  await flush();
  show(port.call('wizard.did_it_work', { transitionId: created['transitionId'] }), [
    'settled',
    'did',
    'effectStatus',
    'writesObserved',
    'verifyHeld',
    'data',
  ]);

  section('the facts block the model reads every turn');
  console.log(wired.session.groundTruth().text);

  section('CONTROL · the same wizard, built without the crossLinks spine');
  const spineless = wireWizard({ crossLinks: false });
  spineless.session.sync('projects');
  console.log(spineless.warnings[0]);
  const row = spineless.session.gaps().find((gap) => gap.kind === 'dead-end');
  // Selected fields: the row also carries a wall-clock timestamp, and a
  // transcript a doc is written from must be the same bytes every run.
  show({ ...row } as ServeResult, ['kind', 'node', 'availableActions', 'availableJourneys']);

  wired.detach();
  spineless.detach();
}

void main();
