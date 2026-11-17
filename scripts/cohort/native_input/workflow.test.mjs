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

test('the explicit producer-fetch token stays scoped to the native entry', () => {
  const workflow = native();
  assert.equal(workflow.env?.GH_TOKEN, undefined);
  const tokenSteps = [];
  for (const job of Object.values(workflow.jobs)) {
    assert.equal(job.env?.GH_TOKEN, undefined);
    for (const step of job.steps ?? []) if (Object.hasOwn(step.env ?? {}, 'GH_TOKEN')) tokenSteps.push(step);
  }
  assert.equal(tokenSteps.length, 1);
  assert.equal(tokenSteps[0].run, 'node scripts/cohort/native_input.mjs');
  assert.equal(tokenSteps[0].env.GH_TOKEN, '${{ github.token }}');
});
