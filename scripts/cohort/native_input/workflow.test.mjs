import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseDocument, stringify } from 'yaml';

function parsedWorkflow(source) {
  const document = parseDocument(source, { uniqueKeys: true });
  assert.equal(document.errors.length, 0, 'Workflow must parse without errors');
  assert.equal(document.warnings.length, 0, 'Workflow cannot use unsupported YAML tags');
  const workflow = document.toJS({ maxAliasCount: 0 });
  const noMerges = value => {
    if (value === null || typeof value !== 'object') return;
    assert.equal(Object.hasOwn(value, '<<'), false, 'Workflow cannot use YAML merges');
    for (const child of Object.values(value)) noMerges(child);
  };
  noMerges(workflow);
  return workflow;
}

const read = name => parsedWorkflow(readFileSync(new URL('../../../.github/workflows/' + name, import.meta.url), 'utf8'));
const safe = () => ({ uses: 'actions/checkout@v7', with: { 'persist-credentials': false } });
const REF = '${{ github.event.pull_request.head.sha || github.sha }}';
const INSTALL = 'npm ci --ignore-scripts --strict-peer-deps';
const WHOLE_BADGE = 'node --input-type=module -e "' +
  "import{readFileSync as r}from'node:fs';import{checkTestBadge,countTestFiles}from'./scripts/check-test-badge.mjs';" +
  "const x=checkTestBadge({readme:r('README.md','utf8'),tally:JSON.parse(r('.test-tally.json','utf8')),testFileCount:countTestFiles()});" +
  "if(x.verdict!=='ok')throw Error(JSON.stringify(x));console.log(JSON.stringify(x));" + '"';
const runs = job => job.steps.flatMap(step => step.run ? [step.run] : []);
const SOURCE = [INSTALL, 'npm run test:cohort',
  "python3 -m unittest discover -s scripts/cohort/native_input -p '*_test.py'",
  'npm run typecheck', 'npm run build', 'npm test', WHOLE_BADGE, 'npm run test:coverage',
  'npm run test:package', 'git diff --exit-code'];

function noPersistedCheckoutCredentials(workflow) {
  assert.ok(workflow?.jobs && typeof workflow.jobs === 'object', 'Jobs required');
  let checkouts = 0;
  for (const [jobName, job] of Object.entries(workflow.jobs)) {
    assert.ok(Array.isArray(job.steps ?? []), 'Steps must be an array');
    for (const step of job.steps ?? []) {
      if (typeof step.uses !== 'string' || !/^actions\/checkout@/i.test(step.uses)) continue;
      checkouts++;
      assert.equal(step.with?.['persist-credentials'], false,
        `Checkout in ${jobName} must explicitly disable credential persistence`);
    }
  }
  assert.ok(checkouts > 0, 'Workflow must retain an explicit checkout');
}

function committedJob(job, node, expected) {
  assert.equal(job.if, undefined, 'Own source assertions may not be conditional');
  assert.ok(job['continue-on-error'] === undefined || job['continue-on-error'] === false);
  assert.equal(job.steps.length, expected.length + 2, 'Only fixed setup and own assertions are allowed');
  assert.match(job.steps[0].uses ?? '', /^actions\/checkout@/);
  assert.deepEqual(job.steps[0].with, { 'persist-credentials': false, ref: REF });
  assert.match(job.steps[1].uses ?? '', /^actions\/setup-node@/);
  assert.deepEqual(job.steps[1].with, { 'node-version': node, cache: 'npm' });
  for (const step of job.steps) {
    assert.equal(step.if, undefined, 'An assertion cannot bypass a refused committed install');
    assert.ok(step['continue-on-error'] === undefined || step['continue-on-error'] === false);
  }
  assert.deepEqual(runs(job), expected, 'Committed install and every own assertion stay ordered');
}

function aggregate(job) {
  assert.equal(job.needs, 'native-source');
  assert.equal(job.if, '${{ always() }}', 'A failed/cancelled dependency must produce a failing check, not a skipped view');
  assert.ok(job['continue-on-error'] === undefined || job['continue-on-error'] === false);
  assert.equal(job.steps.length, 1);
  assert.deepEqual(job.steps[0], { name: 'Require both own source matrices to pass',
    env: { SOURCE_RESULT: '${{ needs.native-source.result }}' }, run: 'test "$SOURCE_RESULT" = success' });
}

