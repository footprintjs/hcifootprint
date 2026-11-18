import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseDocument, stringify } from 'yaml';

function parsedWorkflow(source) {
  const document = parseDocument(source, { uniqueKeys: true });
  assert.equal(document.errors.length, 0, 'Native workflow must parse without errors');
  assert.equal(document.warnings.length, 0, 'Native workflow cannot use unsupported YAML tags');
  const workflow = document.toJS({ maxAliasCount: 0 });
  const noMerges = value => {
    if (value === null || typeof value !== 'object') return;
    assert.equal(Object.hasOwn(value, '<<'), false, 'Native workflow cannot use YAML merges');
    for (const child of Object.values(value)) noMerges(child);
  };
  noMerges(workflow);
  return workflow;
}

function noPersistedCheckoutCredentials(workflow) {
  assert.ok(workflow?.jobs && typeof workflow.jobs === 'object', 'Native jobs required');
  let checkouts = 0;
  for (const [jobName, job] of Object.entries(workflow.jobs)) {
    assert.ok(Array.isArray(job.steps ?? []), 'Native steps must be an array');
    for (const step of job.steps ?? []) {
      if (typeof step.uses !== 'string' || !/^actions\/checkout@/i.test(step.uses)) continue;
      checkouts++;
      assert.equal(step.with?.['persist-credentials'], false,
        `Native checkout in ${jobName} must explicitly disable credential persistence`);
    }
  }
  assert.ok(checkouts > 0, 'Native workflow must retain an explicit checkout');
}

const safe = () => ({ uses: 'actions/checkout@v7', with: { 'persist-credentials': false } });
const check = source => noPersistedCheckoutCredentials(parsedWorkflow(source));
const native = () => parsedWorkflow(readFileSync(new URL('../../../.github/workflows/native-cohort.yml', import.meta.url), 'utf8'));

function earlyPreflight(workflow) {
  let entries = 0;
  for (const job of Object.values(workflow.jobs)) {
    const steps = job.steps ?? [];
    const entry = steps.findIndex(step => ['node scripts/cohort/native_input.mjs',
      'node scripts/cohort/native_input.mjs view-${{ matrix.view }}'].includes(step.run));
    if (entry < 0) continue;
    entries++;
    const isView = steps[entry].run !== 'node scripts/cohort/native_input.mjs';
    if (isView) {
      assert.equal(job.if, '${{ always() }}', 'Proof views must expose failed or cancelled dependencies');
      assert.equal(job.needs, 'native-source');
      assert.equal(steps[entry].env.HCI_EXECUTORS_RESULT, '${{ needs.native-source.result }}');
      assert.equal(steps[entry].env.HCI_VIEW_NODE, '${{ matrix.node }}');
    } else assert.equal(job.if, undefined, 'Required native work cannot be conditional');
    assert.ok(job['continue-on-error'] === undefined || job['continue-on-error'] === false);
    const firstShell = steps.findIndex(step => Object.hasOwn(step, 'run'));
    const preflight = steps[firstShell];
    assert.equal(preflight?.run, 'node scripts/cohort/native_input.mjs preflight', 'Metadata admission must precede every shell effect');
    assert.equal(preflight.if, undefined, 'Preflight must be unconditional');
    assert.ok(preflight['continue-on-error'] === undefined || preflight['continue-on-error'] === false);
    assert.equal(preflight.env?.GH_TOKEN, undefined);
    assert.equal(preflight['working-directory'], steps[entry]['working-directory']);
    for (const key of ['HCI_SOURCE_HEAD', 'HCI_SOURCE_BASE']) {
      assert.equal(preflight.env?.[key], steps[entry].env[key], 'Preflight and execution source bindings must match');
    }
    assert.equal(firstShell, 2, 'Only the fixed checkout and Node setup precede preflight');
    assert.match(steps[0].uses ?? '', /^actions\/checkout@/);
    assert.deepEqual(steps[0].with, { 'persist-credentials': false,
      path: 'hci-native/source', ref: '${{ github.event.pull_request.head.sha }}' });
    assert.match(steps[1].uses ?? '', /^actions\/setup-node@/);
    assert.deepEqual(steps[1].with, { 'node-version': '${{ matrix.node }}' });
    for (const step of steps.slice(0, 2)) {
      assert.equal(step.if, undefined);
      assert.equal(step['continue-on-error'], undefined);
    }
    for (const step of steps.slice(firstShell + 1, entry + 1)) {
      assert.equal(step.if, undefined, 'Setup/execution may not bypass a refused preflight');
      assert.ok(step['continue-on-error'] === undefined || step['continue-on-error'] === false);
    }
    const tail = steps.slice(entry + 1);
    assert.equal(tail.length, isView ? 0 : 1, 'Only proof retention follows native execution');
    if (!isView) {
      assert.match(tail[0].uses ?? '', /^actions\/upload-artifact@/);
      assert.equal(tail[0].run, undefined, 'No later shell effect may bypass refusal');
      assert.equal(tail[0].if, 'always()');
    }
  }
  assert.ok(entries > 0, 'The native execution entry must remain present');
}

