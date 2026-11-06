import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildNavigationGraph, connectAction, createActionRuntime, defineAction, serveToAgent } from 'hcifootprint';
import { mcpServer } from 'hcifootprint/mcp';
import { registerWebMcpTools } from 'hcifootprint/webmcp';
import { ControlSurfaceProvider, useControlSurface } from 'hcifootprint/react';
import { watchPage } from 'hcifootprint/sensor';
import { testApp } from 'hcifootprint/testing';
import { lintGraph } from 'hcifootprint/testing/lint';
import { createElement, isValidElement } from 'react';
import { commitValueAt } from 'foottrace';
import { verifyIdentity } from './identity.mjs';

const imports = ['hcifootprint', 'hcifootprint/mcp', 'hcifootprint/webmcp', 'hcifootprint/react',
  'hcifootprint/sensor', 'hcifootprint/testing', 'hcifootprint/testing/lint'].sort();
assert.deepEqual(imports, JSON.parse(readFileSync(new URL('./public-imports.json', import.meta.url), 'utf8')));
const identity = verifyIdentity(fileURLToPath(new URL('.', import.meta.url)));

const graph = buildNavigationGraph('cohort', {
  pages: { home: {} },
  actions: { save: { on: 'home', does: 'Save the supplied count',
    when: { enabled: { eq: true } }, writes: ['count'],
    input: { type: 'object', properties: { value: { type: 'number' } }, required: ['value'] },
  } },
});
const session = graph.createSession({ node: 'home', state: { enabled: false, count: 0 } });
let release;
const completion = new Promise((resolve) => { release = resolve; });
let invocations = 0;
session.registerHandlers({ group: 'cohort-app', handlers: { save: async (payload) => {
  invocations += 1;
  await completion;
  session.updateState({ count: payload.value });
  return { saved: payload.value };
} } });
assert.equal(session.available().edges.length, 0);
session.updateState({ enabled: true }, { stimulus: 'push' });
assert.equal(session.available().edges.length, 1);
assert.deepEqual(session.toMCPTools()[0].inputSchema.properties.value, { type: 'number' });

const port = serveToAgent(session);
const tools = new Map();
const registration = await registerWebMcpTools(port, {
  registerTool(tool, { signal }) {
    tools.set(tool.name, tool);
    signal.addEventListener('abort', () => tools.delete(tool.name), { once: true });
  },
});
assert.deepEqual([...tools.keys()], port.tools().map((tool) => tool.name));
const fired = await tools.get('cohort.do_action').execute({ action: 'save', input: { value: 3 } });
assert.equal(fired.ok, true);
assert.equal(fired.effectStatus, 'pending');
assert.equal(invocations, 1);
release();
await port.whenSettled(fired.transitionId);
const settled = await tools.get('cohort.did_it_work').execute({ transitionId: fired.transitionId });
assert.deepEqual({ ok: settled.ok, settled: settled.settled, effectStatus: settled.effectStatus,
  outcome: settled.outcome, writesObserved: settled.writesObserved },
{ ok: true, settled: true, effectStatus: 'performed', outcome: 'committed', writesObserved: true });
assert.equal(session.state().count, 3);
assert.match(session.why('count'), /save/);
const log = session.commitLog();
assert.equal(commitValueAt(log, log.at(-1).idx, 'count'), 3);
assert.equal(log.filter((row) => row.runtimeStageId === fired.transitionId).length, 1);
const harness = testApp({ session });
harness.expectState({ count: 3 });
harness.expectClean();
assert.ok(Array.isArray(lintGraph(graph)));
registration.dispose();
assert.equal(tools.size, 0);

const runtime = createActionRuntime();
const action = defineAction('cohort.capture', {
  does: 'Capture a receipt', invocation: 'scalar',
  settle: { evidence: { kind: 'cohort.receipt' },
    onReturn: (outcome) => outcome.status === 'failed'
      ? { status: 'refused', reason: String(outcome.error) }
      : { status: 'verified', evidence: outcome.produced },
  },
  mutate: async (value) => ({ value }),
});
const connection = connectAction(runtime, action, { node: 'home', coverage: 'verifiable' });
const invocation = connection.invoke('receipt-1');
assert.equal((await invocation.whenInvoked).status, 'performed');
assert.equal((await invocation.whenEffectSettled).status, 'verified');
assert.deepEqual(runtime.transitionFor(invocation.transition).evidence, { value: 'receipt-1' });
connection.disconnect();

// These optional doors are also imported/typechecked in the installed consumer.
// Actual React scheduling and sensor DOM behavior stay in their original CI tests.
assert.equal(typeof watchPage, 'function');
assert.equal(typeof useControlSurface, 'function');
assert.ok(isValidElement(createElement(ControlSurfaceProvider, { watch: null })));
const server = mcpServer(session, { settleWithinMs: 0 });
await server.close();

console.log(JSON.stringify({ kind: 'actual-packed-runtime-contract', imports, identity,
  checks: ['guard-and-schema', 'webmcp-registration-and-disposal', 'event-owned-asynchronous-settlement',
    'one-native-record-and-replay', 'testing-harness', 'callable-action-receipt',
    'optional-public-imports'], browserProof: false, modelCalls: 0 }, null, 2));