function proposedLocks(job) {
  assert.equal(job.name, 'lock-inputs (report)');
  assert.equal(job['continue-on-error'], true);
  assert.equal(job.steps[1].with['node-version'], 24);
  assert.equal(job.steps.length, 9, 'Only fixed setup, clean proposal generation and retention are allowed');
  for (const step of job.steps.slice(0, -1)) {
    assert.equal(step.if, undefined, 'Both stale locks must be removed before any generation');
    assert.ok(step['continue-on-error'] === undefined || step['continue-on-error'] === false);
  }
  const commands = runs(job);
  const metadata = commands[0];
  assert.ok(metadata.includes('git rev-parse HEAD > "$RUNNER_TEMP/hci-lock-inputs/source-head.txt"'));
  assert.ok(metadata.includes('"rootLockSource":"package-lock.json"'));
  assert.ok(metadata.includes('"docsLockSource":"docs-next/package-lock.json"'));
  assert.equal(commands[1], 'rm -- package-lock.json docs-next/package-lock.json',
    'A fresh proposal removes BOTH old locks before normal npm resolves current manifests');
  assert.equal(job.steps[3]['working-directory'], undefined);
  assert.deepEqual(commands.slice(2, 4), [
    'npm install --package-lock-only --ignore-scripts --strict-peer-deps --no-audit --no-fund',
    'npm install --package-lock-only --ignore-scripts --strict-peer-deps --no-audit --no-fund']);
  assert.equal(job.steps[4]['working-directory'], undefined);
  assert.equal(job.steps[5]['working-directory'], 'docs-next');
  assert.ok(commands.some(command => command.startsWith('git diff --exit-code -- package.json')));
  assert.equal(commands.at(-1),
    'cp package-lock.json "$RUNNER_TEMP/hci-lock-inputs/package-lock.json"\n' +
    'cp docs-next/package-lock.json "$RUNNER_TEMP/hci-lock-inputs/docs-next/package-lock.json"\n');
  assert.equal(job.steps.at(-1).with.path, '${{ runner.temp }}/hci-lock-inputs/');
}

function noLiveReadiness(workflow) {
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.equal(workflow.defaults, undefined, 'Platform shell semantics cannot be replaced');
  const visit = value => {
    if (value === null || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      assert.ok(!['GH_TOKEN', 'GITHUB_TOKEN', 'NODE_AUTH_TOKEN', 'HCI_EXECUTORS_RESULT', 'HCI_VIEW_NODE'].includes(key),
        'Required checks have no API/provider token or historical proof selector');
      visit(child);
    }
  };
  visit(workflow);
  for (const job of Object.values(workflow.jobs)) {
    assert.equal(job.defaults, undefined, 'Job shell semantics cannot be replaced');
    if (job.permissions !== undefined) assert.deepEqual(job.permissions, { contents: 'read' });
    for (const step of job.steps ?? []) {
      assert.equal(step.shell, undefined, 'A shell override cannot turn assertions into no-ops');
      if (!step.run) continue;
      assert.doesNotMatch(step.run, /native_input\.mjs|api\.github|\bgh\s|\bcurl\b|npm@latest|npm install --global/,
        'Own checks cannot consult sibling Actions, a bootstrap artifact or a live tool version');
    }
  }
}

test('committed-lock admission precedes every own source assertion and cannot be bypassed', () => {
  const ci = read('ci.yml');
  committedJob(ci.jobs['native-source'], '${{ matrix.node }}', SOURCE);
  noLiveReadiness(ci);
});

test('platform aggregate preserves dependency failures without API or artifact-clock views', () => {
  const job = read('ci.yml').jobs.test;
  aggregate(job);
  for (const fault of [j => { j.if = false; }, j => { j['continue-on-error'] = true; },
    j => { j.needs = []; }, j => { j.steps[0].if = 'always()'; },
    j => { j.steps[0].env.SOURCE_RESULT = 'success'; },
    j => { j.steps[0].run = 'true'; }, j => { j.steps.push({ run: 'npm install' }); }]) {
    const changed = structuredClone(job); fault(changed); assert.throws(() => aggregate(changed));
  }
  assert.equal(existsSync(new URL('../../../.github/workflows/native-cohort.yml', import.meta.url)), false,
    'Retired native source/API/proof-view workflow must not remain active');
});