test('metadata preflight precedes npm setup and cannot be bypassed', () => {
  earlyPreflight(native());
});

test('every same-run proof reader preserves admission, failure and source bindings', () => {
  const workflow = native();
  for (const fault of [
    j => { j.if = false; }, j => { j['continue-on-error'] = true; },
    j => { j.steps[2].if = 'always()'; },
    j => { j.steps[3].if = 'always()'; },
    j => { j.steps[3].env.HCI_EXECUTORS_RESULT = 'success'; },
    j => { j.steps[3].env.HCI_VIEW_NODE = '24'; },
    j => j.steps.push({ run: 'npm install', if: 'always()' }),
    j => { j.steps[0].with.ref = 'main'; },
    j => { j.needs = []; },
  ]) {
    const changed = structuredClone(workflow); fault(changed.jobs['proof-view']);
    assert.throws(() => earlyPreflight(changed));
  }
});

test('PR source profile preserves nine context names and main keeps ordinary readiness', () => {
  const workflow = native();
  assert.deepEqual(workflow.on, { pull_request: { branches: ['main'] } });
  assert.deepEqual(Object.keys(workflow.jobs).sort(), ['file-size', 'native-source', 'proof-view', 'structure-advisory']);
  assert.deepEqual(workflow.jobs['native-source'].strategy, { 'fail-fast': false, matrix: { node: [22, 24] } });
  const view = workflow.jobs['proof-view'];
  assert.equal(view.name, '${{ matrix.name }}');
  assert.equal(view.strategy['fail-fast'], false);
  assert.deepEqual(view.strategy.matrix.include, [
    { view: 'test', node: '22', name: 'test' }, { view: 'docs', node: '22', name: 'docs' },
    { view: 'docs-links', node: '22', name: 'docs-links' },
    { view: 'installed-cohort', node: '22', name: 'installed-cohort (22)' },
    { view: 'installed-cohort', node: '24', name: 'installed-cohort (24)' },
  ]);
  const read = name => parsedWorkflow(readFileSync(new URL('../../../.github/workflows/' + name, import.meta.url), 'utf8'));
  const ordinary = read('ci.yml'), cohort = read('cohort.yml');
  for (const main of [ordinary, cohort]) assert.deepEqual(main.on, { push: { branches: ['main'] } });
  for (const key of ['file-size', 'structure-advisory']) assert.deepEqual(workflow.jobs[key], cohort.jobs[key]);
  const runs = job => job.steps.flatMap(step => step.run ? [step.run] : []);
  assert.deepEqual(runs(ordinary.jobs.test), ['npm ci', 'npm run typecheck', 'npm run build', 'npm test',
    'npm run test:coverage', 'npx publint', 'npx @arethetypeswrong/cli --pack --profile esm-only']);
  assert.ok(runs(cohort.jobs['installed-cohort']).includes('npm run test:cohort:pins'));
  assert.deepEqual(cohort.jobs['installed-cohort'].strategy.matrix.node, [22, 24]);
});

test('preflight order, bindings and sibling-effect faults refuse', () => {
  const env = { HCI_SOURCE_HEAD: 'head-fixture', HCI_SOURCE_BASE: 'base-fixture' };
  const steps = [{ ...safe(), with: { ...safe().with, path: 'hci-native/source',
    ref: '${{ github.event.pull_request.head.sha }}' } },
    { uses: 'actions/setup-node@v6', with: { 'node-version': '${{ matrix.node }}' } },
    { run: 'node scripts/cohort/native_input.mjs preflight', env: { ...env }, 'working-directory': 'source' },
    { run: 'npm install --global npm@11.19.1' },
    { run: 'node scripts/cohort/native_input.mjs', env: { ...env }, 'working-directory': 'source' },
    { uses: 'actions/upload-artifact@v7', if: 'always()' }];
  earlyPreflight({ jobs: { fixture: { steps } } });
  const faults = [
    s => s.splice(2, 1), s => s.splice(2, 0, { run: 'npm --version' }),
    s => { [s[2], s[3]] = [s[3], s[2]]; },
    s => { s[2].if = 'always()'; }, s => { s[2]['continue-on-error'] = true; },
    s => { s[3].if = 'always()'; }, s => { s[4].if = 'always()'; },
    s => { s[2].env.GH_TOKEN = 'unexpected'; },
    s => { s[2].env.HCI_SOURCE_HEAD = 'stale'; },
    s => { s[2]['working-directory'] = 'elsewhere'; },
    s => s.splice(1, 0, { uses: 'unreviewed/setup@v1' }),
    s => s.splice(4, 1),
    s => s.push({ run: 'npm --version', if: 'always()' }),
    s => s.splice(1, 0, { uses: 'actions/setup-node@v6', with: { 'node-version': 'latest' } }),
    s => { s[0].with.ref = 'main'; },
    s => { s[1].with['node-version'] = 'latest'; },
  ];
  for (const fault of faults) {
    const mutated = structuredClone(steps); fault(mutated);
    assert.throws(() => earlyPreflight({ jobs: { renamed: { steps: mutated } } }));
  }
  for (const fault of [{ if: false }, { 'continue-on-error': true }]) {
    assert.throws(() => earlyPreflight({ jobs: { fixture: { steps, ...fault } } }));
  }
});

test('every actual native checkout ends Git authentication before dependency execution', () => {
  noPersistedCheckoutCredentials(native());
});

test('all checkout steps in independently named jobs must opt out', () => {
  check(stringify({ jobs: { first: { steps: [safe(), safe()] }, renamed: { steps: [safe()] } } }));
  for (const uses of ['actions/checkout@v7', 'actions/checkout@' + 'a'.repeat(40), 'ACTIONS/Checkout@v7']) {
    for (const value of [undefined, true, 'true', '${{ false }}']) {
      const checkout = safe();
      checkout.uses = uses;
      if (value === undefined) delete checkout.with['persist-credentials'];
      else checkout.with['persist-credentials'] = value;
      assert.throws(() => check(stringify({ jobs: {
        first: { steps: [safe()] }, renamed: { steps: [safe(), checkout] },
      } })), /explicitly disable credential persistence/);
    }
  }
});

test('comments and shell text cannot masquerade as checkout inputs', () => {
  assert.throws(() => check(`jobs:
  renamed:
    steps:
      - uses: actions/checkout@v7 # persist-credentials: false
      - run: |
          echo 'persist-credentials: false'
`), /explicitly disable credential persistence/);
});

test('missing checkout, duplicate keys and unsupported alias or merge semantics refuse', () => {
  for (const source of [
    'jobs: {empty: {steps: []}}',
    'jobs: {first: {steps: []}, first: {steps: []}}',
    'template: &checkout {uses: actions/checkout@v7, with: {persist-credentials: false}}\njobs: {first: {steps: [*checkout]}}',
    'jobs: {first: {steps: [{uses: actions/checkout@v7, with: {<<: {persist-credentials: false}}}]}}',
  ]) assert.throws(() => check(source));
});

test('tokens stay scoped to the fixed producer or same-run proof fetch entries', () => {
  const workflow = native();
  assert.equal(workflow.env?.GH_TOKEN, undefined);
  const tokenSteps = [];
  for (const job of Object.values(workflow.jobs)) {
    assert.equal(job.env?.GH_TOKEN, undefined);
    for (const step of job.steps ?? []) if (Object.hasOwn(step.env ?? {}, 'GH_TOKEN')) tokenSteps.push(step);
  }
  assert.deepEqual(tokenSteps.map(step => step.run).sort(), ['node scripts/cohort/native_input.mjs',
    'node scripts/cohort/native_input.mjs view-${{ matrix.view }}']);
  for (const step of tokenSteps) assert.equal(step.env.GH_TOKEN, '${{ github.token }}');
});