test('nine existing context names retain real own gates on PR and main, with external compatibility reported separately', () => {
  const ci = read('ci.yml'), cohort = read('cohort.yml');
  for (const workflow of [ci, cohort]) assert.deepEqual(workflow.on,
    { push: { branches: ['main'] }, pull_request: { branches: ['main'] } });
  assert.deepEqual(Object.keys(ci.jobs).sort(), ['docs', 'docs-links', 'native-source', 'test']);
  assert.deepEqual(ci.jobs['native-source'].strategy, { 'fail-fast': false, matrix: { node: [22, 24] } });
  assert.deepEqual(Object.keys(cohort.jobs).sort(), ['compatibility-report', 'file-size', 'installed-cohort', 'structure-advisory']);
  assert.deepEqual(cohort.jobs['installed-cohort'].strategy, { 'fail-fast': false, matrix: { node: [22, 24] } });
  const shared = '4537c3701819ba397282fc6c22f00c6cfbc7b714';
  for (const [key, file] of [['file-size', 'file-size.yml'], ['structure-advisory', 'structure-report.yml']]) {
    assert.deepEqual(cohort.jobs[key], { uses: `footprintjs/ci/.github/workflows/${file}@${shared}`, with: { tool_sha: shared } });
  }
  committedJob(ci.jobs.docs, 22, [INSTALL, 'npm run build', 'npm run docs:agents:check',
    'npm run docs:toolchain:check', 'npm ci --strict-peer-deps', 'node scripts/cohort/identity.mjs --docs .',
    'npm run docs:truth:check', 'npm run check:api', 'npm run build',
    'node scripts/cohort/identity.mjs --docs .', 'git diff --exit-code']);
  assert.deepEqual(ci.jobs.docs.steps.filter(step => step['working-directory']).map(step => step['working-directory']),
    ['docs-next', 'docs-next', 'docs-next']);
  committedJob(ci.jobs['docs-links'], 22, [INSTALL, 'node scripts/check-doc-links.mjs --strict']);
  committedJob(cohort.jobs['installed-cohort'], '${{ matrix.node }}', [INSTALL,
    'npm run test:cohort:pins', 'npm run test:cohort', 'npm run build',
    'node scripts/cohort/identity.mjs --workspaces .', 'npm run test:package',
    'npm pack --ignore-scripts --pack-destination "$RUNNER_TEMP" --json', 'git diff --exit-code']);
  const packageJSON = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));
  assert.equal(packageJSON.scripts['test:package'], 'publint && attw --pack --profile esm-only');
  assert.equal(typeof packageJSON.devDependencies.publint, 'string');
  assert.equal(typeof packageJSON.devDependencies['@arethetypeswrong/cli'], 'string');
  const report = cohort.jobs['compatibility-report'];
  assert.equal(report['continue-on-error'], true);
  assert.deepEqual(report.strategy.matrix.node, [22, 24]);
  for (const command of ['npm run verify --workspace live-desk', 'npm run verify --workspace onboarding-wizard-demo',
    'npm install --ignore-scripts --strict-peer-deps --no-audit --no-fund',
    'npm run check:identity', 'npm run check:types', 'npm run check:runtime']) assert.ok(runs(report).includes(command));
  assert.ok(runs(report).some(command => command.includes('prepareConsumer(')));
  for (const job of [...Object.values(ci.jobs), cohort.jobs['installed-cohort']])
    assert.ok(!JSON.stringify(job.needs ?? '').includes('compatibility-report'));
});

test('committed setup order, exact source/Node bindings and sibling-effect faults refuse', () => {
  const original = read('ci.yml').jobs['native-source'];
  committedJob(original, '${{ matrix.node }}', SOURCE);
  const faults = [j => j.steps.splice(2, 1), j => j.steps.splice(2, 0, { run: 'npm --version' }),
    j => { [j.steps[2], j.steps[3]] = [j.steps[3], j.steps[2]]; },
    j => { j.steps[2].if = 'always()'; }, j => { j.steps[2]['continue-on-error'] = true; },
    j => { j.steps[3].if = 'always()'; }, j => { j.steps[4].if = 'always()'; },
    j => { j.steps[0].with.ref = 'main'; }, j => { j.steps[1].with['node-version'] = 'latest'; },
    j => j.steps.splice(1, 0, { uses: 'unreviewed/setup@v1' }), j => j.steps.pop(),
    j => { j.steps = j.steps.filter(s => s.run !== WHOLE_BADGE); },
    j => { j.steps.find(s => s.run === WHOLE_BADGE).run = WHOLE_BADGE.replace("!=='ok'", "==='unknown'"); },
    j => j.steps.push({ run: 'npm --version', if: 'always()' }),
    j => { j.if = false; }, j => { j['continue-on-error'] = true; }];
  for (const fault of faults) {
    const changed = structuredClone(original); fault(changed);
    assert.throws(() => committedJob(changed, '${{ matrix.node }}', SOURCE));
  }
  const prep = read('lock-inputs.yml').jobs['lock-inputs'];
  proposedLocks(prep);
  for (const fault of [j => j.steps.splice(3, 1),
    j => { j.steps[3].run = 'rm -- package-lock.json'; },
    j => { j.steps[3].run = 'rm -- docs-next/package-lock.json'; },
    j => { [j.steps[3], j.steps[4]] = [j.steps[4], j.steps[3]]; },
    j => { j.steps[3].if = 'always()'; },
    j => { j.steps[3]['continue-on-error'] = true; },
    j => { j.steps[3]['working-directory'] = 'docs-next'; }]) {
    const changed = structuredClone(prep); fault(changed); assert.throws(() => proposedLocks(changed));
  }
});

test('every own and report checkout ends Git authentication before dependency execution', () => {
  for (const name of ['ci.yml', 'cohort.yml', 'lock-inputs.yml']) noPersistedCheckoutCredentials(read(name));
});

test('all checkout steps in independently named jobs must opt out', () => {
  const check = source => noPersistedCheckoutCredentials(parsedWorkflow(source));
  check(stringify({ jobs: { first: { steps: [safe(), safe()] }, renamed: { steps: [safe()] } } }));
  for (const uses of ['actions/checkout@v7', 'actions/checkout@' + 'a'.repeat(40), 'ACTIONS/Checkout@v7']) {
    for (const value of [undefined, true, 'true', '${{ false }}']) {
      const checkout = safe(); checkout.uses = uses;
      if (value === undefined) delete checkout.with['persist-credentials'];
      else checkout.with['persist-credentials'] = value;
      assert.throws(() => check(stringify({ jobs: { first: { steps: [safe()] },
        renamed: { steps: [safe(), checkout] } } })), /explicitly disable credential persistence/);
    }
  }
});

test('comments and shell text cannot masquerade as checkout inputs', () => {
  assert.throws(() => noPersistedCheckoutCredentials(parsedWorkflow(`jobs:
  renamed:
    steps:
      - uses: actions/checkout@v7 # persist-credentials: false
      - run: |
          echo 'persist-credentials: false'
`)), /explicitly disable credential persistence/);
});

test('missing checkout, duplicate keys and unsupported alias or merge semantics refuse', () => {
  for (const source of ['jobs: {empty: {steps: []}}',
    'jobs: {first: {steps: []}, first: {steps: []}}',
    'template: &checkout {uses: actions/checkout@v7, with: {persist-credentials: false}}\njobs: {first: {steps: [*checkout]}}',
    'jobs: {first: {steps: [{uses: actions/checkout@v7, with: {<<: {persist-credentials: false}}}]}}'])
    assert.throws(() => noPersistedCheckoutCredentials(parsedWorkflow(source)));
});

test('required checks contain no token, sibling-run, live-version or native-proof readiness path', () => {
  for (const name of ['ci.yml', 'cohort.yml', 'lock-inputs.yml']) {
    const workflow = read(name); noLiveReadiness(workflow);
    for (const mutate of [w => { w.permissions.actions = 'read'; },
      w => { w.env = { ...w.env, GH_TOKEN: '${{ github.token }}' }; },
      w => { w.defaults = { run: { shell: 'true {0}' } }; },
      w => { Object.values(w.jobs).find(j => j.steps).defaults = { run: { shell: 'true {0}' } }; },
      w => { Object.values(w.jobs).find(j => j.steps).steps.find(s => s.run).shell = 'true {0}'; },
      w => { Object.values(w.jobs).find(j => j.steps).permissions = { contents: 'write' }; },
      w => { Object.values(w.jobs).find(j => j.steps).steps.push({ run: 'node scripts/cohort/native_input.mjs view-test' }); }]) {
      const changed = structuredClone(workflow); mutate(changed); assert.throws(() => noLiveReadiness(changed));
    }
  }
});
